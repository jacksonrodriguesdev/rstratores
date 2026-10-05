const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
const fs = require("fs");

/**
 * Script V2: Intercepta a API _serverFn da Redeparts para descobrir
 * os slugs de subcategorias disponíveis para cada marca.
 */
async function interceptarCategorias(marca, machineBrandSlug) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiResponses = [];

  // Interceptar TODAS as respostas da API _serverFn
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("_serverFn")) {
      try {
        const text = await response.text();
        apiResponses.push({ url, text });
      } catch (e) {}
    }
  });

  console.log(`\n🔍 Interceptando API para: ${marca} (${machineBrandSlug})`);
  console.log("=".repeat(60));

  try {
    await page.goto(`https://redeparts.com.br/produtos?machineBrand=${machineBrandSlug}&page=1`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForTimeout(5000);

    console.log(`📡 Capturadas ${apiResponses.length} respostas da API _serverFn`);

    // Analisar cada resposta para encontrar categorias
    let categorias = [];
    let totalProdutos = 0;

    for (const resp of apiResponses) {
      // Buscar campo "categories" no JSON
      const catMatches = resp.text.match(/"categories"[\s\S]*?\[([^\]]*(?:\[[^\]]*\])*[^\]]*)\]/);
      
      // Busca padrão mais genérica por pares value/count
      const valueCountPairs = [];
      const regex = /"s":"([^"]+)"\},\{"t":0,"s":(\d+)/g;
      let match;
      while ((match = regex.exec(resp.text)) !== null) {
        valueCountPairs.push({ value: match[1], count: parseInt(match[2]) });
      }

      // Identificar se esta resposta contém dados de categorias
      // As categorias da Redeparts são strings como "TRATORES MASSEY FERGUSON", "COLHEITADEIRAS NEW HOLLAND", etc.
      const catKeywords = [
        "TRATORES", "COLHEITADEIRAS", "VALTRA", "VALMET", "NEW HOLLAND", 
        "JOHN DEERE", "MASSEY", "CASE", "PLATAFORMAS", "PULVERIZADORES",
        "RETENTORES", "ROLAMENTOS", "TECFIL", "FILTROS", "DANA",
        "CORREIAS", "EMBREAGEM", "PEÇAS", "PECAS", "IMPORTADO",
        "OPTIBELT", "BOSCH", "PARKER", "EATON", "ZF", "CARRARO",
        "MWM", "PERKINS", "LIVRE", "KOYO", "KS", "FERSA", "FORTLUZ",
        "AGRALE", "FORD", "JCB", "CATERPILLAR", "SEMEATO", "STARA",
        "GTS", "KAISER", "PIGOZZI", "SACHS", "SCHUMACHER", "DONALDSON",
        "BORG WARNER", "CNH", "FASTER"
      ];

      for (const pair of valueCountPairs) {
        const isCategory = catKeywords.some(kw => pair.value.toUpperCase().includes(kw));
        if (isCategory && pair.count > 5) {
          categorias.push(pair);
        }
      }

      // Buscar total de produtos
      const totalMatch = resp.text.match(/"total"[\s\S]*?"s":(\d+)/);
      if (totalMatch) {
        totalProdutos = Math.max(totalProdutos, parseInt(totalMatch[1]));
      }
      
      // Tentar extrair total de outro formato
      const hitsTotalMatch = resp.text.match(/"hits"[\s\S]*?"total"[\s\S]*?(\d{3,})/);
      if (hitsTotalMatch) {
        totalProdutos = Math.max(totalProdutos, parseInt(hitsTotalMatch[1]));
      }
    }

    // Agora vamos testar slugs de categorias possíveis via URL
    // A Redeparts parece usar o campo "category" na URL como slug
    console.log(`\n📊 Total de produtos no site para ${marca}: ${totalProdutos}`);
    
    // Remover duplicatas e ordenar por contagem
    const uniqueCats = [...new Map(categorias.map(c => [c.value, c])).values()];
    uniqueCats.sort((a, b) => b.count - a.count);

    console.log(`\n✅ ${uniqueCats.length} categorias/subcategorias encontradas:`);
    for (const cat of uniqueCats) {
      console.log(`  📂 ${cat.value.padEnd(40)} (${cat.count} itens)`);
    }

    // Agora vamos tentar clicar nos filtros de categorias na página para ver os slugs reais
    console.log("\n🔍 Tentando descobrir slugs via filtros da página...");
    
    // Buscar todos os checkboxes/botões de filtro visíveis
    const filtrosVisiveis = await page.evaluate(() => {
      const resultado = [];
      
      // Tentar encontrar o container de filtros
      const allElements = document.querySelectorAll('button, label, [role="checkbox"], [data-state], input[type="checkbox"]');
      for (const el of allElements) {
        const text = el.innerText?.trim() || el.textContent?.trim() || "";
        const dataState = el.getAttribute("data-state");
        const ariaChecked = el.getAttribute("aria-checked");
        if (text.length > 2 && text.length < 60) {
          resultado.push({
            tag: el.tagName,
            text: text,
            dataState: dataState,
            ariaChecked: ariaChecked,
            classes: el.className?.substring(0, 100),
          });
        }
      }
      return resultado;
    });

    console.log(`\n🎛️  Elementos de filtro encontrados na página: ${filtrosVisiveis.length}`);
    for (const f of filtrosVisiveis.slice(0, 30)) {
      console.log(`  [${f.tag}] ${f.text} (state: ${f.dataState}, checked: ${f.ariaChecked})`);
    }

    // Salvar dump da API para análise mais profunda
    fs.writeFileSync(`api_dump_${machineBrandSlug}.json`, JSON.stringify(apiResponses, null, 2));
    console.log(`\n💾 API dump salvo em api_dump_${machineBrandSlug}.json`);

    return { categorias: uniqueCats, totalProdutos };

  } catch (err) {
    console.error(`Erro: ${err.message}`);
    return { categorias: [], totalProdutos: 0 };
  } finally {
    await browser.close();
  }
}

// Função para testar se um slug de category funciona na URL
async function testarSlugs(machineBrandSlug, possiveisSlugs) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const slugsValidos = [];

  for (const slug of possiveisSlugs) {
    try {
      let totalCapturado = 0;
      
      page.on("response", async (response) => {
        if (response.url().includes("_serverFn") && response.url().includes("payload")) {
          try {
            const text = await response.text();
            const totalMatch = text.match(/"total"[\s\S]*?"s":(\d+)/);
            if (totalMatch) totalCapturado = parseInt(totalMatch[1]);
          } catch(e) {}
        }
      });

      const url = `https://redeparts.com.br/produtos?machineBrand=${machineBrandSlug}&category=${slug}&page=1`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(3000);

      const count = await page.evaluate(() => {
        return document.querySelectorAll('a[href^="/pecas/"]').length;
      });

      if (count > 0) {
        console.log(`  ✅ category=${slug} → ${count} produtos na página (total: ${totalCapturado})`);
        slugsValidos.push({ slug, countPage: count, total: totalCapturado });
      } else {
        console.log(`  ❌ category=${slug} → sem resultados`);
      }
    } catch(e) {
      console.log(`  ⚠️  category=${slug} → erro: ${e.message}`);
    }
  }

  await browser.close();
  return slugsValidos;
}

async function main() {
  console.log("🚜 MAPEADOR AVANÇADO DE SUBCATEGORIAS V2 - REDEPARTS");
  console.log("=====================================================\n");

  // Passo 1: Interceptar API para Valtra
  const valtraData = await interceptarCategorias("Valtra", "valtra");

  // Passo 2: Interceptar API para New Holland  
  const nhData = await interceptarCategorias("New Holland", "new-holland");

  // Passo 3: Gerar slugs possíveis a partir dos nomes de categorias encontrados
  // Padrão de slug da Redeparts: lowercase, espaços viram hífens, sem acentos
  function gerarSlug(nome) {
    return nome.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  // Gerar lista de slugs candidatos para testar
  const todosNomes = new Set();
  for (const cat of [...valtraData.categorias, ...nhData.categorias]) {
    todosNomes.add(cat.value);
  }

  const slugsCandidatos = [...todosNomes].map(nome => ({
    nome: nome,
    slug: gerarSlug(nome)
  }));

  console.log("\n\n📋 SLUGS CANDIDATOS PARA TESTE:");
  console.log("=".repeat(60));
  for (const s of slugsCandidatos) {
    console.log(`  ${s.nome.padEnd(40)} → ${s.slug}`);
  }

  // Passo 4: Testar slugs para Valtra
  console.log("\n\n🧪 TESTANDO SLUGS PARA VALTRA...");
  console.log("=".repeat(60));
  const valtraSlugsParaTestar = slugsCandidatos
    .filter(s => s.nome.includes("VALTRA") || s.nome.includes("VALMET"))
    .map(s => s.slug);
  
  // Adicionar slugs óbvios
  valtraSlugsParaTestar.push("motor", "filtros", "transmissao", "cabine", "freios", "eixo", "hidraulica");
  
  const valtraValidos = await testarSlugs("valtra", [...new Set(valtraSlugsParaTestar)]);

  // Passo 5: Testar slugs para New Holland
  console.log("\n\n🧪 TESTANDO SLUGS PARA NEW HOLLAND...");
  console.log("=".repeat(60));
  const nhSlugsParaTestar = slugsCandidatos
    .filter(s => s.nome.includes("NEW HOLLAND") || s.nome.includes("CNH") || s.nome.includes("TRATOR"))
    .map(s => s.slug);

  nhSlugsParaTestar.push("motor", "filtros", "transmissao", "cabine", "freios", "eixo", "hidraulica");

  const nhValidos = await testarSlugs("new-holland", [...new Set(nhSlugsParaTestar)]);

  // Resultado Final
  const resultado = {
    valtra: { total: valtraData.totalProdutos, categorias: valtraData.categorias, slugsValidos: valtraValidos },
    newHolland: { total: nhData.totalProdutos, categorias: nhData.categorias, slugsValidos: nhValidos }
  };

  fs.writeFileSync("dados/categorias_mapeadas.json", JSON.stringify(resultado, null, 2));

  console.log("\n\n📊 RESUMO FINAL:");
  console.log("=".repeat(60));
  console.log(`Valtra:      ${valtraData.totalProdutos} produtos totais, ${valtraValidos.length} slugs válidos`);
  console.log(`New Holland: ${nhData.totalProdutos} produtos totais, ${nhValidos.length} slugs válidos`);
  console.log("\n💾 Resultado salvo em categorias_mapeadas.json");
}

main();
