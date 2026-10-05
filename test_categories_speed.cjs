const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.time("findManyWithoutInclude");
  await prisma.categories.findMany();
  console.timeEnd("findManyWithoutInclude");

  console.time("findManyWithInclude");
  await prisma.categories.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
  console.timeEnd("findManyWithInclude");
}
main().finally(() => prisma.$disconnect());
