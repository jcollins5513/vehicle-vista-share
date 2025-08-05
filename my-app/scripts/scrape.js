import 'dotenv/config';
import { Redis } from '@upstash/redis';
import puppeteer from 'puppeteer';
import fs from 'fs';

// Constants
const CACHE_KEY = 'dealership:inventory'; // Changed from 'vista:inventory' to match the key used in redisService.ts
const CACHE_TTL = parseInt(process.env.SCRAPE_INTERVAL_HOURS || '24') * 60 * 60;
const BASE_URL = 'https://www.bentleysupercenter.com/searchused.aspx';
const ITEMS_PER_PAGE = 24;

// Selectors for vehicle data extraction
const selectors = {
  // Vehicle card and navigation selectors
  CSS_SELECTOR_VEHICLE_CARD: 'div.vehicle-card',
  CSS_SELECTOR_VEHICLE_LINK: '.vehicle-title a, .vehicle-image a, a[href*="/used-"], a[href*="/new-"], a[href*="/certified-"]',
  CSS_SELECTOR_NEXT_PAGE: '.pagination__next:not(.disabled), .pagination-next:not(.disabled)',
  
  // Data attribute selectors (most reliable for vehicle data)
  CSS_SELECTOR_STOCK_NUMBER: '[data-stocknum]',
  CSS_SELECTOR_MAKE: '[data-make]',
  CSS_SELECTOR_MODEL: '[data-model]',
  CSS_SELECTOR_YEAR: '[data-year]',
  CSS_SELECTOR_MSRP: '[data-msrp]',
  CSS_SELECTOR_EXTERIOR_COLOR: '[data-extcolor]',
  CSS_SELECTOR_VIN: '[data-vin]',
  CSS_SELECTOR_TRIM: '[data-trim]',
  CSS_SELECTOR_ENGINE: '[data-engine]',
  CSS_SELECTOR_TRANSMISSION: '[data-trans]',
  CSS_SELECTOR_BODY_STYLE: '[data-bodystyle]',
  
  // Visual element selectors (fallbacks if data attributes not available)
  CSS_SELECTOR_PRICE: '.vehiclePricingHighlightAmount, .vehicle-price, .sale-price',
  CSS_SELECTOR_MILEAGE: '.vehicle-mileage, .mileage',
  CSS_SELECTOR_FEATURES: '.oem-vehicle-features li, .vehicle-features li',
  CSS_SELECTOR_IMAGES: '.hero-carousel__item img, .vehicle-carousel__item img, .vehicle-image img',
  CSS_SELECTOR_COMMENTS: '.comments-list li, .vehicle-comments',
  CSS_SELECTOR_CARFAX: 'a[href*="carfax.com"]',
  CSS_SELECTOR_IDENTIFIERS: '.vehicle-identifiers'
};

// Clean and format Redis URL and token
const cleanUrl = (url) => {
  if (!url) return '';
  // Remove quotes and trim
  return url.replace(/["']/g, '').trim();
};

const REDIS_URL = cleanUrl(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
const REDIS_TOKEN = cleanUrl(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);

// Initialize Redis
async function getBrowserLaunchOptions() {
  if (process.env.NODE_ENV === 'production') {
    console.log('[DEBUG] Using production browser settings (@sparticuz/chromium)');
    const chromium = await import('@sparticuz/chromium');
    return {
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    };
  } else {
    console.log('[DEBUG] Using local browser settings (puppeteer)');
    return {
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }
}

const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

// Scrape vehicle function
async function scrapeVehicle(url, existingBrowser = null) {
  console.log('[DEBUG] Scraping vehicle:', url);
  let browser = existingBrowser;
  let needToCloseBrowser = false;

  try {
    if (!browser) {
      const launchOptions = await getBrowserLaunchOptions();
      browser = await puppeteer.launch(launchOptions);
      needToCloseBrowser = true;
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for the vehicle card to load
    await page.waitForSelector(selectors.CSS_SELECTOR_VEHICLE_CARD, { timeout: 10000 })
      .catch(e => console.log('[DEBUG] Vehicle card selector not found:', e.message));

    // Extract all vehicle data
    const vehicleData = await page.evaluate((selectors) => {
      // Helper function to get data attribute from vehicle card
      const getDataAttribute = (attributeName) => {
        const vehicleCard = document.querySelector(selectors.CSS_SELECTOR_VEHICLE_CARD);
        if (!vehicleCard) return '';
        return vehicleCard.getAttribute(`data-${attributeName}`)?.trim() || '';
      };
      
      // Helper function to get text content from a selector
      const getText = (selector) => {
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || '';
      };
      
      // Helper function to parse numbers
      const getNumber = (text) => {
        if (!text) return 0;
        const cleanedText = text.replace(/[^0-9.]/g, '');
        return cleanedText ? parseInt(cleanedText) : 0;
      };
      
      // Helper function to get mileage
      const getMileage = () => {
        const mileageText = getText(selectors.CSS_SELECTOR_MILEAGE);
        return getNumber(mileageText);
      };
      
      // Helper function to get features
      const getFeatures = () => {
        const features = [];
        const featureElements = document.querySelectorAll(selectors.CSS_SELECTOR_FEATURES);
        
        featureElements.forEach(element => {
          const label = element.querySelector(selectors.CSS_SELECTOR_FEATURE_LABEL);
          if (label) {
            const featureText = label.textContent.trim();
            if (featureText) {
              features.push(featureText);
            }
          }
        });
        
        return features;
      };
      
      // Helper function to get images
      const getImages = () => {
        const images = [];
        const imageElements = document.querySelectorAll(selectors.CSS_SELECTOR_IMAGES);
        
        imageElements.forEach(element => {
          const src = element.getAttribute('src');
          if (src && !images.includes(src) && !src.includes('1w')) {
            // Filter out tiny images (1w) and duplicates
            images.push(src);
          }
        });
        
        return images;
      };
      
      // Extract price from the pricing section
      const getPrice = () => {
        // Try to find the price in the featured price section
        const priceText = getText(selectors.CSS_SELECTOR_PRICE);
        if (priceText) {
          return getNumber(priceText);
        }
        
        // Fallback to MSRP data attribute
        return getNumber(getDataAttribute('msrp'));
      };
      
      // Get CARFAX URL if available
      const getCarfaxUrl = () => {
        const carfaxLink = document.querySelector(selectors.CSS_SELECTOR_CARFAX);
        return carfaxLink ? carfaxLink.href : '';
      };
      
      // Get comments
      const getComments = () => {
        return getText(selectors.CSS_SELECTOR_COMMENTS);
      };
      
      // Return all vehicle data
      return {
        stockNumber: getDataAttribute('stocknum'),
        make: getDataAttribute('make'),
        model: getDataAttribute('model'),
        year: getDataAttribute('year'),
        price: getPrice(),
        mileage: getMileage(),
        exteriorColor: getDataAttribute('extcolor'),
        interiorColor: getDataAttribute('intcolor'),
        vin: getDataAttribute('vin'),
        trim: getDataAttribute('trim'),
        engine: getDataAttribute('engine'),
        transmission: getDataAttribute('trans'),
        bodyStyle: getDataAttribute('bodystyle'),
        fuelType: getDataAttribute('fueltype'),
        features: getFeatures(),
        images: getImages(),
        comments: getComments(),
        carfaxUrl: getCarfaxUrl(),
        mpgCity: getDataAttribute('mpgcity'),
        mpgHighway: getDataAttribute('mpghwy'),
      };
    }, selectors);

    console.log('[DEBUG] Vehicle data extracted:', {
      stockNumber: vehicleData.stockNumber,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      price: vehicleData.price,
      mileage: vehicleData.mileage,
      vin: vehicleData.vin,
    });

    await page.close();
    return vehicleData;
  } catch (error) {
    console.error('[ERROR] Error scraping vehicle:', error);
    return null;
  } finally {
    if (needToCloseBrowser && browser) {
      await browser.close();
    }
  }
}

async function scrapeInventory() {
  console.log('[DEBUG] Starting full inventory scrape...');
  let browser = null;

  try {
    // Launch browser with proper configuration
    const launchOptions = await getBrowserLaunchOptions();
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const vehicles = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const url = new URL(BASE_URL);
      url.searchParams.set('limit', ITEMS_PER_PAGE.toString());
      url.searchParams.set('offset', offset.toString());
      url.searchParams.set('page', currentPage.toString());
      const pageUrl = url.toString();

      console.log(`[DEBUG] Scraping page ${currentPage} with offset ${offset}:`, pageUrl);
      console.time(`page-${currentPage}`);
      
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('[DEBUG] Page loaded successfully');

      // Check if there are vehicle cards on the page
      const hasVehicleCards = await page.evaluate((selector) => {
        return document.querySelectorAll(selector).length > 0;
      }, selectors.CSS_SELECTOR_VEHICLE_CARD);

      if (!hasVehicleCards) {
        console.log('[DEBUG] No vehicle cards found, ending pagination');
        hasNextPage = false;
        console.timeEnd(`page-${currentPage}`);
        break;
      }

      // Get all vehicle links on the page
      console.log('[DEBUG] Fetching vehicle links...');
      
      // Wait for page to fully load with a longer timeout
      await new Promise(resolve => setTimeout(resolve, 5000)); // Give the page more time to load dynamic content
      
      // Save HTML for inspection
      const pageContent = await page.content();
      console.log('[DEBUG] Page content length:', pageContent.length);
      
      // Save the HTML to a file for inspection
      fs.writeFileSync('debug-page.html', pageContent);
      console.log('[DEBUG] Saved page HTML to debug-page.html');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
      console.log('[DEBUG] Saved debug screenshot to debug-screenshot.png');
      
      // Debug the page title
      console.log('[DEBUG] Page title:', await page.title());
      
      // Extract vehicle links using the correct selectors based on the debug HTML analysis
      const vehicleLinks = await page.evaluate(() => {
        console.log('[Browser] Extracting vehicle links using specific selectors...');
        
        // Target the vehicle cards based on the debug HTML structure
        const vehicleCards = document.querySelectorAll('.vehicle-card');
        console.log(`[Browser] Found ${vehicleCards.length} vehicle cards`);
        
        if (vehicleCards.length === 0) {
          console.log('[Browser] No vehicle cards found with .vehicle-card selector');
          return [];
        }
        
        // Extract links from vehicle cards
        const links = [];
        
        // Method 1: Extract from vehicle title links
        const titleLinks = document.querySelectorAll('.vehicle-overview__title a.vehicle-title');
        console.log(`[Browser] Found ${titleLinks.length} title links`);
        
        titleLinks.forEach(link => {
          if (link && link.href) {
            console.log(`[Browser] Found title link: ${link.href}`);
            links.push(link.href);
          }
        });
        
        // Method 2: Extract from vehicle image links
        if (links.length === 0) {
          console.log('[Browser] No title links found, trying image links...');
          const imageLinks = document.querySelectorAll('.hero-carousel__item--viewvehicle');
          console.log(`[Browser] Found ${imageLinks.length} image links`);
          
          imageLinks.forEach(link => {
            if (link && link.href) {
              console.log(`[Browser] Found image link: ${link.href}`);
              links.push(link.href);
            }
          });
        }
        
        // Method 3: Extract from vehicle dropdown menu "View Details" links
        if (links.length === 0) {
          console.log('[Browser] No image links found, trying dropdown menu links...');
          const dropdownLinks = document.querySelectorAll('.vehicle-dropdown__action--details');
          console.log(`[Browser] Found ${dropdownLinks.length} dropdown links`);
          
          dropdownLinks.forEach(link => {
            if (link && link.href) {
              console.log(`[Browser] Found dropdown link: ${link.href}`);
              links.push(link.href);
            }
          });
        }
        
        // Log the results
        console.log(`[Browser] Total vehicle links found: ${links.length}`);
        if (links.length > 0) {
          console.log('[Browser] Sample links:', links.slice(0, 3));
        }
        
        return links;
      });
      
      console.log(`[DEBUG] Found ${vehicleLinks.length} vehicle links using specific selectors`);
      
      // If we found vehicle links with specific selectors, use those
      if (vehicleLinks.length > 0) {
        console.log('[DEBUG] Using vehicle links from specific selectors');
        return vehicleLinks;
      }
      
      // Fallback: If we didn't find any vehicle links with specific selectors, try a generic approach
      console.log('[DEBUG] No vehicle links found with specific selectors, trying generic approach');
      
      // Get all links and filter for likely vehicle detail links
      const allPageLinks = await page.evaluate(() => {
        const allLinks = document.querySelectorAll('a');
        return Array.from(allLinks)
          .map(a => a.href)
          .filter(href => href && href.length > 0);
      });
      
      const filteredVehicleLinks = allPageLinks.filter(link => {
        return link.includes('/used-') || 
               link.includes('/new-') || 
               link.includes('/certified-') || 
               link.includes('/vehicle/') || 
               link.includes('vehicledetails') || 
               link.includes('inventory/');
      });
      
      console.log(`[DEBUG] Found ${filteredVehicleLinks.length} potential vehicle links using generic approach`);
      
      if (filteredVehicleLinks.length > 0) {
        console.log('[DEBUG] Using filtered vehicle links from generic approach');
        return filteredVehicleLinks;
      }
      
      // If we still didn't find any vehicle links, try a more direct approach
      console.log('[DEBUG] No vehicle links found with generic approach, trying direct DOM traversal');
      
      // Try to extract links from the DOM structure based on the debug HTML
      const directLinks = await page.evaluate(() => {
        console.log('[Browser] Attempting direct DOM traversal for vehicle links...');
        
        // Try various selectors that might contain vehicle links based on the debug HTML
        const possibleCardSelectors = [
          '.vehicle-card',
          '[data-vehicle-information]',
          '.vehicle-card__body',
          '.vehicle-card__overview',
          'article',
          '.col-md-4',
          '.col-sm-6',
          '.col-lg-3'
        ];
        
        const links = [];
        
        // Try each selector
        for (const selector of possibleCardSelectors) {
          const elements = document.querySelectorAll(selector);
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          
          if (elements.length > 0) {
            // For each potential card, look for links
            elements.forEach(element => {
              const cardLinks = element.querySelectorAll('a');
              cardLinks.forEach(link => {
                if (link.href && link.href.length > 0) {
                  links.push(link.href);
                }
              });
            });
            
            if (links.length > 0) {
              console.log(`Found ${links.length} links in potential vehicle cards`);
              break;
            }
          }
        }
        
        return links;
      });
      
      console.log(`[DEBUG] Direct approach found ${directLinks.length} links`);
      
      // If we found direct links, use those
      if (directLinks.length > 0) {
        return directLinks;
      }
      
      // If we still don't have any links, try a last resort approach
      console.log('[DEBUG] No links found with any approach, returning empty array');
      return [];

      if (pageLinks.length === 0) {
        console.log('[DEBUG] No vehicle links found, ending pagination');
        hasNextPage = false;
        console.timeEnd(`page-${currentPage}`);
        break;
      }

      // Scrape each vehicle
      for (let index = 0; index < pageLinks.length; index++) {
        const vehicleUrl = new URL(pageLinks[index]).toString();
        console.log(`[DEBUG] Scraping vehicle ${index + 1}/${pageLinks.length} on page ${currentPage}`);
        console.time(`vehicle-${vehicleUrl}`);
        
        const vehicleData = await scrapeVehicle(vehicleUrl, browser);
        if (vehicleData) {
          vehicleData.sourceUrl = vehicleUrl;
          // Add id field that matches stockNumber for proper Redis storage
          vehicleData.id = vehicleData.stockNumber;
          vehicles.push(vehicleData);
          console.log('[DEBUG] Vehicle data scraped successfully:', {
            stockNumber: vehicleData.stockNumber,
            make: vehicleData.make,
            model: vehicleData.model
          });
        } else {
          console.warn('[DEBUG] Failed to scrape vehicle:', vehicleUrl);
        }
        
        console.timeEnd(`vehicle-${vehicleUrl}`);
      }

      // Check for next page button
      const hasNextPageButton = await page.evaluate(() => {
        // Look for pagination next button
        const nextButton = document.querySelector('.pagination__next:not(.disabled), .pagination-next:not(.disabled)');
        return nextButton !== null;
      });

      if (!hasNextPageButton) {
        console.log('[DEBUG] No next page button found, ending pagination');
        hasNextPage = false;
      } else {
        console.log(`[DEBUG] Moving to page ${currentPage + 1}`);
      }

      console.timeEnd(`page-${currentPage}`);
      currentPage++;
    }







    // Update Redis cache
    console.log('[DEBUG] Updating Redis cache...');
    await redis.set(CACHE_KEY, {
      lastUpdated: new Date().toISOString(),
      vehicles: vehicles
    }, { ex: CACHE_TTL });

    console.log('[DEBUG] Scraping completed successfully');
    return vehicles;
  } catch (error) {
    console.error('[ERROR] Error in scrapeInventory:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testSingleVehicle() {
  console.log('[DEBUG] Testing single vehicle scrape...');
  let browser = null;

  try {
    const launchOptions = await getBrowserLaunchOptions();
    browser = await puppeteer.launch(launchOptions);

    // Updated test URL to a current vehicle on the site
    const testUrl = 'https://www.bentleysupercenter.com/used-Florence-2022-Buick-Encore+GX-Select-KL4MMDSL5NB084360';
    
    console.log('[DEBUG] Testing scrape with URL:', testUrl);
    const vehicleData = await scrapeVehicle(testUrl, browser);
    
    if (vehicleData) {
      console.log('[DEBUG] Vehicle data scraped successfully');
      console.log('[DEBUG] Data extracted:', JSON.stringify(vehicleData, null, 2));
      
      // Add id field that matches stockNumber for proper Redis storage
      vehicleData.id = vehicleData.stockNumber;
      
      // Update cache with the correct format
      console.log('[DEBUG] Updating Redis cache');
      const cacheData = {
        lastUpdated: new Date().toISOString(),
        vehicles: [vehicleData]
      };
      console.log('[DEBUG] Cache data:', JSON.stringify(cacheData, null, 2));
      await redis.set(CACHE_KEY, cacheData);
      
      // Verify cache
      console.log('[DEBUG] Verifying Redis cache');
      const cached = await redis.get(CACHE_KEY);
      console.log('[DEBUG] Cached data:', JSON.stringify(cached, null, 2));
      console.log('[DEBUG] Cache updated successfully');
    } else {
      console.error('[DEBUG] Failed to scrape test vehicle');
    }
  } catch (error) {
    console.error('[ERROR] Test scrape failed:', error);
  } finally {
    if (browser) await browser.close();
  }
}

async function main() {
  try {
    console.log('[DEBUG] Starting main function');
    
    // Test Redis connection
    console.log('[DEBUG] Testing Redis connection...');
    await redis.set('test-connection', 'ok', { ex: 60 });
    const testResult = await redis.get('test-connection');
    if (testResult !== 'ok') throw new Error('Redis connection test failed');
    console.log('[DEBUG] Redis connection test passed');
    
    console.log('[DEBUG] Starting inventory scrape...');
    const vehicleLinks = await scrapeInventory();
    
    console.log('='.repeat(50));
    console.log(`[RESULTS] Found ${vehicleLinks.length} vehicle links`);
    
    // Save vehicle links to a file for analysis
    try {
      fs.writeFileSync('vehicle-links.json', JSON.stringify(vehicleLinks, null, 2));
      console.log('[DEBUG] Saved vehicle links to vehicle-links.json');
    } catch (error) {
      console.error('[ERROR] Failed to save vehicle links to file:', error);
    }
    
    if (vehicleLinks.length > 0) {
      console.log('[RESULTS] First 5 vehicle links:');
      vehicleLinks.slice(0, 5).forEach((link, index) => {
        console.log(`  ${index + 1}. ${link}`);
      });
    } else {
      console.log('[RESULTS] No vehicle links found');
    }
    console.log('='.repeat(50));
    
    console.log('Scrape completed successfully');
  } catch (error) {
    console.error('[ERROR] Main function failed:');
    console.error(error);
    throw error;
  }
}

// Run the script
main().catch((error) => {
  console.error('[ERROR] Script failed:');
  console.error(error);
  process.exit(1);
});
