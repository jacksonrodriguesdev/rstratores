const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  console.time("findMany sku-asc");
  await prisma.products.findMany({ orderBy: { sku: "asc" }, take: 12 });
  console.timeEnd("findMany sku-asc");
}

run().finally(() => prisma.$disconnect());
