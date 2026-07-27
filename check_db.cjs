const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.agricolas.count();
  console.log('TOTAL_ITENS:', count);
  
  const brands = await prisma.agricolas.groupBy({
    by: ['marca'],
    _count: { marca: true }
  });
  console.log('Marcas:', brands);
}

check().catch(console.error).finally(() => prisma.$disconnect());
