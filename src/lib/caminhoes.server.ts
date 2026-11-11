// Linha de peças para CAMINHÕES (fornecedor Roni Chaves). As peças ficam na tabela `products`
// com linha='CAMINHOES' e aparecem na loja normal (/loja) pelo filtro "Línea", traduzidas na
// exibição (pecas-es.ts) e sem preço ("consultar"). Aqui fica só o liga/desliga da linha inteira
// (chave `caminhoes_ativa` em configuracoes) e a contagem para o admin.

const CHAVE = "caminhoes_ativa";

// A linha inteira está ligada? Padrão: desligada até o admin ativar.
export async function linhaCaminhoesAtiva(): Promise<boolean> {
  const { prisma } = await import("./prisma");
  const r = await prisma.configuracoes.findUnique({ where: { chave: CHAVE } });
  return r?.valor === "1";
}

export async function definirLinhaCaminhoes(ativa: boolean): Promise<void> {
  const { prisma } = await import("./prisma");
  await prisma.configuracoes.upsert({
    where: { chave: CHAVE },
    create: { chave: CHAVE, valor: ativa ? "1" : "0" },
    update: { valor: ativa ? "1" : "0" },
  });
}

export async function contagemCaminhoes(): Promise<{ total: number; montadoras: number }> {
  const { prisma } = await import("./prisma");
  const r = await prisma.$queryRawUnsafe<{ total: bigint; montadoras: bigint }[]>(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT marca) AS montadoras FROM products WHERE linha='CAMINHOES'`,
  );
  return { total: Number(r[0]?.total || 0), montadoras: Number(r[0]?.montadoras || 0) };
}
