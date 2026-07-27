const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();

const LOGIN_URL = 'https://compreonline.pellegrino.com.br/Account/Login';
const EMAIL = 'jacksonrodriguesdev@gmail.com';
const PASSWORD = 'bzhudi';

// Cria o diretório de uploads
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'pellegrino');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let downloadQueue = [];
async function processDownloadQueue() {
  while (downloadQueue.length > 0) {
    const batch = downloadQueue.splice(0, 50); // Baixa 50 por vez
    await Promise.all(batch.map(task => downloadImage(task.url, task.dest).catch(() => {})));
  }
}

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return resolve('');
    if (fs.existsSync(dest)) return resolve(dest); 
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(dest));
        });
      } else {
        file.close();
        fs.unlink(dest, () => resolve(''));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => resolve(''));
    });
  });
}

function printProgress(saved, total, startTimestamp) {
    const percent = ((saved / total) * 100).toFixed(2);
    const elapsedSec = (Date.now() - startTimestamp) / 1000;
    const itemsPerSec = saved / elapsedSec;
    const remainingItems = total - saved;
    const etaSec = remainingItems / (itemsPerSec || 1);
    
    const formatTime = (secs) => {
        if (!isFinite(secs) || secs < 0) return 'Calculando...';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        return `${h}h ${m}m ${s}s`;
    };
    
    process.stdout.write(`\r🚀 Progresso: ${saved} / ${total} (${percent}%) | ⚡ Vel: ${itemsPerSec.toFixed(1)} itens/seg | ⏳ Restante: ${formatTime(etaSec)}      `);
}

async function start() {
  console.log('Iniciando Robô Extrator Profundo - Pellegrino...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let algoliaKey = null;

  page.on('response', async (response) => {
    if (response.url().includes('/catalogo/aiskeygen')) {
      try {
        const bodyStr = await response.text();
        let body;
        try {
          body = JSON.parse(JSON.parse(bodyStr));
        } catch(e) {
          body = JSON.parse(bodyStr);
        }
        if (body && body.securedKey) {
            console.log('✅ Chave do Algolia capturada com sucesso!');
            algoliaKey = body.securedKey;
        }
      } catch (e) {}
    }
  });

  console.log('⏳ Fazendo Login na Pellegrino...');
  await page.goto(LOGIN_URL);
  await page.waitForTimeout(5000);
  
  const userInputs = await page.$$('input[type="text"], input[type="email"], input[name="UserName"], input[name="Email"]');
  if (userInputs.length > 0) await userInputs[0].fill(EMAIL);
  
  const passInputs = await page.$$('input[type="password"]');
  if (passInputs.length > 0) await passInputs[0].fill(PASSWORD);
  
  const btns = await page.$$('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
  if (btns.length > 0) await btns[0].click();
  
  await page.waitForTimeout(5000); 
  console.log('✅ Login Concluído!');

  console.log('⏳ Navegando para o catálogo para iniciar as requisições...');
  await page.goto('https://compreonline.pellegrino.com.br/catalogo/ais', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // Fallback para forçar o aiskeygen caso não tenha pego no page.goto
  let keyRetries = 0;
  while (!algoliaKey && keyRetries < 3) {
      console.log('Tentando forçar geração do token Algolia...');
      await page.evaluate(async () => {
          try { await fetch('/catalogo/aiskeygen'); } catch(e) {}
      });
      await page.waitForTimeout(4000);
      keyRetries++;
  }

  if (!algoliaKey) {
      console.error('❌ Falha fatal: Chave do Algolia não encontrada.');
      await browser.close();
      await prisma.$disconnect();
      return;
  }

  console.log('🔥 Iniciando varredura massiva de dados e imagens!\n');

  let totalSaved = 0;
  let pageNum = 0;
  let hasMore = true;
  let totalHits = 168000; // Será atualizado na primeira requisição
  const HITS_PER_PAGE = 500; 
  const startTime = Date.now();

  const getPrecos = async (wsids) => {
     if (!wsids || wsids.length === 0) return [];
     const idsParam = wsids.join(',');
     const apiUrl = `https://compreonline.pellegrino.com.br/api/progress/b2b/produtos/precos?ids=${idsParam}&_=${Date.now()}`;
     try {
         const responseStr = await page.evaluate(async (url) => {
             const controller = new AbortController();
             const id = setTimeout(() => controller.abort(), 10000);
             try {
                 const res = await fetch(url, { signal: controller.signal });
                 clearTimeout(id);
                 return await res.text();
             } catch(e) {
                 clearTimeout(id);
                 return "{}";
             }
         }, apiUrl);
         const data = JSON.parse(responseStr);
         return data.precos || [];
     } catch (e) {
         return [];
     }
  };

  // BUSCAR TODAS AS MARCAS PRIMEIRO PARA DRIBLAR A TRAVA DE 10.000 ITENS DA PAGINAÇÃO
  console.log('⏳ Mapeando marcas disponíveis...');
  const algoliaUrl = `https://cgpod1sars-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(5.46.2)&x-algolia-api-key=${algoliaKey}&x-algolia-application-id=CGPOD1SARS`;
  
  const facetPayload = {
      "requests": [
          {
              "indexName": "b2b_prod",
              "params": `query=&hitsPerPage=0&facets=["brand_name"]` 
          }
      ]
  };

  const facetResStr = await page.evaluate(async ({url, payload}) => {
      const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
      });
      return await res.text();
  }, { url: algoliaUrl, payload: facetPayload });

  const facetData = JSON.parse(facetResStr);
  let brands = [];
  try {
      brands = Object.keys(facetData.results[0].facets.brand_name || {});
  } catch(e) {
      console.log('Erro ao pegar facetas de marca, caindo para modo de varredura cega.');
      brands = ['__ALL__'];
  }

  console.log(`✅ ${brands.length} Marcas encontradas. Iniciando extração profunda por marca...`);

  // RETOMADA INTELIGENTE: Varremos todas as marcas, mas pulamos o processamento pesado do que já temos!
  const START_BRAND_INDEX = 0;  

  for (let b = START_BRAND_INDEX; b < brands.length; b++) {
      const brand = brands[b];
      console.log(`\n\n🔹 Iniciando varredura da marca: ${brand} (${b+1}/${brands.length})`);
      
      hasMore = true;
      pageNum = 0;

      while (hasMore) {
          const facetFilter = brand === '__ALL__' ? '' : `&facetFilters=[["brand_name:${encodeURIComponent(brand)}"]]`;
          const queryPayload = {
              "requests": [
                  {
                      "indexName": "b2b_prod",
                      "params": `query=&hitsPerPage=${HITS_PER_PAGE}&page=${pageNum}${facetFilter}` 
                  }
              ]
          };


      try {
          const algoliaResStr = await page.evaluate(async ({url, payload}) => {
              const controller = new AbortController();
              const id = setTimeout(() => controller.abort(), 15000);
              try {
                  const res = await fetch(url, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                      body: JSON.stringify(payload),
                      signal: controller.signal
                  });
                  clearTimeout(id);
                  return await res.text();
              } catch(e) {
                  clearTimeout(id);
                  return "{}";
              }
          }, { url: algoliaUrl, payload: queryPayload });

          const algoliaData = JSON.parse(algoliaResStr);
          
          if (!algoliaData || !algoliaData.results || algoliaData.results.length === 0) {
              console.log('⚠️ Falha ao buscar dados (Rate Limit ou Timeout). Pulando para próxima marca...');
              hasMore = false;
              break;
          }

          const hits = algoliaData.results[0].hits;
          
          if (pageNum === 0 && algoliaData.results[0].nbHits) {
              totalHits = algoliaData.results[0].nbHits;
          }
          
          if (!hits || hits.length === 0) {
              hasMore = false;
              break;
          }

          const wsids = hits.map(h => h.wsid).filter(Boolean);
          const precosMap = {};
          const chunkSize = 100;
          
          for (let i = 0; i < wsids.length; i += chunkSize) {
              const loteIds = wsids.slice(i, i + chunkSize);
              const lotePrecos = await getPrecos(loteIds);
              lotePrecos.forEach(p => {
                  precosMap[p.id] = p;
              });
              await delay(200); 
          }

          for (const item of hits) {
              const sku = item.wsid;
              if (!sku) continue;

              const getVal = (field) => {
                  if (!field) return null;
                  if (typeof field === 'string') return field;
                  if (field.v) {
                      if (Array.isArray(field.v)) return field.v.join(', ');
                      return String(field.v);
                  }
                  return null;
              };

              const codFabricante = getVal(item.codigo_fabricante_br) || '';
              const ean = getVal(item.ean) || '';
              const ncm = getVal(item.ncm) || '';
              const marca = item.brand_name || '';
              const nome = item.product_name || `${item.categoria_3_b2b || 'Produto'} ${marca} ${codFabricante}`;
              const categoria = `${item.categoria_1_b2b || ''} > ${item.categoria_2_b2b || ''} > ${item.categoria_3_b2b || ''}`;
              
              const peso = parseFloat(getVal(item.peso_bruto)) || null;
              const altura = parseFloat(getVal(item.altura_br)) || null;
              const largura = parseFloat(getVal(item.largura_br)) || null;
              const profundidade = parseFloat(getVal(item.profundidade_br)) || null;

              const precoInfo = precosMap[sku];
              const valorCompra = precoInfo ? precoInfo.preco_com_imposto : null;
              const precoBrl = precoInfo ? precoInfo.preco_com_imposto : null;
              const estoque = (item.estoque && Array.isArray(item.estoque)) ? item.estoque.reduce((a,b)=>a+b,0) : 100;

              const linha = "PELLEGRINO";

              try {
                  await prisma.products.upsert({
                      where: { sku: sku },
                      update: {
                          codigo_fabricante: codFabricante, ean: ean, ncm: ncm, marca: marca, nome: nome, categoria: categoria,
                          valor_compra: valorCompra, preco_brl: precoBrl, estoque: estoque, peso: peso, altura: altura, largura: largura,
                          profundidade: profundidade, descricao: item.aplicaco || null, linha: linha, updated_at: new Date()
                      },
                      create: {
                          sku: sku, codigo_fabricante: codFabricante, ean: ean, ncm: ncm, marca: marca, nome: nome, categoria: categoria,
                          valor_compra: valorCompra, preco_brl: precoBrl, estoque: estoque, peso: peso, altura: altura, largura: largura,
                          profundidade: profundidade, descricao: item.aplicaco || null, linha: linha
                      }
                  });

                  if (item.application && Array.isArray(item.application)) {
                      await prisma.produto_aplicacao.deleteMany({ where: { sku: sku } });
                      const novasAplicacoes = item.application.map(app => {
                          const ano = (app.y && app.y.length > 0) ? `${Math.min(...app.y)}-${Math.max(...app.y)}` : '';
                          return { sku: sku, montadora: app.b || 'UNIV', veiculo: `${app.v || ''} ${app.m || ''}`.trim(), ano: ano, motor: app.e || '' };
                      });
                      if (novasAplicacoes.length > 0) {
                          await prisma.produto_aplicacao.createMany({ data: novasAplicacoes, skipDuplicates: true });
                      }
                  }

                  if (item.similars && Array.isArray(item.similars)) {
                      await prisma.produto_similar.deleteMany({ where: { sku: sku } });
                      const novosSimilares = item.similars.map(sim => ({ sku: sku, codigo_similar: sim.c || '', marca_similar: sim.b || '' }));
                      if (novosSimilares.length > 0) {
                          await prisma.produto_similar.createMany({ data: novosSimilares, skipDuplicates: true });
                      }
                  }

                  await prisma.produto_ficha_tecnica.deleteMany({ where: { sku: sku } });
                  for (const key of Object.keys(item)) {
                      const field = item[key];
                      if (!field) continue;
                      
                      if (field.l && field.v) {
                          const ignored = ['product_name', 'brand_name'];
                          if (!ignored.includes(key)) {
                              let stringValue = Array.isArray(field.v) ? field.v.join(', ') : String(field.v);
                              fichas.push({ sku: sku, chave: field.l, valor: stringValue });
                          }
                      } else if (typeof field === 'string' && key !== 'wsid' && key !== 'product_name' && key !== 'brand_name' && !key.includes('categoria')) {
                          const allowedStrings = ['embalagem_venda_br', 'unidade_medida_br', 'curva_abc_br', 'produto_ativo_br'];
                          if (allowedStrings.includes(key)) {
                              fichas.push({ sku: sku, chave: key.replace('_br', '').replace(/_/g, ' '), valor: field });
                          }
                      }
                  }
                  if (fichas.length > 0) {
                      await prisma.produto_ficha_tecnica.createMany({ data: fichas, skipDuplicates: true });
                  }

                  if (item.gallery && Array.isArray(item.gallery)) {
                      await prisma.products_img.deleteMany({ where: { sku: sku } });
                      let imagemPrincipalStr = null;
                      
                      const imagensToInsert = item.gallery.map((img, idx) => {
                          const url = img.url;
                          const filename = url.split('/').pop().split('?')[0];
                          const localPath = `pellegrino/${filename}`;
                          downloadQueue.push({ url: url, dest: path.join(uploadsDir, filename) });
                          if (img.type === 'main_image' || idx === 0) {
                              imagemPrincipalStr = localPath;
                          }
                          return { sku: sku, image_path: localPath, image_type: img.type || 'gallery', sort_order: idx };
                      });

                      if (imagensToInsert.length > 0) {
                          await prisma.products_img.createMany({ data: imagensToInsert, skipDuplicates: true });
                      }
                      
                      if (imagemPrincipalStr) {
                          await prisma.products.update({
                              where: { sku: sku },
                              data: { imagem_principal: imagemPrincipalStr }
                          });
                      }
                  }

              } catch (dbErr) {
                  // ignorar erros de banco isolados
              }
          } // Fim for(missingHits)

          // Somar todo o pacote (os que já tínhamos + os novos) no progresso visual
          totalSaved += hits.length;
          printProgress(totalSaved, totalHits, startTime);
          
          if (totalSaved % 100 === 0) {
              await processDownloadQueue();
          }

          pageNum++;      
      } catch (err) {
          await delay(5000); 
      }
    } // Fim while(hasMore)
  } // Fim for(brands)

  await processDownloadQueue();
  console.log(`\n\n✅ FIM DA EXTRAÇÃO! Total salvo e sincronizado: ${totalSaved} produtos.`);
  await browser.close();
  await prisma.$disconnect();
}

start().catch(e => {
  console.error('\n❌ Erro geral:', e);
});
