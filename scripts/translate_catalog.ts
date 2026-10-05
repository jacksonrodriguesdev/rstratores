import { PrismaClient } from "@prisma/client";
import { translate } from "@vitalets/google-translate-api";

const prisma = new PrismaClient();

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Iniciando tradução do catálogo...");

  // Buscar produtos que ainda não tem nome_es
  const products = await prisma.products.findMany({
    where: { nome_es: null },
    select: { sku: true, nome: true },
  });

  console.log(`Encontrados ${products.length} produtos para traduzir.`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const result = await translate(p.nome, { to: "es" });
      const translatedName = result.text;

      await prisma.products.update({
        where: { sku: p.sku },
        data: { nome_es: translatedName },
      });

      successCount++;
      console.log(`[${i + 1}/${products.length}] OK: ${p.nome} -> ${translatedName}`);

      // Pequeno delay para não bloquear a API do Google (Rate limit)
      await delay(500);
    } catch (err: any) {
      errorCount++;
      console.error(`[${i + 1}/${products.length}] ERRO ao traduzir SKU ${p.sku}: ${err.message}`);

      if (err.name === "TooManyRequestsError" || err.message.includes("429")) {
        console.log("Rate limit atingido. Pausando por 30 segundos...");
        await delay(30000);
      }
    }
  }

  console.log("Tradução finalizada!");
  console.log(`Sucesso: ${successCount}`);
  console.log(`Erros: ${errorCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
