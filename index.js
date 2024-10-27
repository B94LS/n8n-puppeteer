const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Función para manejar el formulario de ING
async function completarFormularioING() {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome'
    });

    const page = await browser.newPage();

    // Navegar a la página
    await page.goto('https://www.ing.es/hipotecas', {
      waitUntil: 'networkidle0'
    });

    // Esperar a que aparezca el formulario
    await page.waitForSelector('input[type="radio"]');

    // Seleccionar "Comprar una casa"
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

    // Esperar un momento para asegurarnos de que la selección se registró
    await page.waitForTimeout(1000);

    // Hacer clic en el botón "Continuar"
    await page.click('button:has-text("Continuar")');

    // Esperar a que se cargue la siguiente página
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Cerrar el navegador
    await browser.close();

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
  }
}

// Endpoint para el health check
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

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
