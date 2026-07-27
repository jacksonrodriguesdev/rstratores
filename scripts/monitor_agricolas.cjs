const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function monitor() {
    console.clear();
    console.log("=========================================");
    console.log("🚜 MONITOR DE EXTRAÇÃO (LINHA AGRÍCOLA) 🚜");
    console.log("=========================================\n");

    try {
        const total = await prisma.agricolas.count();
        const comImagens = await prisma.agricolas_img.count();
        const aplicacoes = await prisma.agricolas_aplicacao.count();
        const similares = await prisma.agricolas_similar.count();

        console.log(`📦 Peças Agrícolas Cadastradas : ${total.toLocaleString('pt-BR')}`);
        console.log(`🖼️  Imagens Salvas             : ${comImagens.toLocaleString('pt-BR')}`);
        console.log(`🚜 Tratores/Máquinas Mapeados : ${aplicacoes.toLocaleString('pt-BR')}`);
        console.log(`🔗 Códigos Relacionados       : ${similares.toLocaleString('pt-BR')}`);

        if (total === 0) {
            console.log("\n⏳ Aguardando o robô inserir os primeiros registros...");
        } else {
            console.log("\n🔥 Extração a todo vapor!");
        }

    } catch (e) {
        console.log("Erro ao conectar no banco de dados:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Rodar imediatamente e depois a cada 3 segundos
monitor();
setInterval(monitor, 3000);
