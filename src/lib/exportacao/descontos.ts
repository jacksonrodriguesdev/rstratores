// Descontos de exportação (atacado), configuráveis no painel do admin:
//  - FAIXAS por volume: a partir de N itens no pedido, X% de desconto (variáveis).
//  - REGRAS por alvo: uma linha/marca/categoria/item específico ganha um % próprio.
// O desconto efetivo de cada item = o MAIOR entre o desconto de volume e o da regra que casa com ele.
// Puro: serve no navegador e no servidor.

export type FaixaDesconto = { min_itens: number; pct: number };
export type TipoRegra = "LINHA" | "MARCA" | "CATEGORIA" | "ITEM";
export type RegraDesconto = { id?: number; tipo: TipoRegra; alvo: string; pct: number };
export type BaseFaixa = "ITENS" | "UNIDADES"; // conta itens distintos ou unidades totais

export type ConfigDescontos = {
  ativo: boolean;
  base: BaseFaixa;
  faixas: FaixaDesconto[];
  regras: RegraDesconto[];
};

export const CONFIG_DESCONTOS_PADRAO: ConfigDescontos = {
  ativo: false,
  base: "ITENS",
  faixas: [],
  regras: [],
};

const norm = (s: unknown) =>
  String(s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// Desconto de volume (%) para uma quantidade (itens distintos ou unidades, conforme a base).
export function descontoVolume(qtd: number, faixas: FaixaDesconto[]): number {
  let pct = 0;
  for (const f of faixas) if (qtd >= f.min_itens && f.pct > pct) pct = f.pct;
  return pct;
}

// Próxima faixa não atingida (para a barra de progresso "faltan X para Y% OFF").
export function proximaFaixa(qtd: number, faixas: FaixaDesconto[]): FaixaDesconto | null {
  const acima = faixas.filter((f) => f.min_itens > qtd).sort((a, b) => a.min_itens - b.min_itens);
  return acima[0] ?? null;
}

// Desconto de uma regra que casa com o item (o maior % entre as regras que batem).
export function descontoRegra(
  item: {
    linha?: string | null;
    marca?: string | null;
    categoria?: string | null;
    codigo?: string | null;
  },
  regras: RegraDesconto[],
): number {
  let pct = 0;
  for (const r of regras) {
    const alvo = norm(r.alvo);
    const casa =
      (r.tipo === "LINHA" && norm(item.linha) === alvo) ||
      (r.tipo === "MARCA" && norm(item.marca) === alvo) ||
      (r.tipo === "CATEGORIA" && norm(item.categoria) === alvo) ||
      (r.tipo === "ITEM" && norm(item.codigo) === alvo);
    if (casa && r.pct > pct) pct = r.pct;
  }
  return pct;
}

// Desconto efetivo de um item = maior entre volume e regra (limitado a 90%).
export function descontoItem(
  item: {
    linha?: string | null;
    marca?: string | null;
    categoria?: string | null;
    codigo?: string | null;
  },
  volumePct: number,
  regras: RegraDesconto[],
): number {
  return Math.min(90, Math.max(volumePct, descontoRegra(item, regras)));
}

export const aplicarDesconto = (preco: number, pct: number) =>
  Math.round(preco * (1 - pct / 100) * 100) / 100;
