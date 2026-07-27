const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.time('findMany created-desc');
    await prisma.products.findMany({ orderBy: { created_at: 'desc' }, take: 12 });
    console.timeEnd('findMany created-desc');

    console.time('findMany nome-asc');
    await prisma.products.findMany({ orderBy: { nome: 'asc' }, take: 12 });
    console.timeEnd('findMany nome-asc');
}

run().finally(() => prisma.$disconnect());
