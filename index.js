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
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Configurar viewport para captura
        await page.setViewport({
            width: 1280,
            height: 800
        });

        // Configurar User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navegar a la página
        await page.goto('https://www.ing.es/hipotecas', {
            waitUntil: 'networkidle0'
        });

        // Seleccionar la opción de operación
        await page.click(`input[name="operation"][value="${operationValue}"]`);

        // Click en el botón continuar
        await page.click('.next-button');

        // Esperar a que la página se actualice
        await page.waitForTimeout(2000); // Esperar a que se complete la transición

        // Tomar screenshot
        const screenshot = await page.screenshot({
            fullPage: true,
            encoding: 'base64'
        });

        return {
            status: 'success',
            screenshot: screenshot
        };

    } catch (error) {
        console.error('Error durante la simulación:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Endpoint para iniciar simulación
app.post('/simulate', async (req, res) => {
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
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
});
