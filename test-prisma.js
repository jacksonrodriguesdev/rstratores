import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const data = {
      nome: "ALAVANCA REDUZIDA - FORD 6600",
      preco_brl: 259.99,
      categoria: "Ford",
      marca: "Produto Nacional",
      estoque: 10,
      peso: 1.0,
      url: "https://realtrator.com.br",
      imagem_principal: "https://4362.cdn.simplo7.net/img.jpg"
    };

    const result = await prisma.products.upsert({
      where: { sku: "7239" },
      create: { sku: "7239", ...data },
      update: data,
    });
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
