require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Redis } = require('@upstash/redis');

const puppeteer = require('puppeteer');
const cron = require('node-cron');

const CACHE_KEY = 'dealership:inventory';
const CACHE_TTL = parseInt(process.env.SCRAPE_INTERVAL_HOURS || '24') * 60 * 60;
const BASE_URL = 'https://www.bentleysupercenter.com/VehicleSearchResults';
const ITEMS_PER_PAGE = 24;

// CSS Selectors
const selectors = {
  CSS_SELECTOR_STOCK_NUMBER: 'li[template="vehicleIdentitySpecs-stockNumber"] span.value',
  CSS_SELECTOR_MAKE: 'span[itemprop="manufacturer"]',
  CSS_SELECTOR_MODEL: 'span[itemprop="model"]',
  CSS_SELECTOR_YEAR: 'span[itemprop="vehicleModelDate"]',
  CSS_SELECTOR_PRICE: 'span[itemprop="price"][data-action="priceSpecification"].value.big-and-bold',
  CSS_SELECTOR_MILEAGE: 'li[template="vehicleIdentitySpecs-miles"] span.value',
  CSS_SELECTOR_EXTERIOR_COLOR: 'li[template="vehicleIdentitySpecs-exterior"] span[itemprop="color"]',
  CSS_SELECTOR_VIN: 'li[template="vehicleIdentitySpecs-vin"] span[itemprop="vehicleIdentificationNumber"]',
  CSS_SELECTOR_TRIM: 'span[itemprop="vehicleConfiguration"]',
  CSS_SELECTOR_ENGINE: 'li[template="vehicleIdentitySpecs-engine"] span[itemprop="name"]',
  CSS_SELECTOR_TRANSMISSION: 'li[template="vehicleIdentitySpecs-transmission"] span[itemprop="name"]',
  CSS_SELECTOR_PHOTOS: 'figure img',
  CSS_SELECTOR_VEHICLE_LINK: 'a[data-insight="vehicleTitle"]',
  CSS_SELECTOR_BODY_STYLE: 'li[template="vehicleIdentitySpecs-body"] span[itemprop="name"]',
  CSS_SELECTOR_CARFAX_HIGHLIGHTS: '#carfaxSection .carfax-one-owner-section'
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

async function saveVehicle(vehicleData) {
  if (!vehicleData) {
    console.error('No vehicle data to save');
    return null;
  }

  try {
    return await prisma.vehicle.upsert({
      where: { stockNumber: vehicleData.stockNumber },
      update: {
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        price: vehicleData.price,
        mileage: vehicleData.mileage,
        color: vehicleData.color,
        vin: vehicleData.vin,
        trim: vehicleData.trim,
        engine: vehicleData.engine,
        transmission: vehicleData.transmission,
        bodyStyle: vehicleData.bodyStyle,
        carfaxHighlights: vehicleData.carfaxHighlights,
        features: vehicleData.features,
        images: vehicleData.images,
        description: vehicleData.description,
        sourceUrl: vehicleData.sourceUrl,
        status: 'available',
        updatedAt: new Date()
      },
      create: {
        stockNumber: vehicleData.stockNumber,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        price: vehicleData.price,
        mileage: vehicleData.mileage,
        color: vehicleData.color,
        vin: vehicleData.vin,
        trim: vehicleData.trim,
        engine: vehicleData.engine,
        transmission: vehicleData.transmission,
        bodyStyle: vehicleData.bodyStyle,
        carfaxHighlights: vehicleData.carfaxHighlights,
        features: vehicleData.features,
        images: vehicleData.images,
        description: vehicleData.description,
        sourceUrl: vehicleData.sourceUrl,
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error saving vehicle:', error);
    return null;
  }
}

async function scrapeVehicle(url, browser) {
  console.log('[DEBUG] Starting vehicle scrape:', url);
  console.time(`scrape-${url}`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log('[DEBUG] Navigating to vehicle page:', url);
    await page.goto(url, { waitUntil: 'networkidle0' });
    console.log('[DEBUG] Vehicle page loaded');

    const data = await page.evaluate((selectors) => {
      const getText = (selector) => 
        document.querySelector(selector)?.textContent?.trim() || '';
      const getNumber = (selector) => {
        const text = getText(selector).replace(/\D/g, '');
        return text ? parseInt(text) : 0;
      };
      const getPrice = (selector) => {
        const text = getText(selector).replace(/\D/g, '');
        return text ? parseInt(text) : 0;
      };

      return {
        stockNumber: getText(selectors.CSS_SELECTOR_STOCK_NUMBER),
        make: getText(selectors.CSS_SELECTOR_MAKE),
        model: getText(selectors.CSS_SELECTOR_MODEL),
        year: getNumber(selectors.CSS_SELECTOR_YEAR),
        price: getPrice(selectors.CSS_SELECTOR_PRICE),
        mileage: getNumber(selectors.CSS_SELECTOR_MILEAGE),
        color: getText(selectors.CSS_SELECTOR_EXTERIOR_COLOR),
        vin: getText(selectors.CSS_SELECTOR_VIN),
        trim: getText(selectors.CSS_SELECTOR_TRIM),
        engine: getText(selectors.CSS_SELECTOR_ENGINE),
        transmission: getText(selectors.CSS_SELECTOR_TRANSMISSION),
        bodyStyle: getText(selectors.CSS_SELECTOR_BODY_STYLE),
        carfaxHighlights: Array.from(
          document.querySelectorAll(selectors.CSS_SELECTOR_CARFAX_HIGHLIGHTS)
        ).map(el => el.textContent?.trim() || ''),
        features: Array.from(
          document.querySelectorAll('li[itemprop="value"] span')
        ).map(el => el.textContent?.trim() || ''),
        images: Array.from(
          document.querySelectorAll(selectors.CSS_SELECTOR_PHOTOS)
        ).map(img => img.src),
        description: ''
      };
    }, selectors);

    console.log('[DEBUG] Vehicle data extracted:', {
      stockNumber: data.stockNumber,
      make: data.make,
      model: data.model
    });

    return data;
  } catch (error) {
    console.error('[DEBUG] Error scraping vehicle:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  } finally {
    await page.close();
    console.timeEnd(`scrape-${url}`);
  }
}

async function scrapeInventory() {
  console.log('[DEBUG] Starting full inventory scrape...');
  let browser = null;

  try {
    // Get all current stock numbers before scraping
    console.log('[DEBUG] Fetching current available vehicles...');
    const previousStockNumbers = await prisma.vehicle.findMany({
      where: { status: 'available' },
      select: { stockNumber: true }
    });
    const previousStockNumberSet = new Set(previousStockNumbers.map(v => v.stockNumber));
    console.log(`[DEBUG] Found ${previousStockNumberSet.size} currently available vehicles`);

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
      
      await page.goto(pageUrl, { waitUntil: 'networkidle0' });
      console.log('[DEBUG] Page loaded successfully');

      // Get all vehicle links on the page
      console.log('[DEBUG] Fetching vehicle links...');
      const pageLinks = await page.$$eval(
        selectors.CSS_SELECTOR_VEHICLE_LINK,
        (elements) => elements.map(el => el.href)
      );

      console.log(`[DEBUG] Found ${pageLinks.length} vehicle links on page ${currentPage}`);

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
          vehicles.push(vehicleData);
          // Remove from previous stock numbers as we've found it
          previousStockNumberSet.delete(vehicleData.stockNumber);
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

      console.timeEnd(`page-${currentPage}`);
      currentPage++;
    }

    // Save all scraped vehicles
    console.log('[DEBUG] Saving scraped vehicles...');
    for (const vehicle of vehicles) {
      await saveVehicle(vehicle);
    }

    // Mark remaining vehicles as sold
    if (previousStockNumberSet.size > 0) {
      console.log(`[DEBUG] Marking ${previousStockNumberSet.size} vehicles as sold...`);
      await prisma.vehicle.updateMany({
        where: {
          stockNumber: {
            in: Array.from(previousStockNumberSet)
          },
          status: 'available'
        },
        data: {
          status: 'sold',
          updatedAt: new Date()
        }
      });
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

    const testUrl = 'https://www.bentleysupercenter.com/VehicleDetails/used-2022-Honda-Accord_Sedan-Sport_1.5T_CVT-Huntsville-AL/5933921760';
    const vehicleData = await scrapeVehicle(testUrl, browser);
    if (vehicleData) {
      console.log('[DEBUG] Vehicle data scraped successfully');
      
      // Update database
      await prisma.vehicle.upsert({
        where: { stockNumber: vehicleData.stockNumber },
        update: {
          ...vehicleData,
          sourceUrl: testUrl,
          updatedAt: new Date()
        },
        create: {
          ...vehicleData,
          sourceUrl: testUrl,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

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
    }
  } catch (error) {
    console.error('Test scrape failed:', error);
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    console.log('[DEBUG] Starting main function');
    console.log('[DEBUG] Checking database connection...');
    
    // Test database connection
    await prisma.$connect();
    console.log('[DEBUG] Database connection successful');
    
    // Test Redis connection
    console.log('[DEBUG] Checking Redis connection...');
    await redis.set('test-connection', 'ok', { ex: 60 });
    const testResult = await redis.get('test-connection');
    if (testResult !== 'ok') {
      throw new Error('Redis connection test failed');
    }
    console.log('[DEBUG] Redis connection successful');
    
    // Run the scraper
    console.log('[DEBUG] Starting inventory scrape...');
    await scrapeInventory();
    
    console.log('[DEBUG] Scrape completed successfully');
  } catch (error) {
    console.error('[ERROR] Main function failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('[ERROR] Script failed:', error);
  process.exit(1);
});
