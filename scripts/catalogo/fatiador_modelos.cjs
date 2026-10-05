const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
const fs = require("fs");

/**
 * ROBÔ FATIADOR POR MODELO DE MÁQUINA
 * ====================================
 * Contorna o limite de 200 páginas da Redeparts extraindo
 * produtos modelo por modelo (machineModel).
 * 
 * Cada modelo tem no máximo ~230 produtos (~10 páginas),
 * muito abaixo do limite de 4.800.
 */

// ==================== CONFIGURAÇÃO ====================
const MARCAS = [
  {
    nome: "Valtra",
    slug: "valtra",
    csvExistente: "dados/valtra.csv",
    csvNovo: "dados/valtra_complemento.csv",
    categoria: "Valmet/Valtra",
    marca: "Valtra",
    prefixoSKU: "VAL"
  },
  {
    nome: "New Holland",
    slug: "new-holland",
    csvExistente: "dados/new_holland.csv",
    csvNovo: "dados/new_holland_complemento.csv",
    categoria: "New Holland",
    marca: "New Holland",
    prefixoSKU: "NH"
  },
  {
    nome: "John Deere",
    slug: "john-deere",
    csvExistente: "dados/john_deere.csv",
    csvNovo: "dados/john_deere_complemento.csv",
    categoria: "John Deere",
    marca: "John Deere",
    prefixoSKU: "JD"
  }
];

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Carrega os links já existentes de um CSV para evitar duplicatas
 */
function carregarLinksExistentes(csvPath) {
  const links = new Set();
  if (!fs.existsSync(csvPath)) return links;
  
  const conteudo = fs.readFileSync(csvPath, "utf-8");
  const linhas = conteudo.split("\n");
  for (const linha of linhas) {
    // Extrair o link (última coluna)
    const match = linha.match(/"(https?:\/\/[^"]+)"/);
    if (match) links.add(match[1]);
    
    // Também extrair por href dentro do link
    const hrefMatch = linha.match(/\/pecas\/[^";\s]+/);
    if (hrefMatch) links.add(hrefMatch[0]);
  }
  console.log(`  📂 Carregados ${links.size} links existentes de ${csvPath}`);
  return links;
}

/**
 * Fase 1: Descobre TODOS os modelos de máquina para uma marca,
 * interceptando a API _serverFn da Redeparts.
 */
async function descobrirModelos(page, marcaSlug) {
  const modelos = [];

  // Interceptar a API para capturar os modelos
  const apiData = [];
  const handler = async (response) => {
    const url = response.url();
    if (url.includes("_serverFn")) {
      try {
        const text = await response.text();
        apiData.push(text);
      } catch (e) {}
    }
  };
  
  page.on("response", handler);

  await page.goto(`https://redeparts.com.br/produtos?machineBrand=${marcaSlug}&page=1`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  page.off("response", handler);

  // Extrair modelos da API interceptada
  // Os modelos estão no endpoint que retorna {model, count}
  for (const text of apiData) {
    const regex = /"model","count"\],"v":\[\{"t":1,"s":"([^"]+)"\},\{"t":0,"s":(\d+)\}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      modelos.push({ model: match[1], count: parseInt(match[2]) });
    }
  }

  // Se não encontrou pela API, tenta ler dos botões de filtro na tela
  if (modelos.length === 0) {
    console.log("  ⚠️  Tentando extrair modelos dos botões de filtro...");
    const botoesModelo = await page.evaluate(() => {
      const botoes = Array.from(document.querySelectorAll("button"));
      const modelos = [];
      for (const btn of botoes) {
        const text = btn.innerText.trim();
        const parts = text.split("\n");
        if (parts.length === 2) {
          const modelo = parts[0].trim();
          const count = parseInt(parts[1].trim());
          if (!isNaN(count) && count > 0 && modelo.length < 20) {
            modelos.push({ model: modelo, count });
          }
        }
      }
      return modelos;
    });
    modelos.push(...botoesModelo);
  }

  // Ordenar por contagem (maiores primeiro para priorizar)
  modelos.sort((a, b) => b.count - a.count);
  return modelos;
}

/**
 * Fase 2: Extrai todos os produtos de um modelo específico,
 * paginando até não encontrar mais resultados.
 */
async function extrairProdutosDoModelo(page, marcaSlug, modelo, prefixoSKU) {
  const produtos = [];
  let pagina = 1;
  let continuar = true;

  while (continuar) {
    try {
      await page.goto(
        `https://redeparts.com.br/produtos?machineBrand=${marcaSlug}&machineModel=${encodeURIComponent(modelo)}&page=${pagina}`,
        { waitUntil: "networkidle", timeout: 60000 }
      );
      await page.waitForTimeout(2500);

      const produtosNaTela = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('a[href^="/pecas/"]'));
        if (cards.length === 0) return [];

        return cards.map((c) => {
          let textParts = c.innerText.split("\n").filter((t) => t.trim() !== "");
          let nome = textParts.length > 0 ? textParts[0].trim() : "";

          let imgEl = c.querySelector("img");
          let img = imgEl ? imgEl.src : "";

          let precoMatch = c.innerText.match(/R\$\s?([\d\.,]+)/);
          let preco = precoMatch ? precoMatch[1] : "0,00";

          let sku = "";
          let idMatch = c.href.match(/-(\d+)$/);
          if (idMatch) sku = idMatch[1];

          return { sku, nome, img, preco, href: c.href };
        });
      });

      if (produtosNaTela.length === 0) {
        continuar = false;
        break;
      }

      produtos.push(...produtosNaTela);
      pagina++;

      // Segurança: se passou de 200 páginas (impossível por modelo, mas por precaução)
      if (pagina > 200) {
        console.log(`    ⚠️  Atingiu limite de 200 páginas para modelo ${modelo}`);
        continuar = false;
      }
    } catch (err) {
      console.log(`    ❌ Erro pág ${pagina} modelo ${modelo}: ${err.message}`);
      continuar = false;
    }
  }

  return produtos;
}

// ==================== EXECUÇÃO PRINCIPAL ====================
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║    🔪 ROBÔ FATIADOR POR MODELO - REDEPARTS             ║");
  console.log("║    Extraindo produtos que ficaram além da pág. 200      ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const estatisticas = {};

  for (const marca of MARCAS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🚜 PROCESSANDO: ${marca.nome.toUpperCase()}`);
    console.log(`${"=".repeat(60)}`);

    // Carregar links já existentes para deduplicação
    const linksExistentes = carregarLinksExistentes(marca.csvExistente);

    // Abrir navegador com stealth
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // FASE 1: Descobrir todos os modelos
    console.log("\n📡 FASE 1: Descobrindo todos os modelos de máquina...");
    const modelos = await descobrirModelos(page, marca.slug);
    console.log(`  ✅ Encontrados ${modelos.length} modelos para ${marca.nome}`);
    
    if (modelos.length > 0) {
      console.log(`  📋 Top 10: ${modelos.slice(0, 10).map(m => `${m.model}(${m.count})`).join(", ")}`);
      console.log(`  📋 Total de produtos nos modelos: ${modelos.reduce((s, m) => s + m.count, 0)}`);
    }

    // Preparar arquivo CSV de complemento
    const csvHeader = "SKU;NOME;CATEGORIA;MARCA;PRECO;IMAGEM;LINK\n";
    fs.writeFileSync(marca.csvNovo, csvHeader);

    // FASE 2: Extrair produtos modelo por modelo
    console.log(`\n🔪 FASE 2: Fatiando extração por modelo...`);
    let totalNovos = 0;
    let totalDuplicados = 0;
    let modelosProcessados = 0;

    for (const { model, count } of modelos) {
      modelosProcessados++;
      process.stdout.write(`  [${modelosProcessados}/${modelos.length}] Modelo ${model} (${count} itens)... `);

      const produtos = await extrairProdutosDoModelo(page, marca.slug, model, marca.prefixoSKU);

      // Filtrar duplicatas
      let novos = 0;
      let chunk = "";
      
      for (const p of produtos) {
        // Extrair o path relativo do link para comparação
        const hrefPath = p.href.replace(/^https?:\/\/[^/]+/, "");
        
        if (linksExistentes.has(p.href) || linksExistentes.has(hrefPath)) {
          totalDuplicados++;
          continue;
        }

        // Marcar como existente para evitar duplicatas entre modelos
        linksExistentes.add(p.href);
        linksExistentes.add(hrefPath);

        let sku = p.sku || `${marca.prefixoSKU}_${Math.random().toString(36).substr(2, 5)}`;
        let nomeSafe = p.nome.replace(/"/g, '""').replace(/;/g, ",");
        let precoSafe = p.preco.replace(/\./g, "").replace(/,/g, ".");

        chunk += `${sku};"${nomeSafe}";"${marca.categoria}";"${marca.marca}";${precoSafe};"${p.img}";"${p.href}"\n`;
        novos++;
        totalNovos++;
      }

      if (chunk) {
        fs.appendFileSync(marca.csvNovo, chunk);
      }

      console.log(`${produtos.length} extraídos, ${novos} novos, ${produtos.length - novos} duplicados`);
    }

    await browser.close();

    // Estatísticas finais da marca
    estatisticas[marca.nome] = {
      modelos: modelos.length,
      novos: totalNovos,
      duplicados: totalDuplicados,
      arquivo: marca.csvNovo
    };

    console.log(`\n📊 Resultado ${marca.nome}:`);
    console.log(`  ✅ ${totalNovos} produtos NOVOS salvos em ${marca.csvNovo}`);
    console.log(`  🔄 ${totalDuplicados} duplicados ignorados (já existiam em ${marca.csvExistente})`);
    console.log(`  📁 ${modelos.length} modelos varridos`);
  }

  // RELATÓRIO FINAL
  console.log("\n\n╔══════════════════════════════════════════════════════════╗");
  console.log("║              📊 RELATÓRIO FINAL DO FATIADOR             ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  let grandTotal = 0;
  for (const [nome, stats] of Object.entries(estatisticas)) {
    console.log(`  🚜 ${nome}:`);
    console.log(`     → ${stats.modelos} modelos varridos`);
    console.log(`     → ${stats.novos} produtos NOVOS → ${stats.arquivo}`);
    console.log(`     → ${stats.duplicados} duplicados ignorados`);
    grandTotal += stats.novos;
  }

  console.log(`\n  🎯 TOTAL DE PRODUTOS NOVOS RESGATADOS: ${grandTotal}`);
  console.log(`\n  💡 Para importar no banco de dados, rode:`);
  console.log(`     node import_complementos.cjs`);
  console.log("\n✅ Fatiador finalizado com sucesso!");
}

main().catch(console.error);
