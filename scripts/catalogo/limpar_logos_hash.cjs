// Tira TODAS as fotos que são a logo do AGROTRATOR, achadas pelo conteúdo da imagem
// (dados/precos_agrotrator/logos_hash.json, de scripts/extratores/achar_logos_hash.cjs).
// A peça fica com a próxima foto real ou sem foto (o site mostra public/img/sem-foto.jpg).
//
// - Banco local: com --aplicar.
// - Produção: gera scripts/importacao/remover_logos_producao.sql. Apaga pelo endereço da VTEX e
//   também pelo nome que a cópia de fotos dá no servidor (agrotrator/<sku>-<n>.jpg), caso a
//   cópia já tenha passado por ela. O <n> segue a numeração do SQL de importação.
//
// Uso (raiz do projeto): node scripts/catalogo/limpar_logos_hash.cjs [--aplicar] [--corte=12]

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const RAIZ = path.join(__dirname, "../..");
const DADOS = path.join(RAIZ, "dados/precos_agrotrator");
const APLICAR = process.argv.includes("--aplicar");
const CORTE = Number((process.argv.find((a) => a.startsWith("--corte=")) || "--corte=12").split("=")[1]);

const dist = (a, b) => {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
};
const foto600 = (u) => u.replace(/\/ids\/(\d+)(-\d+-\d+)?\//, "/ids/$1-600-600/").replace(/\?.*$/, "");
const nomeCopia = (sku, ordem) => `agrotrator/${sku.trim().replace(/[^A-Za-z0-9._-]/g, "_")}-${ordem + 1}.jpg`;
const q = (s) => `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;

(async () => {
  const { ref, hashes } = JSON.parse(fs.readFileSync(path.join(DADOS, "logos_hash.json"), "utf8"));
  const logo = new Set(Object.entries(hashes).filter(([, h]) => h && Math.min(...ref.map((r) => dist(r, h))) <= CORTE).map(([f]) => f));
  console.log(`Fotos-logo pelo conteúdo (distância ≤ ${CORTE}): ${logo.size}`);

  // Numeração das fotos na PRODUÇÃO: a mesma do SQL de importação (fotos sem as logos por tamanho)
  const antigas = JSON.parse(fs.readFileSync(path.join(DADOS, "fotos_logo.json"), "utf8"));
  const tirarAntes = new Set([...antigas.logos, ...antigas.quebradas]);
  const cat = JSON.parse(fs.readFileSync(path.join(DADOS, "catalogo.json"), "utf8"));
  const ordemProd = new Map(); // url -> [{ sku, ordem }]
  for (const p of cat) {
    const base = p.ref.replace(/-AGROTRATOR$/i, "").trim();
    const fotos = [...new Set(p.fotos.map(foto600))].filter((u) => !tirarAntes.has(u));
    fotos.forEach((u, i) => {
      if (!ordemProd.has(u)) ordemProd.set(u, []);
      ordemProd.get(u).push({ base, ordem: i });
    });
  }

  const prisma = new PrismaClient();
  try {
    // Linhas no banco local com logo (endereço VTEX, cópia em uploads ou foto antiga em /catalogo)
    const linhas = [];
    const lista = [...logo];
    for (let i = 0; i < lista.length; i += 1000) {
      linhas.push(...(await prisma.agricolas_img.findMany({ where: { image_path: { in: lista.slice(i, i + 1000) } }, select: { id: true, sku: true, image_path: true } })));
    }
    const skusLocais = [...new Set(linhas.map((l) => l.sku))];
    console.log(`Banco local: ${linhas.length} fotos em ${skusLocais.length} peças`);

    // SQL da produção
    const sql = [
      "-- Remove as fotos que são a logo do AGROTRATOR (achadas pelo conteúdo da imagem).",
      "-- Gerado por scripts/catalogo/limpar_logos_hash.cjs. Pode rodar de novo sem problema.",
      "SET NAMES utf8mb4;",
      "START TRANSACTION;",
    ];
    const skusProd = new Set();
    for (const u of logo) {
      if (u.startsWith("http")) {
        const donos = ordemProd.get(u) || [];
        const nomes = donos.map((d) => nomeCopia(d.base, d.ordem));
        sql.push(`DELETE FROM agricolas_img WHERE image_path IN (${[u, ...nomes].map(q).join(", ")});`);
        for (const d of donos) skusProd.add(d.base);
      } else {
        sql.push(`DELETE FROM agricolas_img WHERE image_path = ${q(u)};`);
        for (const l of linhas.filter((x) => x.image_path === u)) skusProd.add(l.sku);
      }
    }
    // Foto principal: a próxima foto real da peça, ou nenhuma
    const skus = [...skusProd];
    for (let i = 0; i < skus.length; i += 500) {
      sql.push(
        `UPDATE agricolas a SET a.imagem_principal = (SELECT i.image_path FROM agricolas_img i WHERE i.sku = a.sku ORDER BY i.sort_order, i.id LIMIT 1) WHERE a.sku IN (${skus.slice(i, i + 500).map(q).join(", ")});`,
      );
    }
    sql.push("COMMIT;", "");
    const arq = path.join(RAIZ, "scripts/importacao/remover_logos_producao.sql");
    fs.writeFileSync(arq, sql.join("\n"));
    console.log(`SQL da produção: ${path.relative(RAIZ, arq)} (${skus.length} peças, ${(fs.statSync(arq).size / 1048576).toFixed(1)} MB)`);

    if (!APLICAR) return console.log("Simulação no banco local: use --aplicar para remover aqui também.");
    for (let i = 0; i < linhas.length; i += 1000) await prisma.agricolas_img.deleteMany({ where: { id: { in: linhas.slice(i, i + 1000).map((l) => l.id) } } });
    let semFoto = 0;
    for (const sku of skusLocais) {
      const prox = await prisma.agricolas_img.findFirst({ where: { sku }, orderBy: [{ sort_order: "asc" }, { id: "asc" }], select: { image_path: true } });
      if (!prox) semFoto++;
      await prisma.agricolas.update({ where: { sku }, data: { imagem_principal: prox?.image_path ?? null } });
    }
    console.log(`Banco local: removidas. ${skusLocais.length - semFoto} peças com outra foto real; ${semFoto} ficaram sem foto.`);
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
