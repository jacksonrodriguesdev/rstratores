const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.products.count();
  console.log("Products:", count);
  const imgCount = await prisma.product_images.count();
  console.log("Images:", imgCount);
}
main().finally(() => prisma.$disconnect());
