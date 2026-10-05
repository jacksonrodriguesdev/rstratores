const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);

/**
 * Script de reconhecimento: mapeia todas as subcategorias (filtros "category=")
 * disponíveis no site da Redeparts para uma marca específica.
 */
async function mapearCategorias(marca, machineBrandSlug) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`\n🔍 Mapeando subcategorias para: ${marca} (${machineBrandSlug})`);
  console.log("=".repeat(60));

  try {
    await page.goto(`https://redeparts.com.br/produtos?machineBrand=${machineBrandSlug}&page=1`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForTimeout(4000);

    // Extrair todas as subcategorias do filtro lateral
    const categorias = await page.evaluate(() => {
      const resultado = [];

      // Busca links de categorias nos filtros
      const links = Array.from(document.querySelectorAll('a[href*="category="]'));
      for (const link of links) {
        const href = link.href;
        const match = href.match(/category=([^&]+)/);
        if (match) {
          resultado.push({
            slug: match[1],
            texto: link.innerText.trim(),
            href: href
          });
        }
      }

      // Busca botões e inputs de filtro também
      const buttons = Array.from(document.querySelectorAll('button, [role="checkbox"], [role="option"], label'));
      for (const btn of buttons) {
        const text = btn.innerText.trim();
        if (text && !resultado.find(r => r.texto === text)) {
          // Pode ser um filtro de categoria sem link direto
        }
      }

      return resultado;
    });

    if (categorias.length > 0) {
      console.log(`\n✅ Encontradas ${categorias.length} subcategorias para ${marca}:\n`);
      const uniqueCats = [...new Map(categorias.map(c => [c.slug, c])).values()];
      for (const cat of uniqueCats) {
        console.log(`  📂 ${cat.texto.padEnd(30)} → category=${cat.slug}`);
      }
      return uniqueCats;
    }

    // Se não encontrou por links, tenta pegar do HTML do filtro lateral
    console.log("⚠️  Não encontrou links diretos de categoria. Tentando extrair do filtro lateral...");
    
    const filtroData = await page.evaluate(() => {
      const allText = document.body.innerText;
      // Procura a seção de categorias no texto da página
      const secaoCat = allText.match(/Categori[as]*[\s\S]*?(?=Marca|$)/i);
      return secaoCat ? secaoCat[0].substring(0, 2000) : "Não encontrado";
    });
    console.log("Conteúdo do filtro:", filtroData);

    // Tenta acessar o HTML inteiro para análise
    const html = await page.content();
    const catMatches = html.match(/category=([a-z0-9-]+)/g) || [];
    const uniqueSlugs = [...new Set(catMatches.map(m => m.replace("category=", "")))];
    
    if (uniqueSlugs.length > 0) {
      console.log(`\n✅ Encontrados ${uniqueSlugs.length} slugs de categoria no HTML:\n`);
      for (const slug of uniqueSlugs) {
        console.log(`  📂 category=${slug}`);
      }
      return uniqueSlugs.map(s => ({ slug: s, texto: s }));
    }

    console.log("❌ Nenhuma subcategoria encontrada no HTML.");
    return [];

  } catch (err) {
    console.error(`Erro: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("🚜 MAPEADOR DE SUBCATEGORIAS - REDEPARTS");
  console.log("=========================================\n");

  // Mapear categorias para Valtra e New Holland
  const valtraCats = await mapearCategorias("Valtra", "valtra");
  const nhCats = await mapearCategorias("New Holland", "new-holland");

  console.log("\n\n📊 RESUMO FINAL:");
  console.log("=".repeat(60));
  console.log(`Valtra:      ${valtraCats.length} subcategorias`);
  console.log(`New Holland: ${nhCats.length} subcategorias`);
  
  // Salva resultado em JSON para uso posterior
  const fs = require("fs");
  const resultado = { valtra: valtraCats, newHolland: nhCats };
  fs.writeFileSync("categorias_redeparts.json", JSON.stringify(resultado, null, 2));
  console.log("\n💾 Resultado salvo em categorias_redeparts.json");
}

main();
