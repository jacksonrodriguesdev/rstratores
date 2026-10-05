const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/loja', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'loja_screenshot.png', fullPage: true });
  await browser.close();
})();
