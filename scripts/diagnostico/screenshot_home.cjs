const { chromium } = require('playwright');

async function run() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    console.log('Navigating to http://localhost:8080/ ...');
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'home_screenshot.png' });
    console.log('Screenshot saved to home_screenshot.png');
    
    await browser.close();
  } catch(e) {
    console.error('Script Error:', e);
  }
}
run();
