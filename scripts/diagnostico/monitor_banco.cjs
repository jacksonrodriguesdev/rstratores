const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const readline = require("readline");

const META_TOTAL = 105000;

async function monitor() {
  console.log("Iniciando monitoramento do banco de dados...\n");
  console.log("Pressione Ctrl+C para sair.\n");

  setInterval(async () => {
    try {
      const count = await prisma.products.count();
      const percent = ((count / META_TOTAL) * 100).toFixed(2);

      // Desenhar a barra de progresso
      const barLength = 40;
      const filledLength = Math.floor((count / META_TOTAL) * barLength);
      const emptyLength = barLength - filledLength;

      const bar = "█".repeat(Math.max(0, filledLength)) + "░".repeat(Math.max(0, emptyLength));

      // Limpar a linha atual e escrever a nova
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        `🚜 Salvando Peças: [${bar}] ${count.toLocaleString("pt-BR")} / ${META_TOTAL.toLocaleString("pt-BR")} (${percent}%)`,
      );

      if (count >= META_TOTAL) {
        console.log("\n\n🎉 META ATINGIDA! Todos os 105.000 itens foram extraídos com sucesso!");
        process.exit(0);
      }
    } catch (e) {
      // Ignorar erros temporários de conexão com o banco
    }
  }, 2000); // Atualiza a cada 2 segundos
}

monitor();
