const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function listProducts(params) {
  const { linha, page = 1, pageSize = 8, hasImage } = params;

  const where = { AND: [] };

  if (hasImage) {
    where.AND.push({ imagem_principal: { not: null } });
    where.AND.push({ imagem_principal: { not: "" } });
  }

  if (where.AND.length === 0) {
    delete where.AND;
  }

  const queryOptions = {
    where,
    orderBy: { sku: "asc" },
    take: pageSize + 1,
    include: {
      images: { orderBy: { sort_order: "asc" }, take: 1 },
    },
  };

  try {
    console.time(`Query ${linha || "products"}`);
    let data;
    if (linha === "AGRICOLA") {
      data = await prisma.agricolas.findMany(queryOptions);
    } else {
      data = await prisma.products.findMany(queryOptions);
    }
    console.timeEnd(`Query ${linha || "products"}`);
    console.log(`Linha ${linha} retornou ${data.length} produtos.`);
  } catch (e) {
    console.error(`Erro na linha ${linha}:`, e);
  }
}

async function main() {
  console.log("Testando listProducts com filtros...");
  await listProducts({ linha: undefined, hasImage: true }); // ProductsGridBlock default
  await listProducts({ linha: "AGRICOLA", hasImage: true }); // Agricola filter
  await prisma.$disconnect();
}
main();
