const { chromium } = require('playwright');

async function run() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    console.log('Navigating to http://localhost:8081/ ...');
    await page.goto('http://localhost:8081/');
    await page.evaluate(() => localStorage.setItem('rs-trator-auth', '1'));
    
    console.log('Navigating to http://localhost:8081/admin ...');
    await page.goto('http://localhost:8081/admin', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'admin_screenshot_8081.png' });
    console.log('Screenshot saved to admin_screenshot_8081.png');
    
    await browser.close();
  } catch(e) {
    console.error('Script Error:', e);
  }
}
run();
