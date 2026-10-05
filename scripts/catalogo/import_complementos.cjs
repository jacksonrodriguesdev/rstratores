const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * IMPORTADOR DE COMPLEMENTOS
 * ==========================
 * Importa os CSVs gerados pelo Robô Fatiador (complementos)
 * para o banco de dados via Prisma.
 */

async function importFile(file) {
  console.log(`\n=== Importando ${file} ===`);
  
  if (!fs.existsSync(file)) {
    console.log(`⚠️  Arquivo ${file} não encontrado. Pulando...`);
    return 0;
  }

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const rows = lines.slice(1); // pula cabeçalho
  
  if (rows.length === 0) {
    console.log(`⚠️  Arquivo ${file} está vazio. Pulando...`);
    return 0;
  }

  console.log(`  📋 Total de linhas: ${rows.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const inserts = [];
    
    for (const row of batch) {
      const cols = row.split(';');
      if (cols.length < 7) continue;
      
      const sku = cols[0].trim();
      const nome = cols[1].replace(/^"|"$/g, '').trim();
      const categoria = cols[2].replace(/^"|"$/g, '').trim(); 
      const marca = cols[3].replace(/^"|"$/g, '').trim();
      const precoStr = cols[4];
      const imagem_principal = cols[5].replace(/^"|"$/g, '').trim();
      const url = cols[6].replace(/^"|"$/g, '').trim();
      
      let preco_brl = parseFloat(precoStr);
      if (isNaN(preco_brl)) preco_brl = 0;
      
      inserts.push({
        sku, nome, categoria, marca, preco_brl, imagem_principal, url, estoque: 99
      });
    }
    
    try {
      await prisma.agricolas.createMany({
        data: inserts,
        skipDuplicates: true
      });
      successCount += inserts.length;
      console.log(`  ✅ Lote importado. Progresso: ${successCount} produtos.`);
    } catch (e) {
      console.log('  ❌ Erro no lote: ', e.message);
      errorCount += inserts.length;
    }
  }
  
  console.log(`  📊 Resultado: ${successCount} importados | ${errorCount} erros`);
  return successCount;
}

async function run() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║    📦 IMPORTADOR DE COMPLEMENTOS - FATIADOR             ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const arquivos = [
    'dados/valtra_complemento.csv',
    'dados/new_holland_complemento.csv', 
    'dados/john_deere_complemento.csv'
  ];
  
  let totalGeral = 0;
  for (const file of arquivos) {
    totalGeral += await importFile(file);
  }
  
  console.log(`\n🎯 TOTAL GERAL IMPORTADO: ${totalGeral} produtos novos`);
  console.log('\n💡 Rodando generate_facets.cjs para atualizar filtros...');
  
  await prisma.$disconnect();
}

run();
