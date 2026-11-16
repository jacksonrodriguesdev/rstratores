import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaReady: Promise<void> | undefined;
};

// Um único PrismaClient por processo (também em produção): em hospedagem compartilhada,
// instâncias duplicadas esgotam conexões e agravam panics do engine.
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;

// Aquece o engine uma vez no boot. Sem isso, no cold start (logo após o deploy reiniciar o
// Node) várias queries concorrentes competiam para iniciar o engine ("library already
// starting", libraryStarted: false) e provocavam o panic "PANIC: timer has gone away",
// derrubando a home com 500. Um $connect() único serializa esse início.
//
// IMPORTANTE: `prismaReady` NUNCA pode pendurar uma requisição. Se o banco estiver lento ou
// instável, o $connect() pode demorar/travar; por isso corremos contra um timeout curto. Quem
// faz `await prismaReady` espera no máximo esse tempo e segue — se o banco estiver fora, a
// query falha rápido e o chamador degrada (em vez de o app travar e dar 504).
const AQUECIMENTO_MS = 2500;
export const prismaReady: Promise<void> =
  globalForPrisma.prismaReady ??
  Promise.race([
    prisma.$connect().catch((e) => {
      console.error("[prisma] conexão inicial falhou:", (e as Error)?.message);
    }),
    new Promise<void>((resolve) => setTimeout(resolve, AQUECIMENTO_MS)),
  ]);
globalForPrisma.prismaReady = prismaReady;
