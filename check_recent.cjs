const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const latest = await p.products.findMany({
    where: { linha: 'PELLEGRINO' },
    orderBy: { created_at: 'desc' },
    take: 10,
    select: { nome: true, peso: true, altura: true }
  });
  console.table(latest);
}
run().finally(() => p.$disconnect());
