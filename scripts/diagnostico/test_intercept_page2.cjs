const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let captured = null;

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("_serverFn") && url.includes("payload=")) {
      try {
        const text = await res.text();
        // Check if it has 24 items
        if (text.includes("matched_similar")) {
          console.log("Captured _serverFn for page!");
          captured = text;
        }
      } catch (e) {}
    }
  });

  console.log("Acessando Massey Ferguson PÁGINA 2");
  await page.goto("https://redeparts.com.br/produtos?machineBrand=massey-ferguson&page=2", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });

  // Wait for the API call to complete
  let retries = 0;
  while (!captured && retries < 15) {
    await page.waitForTimeout(1000);
    retries++;
  }

  if (captured) {
    console.log("Captured API size:", captured.length);
  } else {
    console.log("Did not capture API response.");
  }

  await browser.close();
}

run();
