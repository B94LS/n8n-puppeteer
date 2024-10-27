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
        
        // Aumentar timeouts
        await page.setDefaultNavigationTimeout(60000); // 60 segundos
        await page.setDefaultTimeout(60000);

        // Optimizar carga de recursos
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const blockedResources = ['image', 'stylesheet', 'font', 'media'];
            if (blockedResources.includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Configurar viewport
        await page.setViewport({
            width: 1200,
            height: 800
        });

        // Configurar headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-ES,es;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('Navegando a ING...');

        // Implementar retry logic para la navegación
        let retries = 3;
        let loaded = false;
        
        while (retries > 0 && !loaded) {
            try {
                await page.goto('https://www.ing.es/hipotecas', {
                    waitUntil: ['domcontentloaded', 'networkidle2'],
                    timeout: 45000
                });
                loaded = true;
            } catch (error) {
                console.log(`Intento fallido ${4 - retries}/3. Error: ${error.message}`);
                retries--;
                if (retries === 0) throw error;
                await page.waitForTimeout(2000); // Esperar antes de reintentar
            }
        }

        console.log('Página cargada, esperando elementos críticos...');

        // Esperar a que aparezcan elementos críticos con retry
        async function waitForElementWithRetry(selector, maxRetries = 3) {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await page.waitForSelector(selector, {
                        timeout: 20000
                    });
                    return true;
                } catch (error) {
                    if (i === maxRetries - 1) throw error;
                    await page.waitForTimeout(1000);
                }
            }
            return false;
        }

        await waitForElementWithRetry('ing-mortgages-form');

        // Verificar que la página está realmente cargada
        const isPageLoaded = await page.evaluate(() => {
            return document.readyState === 'complete' && 
                   !!document.querySelector('ing-mortgages-form');
        });

        if (!isPageLoaded) {
            throw new Error('La página no se cargó completamente');
        }

        console.log('Elementos críticos encontrados, procediendo con la interacción...');

        // Intentar interactuar con el radio button
        const radioButtonFound = await page.evaluate((value) => {
            return new Promise((resolve) => {
                function attemptInteraction() {
                    function getShadowRoot(element) {
                        return element.shadowRoot;
                    }

                    const mortgageForms = document.querySelectorAll('ing-mortgages-form');
                    
                    for (const form of mortgageForms) {
                        const shadowRoot = getShadowRoot(form);
                        if (!shadowRoot) continue;

                        const radioInputs = shadowRoot.querySelectorAll('input[type="radio"]');
                        for (const radio of radioInputs) {
                            if (radio.value === value) {
                                radio.click();
                                radio.dispatchEvent(new Event('change', { bubbles: true }));
                                return true;
                            }
                        }
                    }
                    return false;
                }

                // Intentar varias veces con un pequeño retraso
                let attempts = 0;
                const maxAttempts = 5;
                
                function tryClick() {
                    if (attempts >= maxAttempts) {
                        resolve(false);
                        return;
                    }
                    
                    if (attemptInteraction()) {
                        resolve(true);
                    } else {
                        attempts++;
                        setTimeout(tryClick, 1000);
                    }
                }

                tryClick();
            });
        }, operationValue);

        if (!radioButtonFound) {
            throw new Error('No se pudo encontrar o interactuar con el radio button en el shadow DOM');
        }

        await page.waitForTimeout(2000);

        // Intentar hacer click en el botón continuar
        const buttonClicked = await page.evaluate(() => {
            return new Promise((resolve) => {
                function findAndClickButton() {
                    function findButtonInShadowDOM(element) {
                        const shadowRoot = element.shadowRoot;
                        if (!shadowRoot) return null;

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
                }

                let attempts = 0;
                const maxAttempts = 5;
                
                function tryClick() {
                    if (attempts >= maxAttempts) {
                        resolve(false);
                        return;
                    }
                    
                    if (findAndClickButton()) {
                        resolve(true);
                    } else {
                        attempts++;
                        setTimeout(tryClick, 1000);
                    }
                }

                tryClick();
            });
        });

        if (!buttonClicked) {
            throw new Error('No se pudo encontrar o hacer click en el botón continuar');
        }

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
