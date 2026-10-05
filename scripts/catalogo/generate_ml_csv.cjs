const fs = require("fs");

function parseCSVLine(line) {
  const parts = line.split(";");
  if (parts.length < 8) return null;
  return {
    sku: parts[0].trim(),
    nome: parts[1].replace(/^"|"$/g, "").trim(),
    categoria: parts[2].replace(/^"|"$/g, "").trim(),
    marca: parts[3].replace(/^"|"$/g, "").trim(),
    preco: parts[4] ? parseFloat(parts[4]) : null,
    imagem: parts[5].replace(/^"|"$/g, "").trim(),
    descricao: parts[6].replace(/^"|"$/g, "").trim(),
    linha: parts[7].replace(/^"|"$/g, "").trim(),
  };
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

async function main() {
  console.log("Iniciando conversão para Mercado Livre...");

  const csvText = fs.readFileSync("dados/produtos_extraidos.csv", "utf8");
  const lines = csvText.split("\n").filter((l) => l.trim().length > 0);

  const mlRows = [];
  mlRows.push(
    "SKU,Título,Marca,Preço,Estoque,Condição,Link da Imagem,Descrição",
  );

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const data = parseCSVLine(lines[i]);
    if (!data) continue;

    if (
      !data.nome ||
      data.nome === "1" ||
      data.nome.length < 3 ||
      !data.imagem ||
      !data.imagem.startsWith("http")
    ) {
      continue;
    }

    const sku = data.sku;
    // ML title limits to 60 characters usually, but let's keep full for now
    const titulo = data.nome;
    const marca = data.marca || "Marca Genérica";
    const preco = data.preco ? data.preco.toFixed(2) : "0.00";
    const estoque = 100;
    const condicao = "Novo";
    const imagem = data.imagem;
    const descricao = data.descricao || titulo;

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

  fs.writeFileSync("dados/catalogo_mercado_livre.csv", mlRows.join("\n"));
  console.log(`Gerado catalogo_mercado_livre.csv com ${count} produtos!`);
}

main().catch(console.error);
