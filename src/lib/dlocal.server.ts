// Cliente da API da dLocal (Payins v2.1). Só roda no servidor: as chaves ficam nas variáveis de
// ambiente da Hostinger (nunca no navegador, nunca no código).
//   DLOCAL_X_LOGIN, DLOCAL_X_TRANS_KEY, DLOCAL_SECRET_KEY  → credenciais da conta
//   DLOCAL_AMBIENTE = sandbox | producao                    → endereço da API (padrão: sandbox)
//   DLOCAL_BASE_URL (opcional)                              → força outro endereço (testes)
//   DLOCAL_SMARTFIELDS_KEY                                  → chave pública dos campos do cartão
// Cada chamada é assinada (HMAC-SHA256 de x_login + X-Date + corpo) e a criação de pagamento leva
// uma chave de idempotência: repetir a chamada não cobra duas vezes.
import { createHmac, timingSafeEqual } from "node:crypto";

const env = (k: string) => process.env[k]?.trim() || "";

export const ambienteDlocal = (): "sandbox" | "producao" =>
  env("DLOCAL_AMBIENTE") === "producao" ? "producao" : "sandbox";

export const dlocalConfigurado = () =>
  !!(env("DLOCAL_X_LOGIN") && env("DLOCAL_X_TRANS_KEY") && env("DLOCAL_SECRET_KEY"));

export const urlApiDlocal = () =>
  (
    env("DLOCAL_BASE_URL") ||
    (ambienteDlocal() === "producao" ? "https://api.dlocal.com" : "https://sandbox.dlocal.com")
  ).replace(/\/+$/, "");

// Chave pública dos Smart Fields e o script certo para o ambiente (vão para o navegador)
export const smartFields = () => ({
  chave: env("DLOCAL_SMARTFIELDS_KEY") || env("VITE_DLOCAL_SMARTFIELDS_KEY") || null,
  script:
    ambienteDlocal() === "producao" ? "https://js.dlocal.com/" : "https://js-sandbox.dlocal.com/",
});

export class ErroDlocal extends Error {
  constructor(
    message: string,
    public http: number,
    public codigo: string | null,
    public dados: unknown,
  ) {
    super(message);
  }
}

const assinar = (texto: string) =>
  createHmac("sha256", env("DLOCAL_SECRET_KEY")).update(texto).digest("hex");

async function chamar<T = any>(
  metodo: "GET" | "POST",
  caminho: string,
  corpo?: unknown,
  idempotencia?: string,
): Promise<T> {
  if (!dlocalConfigurado()) throw new ErroDlocal("dLocal não configurada", 0, null, null);
  const xDate = new Date().toISOString();
  const bruto = corpo === undefined ? "" : JSON.stringify(corpo);
  const r = await fetch(urlApiDlocal() + caminho, {
    method: metodo,
    headers: {
      "X-Date": xDate,
      "X-Login": env("DLOCAL_X_LOGIN"),
      "X-Trans-Key": env("DLOCAL_X_TRANS_KEY"),
      "X-Version": "2.1",
      Authorization: `V2-HMAC-SHA256, Signature: ${assinar(env("DLOCAL_X_LOGIN") + xDate + bruto)}`,
      "Content-Type": "application/json",
      "User-Agent": "AGRO PARTS/1.0",
      ...(idempotencia && { "X-Idempotency-Key": idempotencia }),
    },
    body: metodo === "POST" ? bruto : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const texto = await r.text();
  let j: any = null;
  try {
    j = texto ? JSON.parse(texto) : null;
  } catch {
    j = { raw: texto.slice(0, 500) };
  }
  if (!r.ok)
    throw new ErroDlocal(
      String(j?.message || j?.status_detail || `dLocal respondeu ${r.status}`),
      r.status,
      j?.code != null ? String(j.code) : null,
      j,
    );
  return j as T;
}

export type PagamentoDlocal = {
  id: string;
  amount?: number;
  currency?: string;
  country?: string;
  payment_method_id?: string;
  payment_method_type?: string;
  status?: string;
  status_code?: string | number;
  status_detail?: string;
  order_id?: string;
  redirect_url?: string;
  three_dsecure?: { redirect_url?: string };
  card?: { brand?: string; last4?: string; holder_name?: string };
  ticket?: {
    number?: string;
    expiration_date?: string;
    barcode?: string;
    image_url?: string;
    qr_code?: string;
    id?: string;
    type?: string;
    format?: string;
    company_name?: string;
    provider_name?: string;
  };
  [k: string]: unknown;
};

export const criarPagamentoDlocal = (corpo: Record<string, unknown>, idempotencia: string) =>
  chamar<PagamentoDlocal>("POST", "/payments", corpo, idempotencia);

export const consultarPagamentoDlocal = (id: string) =>
  chamar<PagamentoDlocal>("GET", `/payments/${encodeURIComponent(id)}`);

// Aviso (webhook) da dLocal: confere a assinatura sobre o corpo bruto, sem vazar tempo
export function avisoAutentico(corpo: string, h: Headers): boolean {
  if (!dlocalConfigurado()) return false;
  const xDate = h.get("x-date");
  const auth = h.get("authorization");
  if (!xDate || !auth) return false;
  const login = h.get("x-login");
  if (login && login !== env("DLOCAL_X_LOGIN")) return false;
  const esperado = Buffer.from(
    `V2-HMAC-SHA256, Signature: ${assinar(env("DLOCAL_X_LOGIN") + xDate + corpo)}`,
  );
  const recebido = Buffer.from(auth.trim());
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

// Status da dLocal → status interno
export type StatusPagamento =
  "CRIANDO" | "PENDENTE" | "AUTORIZADO" | "PAGO" | "RECUSADO" | "CANCELADO" | "ERRO";

export function statusInterno(p: Pick<PagamentoDlocal, "status" | "status_code">): StatusPagamento {
  const s = String(p.status || "").toUpperCase();
  if (s === "PAID") return "PAGO";
  if (s === "AUTHORIZED") return "AUTORIZADO";
  if (s === "REJECTED") return "RECUSADO";
  if (s === "CANCELLED" || s === "EXPIRED") return "CANCELADO";
  if (s === "PENDING" || s === "VERIFIED") return "PENDENTE";
  const c = Number(p.status_code);
  if (c === 200) return "PAGO";
  if (c === 600) return "AUTORIZADO";
  if (c >= 300 && c < 400) return "RECUSADO";
  if (c === 400) return "CANCELADO";
  return "PENDENTE";
}

// Ordem dos status: um aviso atrasado nunca desfaz um "pago" nem reabre um recusado/cancelado.
// (Exceção: um pagamento recusado/cancelado que a dLocal depois confirma como pago vira PAGO.)
const PESO: Record<string, number> = {
  CRIANDO: 0,
  ERRO: 0,
  PENDENTE: 1,
  AUTORIZADO: 2,
  RECUSADO: 3,
  CANCELADO: 3,
  PAGO: 4,
};
export function podeMudar(de: string, para: string) {
  if (de === para) return false;
  if (de === "PAGO") return false;
  if (para === "PAGO") return true;
  return (PESO[para] ?? 0) > (PESO[de] ?? 0);
}

// Motivo da recusa em linguagem simples (es / pt)
const MOTIVOS: Record<string, [string, string]> = {
  "301": ["El banco rechazó el pago.", "O banco recusou o pagamento."],
  "302": ["Saldo o límite insuficiente.", "Saldo ou limite insuficiente."],
  "303": ["La tarjeta no puede usarse.", "O cartão não pode ser usado."],
  "304": [
    "El pago no pasó la validación de seguridad.",
    "O pagamento não passou na validação de segurança.",
  ],
  "305": ["Demasiados intentos. Probá más tarde.", "Tentativas demais. Tente mais tarde."],
  "306": [
    "Llamá a tu banco para autorizar el pago.",
    "Ligue para o seu banco para autorizar o pagamento.",
  ],
  "307": ["Pago duplicado.", "Pagamento duplicado."],
  "308": ["La tarjeta está deshabilitada.", "O cartão está desabilitado."],
  "309": ["La tarjeta está vencida.", "O cartão está vencido."],
  "310": ["Tarjeta denegada.", "Cartão negado."],
  "311": ["Tarjeta inválida.", "Cartão inválido."],
  "312": ["Número de tarjeta inválido.", "Número de cartão inválido."],
  "313": ["Monto inválido.", "Valor inválido."],
  "314": ["Fecha de vencimiento inválida.", "Validade inválida."],
  "315": ["Código de seguridad (CVV) inválido.", "Código de segurança (CVV) inválido."],
  "316": ["Documento inválido.", "Documento inválido."],
  "320": [
    "El banco pidió confirmar la compra (3D Secure) y no se completó.",
    "O banco pediu a confirmação (3D Secure) e ela não foi concluída.",
  ],
  "322": ["El banco no autorizó el pago.", "O banco não autorizou o pagamento."],
  "340": ["El plazo para pagar venció.", "O prazo para pagar venceu."],
};
export function motivoRecusa(codigo: string | null | undefined, idioma: "es" | "pt") {
  const m = codigo ? MOTIVOS[String(codigo)] : null;
  if (m) return m[idioma === "pt" ? 1 : 0];
  return idioma === "pt"
    ? "O pagamento não foi aprovado. Tente outro cartão ou outra forma de pagamento."
    : "El pago no fue aprobado. Probá con otra tarjeta u otro medio de pago.";
}
