const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("_serverFn") && response.request().method() === "GET") {
      try {
        const text = await response.text();
        // TanStack Start SuperJSON format usually starts with JSON
        if (text.includes('"marca"') || text.includes("codigo") || text.includes("descricao")) {
          console.log("=== ENCONTRADO DADOS DA API ===");
          console.log(text.substring(0, 1500)); // Print snippet to see structure
        }
      } catch (e) {}
    }
  });

  console.log("Carregando uma peça exata na Redeparts...");
  // Let's load the main products page and click the first product
  await page.goto("https://redeparts.com.br/produtos", { waitUntil: "networkidle" });

  // Wait for product links to appear
  await page.waitForTimeout(3000);
  const links = await page.$$('a[href^="/produtos/"]');
  if (links.length > 0) {
    console.log("Acessando o produto:", await links[0].getAttribute("href"));
    await links[0].click();
    await page.waitForTimeout(5000); // Wait for product details API call
  } else {
    console.log("Nenhum link de produto encontrado.");
  }

  await browser.close();
}

main().catch(console.error);
