const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.products.count();
  console.log(`Total de produtos: ${count}`);

  const byLinha = await prisma.products.groupBy({
    by: ['linha'],
    _count: { linha: true },
  });
  console.log("Contagem por linha:");
  console.table(byLinha);

  const byCategoria = await prisma.products.groupBy({
    by: ['categoria'],
    _count: { categoria: true },
    orderBy: { _count: { categoria: 'desc' } },
    take: 10,
  });
  console.log("Contagem por categoria (Top 10):");
  console.table(byCategoria);
  
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
