// Importa o catálogo de caminhões (extraído do site Roni Chaves) para a tabela `caminhoes`.
// Lê o JSON da pasta de extração e grava em lotes (re-executável: ON DUPLICATE KEY UPDATE).
// Imagem = URL do próprio ronichaves (decisão: linkar agora, migrar depois).
// Uso: node scripts/importacao/importar_caminhoes.cjs [caminho_do_json]
const fs = require("fs");
const path = require("path");
const { Prisma, PrismaClient } = require("@prisma/client");

const JSON_PATH =
  process.argv[2] ||
  path.resolve("C:/Users/USER/Desktop/site-rs/caminhoes_extracao/dados/produtos.json");

const prisma = new PrismaClient();

const TABELA = `CREATE TABLE IF NOT EXISTS \`caminhoes\` (
  \`codigo\` VARCHAR(40) NOT NULL,
  \`referencia\` TEXT NULL,
  \`nome\` TEXT NOT NULL,
  \`montadora\` VARCHAR(80) NOT NULL,
  \`montadora_slug\` VARCHAR(80) NOT NULL,
  \`grupo\` VARCHAR(90) NULL,
  \`grupo_slug\` VARCHAR(90) NULL,
  \`aplicacao\` TEXT NULL,
  \`fabricante\` TEXT NULL,
  \`imagem\` TEXT NULL,
  \`imagem_local\` TEXT NULL,
  \`slug\` VARCHAR(191) NOT NULL,
  \`ativo\` TINYINT(1) NOT NULL DEFAULT 1,
  \`origem_url\` TEXT NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`codigo\`),
  INDEX \`caminhoes_nav_idx\`(\`montadora_slug\`, \`grupo_slug\`),
  INDEX \`caminhoes_slug_idx\`(\`slug\`),
  INDEX \`caminhoes_ativo_idx\`(\`ativo\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

function slugify(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}
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
  await prisma.$executeRawUnsafe(TABELA);

  // montar linhas válidas
  const linhas = [];
  const vistos = new Set();
  for (const d of dados) {
    const codigo = txt(d.codigo, 40);
    const nome = txt(d.nome, 500);
    if (!codigo || !nome || vistos.has(codigo)) continue;
    vistos.add(codigo);
    let montadora = txt(d.montadora, 80);
    let montadora_slug = txt(d.montadora_slug, 80);
    if (!montadora || montadora === "?") {
      montadora = "OUTRAS";
      montadora_slug = "outras";
    }
    if (!montadora_slug) montadora_slug = slugify(montadora);
    let grupo = txt(d.grupo, 90);
    let grupo_slug = txt(d.grupo_slug, 90);
    if (!grupo || grupo === "?") {
      grupo = "OUTROS";
      grupo_slug = "outros";
    }
    if (!grupo_slug) grupo_slug = slugify(grupo);
    linhas.push({
      codigo,
      referencia: txt(d.referencia, 2000),
      nome,
      montadora,
      montadora_slug,
      grupo,
      grupo_slug,
      aplicacao: txt(d.aplicacao, 2000),
      fabricante: txt(d.fabricante, 300),
      imagem: txt(d.imagem, 2000),
      slug: (slugify(nome) + "-" + codigo).slice(0, 191),
      origem_url: txt(d.url, 2000),
    });
  }
  console.log("linhas válidas:", linhas.length);

  const LOTE = 500;
  let feitos = 0;
  for (let i = 0; i < linhas.length; i += LOTE) {
    const lote = linhas.slice(i, i + LOTE);
    const tuplas = lote.map(
      (r) => Prisma.sql`(${r.codigo},${r.referencia},${r.nome},${r.montadora},${r.montadora_slug},
        ${r.grupo},${r.grupo_slug},${r.aplicacao},${r.fabricante},${r.imagem},${r.slug},${r.origem_url})`,
    );
    await prisma.$executeRaw`INSERT INTO caminhoes
      (codigo, referencia, nome, montadora, montadora_slug, grupo, grupo_slug, aplicacao, fabricante, imagem, slug, origem_url)
      VALUES ${Prisma.join(tuplas)}
      ON DUPLICATE KEY UPDATE
        referencia=VALUES(referencia), nome=VALUES(nome), montadora=VALUES(montadora),
        montadora_slug=VALUES(montadora_slug), grupo=VALUES(grupo), grupo_slug=VALUES(grupo_slug),
        aplicacao=VALUES(aplicacao), fabricante=VALUES(fabricante), imagem=VALUES(imagem),
        slug=VALUES(slug), origem_url=VALUES(origem_url)`;
    feitos += lote.length;
    if (feitos % 5000 === 0 || feitos === linhas.length) console.log("inseridos:", feitos);
  }

  const [{ n }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM caminhoes`);
  console.log("TOTAL na tabela caminhoes:", Number(n));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERRO:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
