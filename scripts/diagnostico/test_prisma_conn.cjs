const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Testing prisma connection...");
  try {
    const categories = await prisma.categories.findMany({ take: 5 });
    console.log("Categories:", categories.length);

    console.log("Testing agricolas groupBy...");
    const rawCats = await prisma.agricolas.groupBy({
      by: ["categoria"],
      _count: { categoria: true },
    });
    console.log("Raw cats length:", rawCats.length);

    console.log("Prisma is fine!");
  } catch (e) {
    console.error("Prisma Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
