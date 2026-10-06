// Reorganiza a página inicial para mostrar as peças com foto logo no começo e acrescenta
// carrosséis das categorias com mais fotos. Aplica no banco local e acrescenta o mesmo SQL
// ao final de scripts/importacao/agrotrator_producao.sql (um arquivo só para a produção).
// Uso: node --env-file=.env scripts/catalogo/home_com_fotos.cjs [--aplicar]
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const APLICAR = process.argv.includes("--aplicar");

const carrossel = (categoria, limite = 12) =>
  JSON.stringify({ segment: "AMBOS", onlyWithImages: true, limit: limite, rows: 1, ...(categoria && { categoria }) });

// Ordem final. Blocos existentes por tipo/título; os novos são criados se não existirem.
const ORDEM = [
  { type: "HERO_SLIDER" },
  { type: "CATEGORY_GRID" },
  { type: "PRODUCTS_CAROUSEL", title: "Lançamentos", novoTitulo: "Novedades", config: JSON.stringify({ segment: "AMBOS", onlyWithImages: true, limit: 16, rows: 1, sort: "created-desc" }) },
  { type: "FEATURES_STRIP" },
  { type: "PRODUCTS_CAROUSEL", title: "Engrenagens e Transmissão", config: carrossel("Engrenagens e Transmissão"), criar: true },
  { type: "ENVIO_DAC" },
  { type: "PRODUCTS_CAROUSEL", title: "Filtros" },
  { type: "PROMO_STRIP" },
  { type: "PRODUCTS_CAROUSEL", title: "Hidráulica e Pneumática", config: carrossel("Hidráulica e Pneumática"), criar: true },
  { type: "PROMO_BANNERS_DUPLOS" },
  { type: "PRODUCTS_CAROUSEL", title: "Rolamentos e Mancais" },
  { type: "CAROUSEL_MONTADORAS" },
  { type: "PRODUCTS_CAROUSEL", title: "Vedações", config: carrossel("Vedações"), criar: true },
  { type: "BUSCA_CODIGO" },
  { type: "DEPOIMENTOS" },
  { type: "BRANDS_CAROUSEL" },
  { type: "NEWSLETTER_INSTAGRAM" },
];

const q = (s) => (s == null ? "NULL" : `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`);
const onde = (b) => `type = ${q(b.type)}` + (b.title !== undefined ? ` AND title = ${q(b.title)}` : "");

(async () => {
  const prisma = new PrismaClient();
  const sql = ["", "-- Página inicial: peças com foto no começo e carrosséis por categoria (home_com_fotos.cjs)"];
  try {
    const blocos = await prisma.homepage_blocks.findMany();
    for (const [pos, b] of ORDEM.entries()) {
      const atual = blocos.find((x) => x.type === b.type && (b.title === undefined || x.title === b.title || x.title === b.novoTitulo));
      if (b.criar) {
        sql.push(
          `INSERT INTO homepage_blocks (type, active, position, title, config, created_at, updated_at) SELECT ${q(b.type)}, 1, ${pos}, ${q(b.title)}, ${q(b.config)}, NOW(), NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM homepage_blocks WHERE ${onde(b)});`,
        );
      }
      const set = [`position = ${pos}`, ...(b.novoTitulo ? [`title = ${q(b.novoTitulo)}`] : []), ...(b.config ? [`config = ${q(b.config)}`] : [])];
      sql.push(`UPDATE homepage_blocks SET ${set.join(", ")} WHERE ${onde(b)}${b.novoTitulo ? ` OR (type = ${q(b.type)} AND title = ${q(b.novoTitulo)})` : ""};`);
      if (!APLICAR) {
        console.log(pos, b.type, b.novoTitulo || b.title || "", atual ? `(bloco ${atual.id})` : b.criar ? "(novo)" : "(NÃO ENCONTRADO)");
        continue;
      }
      if (atual) {
        await prisma.homepage_blocks.update({
          where: { id: atual.id },
          data: { position: pos, ...(b.novoTitulo && { title: b.novoTitulo }), ...(b.config && { config: b.config }) },
        });
      } else if (b.criar) {
        await prisma.homepage_blocks.create({ data: { type: b.type, active: true, position: pos, title: b.title, config: b.config } });
      }
    }
    if (APLICAR) {
      const arq = "scripts/importacao/agrotrator_producao.sql";
      let atual = fs.readFileSync(arq, "utf8");
      const marca = "\n-- Página inicial: peças com foto";
      if (atual.includes(marca)) atual = atual.slice(0, atual.indexOf(marca));
      fs.writeFileSync(arq, atual.trimEnd() + "\n" + sql.join("\n") + "\n");
      console.log("Aplicado no banco local e acrescentado em", arq);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
