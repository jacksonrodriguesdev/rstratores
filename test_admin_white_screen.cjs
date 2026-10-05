const { chromium } = require('playwright');

async function run() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Simulate login so we stay on /admin instead of redirecting
    console.log('Navigating to http://localhost:8080/ (to set localStorage)...');
    await page.goto('http://localhost:8080/');
    await page.evaluate(() => {
      localStorage.setItem('rs-trator-auth', '1');
    });
    
    console.log('Navigating to http://localhost:8080/admin ...');
    await page.goto('http://localhost:8080/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    await page.waitForTimeout(3000);
    
    const url = page.url();
    console.log('Final URL:', url);
    
    const rootHtml = await page.innerHTML('body');
    console.log('Body HTML length:', rootHtml.length);
    
    await browser.close();
  } catch(e) {
    console.error('Script Error:', e);
  }
}
run();
