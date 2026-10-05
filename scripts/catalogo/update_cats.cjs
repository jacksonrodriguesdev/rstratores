const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateCats() {
  const result = await prisma.agricolas.updateMany({
    where: { categoria: null },
    data: { categoria: "Massey Ferguson" },
  });
  console.log("Registros atualizados para Massey Ferguson:", result.count);
}

updateCats()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
