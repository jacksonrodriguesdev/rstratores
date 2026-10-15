// Conversões enviadas pelo servidor:
// - Meta Conversions API (CAPI): Lead (pedido pelo WhatsApp), CompleteRegistration (cadastro) e
//   Purchase (carrinho marcado como "Ganho" no admin). Dados pessoais vão com hash SHA-256, como o
//   Meta exige. O event_id igual ao do Pixel evita contar duas vezes.
// - GA4 Measurement Protocol: a venda fechada no WhatsApp entra como "purchase" no Analytics.
// Cada envio fica em marketing_eventos (Marketing → Integrações → Últimos eventos).
import { createHash, randomUUID } from "crypto";

const VERSAO = "v21.0";
// META_GRAPH_URL só serve para testes locais (servidor falso); em produção fica o padrão
const GRAPH = (process.env.META_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
// GA4_MP_URL: idem, só para testes locais
const GA4_MP = (process.env.GA4_MP_URL || "https://www.google-analytics.com").replace(/\/+$/, "");
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export type Pessoa = {
  email?: string | null;
  telefone?: string | null;
  nome?: string | null;
  userId?: number | null;
  cidade?: string | null;
  pais?: string | null;
};
export type Navegador = {
  ip?: string | null;
  ua?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  url?: string | null;
};

// Telefone em formato internacional só com dígitos (Uruguai por padrão)
function telefoneE164(t?: string | null): string | null {
  let d = (t ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("598") || d.startsWith("55")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  if (/^9\d{7}$/.test(d)) return "598" + d;
  if (/^\d{10,11}$/.test(d)) return "55" + d; // celular brasileiro com DDD
  return d;
}
const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

function userData(p: Pessoa, n: Navegador) {
  const u: Record<string, unknown> = {};
  const email = p.email?.trim().toLowerCase();
  if (email) u.em = [sha(email)];
  const tel = telefoneE164(p.telefone);
  if (tel) u.ph = [sha(tel)];
  if (p.nome) {
    const [fn, ...resto] = p.nome.trim().split(/\s+/);
    if (fn) u.fn = [sha(semAcento(fn))];
    if (resto.length) u.ln = [sha(semAcento(resto.join("")))];
  }
  if (p.cidade) u.ct = [sha(semAcento(p.cidade))];
  u.country = [sha((p.pais && p.pais.length === 2 ? p.pais : "uy").toLowerCase())];
  if (p.userId) u.external_id = [sha(String(p.userId))];
  if (n.fbp) u.fbp = n.fbp;
  if (n.fbc) u.fbc = n.fbc;
  if (n.ip) u.client_ip_address = n.ip;
  if (n.ua) u.client_user_agent = n.ua;
  return u;
}

async function registrar(
  plataforma: string,
  evento: string,
  eventId: string | null,
  ok: boolean,
  detalhe: string,
  teste = false,
) {
  try {
    const { prisma } = await import("./prisma");
    await prisma.marketing_eventos.create({
      data: {
        plataforma,
        evento,
        event_id: eventId?.slice(0, 100) ?? null,
        ok,
        teste,
        detalhe: detalhe.slice(0, 2000),
      },
    });
  } catch {
    /* tabela ainda não criada em produção: ignora */
  }
}

export async function enviarEventoMeta(o: {
  evento: "Lead" | "CompleteRegistration" | "Purchase" | "Contact" | "PageView";
  eventId?: string | null;
  pessoa?: Pessoa;
  navegador?: Navegador;
  origem?: "website" | "chat" | "system_generated";
  dados?: Record<string, unknown>;
  quando?: Date;
  forcarTeste?: boolean;
}): Promise<{ ok: boolean; detalhe: string }> {
  const { configMarketing } = await import("./marketing-config.server");
  const c = await configMarketing();
  if (!c.mkt_meta_pixel_id || !c.mkt_meta_capi_token)
    return { ok: false, detalhe: "API de Conversões não configurada" };
  const eventId = o.eventId || `srv_${randomUUID()}`;
  const evento: Record<string, unknown> = {
    event_name: o.evento,
    event_time: Math.floor((o.quando?.getTime() ?? Date.now()) / 1000),
    event_id: eventId,
    action_source: o.origem ?? "website",
    user_data: userData(o.pessoa ?? {}, o.navegador ?? {}),
    ...(o.navegador?.url && { event_source_url: o.navegador.url }),
    ...(o.dados && { custom_data: o.dados }),
  };
  const teste = o.forcarTeste || !!c.mkt_meta_test_code;
  try {
    const r = await fetch(
      `${GRAPH}/${VERSAO}/${c.mkt_meta_pixel_id}/events?access_token=${encodeURIComponent(c.mkt_meta_capi_token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [evento],
          ...(c.mkt_meta_test_code && { test_event_code: c.mkt_meta_test_code }),
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const j: any = await r.json().catch(() => ({}));
    const ok = r.ok && Number(j.events_received) > 0;
    const detalhe = ok
      ? `recebido (fbtrace ${j.fbtrace_id ?? "-"})`
      : (j?.error?.message ?? `HTTP ${r.status}`);
    await registrar("META", o.evento, eventId, ok, detalhe, teste);
    return { ok, detalhe };
  } catch (e: any) {
    const detalhe = `falha de rede: ${e?.message ?? e}`;
    await registrar("META", o.evento, eventId, false, detalhe, teste);
    return { ok: false, detalhe };
  }
}

// GA4 Measurement Protocol: precisa do "segredo da API" criado no fluxo de dados do GA4
export async function enviarEventoGA4(o: {
  evento: string;
  clientId: string;
  userId?: number | null;
  params?: Record<string, unknown>;
}) {
  const { configMarketing } = await import("./marketing-config.server");
  const c = await configMarketing();
  if (!c.mkt_ga4_id || !c.mkt_ga4_api_secret)
    return { ok: false, detalhe: "GA4 Measurement Protocol não configurado" };
  try {
    const r = await fetch(
      `${GA4_MP}/mp/collect?measurement_id=${encodeURIComponent(c.mkt_ga4_id)}&api_secret=${encodeURIComponent(c.mkt_ga4_api_secret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: o.clientId,
          ...(o.userId && { user_id: String(o.userId) }),
          events: [{ name: o.evento, params: o.params ?? {} }],
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    // O GA4 responde 204 mesmo com evento inválido; erro de rede/HTTP é o que dá para ver aqui
    const ok = r.status >= 200 && r.status < 300;
    await registrar("GA4", o.evento, null, ok, ok ? "enviado" : `HTTP ${r.status}`);
    return { ok, detalhe: ok ? "enviado" : `HTTP ${r.status}` };
  } catch (e: any) {
    await registrar("GA4", o.evento, null, false, `falha de rede: ${e?.message ?? e}`);
    return { ok: false, detalhe: String(e?.message ?? e) };
  }
}

// Cookies do Meta na requisição do navegador (criados pelo Pixel)
export function cookiesMeta(request: Request): { fbp: string | null; fbc: string | null } {
  const c = request.headers.get("cookie") ?? "";
  const ler = (n: string) => {
    const m = c.match(new RegExp(`(?:^|;\\s*)${n}=([^;]+)`));
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]).slice(0, 255);
    } catch {
      return m[1].slice(0, 255);
    }
  };
  return { fbp: ler("_fbp"), fbc: ler("_fbc") };
}

// Venda fechada no WhatsApp (carrinho → "Ganho" com valor): Purchase no Meta e no GA4. Uma vez só.
export async function registrarVendaFechada(carrinhoId: number) {
  const { prisma } = await import("./prisma");
  const c = await prisma.carrinhos.findUnique({
    where: { id: carrinhoId },
    include: { user: true },
  });
  if (!c || c.etapa !== "GANHO" || !c.valor_fechado || c.valor_fechado <= 0 || c.capi_compra_em)
    return;
  let itens: Array<{ sku: string; quantity: number }> = [];
  try {
    itens = JSON.parse(c.itens);
  } catch {
    /* itens inválidos: envia a compra sem a lista de peças */
  }
  const u = c.user;
  const meta = await enviarEventoMeta({
    evento: "Purchase",
    eventId: `compra_carrinho_${c.id}`,
    origem: "chat", // a venda é fechada pelo WhatsApp
    pessoa: u
      ? {
          email: u.email,
          telefone: u.telefone,
          nome: u.nome_completo,
          userId: u.id,
          cidade: u.cidade,
          pais: "uy",
        }
      : {},
    navegador: { fbp: c.fbp, fbc: c.fbc },
    dados: {
      currency: "UYU",
      value: c.valor_fechado,
      content_type: "product",
      content_ids: itens.map((i) => i.sku),
      num_items: itens.reduce((t, i) => t + (Number(i.quantity) || 1), 0),
      order_id: `carrinho-${c.id}`,
    },
  });
  const ga = await enviarEventoGA4({
    evento: "purchase",
    clientId: c.visitante_id,
    userId: u?.id,
    params: {
      currency: "UYU",
      value: c.valor_fechado,
      transaction_id: `carrinho-${c.id}`,
      items: itens.map((i) => ({ item_id: i.sku, quantity: Number(i.quantity) || 1 })),
    },
  });
  if (meta.ok || ga.ok)
    await prisma.carrinhos.update({ where: { id: c.id }, data: { capi_compra_em: new Date() } });
}

// Conta nova (cadastro, Google ou pop-up): CompleteRegistration. O pop-up manda o mesmo
// event_id ("cadastro_<id>") pelo Pixel, então o Meta conta uma vez só.
export async function registrarCadastro(
  request: Request,
  u: {
    id: number;
    email: string;
    telefone?: string | null;
    nome_completo: string;
    cidade?: string | null;
  },
) {
  const { ipDaRequisicao } = await import("./rastreio.server");
  return enviarEventoMeta({
    evento: "CompleteRegistration",
    eventId: `cadastro_${u.id}`,
    pessoa: {
      email: u.email,
      telefone: u.telefone,
      nome: u.nome_completo,
      userId: u.id,
      cidade: u.cidade,
    },
    navegador: {
      ip: ipDaRequisicao(request),
      ua: request.headers.get("user-agent"),
      ...cookiesMeta(request),
      url: request.headers.get("referer"),
    },
  }).catch(() => ({ ok: false, detalhe: "erro" }));
}
