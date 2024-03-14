const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Converts HTML content to a PDF buffer with advanced options and error handling.
 * 
 * @param {string} html The HTML content to convert. Can include external resources like images, CSS, etc.
 * @param {Object} options Configuration options for PDF generation and browser behavior.
 * @returns {Promise<Buffer>} A promise that resolves with the PDF buffer.
 * 
 * Options can include:
 * - puppeteerLaunchOptions: Options passed to puppeteer.launch() (e.g., headless, args).
 * - pdfOptions: Options passed to page.pdf() (e.g., format, margin).
 * - enableJavaScript: Boolean indicating if JavaScript should be enabled in the page.
 * - customHeaderFooter: HTML content for custom headers and footers.
 * - waitForNetworkIdle: Boolean indicating if conversion should wait for network to be idle.
 * - navigationTimeout: Maximum time in milliseconds to wait for the page navigation.
 * - onPageLoaded: An async function that executes additional page manipulations after content is loaded.
 */
async function convertHtmlToPdf(html, options = {}) {
    if (!html) {
        console.error('HTML content is required for conversion.');
        throw new Error('HTML content is required.');
    }

    // Destructure and set default options
    const {
        puppeteerLaunchOptions = {},
        pdfOptions = {},
        enableJavaScript = true,
        customHeaderFooter = '',
        waitForNetworkIdle = true,
        navigationTimeout = 30000,
        onPageLoaded = async () => {}, // Placeholder for custom page manipulation
    } = options;

    // Launch a browser instance with specified options
    const browser = await puppeteer.launch({
        headless: true, // Run in headless mode by default
        ...puppeteerLaunchOptions,
    });

    try {
        const page = await browser.newPage();

        // Set JavaScript enabled/disabled based on options
        await page.setJavaScriptEnabled(enableJavaScript);

        // Set navigation timeout
        page.setDefaultNavigationTimeout(navigationTimeout);

        // Set content with or without waiting for network to be idle
        const networkIdleOption = waitForNetworkIdle ? 'networkidle0' : undefined;
        await page.setContent(html, { waitUntil: networkIdleOption || 'load' });

        // Execute any custom page manipulations after content is loaded
        await onPageLoaded(page);

        // Add custom headers or footers if provided
        if (customHeaderFooter) {
            await page.evaluate(headerFooterHtml => {
                const headerFooter = document.createElement('div');
                headerFooter.innerHTML = headerFooterHtml;
                document.body.appendChild(headerFooter);
            }, customHeaderFooter);
        }

        // Generate PDF with specified options
        const pdfBuffer = await page.pdf({
            format: 'A4', // Default format
            printBackground: true, // Include background styles
            ...pdfOptions,
        });

        // Close the browser instance
        await browser.close();

        return pdfBuffer;
    } catch (error) {
        console.error('Failed to convert HTML to PDF:', error);
        await browser.close();
        throw error; // Rethrow the error after closing the browser
    }
}

module.exports = { convertHtmlToPdf };