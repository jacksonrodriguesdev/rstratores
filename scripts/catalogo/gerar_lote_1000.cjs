const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

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
  console.log("Buscando produtos no banco de dados...");
  
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

  const uploadsDir = path.join(process.cwd(), "uploads");
  const loteDir = path.join(process.cwd(), "lote1_imagens");
  
  // Criar pasta do lote se não existir
  if (!fs.existsSync(loteDir)) {
    fs.mkdirSync(loteDir, { recursive: true });
  }

  const mlRows = [];
  mlRows.push("SKU,Título,Marca,Preço,Estoque,Condição,Link da Imagem,Descrição");

  let count = 0;
  
  console.log("Separando 1000 produtos e copiando imagens...");

  for (const p of produtos) {
    if (count >= 1000) break; // Parar ao atingir 1000

    if (!p.nome || p.nome === "1" || !p.imagem_principal) {
      continue;
    }

    // O caminho salvo no banco costuma ser "pellegrino/arquivo.jpg"
    // Vamos garantir que estamos pegando apenas o nome do arquivo para encontrar na pasta
    const filename = path.basename(p.imagem_principal);
    const sourcePath = path.join(uploadsDir, "pellegrino", filename);
    const destPath = path.join(loteDir, filename);

    // Verificar se a imagem realmente existe no seu computador
    if (fs.existsSync(sourcePath)) {
      // Copiar a imagem para a nova pasta
      fs.copyFileSync(sourcePath, destPath);

      const sku = p.sku;
      const titulo = p.nome.substring(0, 60);
      const marca = p.marca || "Marca Genérica";
      const preco = p.preco_brl ? p.preco_brl.toFixed(2) : "0.00";
      const estoque = p.estoque || 100;
      const condicao = "Novo";
      
      // Criar um link placeholder para o Cloud
      // Você vai substituir 'https://sua-nuvem.com/lote1/' pelo link real depois
      const imagemUrl = `https://sua-nuvem.com/lote1/${filename}`;
      const descricao = p.descricao || p.nome;

      const row = [
        escapeCSV(sku),
        escapeCSV(titulo),
        escapeCSV(marca),
        escapeCSV(preco),
        escapeCSV(estoque),
        escapeCSV(condicao),
        escapeCSV(imagemUrl),
        escapeCSV(descricao),
      ].join(",");

      mlRows.push(row);
      count++;
    }
  }

  fs.writeFileSync("dados/catalogo_ml_lote1.csv", mlRows.join("\n"));
  
  console.log(`\nSUCESSO!`);
  console.log(`- ${count} produtos selecionados e imagens copiadas para a pasta: ${loteDir}`);
  console.log(`- Planilha gerada: catalogo_ml_lote1.csv`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
