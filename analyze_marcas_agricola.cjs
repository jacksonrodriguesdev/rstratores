const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Montadoras em agricolas_aplicacao ===");
  const montadoras = await prisma.agricolas_aplicacao.groupBy({
    by: ['montadora'],
    _count: { sku: true },
    orderBy: { _count: { sku: 'desc' } }
  });
  montadoras.forEach(m => console.log(`- ${m.montadora}: ${m._count.sku} aplicações`));

  console.log("\n=== Marcas na tabela agricolas ===");
  const marcas = await prisma.agricolas.groupBy({
    by: ['marca'],
    _count: { sku: true },
    orderBy: { _count: { sku: 'desc' } }
  });
  marcas.forEach(m => console.log(`- ${m.marca || "NULL"}: ${m._count.sku} produtos`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
