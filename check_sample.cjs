const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.products.findMany({
    where: { linha: "PELLEGRINO" },
    take: 5
  });
  console.log(JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
