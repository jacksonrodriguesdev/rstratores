// Frete estimado para o logista (portal B2B). Tarifa da transportadora por kg CUBADO (o maior entre
// peso real e volumétrico), + taxa fixa por envio + frete mínimo. Puro: serve no navegador e no servidor.

export type TarifaFrete = {
  porKg: number; // valor por kg cubado
  taxaFixa: number; // valor fixo por envio (despacho/manuseio)
  minimo: number; // frete mínimo cobrado
  moeda: string; // USD (exportação ao Uruguai) ou BRL
};

export const TARIFA_FRETE_PADRAO: TarifaFrete = {
  porKg: 0,
  taxaFixa: 0,
  minimo: 0,
  moeda: "USD",
};

// Frete = máximo entre o mínimo e (taxa fixa + tarifa × peso cubado total).
export function calcularFrete(pesoCubadoKg: number, t: TarifaFrete): number {
  const bruto = (t.taxaFixa || 0) + (t.porKg || 0) * Math.max(0, pesoCubadoKg || 0);
  return Math.round(Math.max(t.minimo || 0, bruto) * 100) / 100;
}

export type EstimativaFrete = {
  tarifa: TarifaFrete;
  pesoCubadoKg: number;
  frete: number;
  achados: number; // itens com peso cubado na base
  semDado: number; // itens sem peso cubado (não entram no cálculo)
  configurada: boolean; // a loja já cadastrou a tarifa?
};
