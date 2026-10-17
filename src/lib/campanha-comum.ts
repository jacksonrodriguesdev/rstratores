// Campanhas (Black Friday e outras) e cupons: regras puras, usadas no site, no admin e no servidor.
//
// Linha do tempo de uma campanha:
//   antes de pre_inicio ........ nada aparece
//   pre_inicio → inicio ........ PRÉ: contagem regressiva ("faltam 30 dias"), site em modo black,
//                                 descontos da pré (regras PRE/AMBAS), cupons mistério
//   inicio → fim ............... BLACK: descontos da campanha (regras BLACK/AMBAS)
//   depois de fim .............. acabou (some sozinha)

export type Fase = "AGUARDANDO" | "PRE" | "BLACK" | "FIM";
export type TipoRegra = "TUDO" | "CATEGORIA" | "MARCA" | "ITEM";
export type FaseRegra = "PRE" | "BLACK" | "AMBAS";
export type Regra = { tipo: TipoRegra; alvo: string; pct: number };

export function faseDe(
  c: { pre_inicio: Date | string; inicio: Date | string; fim: Date | string },
  agora = new Date(),
): Fase {
  const t = agora.getTime();
  if (t < new Date(c.pre_inicio).getTime()) return "AGUARDANDO";
  if (t < new Date(c.inicio).getTime()) return "PRE";
  if (t < new Date(c.fim).getTime()) return "BLACK";
  return "FIM";
}

// Regras que valem na fase atual
export const regraValeNa = (faseRegra: string, fase: Fase) =>
  (fase === "PRE" && (faseRegra === "PRE" || faseRegra === "AMBAS")) ||
  (fase === "BLACK" && (faseRegra === "BLACK" || faseRegra === "AMBAS"));

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// Desconto (%) de uma peça: regra da própria peça manda; senão, o maior entre marca, categoria e "tudo"
export function descontoPara(
  p: { sku?: string | null; categoria?: string | null; marca?: string | null },
  regras: Regra[] | null | undefined,
): number {
  if (!regras?.length) return 0;
  const sku = norm(p.sku);
  if (sku) {
    const item = regras.find((r) => r.tipo === "ITEM" && norm(r.alvo) === sku);
    if (item) return limitePct(item.pct);
  }
  let melhor = 0;
  for (const r of regras) {
    const vale =
      r.tipo === "TUDO" ||
      (r.tipo === "CATEGORIA" && !!p.categoria && norm(r.alvo) === norm(p.categoria)) ||
      (r.tipo === "MARCA" && !!p.marca && norm(r.alvo) === norm(p.marca));
    if (vale && r.pct > melhor) melhor = r.pct;
  }
  return limitePct(melhor);
}
const limitePct = (v: number) => Math.min(Math.max(Number(v) || 0, 0), 90);

// Datas da Black Friday de um ano: a sexta depois da 4ª quinta-feira de novembro (Thanksgiving),
// das 00:00 da sexta às 23:59:59 do Cyber Monday (segunda), no horário do Uruguai.
// A pré começa 30 dias antes.
export function datasBlackFriday(ano: number) {
  const nov1 = new Date(Date.UTC(ano, 10, 1));
  const primeiraQuinta = 1 + ((4 - nov1.getUTCDay() + 7) % 7);
  const sexta = primeiraQuinta + 21 + 1; // no máximo dia 29: sempre em novembro
  const inicio = new Date(`${ano}-11-${String(sexta).padStart(2, "0")}T00:00:00-03:00`);
  // Cyber Monday: somando dias (pode cair em dezembro)
  const fim = new Date(inicio.getTime() + 4 * 86400000 - 1000);
  const pre_inicio = new Date(inicio.getTime() - 30 * 86400000);
  return { pre_inicio, inicio, fim };
}

// Configuração visual/textual da campanha (campanhas.config)
export type ConfigCampanha = {
  selo: string; // "BLACK", "BLACK WEEK"
  titulo: string;
  titulo_pt?: string;
  subtitulo: string;
  subtitulo_pt?: string;
  barra_pre: string; // texto da barra na pré (antes da contagem)
  barra_pre_pt?: string;
  barra_black: string;
  barra_black_pt?: string;
  mostrar_barra: boolean;
  inserir_na_home: boolean; // hero da campanha no topo da home automaticamente
};
export const CONFIG_PADRAO: ConfigCampanha = {
  selo: "BLACK",
  titulo: "Black Friday AGRO PARTS",
  titulo_pt: "Black Friday AGRO PARTS",
  subtitulo: "Los mejores precios del año en repuestos para tractores y cosechadoras.",
  subtitulo_pt: "Os melhores preços do ano em peças para tratores e colheitadeiras.",
  barra_pre: "Faltan para la BLACK FRIDAY",
  barra_pre_pt: "Faltam para a BLACK FRIDAY",
  barra_black: "BLACK FRIDAY: descuentos en todo el sitio · termina en",
  barra_black_pt: "BLACK FRIDAY: descontos no site todo · termina em",
  mostrar_barra: true,
  inserir_na_home: true,
};

// Estado público da campanha (vai para o navegador: nada de regras internas além do maior %)
export type CampanhaPublica = {
  id: number;
  nome: string;
  fase: "PRE" | "BLACK";
  tema: string;
  alvo: string; // ISO: fim da contagem (início da Black na PRÉ; fim da Black na BLACK)
  maxPct: number; // maior desconto da fase (para "hasta -40%")
  config: ConfigCampanha;
  previa?: boolean; // admin vendo a fase simulada
};

// ---------------------------------------------------------------- Cupons
export type CupomBase = {
  codigo: string;
  tipo: string; // PERCENT, FIXO, FRETE
  valor: number;
  moeda: string;
  minimo: number;
  inicio: Date | string | null;
  fim: Date | string | null;
  revelar_em: Date | string | null;
  max_usos: number;
  usos: number;
  ativo: boolean;
};

export type MotivoCupom =
  | "inativo"
  | "ainda_nao"
  | "vencido"
  | "esgotado"
  | "minimo"
  | "moeda"
  | "limite_cliente"
  | "primeira_compra";

export const MENSAGEM_CUPOM: Record<MotivoCupom, [string, string]> = {
  inativo: ["Cupón inválido.", "Cupom inválido."],
  ainda_nao: ["Este cupón todavía no está activo.", "Este cupom ainda não está ativo."],
  vencido: ["Este cupón ya venció.", "Este cupom já venceu."],
  esgotado: ["Este cupón se agotó.", "Este cupom esgotou."],
  minimo: ["No alcanza el monto mínimo del cupón.", "Não atinge o valor mínimo do cupom."],
  moeda: ["Este cupón es para otra moneda.", "Este cupom é para outra moeda."],
  limite_cliente: ["Ya usaste este cupón.", "Você já usou este cupom."],
  primeira_compra: [
    "Cupón válido solo para la primera compra.",
    "Cupom válido só para a primeira compra.",
  ],
};

// Desconto (centavos) de um cupom sobre um subtotal (centavos). Frete grátis: zera o frete.
export function aplicarCupom(
  c: CupomBase,
  subtotal: number,
  moeda: string,
  agora = new Date(),
): { ok: true; desconto: number; freteGratis: boolean } | { ok: false; motivo: MotivoCupom } {
  if (!c.ativo) return { ok: false, motivo: "inativo" };
  const t = agora.getTime();
  if (c.inicio && t < new Date(c.inicio).getTime()) return { ok: false, motivo: "ainda_nao" };
  if (c.fim && t > new Date(c.fim).getTime()) return { ok: false, motivo: "vencido" };
  if (c.max_usos > 0 && c.usos >= c.max_usos) return { ok: false, motivo: "esgotado" };
  if (c.tipo !== "PERCENT" && c.moeda !== moeda) return { ok: false, motivo: "moeda" };
  if (c.minimo > 0 && subtotal < Math.round(c.minimo * 100)) return { ok: false, motivo: "minimo" };
  if (c.tipo === "FRETE") return { ok: true, desconto: 0, freteGratis: true };
  const desconto =
    c.tipo === "PERCENT"
      ? Math.round((subtotal * Math.min(Math.max(c.valor, 0), 90)) / 100)
      : Math.min(Math.round(c.valor * 100), subtotal);
  return { ok: true, desconto, freteGratis: false };
}

// Na página de cupons: antes de "revelar_em" o cupom aparece como mistério (sem código nem valor)
export const cupomMisterio = (c: { revelar_em: Date | string | null }, agora = new Date()) =>
  !!c.revelar_em && agora.getTime() < new Date(c.revelar_em).getTime();
