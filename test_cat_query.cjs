const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log('Testing "Engrenagens e Transmissão"...');

  const count = await prisma.agricolas.count({
    where: { categoria: { contains: "Engrenagens e Transmissão" } },
  });
  console.log(`Contains "Engrenagens e Transmissão": ${count}`);

  const countExact = await prisma.agricolas.count({
    where: { categoria: "Engrenagens e Transmissão" },
  });
  console.log(`Exact "Engrenagens e Transmissão": ${countExact}`);

  const sample = await prisma.agricolas.findFirst({
    where: { categoria: { contains: "Transmissão" } },
    select: { categoria: true, sku: true },
  });
  console.log("Sample:", sample);

  await prisma.$disconnect();
}
main();
