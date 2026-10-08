// Captura as telas do passo a passo em agropartsuy.com (celular, 3x).
// Uso: node marketing/como_funciona/capturar_telas.cjs [url do site]
const path = require("path");
const { chromium } = require(path.join(process.cwd(), "node_modules/playwright"));
const B = process.argv[2] || "https://agropartsuy.com";
const OUT = path.join(process.cwd(), "marketing/como_funciona/telas");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const ir = async (u) => { await p.goto(B + u, { waitUntil: "networkidle", timeout: 120000 }); await p.waitForTimeout(2500); };
  const foto = (n) => p.screenshot({ path: path.join(OUT, n + ".png") });

  // 1. Busca com sugestões (digitando o código)
  await ir("/");
  await p.locator("#busca-header input").fill("055119");
  await p.waitForTimeout(3500);
  await foto("01_busca");

  // 2. Página do produto
  await ir("/produto/055119DELPHI");
  await foto("02_produto");

  // 3. Cotização (carrinho) aberta com 3 peças
  for (const sku of ["055119DELPHI", "1329214C1CNH", "85026700LUK"]) {
    await ir("/produto/" + sku);
    await p.getByRole("button", { name: /Agregar a mi cotización|En tu cotización/ }).first().click();
    await p.waitForTimeout(1200);
    await p.keyboard.press("Escape").catch(() => {});
    await p.locator('button[aria-label="Cerrar"]').first().click().catch(() => {});
  }
  await p.locator('nav[aria-label="Navegación principal"] button', { hasText: "Carrito" }).click();
  await p.waitForTimeout(1500);
  await foto("03_cotizacion");

  // 4. Categorias (barra inferior)
  await ir("/");
  await p.locator('nav[aria-label="Navegación principal"] button', { hasText: "Categorías" }).click();
  await p.waitForTimeout(1500);
  await foto("04_categorias");

  // 5. Loja filtrada por marca
  await ir("/loja?marca=Massey%20Ferguson");
  await foto("05_marca");

  // 6. Pedido rápido com resultado
  await ir("/pedido-rapido");
  await p.fill("#lista", "AL81843\n2x 055119\n1329214C1\n3x 85026700");
  await p.click("text=Buscar códigos");
  await p.waitForSelector("text=Encontramos", { timeout: 60000 });
  await p.waitForTimeout(1200);
  await p.evaluate(() => scrollTo(0, 330));
  await p.waitForTimeout(600);
  await foto("06_pedido_rapido");

  // 7. Home (topo)
  await ir("/");
  await foto("07_home");
  await b.close();
})();
