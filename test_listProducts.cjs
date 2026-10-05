const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.time("findMany");
    const data = await prisma.agricolas.findMany({
      where: { AND: [{ categoria: { contains: "Freios" } }] },
      orderBy: { sku: "asc" },
      take: 37,
      include: { images: { orderBy: { sort_order: "asc" }, take: 1 } },
    });
    console.timeEnd("findMany");
    console.log("Got data length:", data.length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
