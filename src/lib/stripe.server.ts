// Cliente da API do Stripe (Checkout Sessions). Só roda no servidor: as chaves ficam nas variáveis
// de ambiente da Hostinger (nunca no navegador, nunca no código).
//   STRIPE_SECRET_KEY      → chave secreta (sk_test_... no teste, sk_live_... em produção)
//   STRIPE_WEBHOOK_SECRET  → segredo do aviso (whsec_...), do endpoint cadastrado no painel do Stripe
//   STRIPE_BASE_URL        → (opcional) outro endereço da API, só para testes
// O cliente paga na página do próprio Stripe (Checkout): o número do cartão nunca passa por aqui.
// A criação da sessão leva uma chave de idempotência: repetir a chamada não cria outra cobrança.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PagamentoDlocal } from "./dlocal.server";

const env = (k: string) => process.env[k]?.trim() || "";

export const stripeConfigurado = () => /^(sk|rk)_(test|live)_/.test(env("STRIPE_SECRET_KEY"));
export const avisoStripeConfigurado = () => env("STRIPE_WEBHOOK_SECRET").startsWith("whsec_");
export const ambienteStripe = (): "teste" | "producao" =>
  env("STRIPE_SECRET_KEY").includes("_live_") ? "producao" : "teste";
const urlApi = () => (env("STRIPE_BASE_URL") || "https://api.stripe.com").replace(/\/+$/, "");

export class ErroStripe extends Error {
  constructor(
    message: string,
    public http: number,
    public codigo: string | null,
  ) {
    super(message);
  }
}

// O Stripe recebe formulário (a[b][c]=valor), não JSON
function formulario(obj: Record<string, unknown>, prefixo = "", saida = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const chave = prefixo ? `${prefixo}[${k}]` : k;
    if (Array.isArray(v))
      v.forEach((item, i) =>
        typeof item === "object" && item !== null
          ? formulario(item as Record<string, unknown>, `${chave}[${i}]`, saida)
          : saida.append(`${chave}[${i}]`, String(item)),
      );
    else if (typeof v === "object") formulario(v as Record<string, unknown>, chave, saida);
    else saida.append(chave, String(v));
  }
  return saida;
}

async function chamar<T = any>(
  metodo: "GET" | "POST",
  caminho: string,
  corpo?: Record<string, unknown>,
  idempotencia?: string,
): Promise<T> {
  if (!stripeConfigurado()) throw new ErroStripe("Stripe não configurado", 0, null);
  const r = await fetch(urlApi() + caminho, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
      ...(idempotencia && { "Idempotency-Key": idempotencia }),
    },
    body: metodo === "POST" && corpo ? formulario(corpo).toString() : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const j: any = await r.json().catch(() => null);
  if (!r.ok)
    throw new ErroStripe(
      String(j?.error?.message || `Stripe respondeu ${r.status}`),
      r.status,
      j?.error?.code ?? j?.error?.type ?? null,
    );
  return j as T;
}

export type SessaoStripe = {
  id: string;
  url?: string | null;
  status?: "open" | "complete" | "expired" | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required" | null;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  expires_at?: number | null;
  metadata?: Record<string, string>;
  payment_intent?:
    | string
    | {
        id: string;
        status?: string;
        last_payment_error?: { message?: string; code?: string } | null;
        latest_charge?:
          | string
          | {
              payment_method_details?: { card?: { brand?: string; last4?: string } };
            }
          | null;
      }
    | null;
};

export type NovaSessao = {
  orderId: string;
  linkId: number;
  valor: number; // centavos
  moeda: "UYU" | "BRL";
  descricao: string;
  itensResumo: string;
  email?: string | null;
  idioma: "es" | "pt";
  sucesso: string; // URL de volta (pagou)
  cancelar: string; // URL de volta (desistiu)
};

export async function criarSessaoStripe(s: NovaSessao): Promise<SessaoStripe> {
  return chamar<SessaoStripe>(
    "POST",
    "/v1/checkout/sessions",
    {
      mode: "payment",
      client_reference_id: s.orderId,
      ...(s.email && { customer_email: s.email }),
      locale: s.idioma === "pt" ? "pt-BR" : "es-419",
      success_url: s.sucesso,
      cancel_url: s.cancelar,
      // A sessão vale 1 hora (mínimo do Stripe: 30 min); depois o cliente gera outra no link
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: s.moeda.toLowerCase(),
            unit_amount: s.valor,
            product_data: {
              name: s.descricao.slice(0, 120),
              ...(s.itensResumo && { description: s.itensResumo.slice(0, 500) }),
            },
          },
        },
      ],
      metadata: { order_id: s.orderId, link_id: String(s.linkId) },
      payment_intent_data: {
        description: s.descricao.slice(0, 120),
        metadata: { order_id: s.orderId, link_id: String(s.linkId) },
      },
    },
    `checkout-${s.orderId}`,
  );
}

export const consultarSessaoStripe = (id: string) =>
  chamar<SessaoStripe>(
    "GET",
    `/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=payment_intent.latest_charge`,
  );

// A sessão do Stripe no mesmo formato que o resto do sistema já entende (o da dLocal):
// assim a trava, a conferência de valor/moeda, o "pago em duplicidade" e o pós-venda são os mesmos.
export function sessaoComoPagamento(s: SessaoStripe): PagamentoDlocal {
  const pi = typeof s.payment_intent === "object" ? s.payment_intent : null;
  const charge = pi && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  const card = charge?.payment_method_details?.card;
  const status =
    s.payment_status === "paid" || s.payment_status === "no_payment_required"
      ? "PAID"
      : s.status === "expired"
        ? "EXPIRED"
        : pi?.status === "canceled"
          ? "CANCELLED"
          : "PENDING";
  return {
    id: s.id,
    order_id: s.client_reference_id ?? s.metadata?.order_id ?? undefined,
    amount: s.amount_total != null ? s.amount_total / 100 : undefined,
    currency: s.currency ? s.currency.toUpperCase() : undefined,
    status,
    status_detail:
      pi?.last_payment_error?.message ??
      (status === "EXPIRED" ? "Sessão do Stripe expirou sem pagamento" : undefined),
    ...(status === "PENDING" && s.url && { redirect_url: s.url }),
    ...(card && { card: { brand: card.brand, last4: card.last4 } }),
  };
}

// Assinatura do aviso (cabeçalho Stripe-Signature: t=...,v1=...): HMAC-SHA256 de "t.corpo".
// Recusa avisos com mais de 5 minutos (evita reenvio de um aviso antigo).
export function avisoStripeAutentico(corpo: string, cabecalho: string | null, agora = Date.now()) {
  const segredo = env("STRIPE_WEBHOOK_SECRET");
  if (!segredo || !cabecalho) return false;
  const partes = cabecalho.split(",").map((p) => p.trim().split("="));
  const t = partes.find(([k]) => k === "t")?.[1];
  const assinaturas = partes.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !assinaturas.length) return false;
  if (Math.abs(agora / 1000 - Number(t)) > 300) return false;
  const esperada = Buffer.from(
    createHmac("sha256", segredo).update(`${t}.${corpo}`).digest("hex"),
    "utf8",
  );
  return assinaturas.some((a) => {
    const b = Buffer.from(String(a), "utf8");
    return b.length === esperada.length && timingSafeEqual(b, esperada);
  });
}
