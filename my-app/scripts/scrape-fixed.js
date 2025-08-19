import 'dotenv/config';
// import { Redis } from '@upstash/redis'; // Redis is commented out as per user request to focus on scraping
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'https://www.bentleysupercenter.com/searchused.aspx';

const selectors = {
    CSS_SELECTOR_VEHICLE_CARD: 'div.vehicle-card',
    CSS_SELECTOR_STOCK_NUMBER: 'li.stock',
    CSS_SELECTOR_VIN: 'li.vin',
    CSS_SELECTOR_YEAR: '.year',
    CSS_SELECTOR_MAKE: '.make',
    CSS_SELECTOR_MODEL: '.model',
    CSS_SELECTOR_TRIM: '.trim',
    CSS_SELECTOR_PRICE: '.price',
    CSS_SELECTOR_MILEAGE: 'li.mileage',
    CSS_SELECTOR_EXTERIOR_COLOR: 'li.exterior-color',
    CSS_SELECTOR_INTERIOR_COLOR: 'li.interior-color',
    CSS_SELECTOR_TRANSMISSION: 'li.transmission',
    CSS_SELECTOR_ENGINE: 'li.engine',
    CSS_SELECTOR_IMAGES: '.primary-photo a',
    CSS_SELECTOR_FEATURES: '.features-list li',
    CSS_SELECTOR_COMMENTS: '.vehicle-comments',
    CSS_SELECTOR_VEHICLE_LINKS: 'a.vehicle-title',
    CSS_SELECTOR_TOTAL_PAGES: '.total-pages',
};

async function getBrowserLaunchOptions() {
    if (process.env.NODE_ENV === 'production') {
        return {
            executablePath: '/usr/bin/google-chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };
    }
    return {};
}

async function scrapeVehicle(url, existingBrowser = null) {
    console.log('[DEBUG] Scraping vehicle:', url);
    let browser = existingBrowser;
    let page;

    try {
        if (browser === null) {
            const launchOptions = await getBrowserLaunchOptions();
            browser = await puppeteer.launch(launchOptions);
        }
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        await page.waitForSelector('iframe', { timeout: 15000 });
        console.log('[DEBUG] Found iframe, waiting for it to load...');

        // Wait for the frame to finish loading its content
        await new Promise(resolve => setTimeout(resolve, 5000));

        const frames = page.frames();
        const vehicleFrame = frames.find(f => f.url().includes('about:blank'));

        if (!vehicleFrame) {
            throw new Error('Could not find the vehicle data iframe.');
        }

        console.log('[DEBUG] Switched to vehicle data frame. Scraping details...');
        await vehicleFrame.waitForSelector(selectors.CSS_SELECTOR_VEHICLE_CARD, { timeout: 15000 });

        const vehicleData = await vehicleFrame.evaluate((selectors) => {
            const getText = (selectorString, defaultValue = '') => {
                try {
                    const element = document.querySelector(selectorString);
                    return element ? (element.innerText || element.textContent || '').trim() : defaultValue;
                } catch (e) { return defaultValue; }
            };

            const getAllAttributes = (selectorString, attribute, defaultValue = []) => {
                try {
                    const elements = document.querySelectorAll(selectorString);
                    return elements.length > 0 ? Array.from(elements).map(el => el.getAttribute(attribute)).filter(Boolean) : defaultValue;
                } catch (e) { return defaultValue; }
            };

            const stockNumber = getText(selectors.CSS_SELECTOR_STOCK_NUMBER).replace('Stock #', '').trim();
            const vin = getText(selectors.CSS_SELECTOR_VIN).replace('VIN:', '').trim();
            const year = getText(selectors.CSS_SELECTOR_YEAR);
            const make = getText(selectors.CSS_SELECTOR_MAKE);
            const model = getText(selectors.CSS_SELECTOR_MODEL);
            const trim = getText(selectors.CSS_SELECTOR_TRIM);
            const price = getText(selectors.CSS_SELECTOR_PRICE).replace(/[^0-9]/g, '');
            const mileage = getText(selectors.CSS_SELECTOR_MILEAGE).replace(/[^0-9]/g, '');
            const exteriorColor = getText(selectors.CSS_SELECTOR_EXTERIOR_COLOR);
            const interiorColor = getText(selectors.CSS_SELECTOR_INTERIOR_COLOR);
            const transmission = getText(selectors.CSS_SELECTOR_TRANSMISSION);
            const engine = getText(selectors.CSS_SELECTOR_ENGINE);
            const images = getAllAttributes(selectors.CSS_SELECTOR_IMAGES, 'href');
            const features = Array.from(document.querySelectorAll(selectors.CSS_SELECTOR_FEATURES)).map(el => el.innerText.trim());
            const comments = getText(selectors.CSS_SELECTOR_COMMENTS);

            return {
                stockNumber, vin, year, make, model, trim, price, mileage,
                exteriorColor, interiorColor, transmission, engine, images, features, comments
            };
        }, selectors);

        return vehicleData;

    } catch (error) {
        console.error(`[ERROR] Failed to scrape ${url}:`, error.message);
        if (page) {
            const errorPath = `d:/vehicle-vista-share/my-app/error-${new Date().toISOString().replace(/:/g, '-')}.png`;
            await page.screenshot({ path: errorPath, fullPage: true });
            console.log(`[DEBUG] Saved error screenshot to ${errorPath}`);
        }
        return null;
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
        if (existingBrowser === null && browser) {
            await browser.close();
        }
    }
}

async function getVehicleLinks(page) {
    return await page.evaluate((selector) => {
        const links = Array.from(document.querySelectorAll(selector));
        return links.map(link => link.href);
    }, selectors.CSS_SELECTOR_VEHICLE_LINKS);
}

async function getTotalPages(page) {
    try {
        const totalPages = await page.evaluate((selector) => {
            const totalPagesElement = document.querySelector(selector);
            return totalPagesElement ? parseInt(totalPagesElement.innerText, 10) : 1;
        }, selectors.CSS_SELECTOR_TOTAL_PAGES);
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
        await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2' });

        const totalPages = await getTotalPages(page);
        console.log(`[DEBUG] Total pages to scrape: ${totalPages}`);

        let allVehicleLinks = [];
        for (let i = 1; i <= totalPages; i++) {
            console.log(`[DEBUG] Getting links from page ${i} of ${totalPages}`);
            if (i > 1) {
                await page.goto(`${BASE_URL}?pg=${i}`, { waitUntil: 'networkidle2' });
            }
            const vehicleLinks = await getVehicleLinks(page);
            allVehicleLinks.push(...vehicleLinks);
        }
        
        console.log(`[DEBUG] Found a total of ${allVehicleLinks.length} vehicle links.`);

        let allVehicles = [];
        for (const link of allVehicleLinks) {
            const vehicleData = await scrapeVehicle(link, browser);
            if (vehicleData) {
                allVehicles.push(vehicleData);
            }
        }

        console.log(`[SUCCESS] Scraped a total of ${allVehicles.length} vehicles.`);
        fs.writeFileSync('d:/vehicle-vista-share/my-app/vehicle-data.json', JSON.stringify(allVehicles, null, 2));
        console.log('[SUCCESS] Vehicle data saved to vehicle-data.json');

        return allVehicles;

    } catch (error) {
        console.error('[ERROR] An error occurred during inventory scraping:', error);
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
    }
}

// Run the script
main();
