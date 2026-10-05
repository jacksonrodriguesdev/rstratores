const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const file = 'dados/john_deere.csv';
  console.log(`Iniciando a importação do arquivo ${file}...`);
  
  if (!fs.existsSync(file)) {
    console.error('Arquivo não encontrado!');
    process.exit(1);
  }

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  // Pula a primeira linha (cabeçalho)
  const rows = lines.slice(1);
  
  console.log(`Total de linhas a processar: ${rows.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Vamos usar transações em lotes para não sobrecarregar o DB e ir mais rápido
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    // Preparar os dados
    const inserts = [];
    
    for (const row of batch) {
      // Split pelo separador ';' mas considerando que pode haver ponto-e-vírgula dentro de aspas duplas,
      // O split simples por ';' aqui funciona pois na extração não colocamos ';' dentro do conteúdo string.
      const cols = row.split(';');
      if (cols.length < 7) continue;
      
      const sku = cols[0].trim();
      const nome = cols[1].replace(/^"|"$/g, '').trim();
      // O usuário quer a categoria como John Deere ou a categoria estava Indefinida? 
      // Vamos colocar Categoria como 'John Deere' para os filtros do painel capturarem
      const categoria = 'John Deere'; 
      const marca = cols[3].replace(/^"|"$/g, '').trim();
      const precoStr = cols[4];
      const imagem_principal = cols[5].replace(/^"|"$/g, '').trim();
      const url = cols[6].replace(/^"|"$/g, '').trim();
      
      let preco_brl = parseFloat(precoStr);
      if (isNaN(preco_brl)) preco_brl = 0;
      
      inserts.push({
        sku,
        nome,
        categoria,
        marca,
        preco_brl,
        imagem_principal,
        url,
        estoque: 99 // mock
      });
    }
    
    try {
      await prisma.agricolas.createMany({
        data: inserts,
        skipDuplicates: true // ignora se o SKU já existir
      });
      successCount += inserts.length;
      console.log(`Lote ${Math.floor(i/BATCH_SIZE)+1} importado. Total progresso: ${successCount} produtos.`);
    } catch (e) {
      console.log('Erro no lote: ', e.message);
      errorCount += inserts.length;
    }
  }
  
  console.log('--- Resumo da Importação ---');
  console.log(`Sucessos: ${successCount}`);
  console.log(`Erros: ${errorCount}`);
  
  console.log('\nImportação finalizada! Em seguida você deve rodar o gerador de filtros.');
  
  await prisma.$disconnect();
}

run();
