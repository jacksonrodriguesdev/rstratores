const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixBrands() {
  const result1 = await prisma.agricolas.updateMany({
    where: { marca: "Não Informada" },
    data: { marca: "Massey Ferguson" },
  });
  const result2 = await prisma.agricolas.updateMany({
    where: { marca: "REDEPARTS" },
    data: { marca: "Massey Ferguson" },
  });
  console.log("Marcas alteradas:", result1.count + result2.count);
}

fixBrands()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
