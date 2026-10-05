const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.agricolas.count();
  console.log("Total de produtos na base:", count);
  console.log("---------------------------------");

  const cats = await prisma.agricolas.groupBy({
    by: ["categoria"],
    _count: { categoria: true },
    orderBy: { _count: { categoria: "desc" } },
  });

  console.log("Top 15 categorias/marcas salvas:");
  cats.slice(0, 15).forEach((c) => {
    console.log(`- ${c.categoria || "Sem categoria"}: ${c._count.categoria} itens`);
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
