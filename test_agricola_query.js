const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.agricolas.findMany({ take: 5, include: { images: true } });
  console.log("Result length:", result.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
