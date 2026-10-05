const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const countComImagem = await prisma.agricolas.count({
    where: {
      imagem_principal: { not: null, not: "" },
    },
  });

  const countComImagemTabelaImg = await prisma.agricolas_img.count();

  const countTotal = await prisma.agricolas.count();

  console.log(`Total de Agricolas: ${countTotal}`);
  console.log(`Com imagem_principal: ${countComImagem}`);
  console.log(`Imagens na tabela agricolas_img: ${countComImagemTabelaImg}`);

  const productsCount = await prisma.products.count();
  console.log(`Total de Products: ${productsCount}`);
}

main().finally(() => prisma.$disconnect());
