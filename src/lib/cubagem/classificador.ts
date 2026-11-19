// Classificador: tipo de peça -> NCM (regras em regras-ncm.json, reconferidas na web). Puro: serve no
// navegador e no servidor. A NCM resultante decide o acordo Mercosul (acordoDaNcm) e a cubagem média.
import dados from "./regras-ncm.json";

export type Regra = { fam: string; ncm: string; kw: string[]; fallback?: boolean };
export const REGRAS: Regra[] = dados.regras as Regra[];

// Normaliza para MAIÚSCULA sem acento, só letras/números e espaço (para casar palavra-chave).
export const normalizar = (s: unknown) =>
  " " +
  String(s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim() +
  " ";

// Uma palavra-chave casa se aparece como "palavra" dentro do texto (com limites de espaço).
const casa = (hay: string, kw: string) =>
  hay.includes(" " + kw + " ") ||
  hay.startsWith(kw + " ") ||
  hay.endsWith(" " + kw) ||
  hay.trim() === kw;

export type Classificacao = { familia: string; ncm: string; fallback: boolean };

// Classifica pela primeira regra cujas palavras aparecem no nome/categoria/descrição.
export function classificarPeca(
  nome?: string | null,
  categoria?: string | null,
  descricao?: string | null,
): Classificacao {
  const hay = normalizar([nome, categoria, descricao].filter(Boolean).join(" "));
  for (const r of REGRAS) {
    if (r.fallback) break;
    if (r.kw.some((k) => casa(hay, k))) return { familia: r.fam, ncm: r.ncm, fallback: false };
  }
  const fb = REGRAS[REGRAS.length - 1];
  return { familia: fb.fam, ncm: fb.ncm, fallback: true };
}
