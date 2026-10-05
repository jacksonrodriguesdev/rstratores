import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

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

async function main() {
  console.log("Iniciando processo...");

  // 1. Ler e organizar a lista
  const csvText = fs.readFileSync("dados/produtos_extraidos.csv", "utf8");
  const lines = csvText.split("\n").filter((l) => l.trim().length > 0);

  // Pular o cabeçalho (linha 0)
  const rows = [];
  let badCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const data = parseCSVLine(lines[i]);
    if (!data) continue;

    // Filtragem de qualidade (remover sem foto, sem titulo, ou titulo "1")
    if (
      !data.nome ||
      data.nome === "1" ||
      data.nome.length < 3 ||
      !data.imagem ||
      !data.imagem.startsWith("http")
    ) {
      badCount++;
      continue;
    }

    rows.push({
      sku: data.sku,
      nome: data.nome,
      categoria: data.categoria || null,
      marca: data.marca || null,
      preco_brl: data.preco,
      imagem_principal: data.imagem,
      descricao: data.descricao || null,
      linha: "AUTOMOTIVA", // Forçar
      estoque: 100, // Garantir que está disponível
    });
  }

  console.log(
    `Foram encontradas ${rows.length} peças válidas. E foram descartadas ${badCount} peças por falta de foto ou nome ruim.`,
  );

  if (rows.length === 0) {
    console.log("Nenhum produto válido encontrado. Parando.");
    return;
  }

  // 2. Zerar o banco de dados da linha Automotiva
  console.log("Deletando todo o banco de dados da linha AUTOMOTIVA atual...");
  const deleteResult = await prisma.products.deleteMany({
    where: { linha: "AUTOMOTIVA" },
  });
  console.log(`Deletados ${deleteResult.count} produtos antigos.`);

  // 3. Subir os novos
  console.log("Inserindo o novo lote organizado...");
  const chunkSize = 1000;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    try {
      // Usar createMany, usando skipDuplicates caso SKUs colidam (improvável no nosso caso)
      const insert = await prisma.products.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      totalInserted += insert.count;
      console.log(`Progresso: ${totalInserted}/${rows.length} inseridos...`);
    } catch (e) {
      console.error(`Erro ao inserir chunk na linha ${i}:`, e.message);
    }
  }

  console.log("CONCLUÍDO COM SUCESSO!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
