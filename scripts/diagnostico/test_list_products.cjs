const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function listProducts(params) {
  const { linha, page = 1, pageSize = 10 } = params;

  const where = { AND: [] };

  if (where.AND.length === 0) {
    delete where.AND;
  }

  const queryOptions = {
    where,
    take: pageSize,
    include: {
      images: { orderBy: { sort_order: "asc" }, take: 1 },
    },
  };

  try {
    let data;
    if (linha === "AGRICOLA") {
      data = await prisma.agricolas.findMany(queryOptions);
    } else {
      data = await prisma.products.findMany(queryOptions);
    }
    console.log(`Linha ${linha} retornou ${data.length} produtos.`);
  } catch (e) {
    console.error(`Erro na linha ${linha}:`, e);
  }
}

async function main() {
  console.log("Testando listProducts...");
  await listProducts({ linha: "AGRICOLA" });
  await listProducts({ linha: "PELLEGRINO" });
  await prisma.$disconnect();
}
main();
