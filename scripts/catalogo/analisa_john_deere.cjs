const fs = require('fs');

if (!fs.existsSync('dados/john_deere.csv')) {
  console.log("O arquivo 'dados/john_deere.csv' ainda não foi gerado ou não foi encontrado.");
  process.exit();
}

const conteudo = fs.readFileSync('dados/john_deere.csv', 'utf8');
const linhas = conteudo.split('\n').filter(l => l.trim() !== '');

if (linhas.length <= 1) {
  console.log("O arquivo CSV existe, mas parece não ter dados capturados ainda.");
  process.exit();
}

// Subtraindo 1 para tirar o cabeçalho
console.log(`\n==========================================`);
console.log(`📊 TOTAL DE PRODUTOS JOHN DEERE CAPTURADOS: ${linhas.length - 1}`);
console.log(`==========================================\n`);

console.log("🔍 AMOSTRA DOS PRIMEIROS 5 PRODUTOS:");
for (let i = 1; i <= Math.min(5, linhas.length - 1); i++) {
  const colunas = linhas[i].split(';');
  
  // Limpando as aspas duplas do nome para ficar mais bonito na tela
  const nome = colunas[1] ? colunas[1].replace(/^"|"$/g, '') : "Sem Nome";
  const marca = colunas[3] ? colunas[3].replace(/^"|"$/g, '') : "Sem Marca";
  
  console.log(`\n--- PRODUTO ${i} ---`);
  console.log(`🛒 SKU:   ${colunas[0]}`);
  console.log(`📝 NOME:  ${nome}`);
  console.log(`🏷️  MARCA: ${marca}`);
  console.log(`💰 PREÇO: R$ ${colunas[4]}`);
}

console.log(`\n✅ O arquivo john_deere.csv está pronto para uso!\n`);
