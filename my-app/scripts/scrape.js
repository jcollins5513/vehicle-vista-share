import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { Redis } from '@upstash/redis';
import puppeteer from 'puppeteer';
import fs from 'fs';

const CACHE_KEY = 'dealership:inventory';
const CACHE_TTL = parseInt(process.env.SCRAPE_INTERVAL_HOURS || '0') * 60 * 60;
const BASE_URL = 'https://www.bentleysupercenter.com/searchused.aspx';
// const ITEMS_PER_PAGE = 24; // Not used currently

const selectors = {
    CSS_SELECTOR_VEHICLE_CARD: 'div[data-vehicle-information]',
    CSS_SELECTOR_VEHICLE_LINKS: 'a.vehicle-title',
    CSS_SELECTOR_TOTAL_PAGES: '.total-pages',
    CSS_SELECTOR_FEATURES: '.vehicle-highlights__item',
    CSS_SELECTOR_IMAGES: '.hero-carousel__image',
    CSS_SELECTOR_MILEAGE: '.vehicle-mileage',
    CSS_SELECTOR_PRICE: '.vehiclePricingHighlightAmount',
    CSS_SELECTOR_PRICE_LABEL: '.vehiclePricingHighlightLabel',
    CSS_SELECTOR_PRICE_DETAILS: '.priceBlocItemPriceLabel, .priceBlocItemPriceValue',
};

// Initialize Prisma client
const prisma = new PrismaClient();

// Clean and format Redis URL and token
const cleanUrl = (url) => {
  if (!url) return '';
  // Remove quotes and trim
  return url.replace(/["']/g, '').trim();
};

const REDIS_URL = cleanUrl(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
const REDIS_TOKEN = cleanUrl(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);

// Initialize Redis
const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

async function saveVehicle(vehicleData) {
  if (!vehicleData || !vehicleData.stockNumber) {
    console.error('No vehicle data or stock number to save');
    return null;
  }

  try {
    // Map the scraped data to database fields
    const dbVehicleData = {
      stockNumber: vehicleData.stockNumber,
      make: vehicleData.make,
      model: vehicleData.model,
      year: parseInt(vehicleData.year) || 0,
      price: parseInt(vehicleData.price) || 0,
      salePrice: vehicleData.salePrice,
      mileage: vehicleData.mileage ? parseInt(vehicleData.mileage.replace(/[^\d]/g, '')) : null,
      exteriorColor: vehicleData.exteriorColor,
      interiorColor: vehicleData.interiorColor,
      vin: vehicleData.vin,
      trim: vehicleData.trim,
      engine: vehicleData.engine,
      transmission: vehicleData.transmission,
      fuelType: vehicleData.fuelType,
      bodyStyle: vehicleData.bodyStyle,
      modelCode: vehicleData.modelCode,
      condition: vehicleData.condition,
      mpgCity: parseInt(vehicleData.mpgCity) || null,
      mpgHwy: parseInt(vehicleData.mpgHwy) || null,
      inStock: vehicleData.inStock || false,
      status: vehicleData.inStock ? 'available' : 'unavailable',
      sourceUrl: vehicleData.sourceUrl || BASE_URL,
      features: vehicleData.features || [],
      images: vehicleData.images || [],
      pricingDetails: vehicleData.pricingDetails || {},
      carfaxHighlights: vehicleData.carfaxHighlights || [],
      description: vehicleData.description || `${vehicleData.year} ${vehicleData.make} ${vehicleData.model} ${vehicleData.trim}`,
      photos: vehicleData.images || []
    };

    // Use VIN as the primary identifier if available, otherwise fall back to stockNumber
    const whereClause = vehicleData.vin ? { vin: vehicleData.vin } : { stockNumber: vehicleData.stockNumber };
    
    return await prisma.vehicle.upsert({
      where: whereClause,
      update: {
        ...dbVehicleData,
        updatedAt: new Date()
      },
      create: {
        ...dbVehicleData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('vin')) {
      console.log(`[INFO] Vehicle with VIN ${vehicleData.vin} already exists, attempting to update by stockNumber instead`);
      
      // Try to update by stockNumber if VIN conflict occurs
      try {
        return await prisma.vehicle.update({
          where: { stockNumber: vehicleData.stockNumber },
          data: {
            ...dbVehicleData,
            updatedAt: new Date()
          }
        });
      } catch (updateError) {
        console.error('Error updating vehicle by stockNumber:', updateError);
        return null;
      }
    }
    
    console.error('Error saving vehicle:', error);
    return null;
  }
}

async function saveToRedis(vehicles) {
  try {
    const cacheData = {
      vehicles: vehicles,
      lastUpdated: new Date().toISOString(),
      totalCount: vehicles.length
    };
    
    // Only include TTL if CACHE_TTL is greater than 0
    // If CACHE_TTL is 0 or negative, make the cache persistent (no expiration)
    if (CACHE_TTL > 0) {
      await redis.set(CACHE_KEY, JSON.stringify(cacheData), { ex: CACHE_TTL });
      console.log(`[SUCCESS] Cached ${vehicles.length} vehicles in Redis with TTL ${CACHE_TTL}s`);
    } else {
      await redis.set(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`[SUCCESS] Cached ${vehicles.length} vehicles in Redis (persistent, no expiration)`);
    }
  } catch (error) {
    console.error('[ERROR] Failed to save to Redis:', error);
  }
}

async function getBrowserLaunchOptions() {
    return {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
}

async function extractVehicleDataFromCard(vehicleCard) {
    try {
        // Extract data from the vehicle card's data attributes
        const vehicleData = await vehicleCard.evaluate((card) => {
            const getAttribute = (attr, defaultValue = '') => {
                return card.getAttribute(attr) || defaultValue;
            };

            const getText = (selector, defaultValue = '') => {
                const element = card.querySelector(selector);
                return element ? (element.innerText || element.textContent || '').trim() : defaultValue;
            };

            const getSalePrice = () => {
                const priceElement = card.querySelector('.vehiclePricingHighlightAmount');
                return priceElement ? priceElement.innerText.trim() : '';
            };

            const getFeatures = () => {
                const featureElements = card.querySelectorAll('.vehicle-highlights__item');
                return Array.from(featureElements).map(feature => {
                    const icon = feature.querySelector('img');
                    return icon ? icon.alt || icon.title || '' : '';
                }).filter(feature => feature.length > 0);
            };

            const getImages = () => {
                const images = [];
                
                // Get the VIN from data attributes
                const vin = getAttribute('data-vin');
                const stockNumber = getAttribute('data-stocknum');
                
                if (!vin) {
                    console.log('[DEBUG] No VIN found for vehicle, cannot generate image URLs');
                    return images;
                }
                
                // First, try to extract car ID from existing image URLs on the card
                let carId = null;
                const existingImages = card.querySelectorAll('img[src*="inventoryphotos"]');
                
                if (existingImages.length > 0) {
                    for (const img of existingImages) {
                        if (img.src) {
                            let src = img.src;
                            if (src && src.startsWith('/')) {
                                src = `https://www.bentleysupercenter.com${src}`;
                            }
                            
                            // Extract car ID from URL pattern: /inventoryphotos/{carId}/{vin}/ip/
                            const carIdMatch = src.match(/\/inventoryphotos\/(\d+)\//);
                            if (carIdMatch) {
                                carId = carIdMatch[1];
                                console.log(`[DEBUG] Extracted car ID: ${carId} from existing image URL: ${src}`);
                                break;
                            }
                        }
                    }
                }
                
                // If we found a car ID from existing images, use it to generate more images
                if (carId) {
                    console.log(`[DEBUG] Using car ID: ${carId} for VIN: ${vin}, Stock: ${stockNumber}`);
                    
                    // Convert VIN to lowercase for URL generation
                    const vinLower = vin.toLowerCase();
                    
                    // Generate image URLs using the correct pattern
                    // Pattern: https://www.bentleysupercenter.com/inventoryphotos/{carId}/{vin}/ip/{imageNumber}.jpg
                    const baseUrl = `https://www.bentleysupercenter.com/inventoryphotos/${carId}/${vinLower}/ip`;
                    
                    console.log(`[DEBUG] Generating images for VIN: ${vin} (${vinLower}), Car ID: ${carId}`);
                    console.log(`[DEBUG] Base URL: ${baseUrl}`);
                    
                    // Generate images 1-20 (most vehicles have 10-15 images)
                    for (let i = 1; i <= 20; i++) {
                        const imageUrl = `${baseUrl}/${i}.jpg`;
                        images.push(imageUrl);
                    }
                    
                    // Also try alternative image formats for the first few images
                    for (let i = 1; i <= 5; i++) {
                        const pngUrl = `${baseUrl}/${i}.png`;
                        const jpegUrl = `${baseUrl}/${i}.jpeg`;
                        images.push(pngUrl, jpegUrl);
                    }
                    
                    // Clean all URLs by removing query parameters and remove duplicates
                    const cleanImages = images.map(url => url.split('?')[0]);
                    return [...new Set(cleanImages)];
                } else {
                    console.log(`[DEBUG] No car ID found for VIN: ${vin}, Stock: ${stockNumber} - no images will be generated`);
                    return images;
                }
            };

            // Note: image URL validation is intentionally skipped for speed

            const getExteriorColor = () => {
                const extColorElement = card.querySelector('.vehicle-colors__ext .vehicle-colors__icon');
                return extColorElement ? extColorElement.getAttribute('title') || extColorElement.getAttribute('aria-label') || '' : '';
            };

            const getInteriorColor = () => {
                const intColorElement = card.querySelector('.vehicle-colors__int .vehicle-colors__icon');
                return intColorElement ? intColorElement.getAttribute('title') || intColorElement.getAttribute('aria-label') || '' : '';
            };

            const getPricingDetails = () => {
                const priceLabels = card.querySelectorAll('.priceBlocItemPriceLabel');
                const priceValues = card.querySelectorAll('.priceBlocItemPriceValue');
                const pricing = {};
                
                priceLabels.forEach((label, index) => {
                    const value = priceValues[index];
                    if (label && value) {
                        const labelText = label.innerText.trim().replace(':', '');
                        const valueText = value.innerText.trim();
                        pricing[labelText] = valueText;
                    }
                });
                
                return pricing;
            };

            const getDetailUrl = () => {
                const link = card.querySelector('a.vehicle-title, a[href*="/used/"], a[href*="vehicle-details"], a[href*="vin"]');
                if (!link) return '';
                let href = link.getAttribute('href') || '';
                if (!href) return '';
                if (href.startsWith('/')) {
                    href = `https://www.bentleysupercenter.com${href}`;
                }
                return href;
            };

            // Extract basic vehicle information from data attributes
            const stockNumber = getAttribute('data-stocknum');
            const vin = getAttribute('data-vin');
            const year = getAttribute('data-year');
            const make = getAttribute('data-make');
            const model = getAttribute('data-model');
            const trim = getAttribute('data-trim');
            const price = getAttribute('data-price');
            const exteriorColor = getAttribute('data-extcolor');
            const interiorColor = getAttribute('data-intcolor');
            const transmission = getAttribute('data-trans');
            const engine = getAttribute('data-engine');
            const fuelType = getAttribute('data-fueltype');
            const bodyStyle = getAttribute('data-bodystyle');
            const modelCode = getAttribute('data-modelcode');
            const condition = getAttribute('data-vehicletype');
            const mpgCity = getAttribute('data-mpgcity');
            const mpgHwy = getAttribute('data-mpghwy');
            const inStock = getAttribute('data-instock') === 'true';

            // Extract additional information from DOM elements
            const mileage = getText('.vehicle-mileage');
            const features = getFeatures();
            const images = getImages();
            const pricingDetails = getPricingDetails();
            const salePrice = getSalePrice();
            const salePriceLabel = getText('.vehiclePricingHighlightLabel');
            const exteriorColorFromDOM = getExteriorColor();
            const interiorColorFromDOM = getInteriorColor();

            return {
                stockNumber,
                vin,
                year,
                make,
                model,
                trim,
                price,
                salePrice,
                salePriceLabel,
                mileage,
                exteriorColor: exteriorColor || exteriorColorFromDOM,
                interiorColor: interiorColor || interiorColorFromDOM,
                transmission,
                engine,
                fuelType,
                bodyStyle,
                modelCode,
                condition,
                mpgCity,
                mpgHwy,
                inStock,
                features,
                images,
                pricingDetails,
                detailUrl: getDetailUrl()
            };
        });

        // Note: Car ID is now extracted directly from existing image URLs in the getImages() function
        
        return vehicleData;
    } catch (error) {
        console.error('[ERROR] Failed to extract data from vehicle card:', error.message);
        return null;
    }
}

async function extractAllFeaturesFromDetail(browser, detailUrl) {
    if (!detailUrl) return [];
    let detailPage;
    try {
        detailPage = await browser.newPage();
        await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Some pages lazy-load or truncate features; attempt to expand if button exists
        try {
            await detailPage.waitForSelector('.all-features__truncate-button', { timeout: 3000 });
            await detailPage.evaluate(() => {
                const btn = document.querySelector('.all-features__truncate-button');
                if (btn) {
                    (btn).dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }
            });
        } catch {
            // Ignore if button not present
        }

        // Wait for features container or proceed after a short delay
        try {
            await detailPage.waitForSelector('#Options ul li, .all-features__tab-content', { timeout: 8000 });
        } catch {}

        const features = await detailPage.evaluate(() => {
            const items = Array.from(document.querySelectorAll('#Options ul li'));
            if (items.length > 0) {
                return items.map(li => (li.textContent || '').trim()).filter(Boolean);
            }
            // Fallback: try any features lists inside all-features section
            const container = document.querySelector('.bottom-block__item.bottom-block__item--all-features, .all-features');
            if (!container) return [];
            return Array.from(container.querySelectorAll('ul li'))
                .map(li => (li.textContent || '').trim())
                .filter(Boolean);
        });

        console.log(`[DEBUG] Extracted ${features.length} features from detail page: ${detailUrl}`);
        return [...new Set(features)];
    } catch (error) {
        console.log('[DEBUG] Failed to extract features from detail page:', error.message);
        return [];
    } finally {
        if (detailPage) {
            try { await detailPage.close(); } catch {}
        }
    }
}

async function getTotalPages(page) {
    try {
        const totalPages = await page.evaluate(() => {
            // Try multiple selectors to find pagination information
            const selectors = [
                '.total-pages',
                '.pagination .total-pages',
                '.pagination-info',
                '[data-total-pages]',
                '.results-count',
                '.inventory-count'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.innerText || element.textContent || '';
                    // Look for patterns like "Page 1 of 5" or "1-24 of 120" or just numbers
                    const pageMatch = text.match(/(?:page\s+\d+\s+of\s+(\d+)|(\d+)\s+pages?|(\d+)\s+total)/i);
                    if (pageMatch) {
                        const pages = parseInt(pageMatch[1] || pageMatch[2] || pageMatch[3]);
                        if (pages > 0) return pages;
                    }
                    // If it's just a number, assume it's total pages
                    const numMatch = text.match(/(\d+)/);
                    if (numMatch) {
                        const pages = parseInt(numMatch[1]);
                        if (pages > 0) return pages;
                    }
                }
            }
            
            // If no pagination found, check if there are more than 24 vehicles
            const vehicleCards = document.querySelectorAll('div[data-vehicle-information]');
            if (vehicleCards.length >= 24) {
                // If we have exactly 24 vehicles, there might be more pages
                // Let's check if there's a "Next" button or pagination controls
                const nextButton = document.querySelector('.pagination .next, .pagination-next, [aria-label*="next"], .next-page');
                if (nextButton) {
                    console.log('[DEBUG] Found next button, assuming multiple pages');
                    return 5; // Assume at least 5 pages, we'll stop when no more vehicles are found
                }
            }
            
            return 1;
        });
        
        console.log(`[DEBUG] Detected ${totalPages} total pages`);
        return totalPages;
    } catch {
        console.log("[DEBUG] Could not find total pages element, assuming 1 page.");
        return 1;
    }
}

async function scrapeInventory() {
    let browser;
    try {
        const launchOptions = await getBrowserLaunchOptions();
        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded', timeout: 90000 });


        
        const totalPages = await getTotalPages(page);
        console.log(`[DEBUG] Total pages to scrape: ${totalPages}`);

        let allVehicles = [];
        
        let pageNum = 1;
        let hasMorePages = true;
        let consecutiveEmptyPages = 0;
        
        while (hasMorePages && pageNum <= 20) { // Cap at 20 pages to prevent infinite loops
            console.log(`[DEBUG] Scraping page ${pageNum}${totalPages > 1 ? ` of ${totalPages}` : ''}`);
            
            try {
                if (pageNum > 1) {
                    // Add retry logic for page navigation
                    let retries = 3;
                    let navigationSuccess = false;
                    
                    while (retries > 0 && !navigationSuccess) {
                        try {
                            await page.goto(`${BASE_URL}?pt=${pageNum}`, { 
                                waitUntil: 'domcontentloaded',  // Changed from networkidle2 to domcontentloaded
                                timeout: 90000  // Increased timeout to 90s
                            });
                            navigationSuccess = true;
                        } catch (navError) {
                            retries--;
                            console.log(`[WARNING] Navigation to page ${pageNum} failed: ${navError.message}, retries left: ${retries}`);
                            if (retries > 0) {
                                console.log(`[DEBUG] Waiting 10 seconds before retry...`);
                                await new Promise(resolve => setTimeout(resolve, 10000));
                            } else {
                                // If all retries failed, skip this page and try next one
                                console.log(`[ERROR] Failed to load page ${pageNum} after all retries, skipping to next page`);
                                pageNum++;
                                continue;
                            }
                        }
                    }
                }

                // Wait for vehicle cards to load
                try {
                    await page.waitForSelector(selectors.CSS_SELECTOR_VEHICLE_CARD, { timeout: 30000 });
                } catch {
                    console.log(`[DEBUG] No vehicle cards found on page ${pageNum}, stopping pagination`);
                    break;
                }
            } catch (pageError) {
                console.log(`[ERROR] Error on page ${pageNum}: ${pageError.message}, attempting to continue...`);
                pageNum++;
                continue;
            }

            // Extract vehicle data from all cards on this page
            const vehicleCards = await page.$$(selectors.CSS_SELECTOR_VEHICLE_CARD);
            console.log(`[DEBUG] Found ${vehicleCards.length} vehicle cards on page ${pageNum}`);

            // If no vehicles found, increment counter and check if we should stop
            if (vehicleCards.length === 0) {
                consecutiveEmptyPages++;
                console.log(`[DEBUG] No vehicles found on page ${pageNum} (consecutive empty pages: ${consecutiveEmptyPages})`);
                if (consecutiveEmptyPages >= 2) {
                    console.log(`[DEBUG] Found ${consecutiveEmptyPages} consecutive empty pages, stopping pagination`);
                    break;
                }
            } else {
                consecutiveEmptyPages = 0; // Reset counter if we found vehicles
            }

            for (let j = 0; j < vehicleCards.length; j++) {
                console.log(`[DEBUG] Processing vehicle ${j + 1} of ${vehicleCards.length} on page ${pageNum}`);
                const vehicleData = await extractVehicleDataFromCard(vehicleCards[j], page);
                if (vehicleData) {
                    // Enrich features with full list from the vehicle detail page, if available
                    try {
                        if (vehicleData.detailUrl) {
                            const detailFeatures = await extractAllFeaturesFromDetail(browser, vehicleData.detailUrl);
                            if (detailFeatures.length > 0) {
                                const existing = Array.isArray(vehicleData.features) ? vehicleData.features : [];
                                vehicleData.features = [...new Set([...existing, ...detailFeatures])];
                            }
                            // Add small delay after opening detail page to reduce load
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    } catch {
                        console.log('[DEBUG] Skipping detail feature extraction due to error while fetching detail features');
                    }

                    allVehicles.push(vehicleData);
                    
                    // Save to database
                    const savedVehicle = await saveVehicle(vehicleData);
                    if (savedVehicle) {
                        console.log(`[SUCCESS] Saved to database: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} (Stock: ${vehicleData.stockNumber})`);
                    } else {
                        console.log(`[WARNING] Failed to save to database: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`);
                    }
                }
            }
            
            // Clear browser cache and cookies periodically to prevent memory issues
            if (pageNum % 3 === 0) {
                try {
                    console.log(`[DEBUG] Clearing browser cache after page ${pageNum}...`);
                    const client = await page.target().createCDPSession();
                    await client.send('Network.clearBrowserCache');
                    await client.send('Network.clearBrowserCookies');
                } catch (clearError) {
                    console.log(`[DEBUG] Cache clearing skipped: ${clearError.message}`);
                }
            }

            // Always try the next page if we found vehicles on this page
            if (vehicleCards.length === 0) {
                hasMorePages = false;
            }

            // Add a delay between pages to be respectful and avoid rate limiting
            if (hasMorePages) {
                // Random delay between 4-8 seconds to appear more human-like
                const delay = 4000 + Math.random() * 4000;
                console.log(`[DEBUG] Waiting ${Math.round(delay/1000)} seconds before next page...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            pageNum++;
        }

        console.log(`[SUCCESS] Scraped a total of ${allVehicles.length} vehicles.`);
        
        // Save to Redis cache
        await saveToRedis(allVehicles);
        
        // Save the data to JSON files as backup
        const outputPath = 'd:/vehicle-vista-share/my-app/vehicle-data.json';
        fs.writeFileSync(outputPath, JSON.stringify(allVehicles, null, 2));
        console.log(`[SUCCESS] Vehicle data saved to ${outputPath}`);

        // Also save a summary
        const summary = {
            totalVehicles: allVehicles.length,
            scrapedAt: new Date().toISOString(),
            makes: [...new Set(allVehicles.map(v => v.make))],
            years: [...new Set(allVehicles.map(v => v.year))],
            priceRange: {
                min: Math.min(...allVehicles.map(v => parseInt(v.price) || 0)),
                max: Math.max(...allVehicles.map(v => parseInt(v.price) || 0))
            }
        };
        
        fs.writeFileSync('d:/vehicle-vista-share/my-app/scrape-summary.json', JSON.stringify(summary, null, 2));
        console.log('[SUCCESS] Scrape summary saved to scrape-summary.json');

        return allVehicles;

    } catch (error) {
        console.error('[ERROR] An error occurred during inventory scraping:', error);
        
        // Save error screenshot if page is available
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    const errorPath = `d:/vehicle-vista-share/my-app/error-${new Date().toISOString().replace(/:/g, '-')}`;
                    await pages[0].screenshot({ path: `${errorPath}.png`, fullPage: true });
                    console.log(`[DEBUG] Saved error screenshot to ${errorPath}.png`);
                }
            } catch (screenshotError) {
                console.error('[ERROR] Could not save error screenshot:', screenshotError.message);
            }
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function main() {
    try {
        console.log('[INFO] Starting scraper...');
        await scrapeInventory();
        console.log('[INFO] Scraper finished.');
    } catch (error) {
        console.error('[FATAL] The main scraping process failed:', error);
        process.exit(1);
    } finally {
        // Clean up database connection
        await prisma.$disconnect();
        console.log('[INFO] Database connection closed.');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('[INFO] Received SIGINT, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('[INFO] Received SIGTERM, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

// Run the script
main();
