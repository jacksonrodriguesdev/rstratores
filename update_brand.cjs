const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateDB() {
  const result = await prisma.agricolas.updateMany({
    where: { marca: 'REDEPARTS' },
    data: { marca: 'Não Informada' }
  });
  console.log('Registros atualizados:', result.count);
}

updateDB().catch(console.error).finally(() => prisma.$disconnect());
