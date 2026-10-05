const { chromium } = require('playwright');

async function run() {
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    
    const page = await context.newPage();
    page.on('console', msg => console.log('PAGE LOG [' + msg.type() + ']:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('request', req => console.log('REQUEST:', req.url()));
    
    console.log('Navigating to /admin ...');
    await page.goto('http://localhost:8080/admin', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(5000);
    
    await browser.close();
  } catch(e) {
    console.error('Script Error:', e);
  }
}
run();
