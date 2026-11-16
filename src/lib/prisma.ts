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
// derrubando a home com 500. Um $connect() único serializa esse início; quem precisa de
// garantia de ordem pode `await prismaReady` antes de disparar queries em paralelo.
export const prismaReady: Promise<void> =
  globalForPrisma.prismaReady ??
  prisma.$connect().catch((e) => {
    console.error("[prisma] conexão inicial falhou:", (e as Error)?.message);
  });
globalForPrisma.prismaReady = prismaReady;
