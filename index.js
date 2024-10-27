const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Función para manejar el formulario de ING
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
    
    // Configurar el viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Configurar timeout más largo para entornos de rendimiento variable
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    // Navegar a la página
    await page.goto('https://www.ing.es/hipotecas', {
      waitUntil: 'networkidle0'
    });

    // Resto del código igual...
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

// Resto del código igual...
