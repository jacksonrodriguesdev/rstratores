const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log('--- Analyzing "Geral" Agricola Products ---');

  const products = await prisma.agricolas.findMany({
    where: { categoria: "Geral" },
    select: { nome: true },
  });

  const keywords = {};

  for (const p of products) {
    if (!p.nome) continue;
    // Get the first word of the product name as a basic type/keyword
    const firstWord = p.nome.split(" ")[0].toUpperCase();

    // Clean up word
    const word = firstWord.replace(/[^A-Z]/g, "");
    if (word.length < 3) continue;

    keywords[word] = (keywords[word] || 0) + 1;
  }

  const sortedKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  console.log("\nTop 30 most common first words (potential categories):");
  for (const [word, count] of sortedKeywords) {
    console.log(`- ${word}: ${count}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
