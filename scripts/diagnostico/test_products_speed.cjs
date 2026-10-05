const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Testing agricolas queries...");

  console.time("agricolas.findMany.noInclude");
  await prisma.agricolas.findMany({ take: 10 });
  console.timeEnd("agricolas.findMany.noInclude");

  console.time("agricolas.findMany.withInclude");
  await prisma.agricolas.findMany({
    take: 10,
    include: { images: { take: 1 } },
  });
  console.timeEnd("agricolas.findMany.withInclude");

  console.log("\nTesting products queries...");

  console.time("products.findMany.noInclude");
  await prisma.products.findMany({ take: 10 });
  console.timeEnd("products.findMany.noInclude");

  console.time("products.findMany.withInclude");
  await prisma.products.findMany({
    take: 10,
    include: { images: { take: 1 } },
  });
  console.timeEnd("products.findMany.withInclude");
}

main().finally(() => prisma.$disconnect());
