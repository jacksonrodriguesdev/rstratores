// Formatos do Extrato do banco (dinheiro, nome do mês), usados pelas telas
import type { painelExtratoFn } from "./extratos";

export const brl = (v: number, casas = 2) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
export const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
export const MESES_LONGOS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
export const nomeMes = (m: string) => MESES[Number(m.slice(5, 7)) - 1];
export const mesLongo = (m: string) => MESES_LONGOS[Number(m.slice(5, 7)) - 1];
export const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

type Painel = Awaited<ReturnType<typeof painelExtratoFn>>;
// Mês do Panorama: o escolhido, senão o último com extrato
export function mesDoPanorama(d: Painel, mes: string | null) {
  if (mes) return mes;
  const com = d.meses.filter((m) => m.importado && !m.futuro);
  return com.length ? com[com.length - 1].mes : d.meses.filter((m) => !m.futuro).pop()!.mes;
}
