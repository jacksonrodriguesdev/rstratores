const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOldProducts() {
    try {
        console.log('Limpando produtos não-Pellegrino...');
        const result = await prisma.$executeRaw`DELETE FROM products WHERE linha != 'PELLEGRINO' OR linha IS NULL`;
        console.log(`Foram deletados ${result} produtos antigos e todas as suas dependências.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanOldProducts();
