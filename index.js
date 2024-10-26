const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json());

// Configuración global de puppeteer
const browserOptions = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920x1080'
  ],
  headless: "new",  // Usar el nuevo modo headless
  defaultViewport: { width: 1920, height: 1080 }
};

// Pool de navegadores
let browserPool = [];
const MAX_POOL_SIZE = 2;

async function getBrowser() {
  try {
    // Intentar reutilizar un navegador existente
    const browser = browserPool.pop();
    if (browser) {
      try {
        // Verificar si el navegador aún está utilizable
        await browser.version();
        return browser;
      } catch (e) {
        // Si el navegador está muerto, crear uno nuevo
        console.log('Browser from pool is dead, launching new one');
        return await puppeteer.launch(browserOptions);
      }
    }
    // Si no hay navegadores disponibles, crear uno nuevo
    return await puppeteer.launch(browserOptions);
  } catch (error) {
    console.error('Error launching browser:', error);
    throw error;
  }
}

async function releaseBrowser(browser) {
  try {
    // Si hay espacio en el pool, guardar el navegador para reutilizar
    if (browserPool.length < MAX_POOL_SIZE) {
      browserPool.push(browser);
    } else {
      await browser.close();
    }
  } catch (error) {
    console.error('Error releasing browser:', error);
  }
}

// Ruta básica de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', poolSize: browserPool.length });
});

// Ruta para capturar screenshot de una página
app.post('/screenshot', async (req, res) => {
  const browser = await getBrowser();
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(15000); // 15 segundos timeout
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: options.fullPage || false,
      ...options
    });

    await page.close();
    await releaseBrowser(browser);

    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    console.error('Screenshot error:', error);
    await browser.close(); // En caso de error, cerrar el navegador
    res.status(500).json({ error: error.message });
  }
});

// Ruta para extraer datos de una página
app.post('/scrape', async (req, res) => {
  const browser = await getBrowser();
  try {
    const { url, selectors } = req.body;
    
    if (!url || !selectors) {
      return res.status(400).json({ 
        error: 'URL and selectors are required' 
      });
    }

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(15000); // 15 segundos timeout
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Cambiar a domcontentloaded para más velocidad
      timeout: 15000 
    });
    
    const data = {};
    for (const [key, selector] of Object.entries(selectors)) {
      try {
        data[key] = await page.$eval(selector, el => el.textContent.trim());
      } catch (e) {
        data[key] = null; // Si no se encuentra el selector, devolver null
      }
    }

    await page.close();
    await releaseBrowser(browser);
    res.json(data);
  } catch (error) {
    console.error('Scraping error:', error);
    await browser.close(); // En caso de error, cerrar el navegador
    res.status(500).json({ error: error.message });
  }
});

// Limpieza del pool cada hora
setInterval(async () => {
  console.log('Cleaning browser pool...');
  while (browserPool.length > 0) {
    const browser = browserPool.pop();
    await browser.close();
  }
}, 3600000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Limpieza en el cierre
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, cleaning up...');
  while (browserPool.length > 0) {
    const browser = browserPool.pop();
    await browser.close();
  }
  process.exit(0);
});
