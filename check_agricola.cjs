const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- Analyzing Agricola Categories ---");

  // Try to get categories from the categories table first
  const cats = await prisma.categories.findMany({
    where: { linha: "AGRICOLA" },
    include: {
      _count: {
        select: {
          agricolas: true,
          products: true,
        },
      },
      children: true,
    },
  });

  console.log(`Found ${cats.length} categories with linha='AGRICOLA'`);
  for (const cat of cats) {
    console.log(
      `- ${cat.nome} (ID: ${cat.id}) | Parent: ${cat.parent_id} | Agricolas count: ${cat._count.agricolas} | Products count: ${cat._count.products}`,
    );
  }

  console.log("\n--- Analyzing Agricolas Table ---");
  const agricolasCount = await prisma.agricolas.count();
  console.log(`Total agricolas in table: ${agricolasCount}`);

  const distinctCats = await prisma.agricolas.groupBy({
    by: ["categoria"],
    _count: {
      sku: true,
    },
    orderBy: {
      _count: {
        sku: "desc",
      },
    },
  });

  console.log("\nDistinct categories in agricolas table:");
  distinctCats.forEach((c) => {
    console.log(`- ${c.categoria || "NULL"}: ${c._count.sku} products`);
  });

  console.log("\n--- Analyzing Products Table (linha=AGRICOLA) ---");
  const productsCount = await prisma.products.count({
    where: { linha: "AGRICOLA" },
  });
  console.log(`Total products with linha='AGRICOLA': ${productsCount}`);

  if (productsCount > 0) {
    const distinctProdCats = await prisma.products.groupBy({
      by: ["categoria"],
      where: { linha: "AGRICOLA" },
      _count: {
        sku: true,
      },
      orderBy: {
        _count: {
          sku: "desc",
        },
      },
    });

    console.log("\nDistinct categories in products table (linha=AGRICOLA):");
    distinctProdCats.forEach((c) => {
      console.log(`- ${c.categoria || "NULL"}: ${c._count.sku} products`);
    });
  }

  // Get some samples
  console.log("\n--- Sample Agricola Products (Names) ---");
  const samples = await prisma.agricolas.findMany({
    take: 20,
    select: { nome: true, categoria: true },
  });
  samples.forEach((s) => console.log(`[${s.categoria}] ${s.nome}`));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
