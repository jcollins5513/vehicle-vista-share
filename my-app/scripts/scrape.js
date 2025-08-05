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

        const frames = page.frames();
        const vehicleFrame = frames.find(f => f.url().includes('about:blank'));

        if (!vehicleFrame) {
            throw new Error('Could not find the vehicle data iframe.');
        }

        console.log('[DEBUG] Found vehicle frame. Starting patient polling for content...');
        let contentFound = false;
        for (let i = 0; i < 15; i++) { // Poll for up to 60 seconds (15 retries * 4s)
            await page.mouse.move(Math.random() * 200 + 50, Math.random() * 200 + 50); // Simulate activity
            contentFound = await vehicleFrame.evaluate(() => document.querySelector('div.vdp--mod') !== null);
            if (contentFound) {
                console.log('[DEBUG] Frame content found after polling.');
                break;
            }
            console.log(`[DEBUG] Content not found, polling again... (Attempt ${i + 1}/15)`);
            await new Promise(resolve => setTimeout(resolve, 4000));
        }

        if (!contentFound) {
            throw new Error('Vehicle content did not load in the iframe after patient polling.');
        }

        const vehicleData = await vehicleFrame.evaluate(() => {
            const vehicleElement = document.querySelector('div.vdp--mod');
            if (!vehicleElement) return null;

            const getAttribute = (el, attr, defaultValue = '') => el ? el.getAttribute(attr) || defaultValue : defaultValue;

            const getText = (selector, defaultValue = '') => {
                const element = document.querySelector(selector);
                return element ? (element.innerText || element.textContent || '').trim() : defaultValue;
            };

            const stockNumber = getAttribute(vehicleElement, 'data-stocknum');
            const vin = getAttribute(vehicleElement, 'data-vin');
            const year = getAttribute(vehicleElement, 'data-year');
            const make = getAttribute(vehicleElement, 'data-make');
            const model = getAttribute(vehicleElement, 'data-model');
            const trim = getAttribute(vehicleElement, 'data-trim');
            const price = getAttribute(vehicleElement, 'data-price');
            const mileage = getText('.mileage .value', 'N/A'); // Assuming mileage is in a .value element
            const exteriorColor = getAttribute(vehicleElement, 'data-extcolor');
            const interiorColor = getAttribute(vehicleElement, 'data-intcolor');
            const transmission = getAttribute(vehicleElement, 'data-trans');
            const engine = getAttribute(vehicleElement, 'data-engine');
            const images = Array.from(document.querySelectorAll('.hero-carousel__image')).map(img => img.src);
            const features = Array.from(document.querySelectorAll('.features-list li')).map(li => li.innerText.trim());
            const comments = getText('.vehicle-comments');

            return {
                stockNumber, vin, year, make, model, trim, price, mileage,
                exteriorColor, interiorColor, transmission, engine, images, features, comments
            };
        });

        return vehicleData;

    } catch (error) {
        console.error(`[ERROR] Failed to scrape ${url}:`, error.message);
        if (page) {
            const errorPath = `d:/vehicle-vista-share/my-app/error-${new Date().toISOString().replace(/:/g, '-')}`;
            await page.screenshot({ path: `${errorPath}.png`, fullPage: true });
            console.log(`[DEBUG] Saved error screenshot to ${errorPath}.png`);

            // Also save the iframe's HTML content for debugging
            const frames = page.frames();
            const vehicleFrame = frames.find(f => f.url().includes('about:blank'));
            if (vehicleFrame) {
                try {
                    const frameContent = await vehicleFrame.content();
                    fs.writeFileSync(`${errorPath}-frame.html`, frameContent);
                    console.log(`[DEBUG] Saved error iframe HTML to ${errorPath}-frame.html`);
                } catch (frameError) {
                    console.error('[ERROR] Could not get iframe content:', frameError.message);
                }
            }
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
