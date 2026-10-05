const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

async function main() {
  console.log("Buscando produtos PELLEGRINO (sem filtro rigoroso)...");

  const produtos = await prisma.products.findMany({
    where: { linha: "PELLEGRINO" },
    select: {
      sku: true,
      nome: true,
      marca: true,
      preco_brl: true,
      imagem_principal: true,
      descricao: true,
      estoque: true
    }
  });

  console.log(`Lidos ${produtos.length} produtos do banco.`);

  const mlRows = [];
  mlRows.push("SKU,Título,Marca,Preço,Estoque,Condição,Link da Imagem,Descrição");

  let count = 0;
  for (const p of produtos) {
    if (!p.nome || p.nome === "1") {
      continue; // Pular apenas os que estão vazios
    }

    const sku = p.sku;
    const titulo = p.nome.substring(0, 60);
    const marca = p.marca || "Marca Genérica";
    const preco = p.preco_brl ? p.preco_brl.toFixed(2) : "0.00";
    const estoque = p.estoque || 100;
    const condicao = "Novo";
    
    // Arrumar a imagem para ter HTTP
    let imagem = "";
    if (p.imagem_principal) {
      if (p.imagem_principal.startsWith("http")) {
        imagem = p.imagem_principal;
      } else {
        imagem = `https://seusite.com.br/${p.imagem_principal}`; // Placeholder
      }
    }
    
    const descricao = p.descricao || p.nome;

    const row = [
      escapeCSV(sku),
      escapeCSV(titulo),
      escapeCSV(marca),
      escapeCSV(preco),
      escapeCSV(estoque),
      escapeCSV(condicao),
      escapeCSV(imagem),
      escapeCSV(descricao),
    ].join(",");

    mlRows.push(row);
    count++;
  }

  fs.writeFileSync("dados/catalogo_mercado_livre_103k.csv", mlRows.join("\n"));
  console.log(`Gerado catalogo_mercado_livre_103k.csv com ${count} produtos!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
