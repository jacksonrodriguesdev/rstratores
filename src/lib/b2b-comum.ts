// AGRO PARTS Mayorista (empresas do Uruguai que compram por volume, com despacho do Brasil).
// Partes usadas no navegador e no servidor: RUT, leitura de listas coladas, situações e formatos.

// ---------------------------------------------------------------- RUT (Uruguai)
// 12 dígitos: 2 do registro (01–21), 6 do número, "00" e 1 verificador (módulo 11, pesos 4,3,2,9,8,7,6,5,4,3,2).
export const soDigitos = (s: string) => String(s ?? "").replace(/\D/g, "");
export function rutValido(rut: string): boolean {
  const d = soDigitos(rut);
  if (d.length !== 12) return false;
  const reg = Number(d.slice(0, 2));
  if (reg < 1 || reg > 21) return false;
  if (d.slice(2, 8) === "000000" || d.slice(8, 10) !== "00") return false;
  const pesos = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = pesos.reduce((s, p, i) => s + p * Number(d[i]), 0);
  let dv = 11 - (soma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) return false;
  return dv === Number(d[11]);
}
export const formatarRut = (rut: string) => {
  const d = soDigitos(rut);
  return d.length === 12 ? `${d.slice(0, 2)} ${d.slice(2, 8)} ${d.slice(8, 11)} ${d[11]}` : rut;
};

// ---------------------------------------------------------------- listas de peças coladas
// Aceita o que o comprador tem na mão: colado do Excel (colunas), "código;cantidad", "20x CÓDIGO",
// "CÓDIGO x20", "CÓDIGO 20 un", ou só o código (fica com o mínimo).
export type LinhaLista = { linha: number; codigo: string; qtd: number | null; descricao: string };

export const normalizarCodigo = (s: string) =>
  String(s ?? "")
    .toUpperCase()
    .replace(/[\s.\-/_]/g, "");

const QTD_MARCADA =
  /^(?:x\s*(\d{1,5})|(\d{1,5})\s*(?:x|un|u|uds?|unid(?:ades)?|pcs?|pz|piezas?))$/i;

export function lerLista(texto: string, maximo = 300): LinhaLista[] {
  const linhas = String(texto ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const res: LinhaLista[] = [];
  for (const [i, bruta] of linhas.entries()) {
    if (res.length >= maximo) break;
    // Colunas (Excel = tab; CSV = ; ou ,)
    const sep = bruta.includes("\t") ? "\t" : bruta.includes(";") ? ";" : null;
    let tokens: string[];
    if (sep) tokens = bruta.split(sep).map((t) => t.trim());
    else tokens = bruta.replace(/(\d)\s*(x|un|uds?|pcs?)\b/gi, "$1$2").split(/\s+/);
    tokens = tokens.filter(Boolean);
    if (!tokens.length) continue;
    // Cabeçalho do Excel ("Código | Cantidad")
    if (i === 0 && tokens.every((t) => !/\d/.test(t))) continue;

    let qtd: number | null = null;
    let idxQtd = -1;
    tokens.forEach((t, k) => {
      const m = t.match(QTD_MARCADA);
      if (m && idxQtd < 0) {
        qtd = Number(m[1] ?? m[2]);
        idxQtd = k;
      }
    });
    if (idxQtd < 0 && tokens.length > 1) {
      // Número curto sozinho no fim ou no começo = quantidade
      const ult = tokens.length - 1;
      if (/^\d{1,4}$/.test(tokens[ult])) idxQtd = ult;
      else if (/^\d{1,4}$/.test(tokens[0]) && /\d/.test(tokens[1] ?? "")) idxQtd = 0;
      if (idxQtd >= 0) qtd = Number(tokens[idxQtd]);
    }
    const resto = tokens.filter((_, k) => k !== idxQtd);
    // Código = primeiro pedaço com número (ou o primeiro, se nenhum tiver)
    const ic = resto.findIndex((t) => /\d/.test(t) && t.replace(/[^0-9a-z]/gi, "").length >= 3);
    const codigo = (ic >= 0 ? resto[ic] : (resto[0] ?? "")).slice(0, 64);
    if (!codigo) continue;
    const descricao = resto
      .filter((_, k) => k !== (ic >= 0 ? ic : 0))
      .join(" ")
      .slice(0, 160);
    res.push({
      linha: i + 1,
      codigo,
      qtd: qtd && qtd > 0 ? Math.min(qtd, 99999) : null,
      descricao,
    });
  }
  return res;
}

// ---------------------------------------------------------------- empresas e cotações
export const TIPOS_EMPRESA = [
  ["REPUESTERA", "Casa de repuestos"],
  ["TALLER", "Taller mecánico"],
  ["CONCESIONARIO", "Concesionario o revendedor de maquinaria"],
  ["COOPERATIVA", "Cooperativa o gremial"],
  ["CONTRATISTA", "Contratista o empresa agrícola"],
  ["OTRO", "Otro"],
] as const;

export const VOLUMES = [
  ["ATE_2K", "Hasta USD 2.000 por mes"],
  ["2K_10K", "USD 2.000 a 10.000 por mes"],
  ["10K_50K", "USD 10.000 a 50.000 por mes"],
  ["MAIS_50K", "Más de USD 50.000 por mes"],
] as const;

export const INCOTERMS = {
  DAP: "DAP · puesto en su depósito en Uruguay (despacho de importación a cargo del comprador)",
  CPT: "CPT · flete pago hasta la frontera (Chuy / Río Branco)",
  FCA: "FCA · retiro en nuestro depósito en Brasil",
} as const;
export type Incoterm = keyof typeof INCOTERMS;

export const PAGAMENTOS = {
  ANTICIPADO: "Pago anticipado (transferencia)",
  "50_50": "50% al confirmar y 50% antes del despacho",
  "30_DIAS": "30 días desde la factura",
} as const;

export type StatusEmpresa = "PENDENTE" | "APROVADA" | "RECUSADA" | "SUSPENSA";
export const STATUS_EMPRESA_ES: Record<StatusEmpresa, string> = {
  PENDENTE: "En revisión",
  APROVADA: "Aprobada",
  RECUSADA: "No aprobada",
  SUSPENSA: "Suspendida",
};
export const STATUS_EMPRESA_PT: Record<StatusEmpresa, string> = {
  PENDENTE: "Aguardando aprovação",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
  SUSPENSA: "Suspensa",
};

export type StatusCotacao = "ENVIADA" | "COTADA" | "ACEITA" | "RECUSADA" | "CANCELADA";
export const STATUS_COTACAO_ES: Record<StatusCotacao | "VENCIDA", string> = {
  ENVIADA: "Recibida · preparando propuesta",
  COTADA: "Propuesta lista",
  ACEITA: "Aceptada",
  RECUSADA: "Rechazada",
  CANCELADA: "Cancelada",
  VENCIDA: "Propuesta vencida",
};
export const STATUS_COTACAO_PT: Record<StatusCotacao | "VENCIDA", string> = {
  ENVIADA: "Nova · cotar",
  COTADA: "Proposta enviada",
  ACEITA: "Aceita pelo cliente",
  RECUSADA: "Recusada pelo cliente",
  CANCELADA: "Cancelada",
  VENCIDA: "Proposta vencida",
};

export type ItemCotacao = {
  linha: number;
  codigo: string; // como o cliente escreveu
  descricao?: string; // texto do cliente
  qtd: number;
  ajustadaMinimo?: boolean; // a quantidade subiu para o mínimo
  sku?: string | null; // peça do catálogo (null = não encontrada, a cotar)
  nome?: string | null;
  marca?: string | null;
  foto?: string | null;
  ncm?: string | null;
  peso?: number | null; // kg por unidade
  sugerido?: number | null; // USD por unidade (cálculo automático)
  preco?: number | null; // USD por unidade (proposta)
  origem?: "MERCOSUL" | "OUTRA" | null; // origem para preferência tarifária (confirmar com certificado)
  disponivel?: boolean; // incluído na proposta
  obs?: string | null;
  aec?: number | null; // % da TEC/AEC no Uruguai sem preferência (estimativa de custo)
  minimo?: number | null; // mínimo próprio do produto (catálogo de exportação)
  unidade?: string | null; // UN, PAR, JG, KIT… (catálogo de exportação)
  origemStatus?: "COMPROVADA" | "INFORMADA" | "EXTRAZONA" | "A_VERIFICAR" | null; // registro de origem da peça
};

// Proposta vencida: cotada e com validade antes de hoje
export function statusVisivel(c: { status: string; validade?: string | null }) {
  if (c.status === "COTADA" && c.validade && c.validade < new Date().toISOString().slice(0, 10))
    return "VENCIDA" as const;
  return c.status as StatusCotacao;
}

export const usd = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `USD ${n.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function totaisCotacao(itens: ItemCotacao[], frete?: number | null) {
  const validos = itens.filter((i) => i.disponivel !== false && i.preco != null && i.preco > 0);
  const subtotal = Math.round(validos.reduce((s, i) => s + i.qtd * (i.preco ?? 0), 0) * 100) / 100;
  const peso = Math.round(validos.reduce((s, i) => s + i.qtd * (i.peso ?? 0), 0) * 10) / 10;
  const unidades = validos.reduce((s, i) => s + i.qtd, 0);
  return {
    subtotal,
    total: Math.round((subtotal + (frete ?? 0)) * 100) / 100,
    peso,
    unidades,
    itens: validos.length,
  };
}
