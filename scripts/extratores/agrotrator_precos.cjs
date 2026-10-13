// Baixa o catálogo do agrotrator.com.br (loja VTEX) com preço, para precificar as nossas peças.
// Usa a busca pública da VTEX categoria por categoria (ela devolve no máximo 2.500 itens por
// consulta; categorias maiores são divididas por faixa de preço). Pausa entre os pedidos.
//
// Uso (raiz do projeto):
//   node scripts/extratores/agrotrator_precos.cjs          -> grava dados/precos_agrotrator/catalogo.json
//
// Saída: [{ ref, nome, marca, preco, precoLista, disponivel, link, categoria }]

const fs = require("fs");
const path = require("path");

const BASE = "https://www.agrotrator.com.br";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const PAUSA = 350;
const POR_PAGINA = 50;
const LIMITE = 2500;
const SAIDA = path.join(__dirname, "../../dados/precos_agrotrator");

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url, tentativas = 7) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      const total = Number((r.headers.get("resources") || "").split("/")[1] || 0);
      const corpo = r.status === 200 || r.status === 206 ? await r.json() : [];
      return { total, itens: corpo };
    } catch (e) {
      if (i === tentativas - 1) throw e;
      // Erro passageiro do servidor: espera cada vez mais (3s, 6s, 12s...)
      await dormir(3000 * 2 ** i);
    }
  }
}

const busca = (fq, de, ate) =>
  `${BASE}/api/catalog_system/pub/products/search?${fq.map((f) => `fq=${encodeURIComponent(f)}`).join("&")}&_from=${de}&_to=${ate}`;

const produtos = new Map();
// Progresso salvo a cada parte: se cair, roda de novo e continua de onde parou
const PROGRESSO = path.join(SAIDA, "progresso.json");
const feitos = new Set();
function carregarProgresso() {
  if (!fs.existsSync(PROGRESSO)) return;
  const p = JSON.parse(fs.readFileSync(PROGRESSO, "utf8"));
  for (const x of p.produtos) produtos.set(x.ref, x);
  for (const k of p.feitos) feitos.add(k);
  console.log(`Retomando: ${produtos.size} produtos já baixados, ${feitos.size} partes prontas`);
}
function salvarProgresso() {
  fs.writeFileSync(PROGRESSO, JSON.stringify({ produtos: [...produtos.values()], feitos: [...feitos] }));
}

function guardar(lista) {
  for (const p of lista) {
    for (const it of p.items || []) {
      const oferta = it.sellers?.[0]?.commertialOffer ?? {};
      const ref = (it.referenceId || []).find((r) => r.Key === "RefId")?.Value || p.productReference;
      if (!ref) continue;
      produtos.set(ref, {
        ref,
        nome: p.productName,
        marca: p.brand,
        preco: Number(oferta.Price) || 0,
        precoLista: Number(oferta.ListPrice) || 0,
        disponivel: Number(oferta.AvailableQuantity) || 0,
        link: `${BASE}/${p.linkText}/p`,
        categoria: (p.categories || [])[0] || "",
        // Fotos (URL da VTEX) para importar as peças novas e completar as que não têm foto
        fotos: (it.images || []).map((im) => im.imageUrl).filter(Boolean).slice(0, 6),
        ean: it.ean || "",
      });
    }
  }
}

// Baixa todas as páginas de um filtro (até 2.500 itens)
async function baixar(fq) {
  const chave = fq.join("&");
  if (feitos.has(chave)) return;
  const primeira = await pedir(busca(fq, 0, POR_PAGINA - 1));
  guardar(primeira.itens);
  const total = Math.min(primeira.total, LIMITE);
  for (let de = POR_PAGINA; de < total; de += POR_PAGINA) {
    await dormir(PAUSA);
    guardar((await pedir(busca(fq, de, Math.min(de + POR_PAGINA - 1, LIMITE - 1)))).itens);
  }
  if (primeira.total > LIMITE) console.log(`
  aviso: ${chave} tem ${primeira.total} (só os primeiros ${LIMITE})`);
  feitos.add(chave);
  salvarProgresso();
}

// Categoria grande: divide por faixa de preço até cada parte caber em 2.500
async function baixarDividindo(fq, min = 0, max = 200000) {
  await dormir(PAUSA);
  const { total } = await pedir(busca([...fq, `P:[${min} TO ${max}]`], 0, 0));
  if (!total) return;
  if (total <= LIMITE || max - min < 1) {
    await baixar([...fq, `P:[${min} TO ${max}]`]);
    return;
  }
  const meio = Math.round(((min + max) / 2) * 100) / 100;
  await baixarDividindo(fq, min, meio);
  await baixarDividindo(fq, Math.round((meio + 0.01) * 100) / 100, max);
}

// --nossas: só as nossas peças que vieram do agrotrator (fotos em /catalogo), buscadas pela
// referência "<sku>-AGROTRATOR" em lotes (a VTEX junta vários fq de RefId com OU)
async function soAsNossas() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const nossas = await prisma.agricolas.findMany({ where: { duplicado_de: null, imagem_principal: { startsWith: "/catalogo/" } }, select: { sku: true } });
  await prisma.$disconnect();
  const refs = nossas.map((n) => `${n.sku.trim()}-AGROTRATOR`);
  console.log(`Buscando ${refs.length} referências no agrotrator...`);
  for (let i = 0; i < refs.length; i += 40) {
    const lote = refs.slice(i, i + 40);
    guardar((await pedir(busca(lote.map((r) => `alternateIds_RefId:${r}`), 0, 49))).itens);
    process.stdout.write(`\r${Math.min(i + 40, refs.length)}/${refs.length} (${produtos.size} achadas)`);
    await dormir(PAUSA);
  }
  const lista = [...produtos.values()];
  fs.writeFileSync(path.join(SAIDA, "nossas.json"), JSON.stringify(lista));
  console.log(`\nGravado: ${lista.length} de ${refs.length} em dados/precos_agrotrator/nossas.json`);
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  if (process.argv.includes("--nossas")) return soAsNossas();
  const arvore = (await (await fetch(`${BASE}/api/catalog_system/pub/category/tree/4`, { headers: { "User-Agent": UA } })).json());
  const { total: geral } = await pedir(busca([], 0, 0));
  console.log(`Catálogo do agrotrator: ${geral} produtos em ${arvore.length} categorias`);
  // Categoria grande: desce para as subcategorias; se ainda passar de 2.500, divide por preço
  async function categoria(c, caminho) {
    const fq = [`C:${caminho}`];
    if (feitos.has("cat:" + caminho)) return;
    await dormir(PAUSA);
    const { total } = await pedir(busca(fq, 0, 0));
    if (total <= LIMITE) await baixar(fq);
    else if (c.children?.length) {
      for (const f of c.children) await categoria(f, `${caminho}${f.id}/`);
    } else await baixarDividindo(fq);
    feitos.add("cat:" + caminho);
    salvarProgresso();
  }
  carregarProgresso();
  for (const c of arvore) {
    process.stdout.write(`${c.name} ... `);
    await categoria(c, `/${c.id}/`);
    console.log(`ok (${produtos.size} no total)`);
  }
  const lista = [...produtos.values()];
  fs.writeFileSync(path.join(SAIDA, "catalogo.json"), JSON.stringify(lista));
  const comPreco = lista.filter((p) => p.preco > 0 || p.precoLista > 0).length;
  console.log(`\nGravado: ${lista.length} produtos (${comPreco} com preço) em dados/precos_agrotrator/catalogo.json`);
  if (lista.length < geral * 0.95) console.log(`Atenção: o site informa ${geral}; faltaram ${geral - lista.length} (produtos sem categoria?)`);
})().catch((e) => {
  console.error("Falhou:", e.message);
  process.exit(1);
});
