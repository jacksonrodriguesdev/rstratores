// Fiscal do Brasil (MEI): regras que a tela e o servidor usam igual. Só as vendas do Brasil
// passam pelo CNPJ; as do Uruguai ficam de fora de tudo aqui.

// Limite do MEI: R$ 81 mil por ano. No ano em que o CNPJ abriu, R$ 6.750 por mês, contando o
// mês da abertura. Até 20% acima: paga a diferença e vira microempresa em janeiro; mais que
// isso: desenquadramento retroativo (com imposto atrasado).
export const LIMITE_MEI_ANO = 81_000;
export const LIMITE_MEI_MES = 6_750;
export const TOLERANCIA_MEI = 0.2;
// DAS do MEI em 2026: 5% do salário mínimo (R$ 1.621) de INSS + R$ 1 de ICMS (comércio)
// e/ou R$ 5 de ISS (serviços). Vale o que está no CNPJ, mesmo que só venda peças.
export const DAS_MEI = { comercio: 82.05, servicos: 86.05, comercio_servicos: 87.05 } as const;
export type AtividadeMei = keyof typeof DAS_MEI;
export const NOME_ATIVIDADE: Record<AtividadeMei, string> = {
  comercio: "Só comércio",
  servicos: "Só serviços",
  comercio_servicos: "Comércio e serviços",
};
export const DAS_MEI_COMERCIO = DAS_MEI.comercio;
export const DIA_VENCE_DAS = 20;
// Parte do lucro que sai isenta para o dono sem livro caixa: 8% da receita no comércio
export const PRESUNCAO_COMERCIO = 0.08;

export function limiteMei(ano: number, abertura: string | null) {
  const m = /^(\d{4})-(\d{2})/.exec(abertura ?? "");
  if (m && Number(m[1]) === ano) return LIMITE_MEI_MES * (12 - Number(m[2]) + 1);
  if (m && Number(m[1]) > ano) return 0;
  return LIMITE_MEI_ANO;
}

const so = (s: string | null | undefined) => String(s ?? "").replace(/\D/g, "");

export function cpfValido(s: string | null | undefined) {
  const c = so(s);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}
export function cnpjValido(s: string | null | undefined) {
  const c = so(s);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  for (const t of [12, 13]) {
    let soma = 0;
    // Pesos 5,4,3,2,9,8,…,2 (primeiro dígito) e 6,5,4,3,2,9,…,2 (segundo)
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (((t - i - 1) % 8) + 2);
    const resto = soma % 11;
    if ((resto < 2 ? 0 : 11 - resto) !== Number(c[t])) return false;
  }
  return true;
}
// "CPF" | "CNPJ" | null (inválido ou vazio)
export const tipoDoc = (s: string | null | undefined) =>
  cpfValido(s) ? "CPF" : cnpjValido(s) ? "CNPJ" : null;
export const soNumeros = so;

export const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];
const NOMES_UF: Record<string, string> = {
  "rio grande do sul": "RS",
  "santa catarina": "SC",
  parana: "PR",
  "sao paulo": "SP",
};
// "Rio Grande do Sul", "rs", "RS " → "RS"
export function siglaUf(s: string | null | undefined) {
  const t = String(s ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (UFS.includes(t.toUpperCase())) return t.toUpperCase();
  return NOMES_UF[t] ?? null;
}

// NCM (código fiscal da mercadoria) por categoria do catálogo, quando a peça não tem o dela.
// Para o MEI o imposto não muda com o NCM, mas a nota precisa de um código que exista.
// Editável em Admin → Fiscal → Configurar.
export const NCM_PADRAO = "87089990"; // outras partes e acessórios de tratores e veículos
export const NCM_SUGERIDO: Record<string, string> = {
  "Rolamentos e Mancais": "84821010",
  Filtros: "84212300",
  Vedações: "40169300",
  "Elementos de Fixação": "73181500",
};

export type StatusNota = "PROCESSANDO" | "AUTORIZADA" | "ERRO" | "CANCELADA";
export const NOME_STATUS: Record<StatusNota, string> = {
  PROCESSANDO: "Enviando à Receita",
  AUTORIZADA: "Nota emitida",
  ERRO: "Recusada",
  CANCELADA: "Cancelada",
};
