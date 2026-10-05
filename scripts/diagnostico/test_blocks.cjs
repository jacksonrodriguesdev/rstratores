const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const blocks = await prisma.homepage_blocks.findMany({ orderBy: { position: "asc" } });
    console.log("Blocks found:", blocks.length);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
