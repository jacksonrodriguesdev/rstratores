// Preço de venda das peças (código puro: roda no site e no admin).
// valor_compra = custo em R$ · preco_brl = venda em R$ · $U = venda em R$ × cotação do dia
// (ou preço fixo em $U quando preco_modo = "FIXO").

export type ConfigPrecos = {
  cotacao: number | null; // 1 R$ = X $U
  cotacaoEm: string | null;
  fonte: string | null;
  manual: boolean; // cotação digitada no admin (não a automática)
  arredondar: number; // arredonda o $U para cima em múltiplos deste valor
  ajuste: number; // % somado à cotação (câmbio/taxas)
  margemPadrao: number;
  mostrar: boolean; // mostrar preços no site
};

// valor_promocional = preço promocional de venda em R$ (vale quando é menor que preco_brl)
export type CamposPreco = { preco_brl?: number | null; preco_modo?: string | null; preco_uyu?: number | null; valor_promocional?: number | null };

export const arredondar = (v: number, passo: number) => (passo > 0 ? Math.ceil(v / passo - 1e-9) * passo : Math.round(v));

export function uyuDeBrl(brl: number, c: Pick<ConfigPrecos, "cotacao" | "ajuste" | "arredondar">) {
  if (!c.cotacao) return null;
  return arredondar(brl * c.cotacao * (1 + (c.ajuste || 0) / 100), c.arredondar);
}

export type PrecoFinal = {
  uyu: number | null;
  brl: number | null;
  // Em promoção: preço "de" (riscado) e o desconto em %
  deUyu?: number | null;
  deBrl?: number | null;
  desconto?: number;
};

function precoCheio(p: CamposPreco, c: ConfigPrecos | null | undefined) {
  const brl = p.preco_brl && p.preco_brl > 0 ? p.preco_brl : null;
  let uyu: number | null = null;
  if (p.preco_modo === "FIXO" && p.preco_uyu && p.preco_uyu > 0) uyu = p.preco_uyu;
  else if (brl && c) uyu = uyuDeBrl(brl, c);
  return { uyu, brl };
}

export function precoVenda(p: CamposPreco, c: ConfigPrecos | null | undefined): PrecoFinal | null {
  const cheio = precoCheio(p, c);
  if (!cheio.uyu && !cheio.brl) return null;
  const promo = p.valor_promocional && p.valor_promocional > 0 ? p.valor_promocional : null;
  if (!promo || !cheio.brl || promo >= cheio.brl) return cheio;
  // Promoção: mesmo desconto em R$ e em $U (no modo fixo, aplica a proporção sobre o $U fixo)
  const fator = promo / cheio.brl;
  const uyuPromo = p.preco_modo === "FIXO" && cheio.uyu ? arredondar(cheio.uyu * fator, c?.arredondar ?? 0) : c ? uyuDeBrl(promo, c) : null;
  return { uyu: uyuPromo, brl: promo, deUyu: cheio.uyu, deBrl: cheio.brl, desconto: Math.round((1 - fator) * 100) };
}

// Venda em R$ a partir do custo e da margem (%)
export const vendaDeCusto = (custo: number, margem: number) => Math.round(custo * (1 + margem / 100) * 100) / 100;
export const margemDe = (custo: number, venda: number) => (custo > 0 ? Math.round(((venda / custo - 1) * 100) * 10) / 10 : null);

export const fmtUYU = (n: number) => `$U ${Math.round(n).toLocaleString("es-UY")}`;
export const fmtBRL = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
