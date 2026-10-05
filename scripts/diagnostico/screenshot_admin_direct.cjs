const { chromium } = require('playwright');

async function run() {
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    
    const page = await context.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    console.log('Navigating to /login to set auth...');
    await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.setItem('rs-trator-auth', '1'));
    
    console.log('Navigating to /admin ...');
    await page.goto('http://localhost:8080/admin', { waitUntil: 'domcontentloaded' });
    
    console.log('Waiting 30 seconds for React hydration / Vite compilation...');
    await page.waitForTimeout(30000);
    
    await page.screenshot({ path: 'admin_direct_screenshot.png' });
    console.log('Screenshot saved to admin_direct_screenshot.png');
    
    await browser.close();
  } catch(e) {
    console.error('Script Error:', e);
  }
}
run();
