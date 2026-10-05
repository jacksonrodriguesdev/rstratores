const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    console.log('STACK:', error.stack);
  });
  await page.goto('http://localhost:8080/loja', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await browser.close();
})();
