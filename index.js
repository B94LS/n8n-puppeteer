const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
// Asegurarnos de usar el puerto de Render
const port = process.env.PORT || 3000;

app.use(express.json());

async function completarFormularioING() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    await page.goto('https://www.ing.es/hipotecas', {
      waitUntil: 'networkidle0'
    });

    await page.waitForSelector('input[type="radio"]');

    const radioButtons = await page.$$('input[type="radio"]');
    for (const radioButton of radioButtons) {
      const label = await radioButton.evaluateHandle(el => 
        el.closest('label').textContent.trim()
      );
      const labelText = await label.jsonValue();
      
      if (labelText.includes('Comprar una casa')) {
        await radioButton.click();
        break;
      }
    }

    await page.waitForTimeout(1000);
    await page.click('button:has-text("Continuar")');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    return {
      success: true,
      message: 'Formulario completado exitosamente'
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Endpoint raíz para verificar que el servicio está en funcionamiento
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Endpoint para completar el formulario
app.post('/complete-form', async (req, res) => {
  try {
    const result = await completarFormularioING();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manejador de errores general
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Iniciar el servidor y loguear cuando esté listo
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Health check available at: http://0.0.0.0:${port}/health`);
});

// Manejar el cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
