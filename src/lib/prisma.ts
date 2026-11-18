import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Um único PrismaClient por processo (também em produção): em hospedagem compartilhada,
// instâncias duplicadas esgotam conexões e agravam panics do engine.
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;

// Aquecimento best-effort do engine no boot (fire-and-forget). NUNCA é aguardado por nenhuma
// requisição — se o banco estiver lento/instável, isto não pode segurar nada. Ajuda só a
// iniciar o engine cedo no cold start; se falhar, as queries seguem normalmente (com conexão
// preguiçosa) e cada chamador trata o erro.
void prisma.$connect().catch(() => {});
