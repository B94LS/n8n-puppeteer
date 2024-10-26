const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json());

// Ruta básica de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ruta para capturar screenshot de una página
app.post('/screenshot', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: options.fullPage || false,
      ...options
    });

    await browser.close();

    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para extraer datos de una página
app.post('/scrape', async (req, res) => {
  try {
    const { url, selectors } = req.body;
    
    if (!url || !selectors) {
      return res.status(400).json({ 
        error: 'URL and selectors are required' 
      });
    }

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const data = {};
    for (const [key, selector] of Object.entries(selectors)) {
      data[key] = await page.$eval(selector, el => el.textContent.trim());
    }

    await browser.close();
    res.json(data);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
