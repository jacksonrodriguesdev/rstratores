const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  try {
    const where = { AND: [] };
    const categoria = ["Freios"];
    where.AND.push({ OR: categoria.map((c) => ({ categoria: { contains: c } })) });

    const queryOptions = {
      where,
      orderBy: { sku: "asc" },
      take: 31,
      include: { images: { orderBy: { sort_order: "asc" }, take: 1 } },
    };

    console.log("Query options:", JSON.stringify(queryOptions, null, 2));
    const res = await prisma.agricolas.findMany(queryOptions);
    console.log("Total returned:", res.length);
  } catch (e) {
    console.error("Prisma Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
