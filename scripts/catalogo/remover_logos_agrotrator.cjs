// Tira do banco local as fotos do agrotrator que são só a logo da loja (lista em
// dados/precos_agrotrator/fotos_logo.json, de scripts/extratores/agrotrator_fotos_logo.cjs).
// A peça fica com a próxima foto real ou sem foto ("Foto próximamente").
// Na produção não precisa: o SQL gerado por importar_agrotrator_completo.cjs já sai sem as logos.
//
// Uso: node scripts/catalogo/remover_logos_agrotrator.cjs [--aplicar]

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const RAIZ = path.join(__dirname, "../..");
const APLICAR = process.argv.includes("--aplicar");

(async () => {
  const prisma = new PrismaClient();
  try {
    const j = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados/precos_agrotrator/fotos_logo.json"), "utf8"));
    const ruins = [...new Set([...j.logos, ...j.quebradas])];
    const linhas = [];
    for (let i = 0; i < ruins.length; i += 1000) {
      linhas.push(...(await prisma.agricolas_img.findMany({ where: { image_path: { in: ruins.slice(i, i + 1000) } }, select: { id: true, sku: true } })));
    }
    const skus = [...new Set(linhas.map((l) => l.sku))];
    console.log(`Fotos-logo no banco local: ${linhas.length} em ${skus.length} peças`);
    if (!APLICAR) return console.log("Simulação: use --aplicar para remover.");

    for (let i = 0; i < linhas.length; i += 1000) await prisma.agricolas_img.deleteMany({ where: { id: { in: linhas.slice(i, i + 1000).map((l) => l.id) } } });
    let semFoto = 0;
    for (const sku of skus) {
      const prox = await prisma.agricolas_img.findFirst({ where: { sku }, orderBy: { sort_order: "asc" }, select: { image_path: true } });
      if (!prox) semFoto++;
      await prisma.agricolas.update({ where: { sku }, data: { imagem_principal: prox?.image_path ?? null } });
    }
    console.log(`Removidas. ${skus.length - semFoto} peças ficaram com outra foto real; ${semFoto} ficaram sem foto.`);
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
