// Acha fotos que são a logo do AGROTRATOR pelo CONTEÚDO da imagem (não pelo tamanho do arquivo).
// Cada foto vira uma "impressão digital" visual (dHash 16×16 em tons de cinza, calculado num
// navegador sem tela) e é comparada com a da logo. Distância pequena = mesma imagem.
//
// Fontes analisadas (banco local): agricolas_img com foto da VTEX, uploads/agrotrator e public/catalogo.
// Uso (raiz do projeto):
//   node scripts/extratores/achar_logos_hash.cjs [--limite=N]
// Saída: dados/precos_agrotrator/logos_hash.json  ({ ref: [hash...], resultados: {caminho: distancia} })

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");

const RAIZ = path.join(__dirname, "../..");
const SAIDA = path.join(RAIZ, "dados/precos_agrotrator/logos_hash.json");
const SIMULTANEAS = 16;
const LIMITE = Number((process.argv.find((a) => a.startsWith("--limite=")) || "--limite=0").split("=")[1]);

// Amostras da logo (as 5 versões conferidas a olho): baixadas da VTEX
const AMOSTRAS_LOGO = process.argv.filter((a) => a.startsWith("--logo=")).map((a) => a.slice(7));

async function bytesDe(origem) {
  if (/^https?:/.test(origem)) {
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(origem, { signal: AbortSignal.timeout(20_000) });
        if (r.ok) return { buf: Buffer.from(await r.arrayBuffer()), tipo: r.headers.get("content-type") || "image/jpeg" };
        if (r.status === 404) return null;
      } catch {}
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
    return null;
  }
  const arq = origem.startsWith("/catalogo/") ? path.join(RAIZ, "public", origem) : path.join(RAIZ, "uploads", origem);
  if (!fs.existsSync(arq)) return null;
  return { buf: fs.readFileSync(arq), tipo: /\.png$/i.test(arq) ? "image/png" : "image/jpeg" };
}

const HASH_NO_NAVEGADOR = `async (lista) => {
  const N = 16;
  const c = document.createElement("canvas");
  c.width = N + 1; c.height = N;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const saida = [];
  for (const { id, url } of lista) {
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, N + 1, N);
      ctx.drawImage(img, 0, 0, N + 1, N);
      const d = ctx.getImageData(0, 0, N + 1, N).data;
      let bits = "";
      let verde = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = (y * (N + 1) + x) * 4, j = i + 4;
        const a = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        const b = d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11;
        bits += a > b ? "1" : "0";
      }
      saida.push({ id, bits });
    } catch (e) { saida.push({ id, bits: null }); }
  }
  return saida;
}`;

const distancia = (a, b) => {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
};

(async () => {
  const prisma = new PrismaClient();
  const imgs = await prisma.agricolas_img.findMany({
    where: { OR: [{ image_path: { contains: "vteximg" } }, { image_path: { startsWith: "agrotrator/" } }, { image_path: { startsWith: "/catalogo/" } }] },
    select: { image_path: true },
  });
  const principais = await prisma.agricolas.findMany({
    where: { OR: [{ imagem_principal: { contains: "vteximg" } }, { imagem_principal: { startsWith: "agrotrator/" } }, { imagem_principal: { startsWith: "/catalogo/" } }] },
    select: { imagem_principal: true },
  });
  await prisma.$disconnect();
  let fontes = [...new Set([...imgs.map((i) => i.image_path), ...principais.map((p) => p.imagem_principal)])];
  if (LIMITE) fontes = fontes.slice(0, LIMITE);

  const anterior = fs.existsSync(SAIDA) ? JSON.parse(fs.readFileSync(SAIDA, "utf8")) : { hashes: {} };
  const hashes = anterior.hashes || {};
  const faltam = fontes.filter((f) => !(f in hashes));
  console.log(`${fontes.length} fotos · já analisadas ${fontes.length - faltam.length} · faltam ${faltam.length}`);

  const b = await chromium.launch();
  const pagina = await b.newPage();
  const calcular = async (lista) => pagina.evaluate(`(${HASH_NO_NAVEGADOR})(${JSON.stringify(lista)})`);

  const ref = [];
  for (const u of AMOSTRAS_LOGO) {
    const x = await bytesDe(u);
    const [r] = await calcular([{ id: u, url: `data:${x.tipo};base64,${x.buf.toString("base64")}` }]);
    ref.push(r.bits);
  }
  if (!ref.length && anterior.ref) ref.push(...anterior.ref);
  if (!ref.length) throw new Error("Passe ao menos uma amostra da logo com --logo=<url>");

  let feitos = 0;
  for (let i = 0; i < faltam.length; i += SIMULTANEAS * 4) {
    const bloco = faltam.slice(i, i + SIMULTANEAS * 4);
    const dados = [];
    for (let k = 0; k < bloco.length; k += SIMULTANEAS) {
      const parte = await Promise.all(bloco.slice(k, k + SIMULTANEAS).map(async (f) => ({ f, x: await bytesDe(f) })));
      for (const { f, x } of parte) {
        if (x) dados.push({ id: f, url: `data:${x.tipo};base64,${x.buf.toString("base64")}` });
        else hashes[f] = null;
      }
    }
    for (const r of await calcular(dados)) hashes[r.id] = r.bits;
    feitos += bloco.length;
    if (feitos % 1024 < SIMULTANEAS * 4 || feitos >= faltam.length) {
      fs.writeFileSync(SAIDA, JSON.stringify({ ref, hashes }));
      console.log(`  ${Math.min(feitos, faltam.length)}/${faltam.length}`);
    }
  }
  await b.close();
  fs.writeFileSync(SAIDA, JSON.stringify({ ref, hashes }));

  // Distribuição da menor distância até a logo (para escolher o corte)
  const faixas = {};
  for (const f of fontes) {
    const h = hashes[f];
    if (!h) continue;
    const d = Math.min(...ref.map((r) => distancia(r, h)));
    const faixa = d <= 10 ? `≤10` : d <= 20 ? "11-20" : d <= 30 ? "21-30" : d <= 40 ? "31-40" : ">40";
    faixas[faixa] = (faixas[faixa] || 0) + 1;
  }
  console.log("Distância até a logo (256 bits):", faixas, "· sem imagem/erro:", fontes.filter((f) => !hashes[f]).length);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
