const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importFile(file) {
  console.log(`\n=== Iniciando a importação de ${file} ===`);
  
  if (!fs.existsSync(file)) {
    console.error(`Arquivo ${file} não encontrado. Pulando...`);
    return;
  }

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const rows = lines.slice(1); // pula cabeçalho
  
  console.log(`Total de linhas: ${rows.length}`);
  
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
      console.log(`Lote importado. Progresso: ${successCount} produtos.`);
    } catch (e) {
      console.log('Erro no lote: ', e.message);
      errorCount += inserts.length;
    }
  }
  console.log(`> Sucessos: ${successCount} | Erros: ${errorCount}`);
}

async function run() {
  const arquivos = ['dados/case.csv', 'dados/valtra.csv', 'dados/new_holland.csv', 'dados/ford.csv', 'dados/agrale.csv'];
  for (const file of arquivos) {
    await importFile(file);
  }
  console.log('\n--- Importação em Massa Finalizada ---');
  console.log('Lembre-se de rodar "node generate_facets.cjs" depois!');
  await prisma.$disconnect();
}

run();
