const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testGetFacets(linha) {
  try {
    let rawCats, rawMarcas;
    if (linha === "AGRICOLA") {
      rawCats = await prisma.agricolas.groupBy({ by: ["categoria"], _count: { categoria: true } });
      rawMarcas = await prisma.agricolas.groupBy({ by: ["marca"], _count: { marca: true } });
    } else {
      rawCats = await prisma.products.groupBy({ by: ["categoria"], _count: { categoria: true } });
      rawMarcas = await prisma.products.groupBy({ by: ["marca"], _count: { marca: true } });
    }
    console.log(`Linha ${linha}: Categorias: ${rawCats.length}, Marcas: ${rawMarcas.length}`);
  } catch (e) {
    console.error(`Erro no getFacets para ${linha}:`, e);
  }
}

async function main() {
  await testGetFacets("AGRICOLA");
  await testGetFacets("AUTOMOTIVA");
  await prisma.$disconnect();
}
main();
