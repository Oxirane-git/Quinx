const { chromium } = require('playwright');
const { logger } = require('./utils');

async function launchBrowser() {
    const headless = process.env.HEADLESS !== 'false';

    logger.info(`Launching Playwright (headless: ${headless})`);

    const browser = await chromium.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1366,768',
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        javaScriptEnabled: true,
        bypassCSP: true,
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    return { browser, context, page };
}

async function closeBrowser(browser) {
    if (browser) {
        logger.info('Closing browser gracefully');
        await browser.close();
    }
}

module.exports = {
    launchBrowser,
    closeBrowser
};
