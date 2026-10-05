import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando sincronização de categorias...");

  // 1. Buscar todas as categorias únicas que os produtos têm no momento
  const uniqueCategories = await prisma.products.findMany({
    select: { categoria: true },
    distinct: ["categoria"],
    where: { categoria: { not: null } },
  });

  const categoryNames = uniqueCategories.map((c) => c.categoria).filter(Boolean);
  console.log(`Encontradas ${categoryNames.length} categorias únicas nos produtos.`);

  for (const catName of categoryNames) {
    if (!catName || catName.trim() === "") continue;

    // 2. Verificar se a categoria já existe na tabela de categorias
    let category = await prisma.categories.findFirst({
      where: { nome: catName.trim() },
    });

    // Se não existir, criar
    if (!category) {
      console.log(`Criando nova categoria: ${catName}`);
      category = await prisma.categories.create({
        data: { nome: catName.trim() },
      });
    }

    // 3. Atualizar os produtos vinculando o category_id
    const updated = await prisma.products.updateMany({
      where: {
        categoria: catName,
        category_id: null,
      },
      data: {
        category_id: category.id,
      },
    });

    if (updated.count > 0) {
      console.log(`Vinculados ${updated.count} produtos à categoria ${catName}`);
    }
  }

  console.log("Sincronização concluída com sucesso!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
