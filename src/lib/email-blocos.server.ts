// Peças dos blocos "Produtos" dos e-mails, com o preço do dia (inclui promoção e Black Friday).
// Roda na prévia do admin e uma vez por envio de campanha (todos os clientes recebem as mesmas).
import type { BlocoEmail } from "./email-blocos";
import type { ProdutoEmail } from "./email-template";

const comFoto = (img: string | null) => !!img && !/redeparts/i.test(img);

async function skusDoBloco(d: Record<string, any>, limite: number): Promise<string[]> {
  const { prisma } = await import("./prisma");
  const fonte = String(d.fonte || "ofertas");
  if (fonte === "manual")
    return (d.produtos ?? []).map((p: ProdutoEmail) => p?.sku).filter(Boolean);
  const precisa = limite * 4;
  const ordem = [{ imagem_principal: "desc" as const }, { estoque: "desc" as const }];
  const comPreco = { duplicado_de: null, preco_brl: { gt: 0 } };
  if (fonte === "campanha") {
    const { pecasDaCampanha } = await import("./campanha.server");
    const pecas = await pecasDaCampanha(limite);
    if (pecas.length) return pecas.map((p) => p.sku);
    // Sem campanha no ar: cai para as ofertas
    return skusDoBloco({ ...d, fonte: "ofertas" }, limite);
  }
  let where: any = comPreco;
  let orderBy: any = ordem;
  if (fonte === "ofertas") where = { ...comPreco, valor_promocional: { gt: 0 } };
  if (fonte === "categoria") where = { ...comPreco, categoria: String(d.alvo || "-") };
  if (fonte === "marca") where = { ...comPreco, marca: String(d.alvo || "-") };
  if (fonte === "novos") orderBy = [{ precificado_em: "desc" }, { updated_at: "desc" }];
  let rows = await prisma.agricolas.findMany({
    where,
    select: { sku: true, imagem_principal: true },
    orderBy,
    take: precisa,
  });
  // Ofertas sem nenhuma promoção cadastrada: peças com preço (com Black Friday no ar, já com desconto)
  if (!rows.length && fonte === "ofertas")
    rows = await prisma.agricolas.findMany({
      where: comPreco,
      select: { sku: true, imagem_principal: true },
      orderBy: ordem,
      take: precisa,
    });
  const lista = [
    ...rows.filter((r) => comFoto(r.imagem_principal)),
    ...rows.filter((r) => !comFoto(r.imagem_principal)),
  ];
  return lista.map((r) => r.sku);
}

export async function resolverProdutosBlocos(
  blocos: BlocoEmail[] = [],
): Promise<Record<string, ProdutoEmail[]>> {
  const { produtosEmail } = await import("./automacoes.server");
  const out: Record<string, ProdutoEmail[]> = {};
  for (const b of blocos) {
    if (b.tipo !== "PRODUTOS" || b.oculto) continue;
    const limite = Math.min(12, Math.max(1, Number(b.d.limite) || 6));
    const skus = [...new Set(await skusDoBloco(b.d, limite))];
    let lista = await produtosEmail(skus);
    // Automáticos: só peças com preço (a mensagem é de oferta)
    if (b.d.fonte !== "manual") {
      // Variantes da mesma peça (mesmo código) aparecem uma vez só
      const vistos = new Set<string>();
      lista = lista.filter((p) => {
        const k = (p.codigo || p.sku).toUpperCase();
        if (!p.preco || vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });
    }
    out[b.id] = lista.slice(0, limite);
  }
  return out;
}
