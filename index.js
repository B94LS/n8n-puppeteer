const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function completarFormularioING() {
  let browser;
  try {
    // Configuración actualizada para usar Chrome preinstalado
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/google-chrome-stable',  // Ruta en la imagen de Puppeteer
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ],
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    
    // Añadir logging para debug
    console.log('Navegador iniciado correctamente');
    
    await page.setViewport({ width: 1280, height: 800 });
    page.setDefaultNavigationTimeout(60000); // Aumentamos el timeout a 60 segundos
    page.setDefaultTimeout(60000);

    // Log de navegación
    console.log('Intentando navegar a ING...');
    
    await page.goto('https://www.ing.es/hipotecas', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('Página cargada correctamente');

    await page.waitForSelector('input[type="radio"]', { timeout: 60000 });
    console.log('Selector de radio encontrado');

    const radioButtons = await page.$$('input[type="radio"]');
    for (const radioButton of radioButtons) {
      const label = await radioButton.evaluateHandle(el => 
        el.closest('label').textContent.trim()
      );
      const labelText = await label.jsonValue();
      
      if (labelText.includes('Comprar una casa')) {
        await radioButton.click();
        console.log('Opción "Comprar una casa" seleccionada');
        break;
      }
    }

    await page.waitForTimeout(1000);
    
    console.log('Intentando hacer clic en Continuar...');
    await page.click('button:has-text("Continuar")');
    
    await page.waitForNavigation({ 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    console.log('Navegación completada');

    return {
      success: true,
      message: 'Formulario completado exitosamente'
    };

  } catch (error) {
    console.error('Error detallado:', error);
    return {
      success: false,
      error: `${error.message}\nStack: ${error.stack}`
    };
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navegador cerrado');
    }
  }
}

// Endpoint raíz
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Endpoint para completar el formulario
app.post('/complete-form', async (req, res) => {
  console.log('Recibida petición para completar formulario');
  try {
    const result = await completarFormularioING();
    console.log('Resultado:', result);
    res.json(result);
  } catch (error) {
    console.error('Error en el endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Manejador de errores general
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: err.message
  });
});

// Iniciar el servidor
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
