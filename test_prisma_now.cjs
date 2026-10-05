const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to Prisma...');
    const start = Date.now();
    const count = await prisma.products.count();
    console.log('Prisma products count:', count, 'in', Date.now() - start, 'ms');
    const blocks = await prisma.homepage_blocks.count();
    console.log('Prisma blocks count:', blocks);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
