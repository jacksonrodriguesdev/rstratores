// Links de pagamento: tipos, formas de pagamento e validação de documentos (código puro: roda no
// site, no admin e no servidor).

export type Pais = "UY" | "BR";
export type Metodo = "CARTAO" | "PIX" | "ABITAB" | "REDPAGOS" | "STRIPE";
// Quem processa cada forma: STRIPE = página de pagamento do Stripe (Checkout); o resto, dLocal
export type Provedor = "dlocal" | "stripe";
export const provedorDe = (m: string): Provedor => (m === "STRIPE" ? "stripe" : "dlocal");

export const MOEDA: Record<Pais, "UYU" | "BRL"> = { UY: "UYU", BR: "BRL" };

// Formas de pagamento por país (o código é o payment_method_id da dLocal; STRIPE não usa)
export const METODOS: Record<Pais, Metodo[]> = {
  UY: ["CARTAO", "ABITAB", "REDPAGOS", "STRIPE"],
  BR: ["CARTAO", "PIX", "STRIPE"],
};
export const ID_DLOCAL: Record<Exclude<Metodo, "STRIPE">, string> = {
  CARTAO: "CARD",
  PIX: "PQ",
  ABITAB: "AI",
  REDPAGOS: "RE",
};
export const ROTULO_METODO: Record<Metodo, [string, string]> = {
  CARTAO: ["Tarjeta de crédito o débito", "Cartão de crédito"],
  PIX: ["PIX", "PIX"],
  ABITAB: ["Abitab (efectivo)", "Abitab (dinheiro)"],
  REDPAGOS: ["Redpagos (efectivo)", "Redpagos (dinheiro)"],
  STRIPE: ["Tarjeta de crédito o débito (Stripe)", "Cartão de crédito ou débito (Stripe)"],
};

// Frete: no total do link, grátis, ou por conta do comprador (paga ao receber: DAC / transportadora)
export type FreteModo = "COBRADO" | "GRATIS" | "NA_CHEGADA";
export const FRETE_MODOS: FreteModo[] = ["COBRADO", "GRATIS", "NA_CHEGADA"];
export const ROTULO_FRETE: Record<FreteModo, [string, string]> = {
  COBRADO: ["Envío incluido en el total", "Frete incluído no total"],
  GRATIS: ["Envío sin costo", "Frete grátis"],
  NA_CHEGADA: [
    "Envío a cargo del comprador (se paga al recibir)",
    "Frete por conta do comprador (pago na chegada)",
  ],
};

export type ItemLink = {
  sku?: string | null;
  codigo: string;
  nome: string;
  imagem?: string | null;
  quantidade: number;
  preco: number; // centavos, por unidade
};

export const STATUS_LINK: Record<string, [string, string]> = {
  ABERTO: ["Pendiente de pago", "Aguardando pagamento"],
  PAGO: ["Pagado", "Pago"],
  CANCELADO: ["Cancelado", "Cancelado"],
  VENCIDO: ["Vencido", "Vencido"],
};

// Valor em centavos → "$U 12.500" / "R$ 1.234,50"
export function fmtValor(centavos: number, moeda: string) {
  const v = centavos / 100;
  if (moeda === "USD")
    return `US$ ${v.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (moeda === "BRL")
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const inteiro = Number.isInteger(v);
  return `$U ${v.toLocaleString("es-UY", {
    minimumFractionDigits: inteiro ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export const somenteDigitos = (s: string) => String(s || "").replace(/\D/g, "");

// Cédula uruguaya: 6 a 8 dígitos, o último é o verificador
function ciValida(d: string) {
  if (d.length < 6 || d.length > 8) return false;
  const corpo = d.slice(0, -1).padStart(7, "0");
  const pesos = [2, 9, 8, 7, 6, 3, 4];
  const soma = pesos.reduce((t, p, i) => t + p * Number(corpo[i]), 0);
  return (10 - (soma % 10)) % 10 === Number(d.at(-1));
}

function cpfValido(d: string) {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

function cnpjValido(d: string) {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => {
    const pesos =
      n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((t, p, i) => t + p * Number(d[i]), 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

// Documento do pagador: Uruguai = CI ou RUT (12 dígitos); Brasil = CPF ou CNPJ
export function documentoValido(pais: Pais, doc: string): boolean {
  const d = somenteDigitos(doc);
  if (pais === "BR") return d.length === 11 ? cpfValido(d) : cnpjValido(d);
  return d.length === 12 ? true : ciValida(d);
}

// Guardado só assim: "•••••123-4"
export function mascararDocumento(doc: string) {
  const d = somenteDigitos(doc);
  return `${"•".repeat(Math.max(d.length - 4, 0))}${d.slice(-4, -1)}-${d.slice(-1)}`;
}
