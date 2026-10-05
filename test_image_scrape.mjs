import { PrismaClient } from "@prisma/client";
import google from "googlethis";

const prisma = new PrismaClient();

async function run() {
  console.log("Selecionando 5 produtos sem imagem...");

  const produtos = await prisma.products.findMany({
    where: {
      OR: [{ imagem_principal: null }, { imagem_principal: "" }],
    },
    take: 5,
  });

  if (produtos.length === 0) {
    console.log("Todos os produtos ja possuem imagem!");
    return;
  }

  const atualizados = [];

  for (const produto of produtos) {
    const query = `${produto.sku} ${produto.nome}`;
    console.log(`\nBuscando imagem para: ${query}`);

    try {
      const images = await google.image(query, { safe: false });

      if (images && images.length > 0) {
        const url = images[0].url;
        console.log(`Imagem encontrada: ${url}`);

        await prisma.products.update({
          where: { sku: produto.sku },
          data: { imagem_principal: url },
        });

        atualizados.push({
          sku: produto.sku,
          nome: produto.nome,
          url: url,
        });
      } else {
        console.log("Nenhuma imagem encontrada.");
      }
    } catch (err) {
      console.error(`Erro ao buscar: ${err.message}`);
    }
  }

  console.log("\n=== RESULTADO (PESQUISE ESTES 5 PRODUTOS NO SITE) ===");
  atualizados.forEach((p) => {
    console.log(`SKU: ${p.sku} | Nome: ${p.nome}`);
    console.log(`Imagem Original: ${p.url}\n`);
  });

  await prisma.$disconnect();
}

run();
