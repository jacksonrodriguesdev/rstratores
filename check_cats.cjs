const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const cats = await prisma.agricolas.groupBy({
    by: ['categoria'],
    _count: { categoria: true }
  });
  console.log(cats);
}

check().catch(console.error).finally(() => prisma.$disconnect());
