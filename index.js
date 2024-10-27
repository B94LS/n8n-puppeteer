const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function completarFormularioING() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/google-chrome-stable',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    page.setDefaultNavigationTimeout(120000); // Timeout aumentado
    page.setDefaultTimeout(120000);
    
    // Usar un User-Agent para evitar detecciones
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36');

    await page.goto('https://www.ing.es/hipotecas', {
      waitUntil: 'networkidle0',
      timeout: 120000
    });

    // Espera adicional para cargar contenido dinámico
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshot.png', fullPage: true }); // Para diagnóstico
    
    await page.waitForSelector('input[type="radio"]', { timeout: 120000 });
    
    const radioButtons = await page.$$('input[type="radio"]');
    for (const radioButton of radioButtons) {
      const label = await radioButton.evaluateHandle(el => el.closest('label').textContent.trim());
      const labelText = await label.jsonValue();
      if (labelText.includes('Comprar una casa')) {
        await radioButton.click();
        break;
      }
    }

    await page.click('button:has-text("Continuar")');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
    
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
    if (browser) await browser.close();
  }
}
