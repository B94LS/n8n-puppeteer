const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function simulateINGMortgage(operationValue) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--disable-translate',
            '--metrics-recording-only',
            '--no-first-run',
            '--safebrowsing-disable-auto-update'
        ]
    });

    try {
        const page = await browser.newPage();
        
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const blockedResources = ['image', 'stylesheet', 'font', 'media'];
            if (blockedResources.includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.setDefaultNavigationTimeout(30000);
        await page.setDefaultTimeout(30000);
        
        await page.setViewport({
            width: 1200,  // Increased viewport size
            height: 800
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('Navegando a ING...');

        await page.goto('https://www.ing.es/hipotecas', {
            waitUntil: 'networkidle0'  // Changed to ensure full page load
        });

        console.log('Página cargada, esperando elementos del shadow DOM...');

        // Wait for the custom element to be present
        await page.waitForSelector('ing-mortgages-form');

        // New approach using shadow DOM and custom elements
        const radioButtonFound = await page.evaluate((value) => {
            // Helper function to get shadow root
            function getShadowRoot(element) {
                return element.shadowRoot;
            }

            // Get all mortgage forms
            const mortgageForms = document.querySelectorAll('ing-mortgages-form');
            
            for (const form of mortgageForms) {
                const shadowRoot = getShadowRoot(form);
                if (!shadowRoot) continue;

                // Look for radio inputs in the shadow DOM
                const radioInputs = shadowRoot.querySelectorAll('input[type="radio"]');
                for (const radio of radioInputs) {
                    if (radio.value === value) {
                        // Click the radio button
                        radio.click();
                        // Also dispatch change event
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
            }
            return false;
        }, operationValue);

        if (!radioButtonFound) {
            throw new Error('No se pudo encontrar el radio button en el shadow DOM');
        }

        console.log('Radio button encontrado y clickeado, buscando botón continuar...');

        // Wait a bit for any reactions to the radio button click
        await page.waitForTimeout(1000);

        // New approach for finding and clicking the continue button
        const buttonClicked = await page.evaluate(() => {
            function findButtonInShadowDOM(element) {
                const shadowRoot = element.shadowRoot;
                if (!shadowRoot) return null;

                // Look for button in different possible formats
                const button = shadowRoot.querySelector('button.next-button') ||
                             shadowRoot.querySelector('ing-button[type="submit"]') ||
                             shadowRoot.querySelector('[role="button"]');

                if (button) {
                    button.click();
                    return true;
                }
                return false;
            }

            const forms = document.querySelectorAll('ing-mortgages-form');
            for (const form of forms) {
                if (findButtonInShadowDOM(form)) return true;
            }
            return false;
        });

        if (!buttonClicked) {
            throw new Error('No se pudo encontrar o hacer click en el botón continuar');
        }

        // Wait for any transitions or loading states
        await page.waitForTimeout(2000);

        console.log('Tomando screenshot...');
        const screenshot = await page.screenshot({
            fullPage: false,
            encoding: 'base64'
        });

        return {
            status: 'success',
            screenshot: screenshot
        };

    } catch (error) {
        console.error('Error detallado:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    } finally {
        await browser.close();
    }
}

app.post('/simulate', async (req, res) => {
    console.log('Recibida petición:', req.body);
    
    try {
        const { operationValue } = req.body;
        
        if (!['0', '1', '2'].includes(operationValue)) {
            return res.status(400).json({
                status: 'error',
                message: 'operationValue debe ser "0", "1" o "2"'
            });
        }

        const result = await simulateINGMortgage(operationValue);
        res.json(result);
    } catch (error) {
        console.error('Error en endpoint:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            details: {
                timestamp: new Date().toISOString(),
                errorName: error.name
            }
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
});
