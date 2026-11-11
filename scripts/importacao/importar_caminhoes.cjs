// Importa o catálogo de caminhões (extraído do site Roni Chaves) para a tabela `products`
// com linha = 'CAMINHOES', reaproveitando toda a loja (busca, filtros, ficha, carrinho).
// Sem preço (mostra "consultar"). Imagem = URL do ronichaves (migrar ao Hostinger depois).
// Re-executável (ON DUPLICATE KEY UPDATE por sku). Uso: node scripts/importacao/importar_caminhoes.cjs [json]
const fs = require("fs");
const path = require("path");
const { Prisma, PrismaClient } = require("@prisma/client");

const JSON_PATH =
  process.argv[2] ||
  path.resolve("C:/Users/USER/Desktop/site-rs/caminhoes_extracao/dados/produtos.json");

const prisma = new PrismaClient();
const LINHA = "CAMINHOES";

const txt = (v, max) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return max ? s.slice(0, max) : s;
};

(async () => {
  console.log("JSON:", JSON_PATH);
  const dados = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  console.log("registros no arquivo:", dados.length);

  const linhas = [];
  const vistos = new Set();
  for (const d of dados) {
    const sku = txt(d.codigo, 191);
    const nome = txt(d.nome, 2000);
    if (!sku || !nome || vistos.has(sku)) continue;
    vistos.add(sku);
    let montadora = txt(d.montadora, 190);
    if (!montadora || montadora === "?") montadora = "OUTRAS";
    let grupo = txt(d.grupo, 190);
    if (!grupo || grupo === "?") grupo = "OUTROS";
    linhas.push({
      sku,
      nome,
      marca: montadora, // montadora vira "marca" (filtro de marca já existe)
      categoria: grupo, // grupo vira "categoria" (filtro de categoria já existe)
      codigo_fabricante: txt(d.referencia, 2000),
      veiculos_compativeis: txt(d.aplicacao, 2000), // aplicação/compatibilidade
      imagem_principal: txt(d.imagem, 2000),
      url: txt(d.url, 2000),
    });
  }
  console.log("linhas válidas:", linhas.length);

  const LOTE = 500;
  let feitos = 0;
  for (let i = 0; i < linhas.length; i += LOTE) {
    const lote = linhas.slice(i, i + LOTE);
    const tuplas = lote.map(
      (r) => Prisma.sql`(${r.sku},${LINHA},${r.nome},${r.marca},${r.categoria},
        ${r.codigo_fabricante},${r.veiculos_compativeis},${r.imagem_principal},${r.url},0,NOW(3),NOW(3))`,
    );
    await prisma.$executeRaw`INSERT INTO products
      (sku, linha, nome, marca, categoria, codigo_fabricante, veiculos_compativeis, imagem_principal, url, estoque, created_at, updated_at)
      VALUES ${Prisma.join(tuplas)}
      ON DUPLICATE KEY UPDATE
        linha=VALUES(linha), nome=VALUES(nome), marca=VALUES(marca), categoria=VALUES(categoria),
        codigo_fabricante=VALUES(codigo_fabricante), veiculos_compativeis=VALUES(veiculos_compativeis),
        imagem_principal=VALUES(imagem_principal), url=VALUES(url)`;
    feitos += lote.length;
    if (feitos % 5000 === 0 || feitos === linhas.length) console.log("inseridos:", feitos);
  }

  const r = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n FROM products WHERE linha='${LINHA}'`,
  );
  console.log("TOTAL products linha CAMINHOES:", Number(r[0].n));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERRO:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
