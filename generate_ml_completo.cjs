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
  console.log("Conectando ao banco de dados e buscando produtos PELLEGRINO...");

  // Buscar todos os produtos da linha PELLEGRINO
  const produtos = await prisma.products.findMany({
    where: { linha: "PELLEGRINO" },
    select: {
      sku: true,
      nome: true,
      marca: true,
      preco_brl: true,
      imagem_principal: true,
      descricao: true,
    }
  });

  console.log(`Encontrados ${produtos.length} produtos. Gerando arquivo CSV...`);

  const mlRows = [];
  mlRows.push("SKU,Título,Marca,Preço,Estoque,Condição,Link da Imagem,Descrição");

  let count = 0;
  for (const p of produtos) {
    if (!p.nome || p.nome === "1" || !p.imagem_principal || !p.imagem_principal.startsWith("http")) {
      continue;
    }

    const sku = p.sku;
    const titulo = p.nome.substring(0, 60); // ML limite de título é 60 caracteres
    const marca = p.marca || "Marca Genérica";
    const preco = p.preco_brl ? p.preco_brl.toFixed(2) : "0.00";
    const estoque = 100;
    const condicao = "Novo";
    const imagem = p.imagem_principal;
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

  fs.writeFileSync("catalogo_mercado_livre_103k.csv", mlRows.join("\n"));
  console.log(`Sucesso! Arquivo catalogo_mercado_livre_103k.csv gerado com ${count} produtos válidos!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
