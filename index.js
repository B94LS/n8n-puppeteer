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
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        timeout: 60000 // Aumentamos timeout del navegador a 60s
    });

    try {
        const page = await browser.newPage();
        
        // Aumentar timeouts de navegación
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);
        
        console.log('Configurando página...');
        
        // Configurar viewport para captura
        await page.setViewport({
            width: 1280,
            height: 800
        });

        // Configurar User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Habilitar logs de consola del navegador
        page.on('console', msg => console.log('Browser console:', msg.text()));
        
        console.log('Navegando a ING...');

        // Navegar a la página con más opciones de espera
        await page.goto('https://www.ing.es/hipotecas', {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 60000
        });

        console.log('Página cargada, esperando elementos...');

        // Esperar a que los elementos estén disponibles
        await page.waitForSelector('input[name="operation"]', { timeout: 60000 });
        await page.waitForSelector('.next-button', { timeout: 60000 });

        console.log('Seleccionando opción:', operationValue);

        // Seleccionar la opción de operación
        await page.click(`input[name="operation"][value="${operationValue}"]`);

        console.log('Haciendo click en continuar...');

        // Click en el botón continuar
        await page.click('.next-button');

        // Esperar a que la página se actualice
        await page.waitForTimeout(5000); // Aumentamos el tiempo de espera después del click

        console.log('Tomando screenshot...');

        // Tomar screenshot
        const screenshot = await page.screenshot({
            fullPage: true,
            encoding: 'base64'
        });

        console.log('Proceso completado exitosamente');

        return {
            status: 'success',
            screenshot: screenshot
        };

    } catch (error) {
        console.error('Error detallado durante la simulación:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        throw new Error(`Error en la simulación: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Endpoint para iniciar simulación
app.post('/simulate', async (req, res) => {
    console.log('Recibida petición de simulación:', req.body);
    
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
        console.error('Error en endpoint simulate:', error);
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

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString() 
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port} - ${new Date().toISOString()}`);
});
