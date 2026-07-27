const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function checkNull() {
  const c = await p.products.count({ where: { linha: 'PELLEGRINO', peso: null } });
  console.log('Items with NO weight:', c);
  const cAll = await p.products.count({ where: { linha: 'PELLEGRINO' } });
  console.log('Total PELLEGRINO items:', cAll);
}
checkNull().finally(() => p.$disconnect());
