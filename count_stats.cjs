const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function count() {
  const prods = await p.products.count({ where: { linha: 'PELLEGRINO' } });
  const imgs = await p.products_img.count({ 
    where: { product: { linha: 'PELLEGRINO' } } 
  });
  console.log(`Produtos salvos: ${prods}`);
  console.log(`Registros de Imagem no BD: ${imgs}`);
}
count().finally(() => p.$disconnect());
