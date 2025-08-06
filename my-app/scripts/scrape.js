import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { Redis } from '@upstash/redis';
import puppeteer from 'puppeteer';
import cron from 'node-cron';
import fs from 'fs';

const CACHE_KEY = 'dealership:inventory';
const CACHE_TTL = parseInt(process.env.SCRAPE_INTERVAL_HOURS || '24') * 60 * 60;
const BASE_URL = 'https://www.bentleysupercenter.com/searchused.aspx';
const ITEMS_PER_PAGE = 24;

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

    return await prisma.vehicle.upsert({
      where: { stockNumber: vehicleData.stockNumber },
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
    
    await redis.set(CACHE_KEY, JSON.stringify(cacheData), { ex: CACHE_TTL });
    console.log(`[SUCCESS] Cached ${vehicles.length} vehicles in Redis with TTL ${CACHE_TTL}s`);
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

async function extractVehicleDataFromCard(vehicleCard, page) {
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
                
                // Try to extract the car ID from data attributes first
                let carId = getAttribute('data-car-id') || 
                           getAttribute('data-vehicle-id') || 
                           getAttribute('data-id') ||
                           getAttribute('data-inventory-id') ||
                           getAttribute('data-photo-id') ||
                           getAttribute('data-image-id') ||
                           getAttribute('data-stocknum'); // Stock number might be the car ID
                
                // If not found in data attributes, try to extract from existing image URLs
                if (!carId) {
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
                                    console.log(`[DEBUG] Extracted car ID: ${carId} from URL: ${src}`);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // If still no car ID found, try to extract from vehicle detail page URL
                if (!carId) {
                    const vehicleLink = card.querySelector('a[href*="vehicle"]') || card.querySelector('a[href*="inventory"]');
                    if (vehicleLink && vehicleLink.href) {
                        const urlMatch = vehicleLink.href.match(/[?&]id=(\d+)/) || vehicleLink.href.match(/\/(\d+)\/?$/);
                        if (urlMatch) {
                            carId = urlMatch[1];
                            console.log(`[DEBUG] Extracted car ID: ${carId} from vehicle link: ${vehicleLink.href}`);
                        }
                    }
                }
                
                // If still no car ID, try to extract from any image URL that might be on the card
                if (!carId) {
                    const allImages = card.querySelectorAll('img');
                    for (const img of allImages) {
                        if (img.src && img.src.includes('inventoryphotos')) {
                            const carIdMatch = img.src.match(/\/inventoryphotos\/(\d+)\//);
                            if (carIdMatch) {
                                carId = carIdMatch[1];
                                console.log(`[DEBUG] Extracted car ID: ${carId} from image src: ${img.src}`);
                                break;
                            }
                        }
                    }
                }
                
                // If still no car ID found, generate a unique ID based on VIN and stock number
                if (!carId) {
                    // Create a simple hash-based car ID from VIN and stock number
                    const combined = `${vin}${stockNumber}`;
                    let hash = 0;
                    for (let i = 0; i < combined.length; i++) {
                        const char = combined.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash; // Convert to 32-bit integer
                    }
                    carId = Math.abs(hash).toString().substring(0, 5); // Get first 5 digits
                    console.log(`[DEBUG] Generated unique car ID: ${carId} for VIN: ${vin}, Stock: ${stockNumber}`);
                }
                
                // Validate that we have a unique car ID for this specific vehicle
                console.log(`[DEBUG] Using car ID: ${carId} for VIN: ${vin}, Stock: ${stockNumber}`);
                
                // Try to find existing image URLs first (fallback)
                const existingImages = card.querySelectorAll('img[src*="inventoryphotos"]');
                
                if (existingImages.length > 0) {
                    existingImages.forEach(img => {
                        if (img.src) {
                            let src = img.src;
                            if (src && src.startsWith('/')) {
                                src = `https://www.bentleysupercenter.com${src}`;
                            }
                            // Clean up the URL by removing ALL query parameters (timestamp, bg-color, width, etc.)
                            src = src.split('?')[0];
                            if (src && !images.includes(src)) {
                                images.push(src);
                            }
                        }
                    });
                }
                
                // Generate image URLs using the correct pattern
                // Pattern: https://www.bentleysupercenter.com/inventoryphotos/{carId}/{vin}/ip/{imageNumber}.jpg
                const baseUrl = `https://www.bentleysupercenter.com/inventoryphotos/${carId}/${vin}/ip`;
                
                console.log(`[DEBUG] Generating images for VIN: ${vin}, Car ID: ${carId}`);
                console.log(`[DEBUG] Base URL: ${baseUrl}`);
                
                // Try to get image count from data attributes or assume a reasonable number
                const imageCount = parseInt(getAttribute('data-image-count')) || 10; // Default to 10 images
                
                for (let i = 1; i <= imageCount; i++) {
                    const imageUrl = `${baseUrl}/${i}.jpg`;
                    images.push(imageUrl);
                }
                
                // Also try alternative image formats (but fewer to avoid duplicates)
                for (let i = 1; i <= 3; i++) {
                    const pngUrl = `${baseUrl}/${i}.png`;
                    const jpegUrl = `${baseUrl}/${i}.jpeg`;
                    images.push(pngUrl, jpegUrl);
                }
                
                // Clean all URLs by removing query parameters and remove duplicates
                const cleanImages = images.map(url => url.split('?')[0]);
                return [...new Set(cleanImages)];
            };

            const validateImageUrl = async (url) => {
                try {
                    const response = await fetch(url, { method: 'HEAD' });
                    return response.ok;
                } catch (error) {
                    return false;
                }
            };

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
                pricingDetails
            };
        });

        // If we still don't have a car ID, try to visit the vehicle detail page
        if (!vehicleData.carId && vehicleData.stockNumber) {
            try {
                console.log(`[DEBUG] Attempting to get car ID from detail page for stock: ${vehicleData.stockNumber}`);
                
                // Find the vehicle detail link (avoid Carfax links)
                const detailLink = await vehicleCard.$('a[href*="vehicle"]') || 
                                  await vehicleCard.$('a[href*="inventory"]') ||
                                  await vehicleCard.$('a[href*="bentleysupercenter"]');
                if (detailLink) {
                    const href = await detailLink.evaluate(link => link.href);
                    if (href && !href.includes('carfax.com')) {
                        console.log(`[DEBUG] Visiting detail page: ${href}`);
                        
                        // Open detail page in new tab
                        const detailPage = await page.browser().newPage();
                        await detailPage.goto(href, { waitUntil: 'networkidle2', timeout: 30000 });
                        
                        // Look for car ID in the detail page
                        const carIdFromDetail = await detailPage.evaluate(() => {
                            // Try multiple selectors to find car ID
                            const selectors = [
                                'img[src*="inventoryphotos"]',
                                '[data-car-id]',
                                '[data-vehicle-id]',
                                '[data-inventory-id]'
                            ];
                            
                            for (const selector of selectors) {
                                const elements = document.querySelectorAll(selector);
                                for (const element of elements) {
                                    if (selector === 'img[src*="inventoryphotos"]') {
                                        // Clean the URL first by removing query parameters
                                        const cleanSrc = element.src.split('?')[0];
                                        const carIdMatch = cleanSrc.match(/\/inventoryphotos\/(\d+)\//);
                                        if (carIdMatch) return carIdMatch[1];
                                    } else {
                                        const carId = element.getAttribute('data-car-id') || 
                                                    element.getAttribute('data-vehicle-id') || 
                                                    element.getAttribute('data-inventory-id');
                                        if (carId) return carId;
                                    }
                                }
                            }
                            return null;
                        });
                        
                        if (carIdFromDetail) {
                            vehicleData.carId = carIdFromDetail;
                            console.log(`[DEBUG] Found car ID from detail page: ${carIdFromDetail}`);
                        }
                        
                        await detailPage.close();
                    }
                }
            } catch (detailError) {
                console.log(`[DEBUG] Could not get car ID from detail page: ${detailError.message}`);
                // If detail page fails, we'll use the generated car ID from above
            }
        }
        
        return vehicleData;
    } catch (error) {
        console.error('[ERROR] Failed to extract data from vehicle card:', error.message);
        return null;
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
    } catch (e) {
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
        
        await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2', timeout: 60000 });


        
        const totalPages = await getTotalPages(page);
        console.log(`[DEBUG] Total pages to scrape: ${totalPages}`);

        let allVehicles = [];
        
        let pageNum = 1;
        let hasMorePages = true;
        let consecutiveEmptyPages = 0;
        
        while (hasMorePages && pageNum <= 20) { // Cap at 20 pages to prevent infinite loops
            console.log(`[DEBUG] Scraping page ${pageNum}${totalPages > 1 ? ` of ${totalPages}` : ''}`);
            
            if (pageNum > 1) {
                await page.goto(`${BASE_URL}?pt=${pageNum}`, { waitUntil: 'networkidle2', timeout: 60000 });
            }

            // Wait for vehicle cards to load
            try {
                await page.waitForSelector(selectors.CSS_SELECTOR_VEHICLE_CARD, { timeout: 30000 });
            } catch (error) {
                console.log(`[DEBUG] No vehicle cards found on page ${pageNum}, stopping pagination`);
                break;
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

            // Always try the next page if we found vehicles on this page
            if (vehicleCards.length === 0) {
                hasMorePages = false;
            }

            // Add a small delay between pages to be respectful
            if (hasMorePages) {
                await new Promise(resolve => setTimeout(resolve, 2000));
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
