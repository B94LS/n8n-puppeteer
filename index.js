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
            // Optimizaciones adicionales
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
        
        // Optimizar rendimiento
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Bloquear recursos innecesarios
            const blockedResources = ['image', 'stylesheet', 'font', 'media'];
            if (blockedResources.includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.setDefaultNavigationTimeout(30000);
        await page.setDefaultTimeout(30000);

        // Configurar viewport mínimo
        await page.setViewport({
            width: 800,
            height: 600
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('Navegando a ING...');

        await page.goto('https://www.ing.es/hipotecas', {
            waitUntil: 'domcontentloaded' // Solo esperar al DOM
        });

        console.log('Página cargada, buscando elementos...');

        // Intentar diferentes estrategias para encontrar el radio button
        const radioButton = await page.evaluate((value) => {
            // Intentar diferentes selectores
            const selectors = [
                `input[name="operation"][value="${value}"]`,
                `#ing-radio-${value}`,
                `input[type="radio"][value="${value}"]`,
                // Buscar por el contenedor del form
                `form input[type="radio"][value="${value}"]`,
                // Buscar por atributos aria
                `[aria-labelledby^="label-ing-radio-"][value="${value}"]`
            ];

            for (let selector of selectors) {
                const element = document.querySelector(selector);
                if (element) return true;
            }
            return false;
        }, operationValue);

        if (!radioButton) {
            throw new Error('No se pudo encontrar el radio button - estructura de página posiblemente cambiada');
        }

        console.log('Elemento encontrado, realizando click...');

        // Hacer click usando JavaScript
        await page.evaluate((value) => {
            const radio = document.querySelector(`input[value="${value}"]`);
            if (radio) {
                radio.click();
                return true;
            }
            return false;
        }, operationValue);

        console.log('Buscando botón continuar...');

        // Buscar el botón de diferentes formas
        const continueButton = await page.evaluate(() => {
            const selectors = [
                '.next-button',
                'ing-button[type="submit"]',
                'button:has-text("Continuar")',
                '[role="button"]:has-text("Continuar")'
            ];

            for (let selector of selectors) {
                const element = document.querySelector(selector);
                if (element) return true;
            }
            return false;
        });

        if (!continueButton) {
            throw new Error('No se pudo encontrar el botón continuar');
        }

        // Click en continuar usando JavaScript
        await page.evaluate(() => {
            const button = document.querySelector('.next-button');
            if (button) button.click();
        });

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
