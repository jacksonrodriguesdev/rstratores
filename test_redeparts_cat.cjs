const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Acessando Massey Ferguson > Motor");
  await page.goto(
    "https://redeparts.com.br/produtos?machineBrand=massey-ferguson&category=motor&page=1",
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await page.waitForTimeout(5000);

  const html = await page.content();
  console.log("Size of HTML: " + html.length);

  const productLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href^="/pecas/"]')).map((a) => a.href);
  });

  console.log("Product links found: " + productLinks.length);
  if (productLinks.length > 0) {
    console.log("Sample: ", productLinks.slice(0, 3));
  }

  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((h) => h.includes("category="));
  });
  console.log("Category links found: ", [...new Set(allLinks)].slice(0, 10));

  await browser.close();
}

run();
