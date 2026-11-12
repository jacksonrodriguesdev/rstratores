// Linhas extras da loja que ficam na tabela `products` (além da agrícola, que é `agricolas`):
// CAMINHOES (Roni Chaves) e DIESEL (Bodipasa). Cada uma liga/desliga por uma chave em
// `configuracoes`, aparece no filtro "Línea" da loja, sem preço ("consultar"), traduzida na
// exibição. Para somar outra linha no futuro, basta adicionar aqui.
export const LINHAS_EXTRAS = [
  { id: "CAMINHOES", rotulo: "Camiones", rotuloPt: "Caminhões", chave: "caminhoes_ativa" },
  { id: "DIESEL", rotulo: "Diesel", rotuloPt: "Diesel", chave: "diesel_ativa" },
] as const;
export type LinhaExtraId = (typeof LINHAS_EXTRAS)[number]["id"];

export function linhaExtra(id?: string | null) {
  return LINHAS_EXTRAS.find((l) => l.id === id) ?? null;
}

export async function linhaExtraAtiva(id: string): Promise<boolean> {
  const l = linhaExtra(id);
  if (!l) return false;
  const { prisma } = await import("./prisma");
  const r = await prisma.configuracoes.findUnique({ where: { chave: l.chave } });
  return r?.valor === "1";
}

export async function definirLinhaExtra(id: string, ativa: boolean): Promise<void> {
  const l = linhaExtra(id);
  if (!l) throw new Error("Linha inválida");
  const { prisma } = await import("./prisma");
  await prisma.configuracoes.upsert({
    where: { chave: l.chave },
    create: { chave: l.chave, valor: ativa ? "1" : "0" },
    update: { valor: ativa ? "1" : "0" },
  });
}

// Linhas extras atualmente ligadas (para a loja montar o filtro "Línea").
export async function linhasExtrasAtivas() {
  const res = await Promise.all(
    LINHAS_EXTRAS.map(async (l) => ((await linhaExtraAtiva(l.id)) ? l : null)),
  );
  return res.filter(Boolean) as { id: string; rotulo: string; rotuloPt: string; chave: string }[];
}

export async function contagemLinha(
  id: string,
): Promise<{ total: number; marcas: number; segmentos: number }> {
  const { prisma } = await import("./prisma");
  const r = await prisma.$queryRawUnsafe<{ total: bigint; marcas: bigint; segmentos: bigint }[]>(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT marca) AS marcas, COUNT(DISTINCT categoria) AS segmentos
     FROM products WHERE linha=?`,
    id,
  );
  return {
    total: Number(r[0]?.total || 0),
    marcas: Number(r[0]?.marcas || 0),
    segmentos: Number(r[0]?.segmentos || 0),
  };
}
