// API do Google Ads para a Central de Anúncios (REST + GAQL).
// Precisa de três coisas:
// 1. Conexão OAuth (escopo adwords) com a conta Google que acessa o Google Ads: botão "Conectar"
//    no painel (mesmo GOOGLE_CLIENT_ID do "Entrar com Google"); o refresh token fica em
//    configuracoes (gads_refresh), só no servidor.
// 2. Token de desenvolvedor (mkt_gads_dev_token ou MKT_GADS_DEV_TOKEN): conta de gerente (MCC) →
//    Ferramentas → Centro de API.
// 3. ID da conta (mkt_gads_customer_id) e, se ela é gerenciada pela MCC, o ID da MCC
//    (mkt_gads_login_customer_id).
// GADS_API_URL / GADS_TOKEN_URL só servem para testes locais (servidor falso).
import type { CampanhaApi, DiaApi } from "./ads-meta.server";

const API = (process.env.GADS_API_URL || "https://googleads.googleapis.com").replace(/\/+$/, "");
const TOKEN_URL = process.env.GADS_TOKEN_URL || "https://oauth2.googleapis.com/token";
export const ESCOPO_ADS = "https://www.googleapis.com/auth/adwords";
// A API muda de versão algumas vezes por ano; usa a mais nova que responder
const VERSOES = (process.env.GADS_API_VERSAO || "v24,v23,v22,v21,v20").split(",");

const soDigitos = (s: string) => s.replace(/\D/g, "");

async function lerConfig() {
  const { configMarketing } = await import("./marketing-config.server");
  const { prisma } = await import("./prisma");
  const c = await configMarketing();
  const ref = await prisma.configuracoes.findMany({
    where: { chave: { in: ["gads_refresh", "gads_email"] } },
  });
  const m = Object.fromEntries(ref.map((r) => [r.chave, r.valor]));
  return {
    cliente: soDigitos(c.mkt_gads_customer_id),
    gerente: soDigitos(c.mkt_gads_login_customer_id),
    devToken: c.mkt_gads_dev_token,
    refresh: m.gads_refresh || "",
    email: m.gads_email || null,
  };
}

export async function estadoGoogleAds() {
  const c = await lerConfig();
  return {
    conectado: !!c.refresh,
    email: c.email,
    temCliente: !!c.cliente,
    temDevToken: !!c.devToken,
    pronto: !!(c.refresh && c.cliente && c.devToken),
  };
}

// ---------- OAuth ----------
export function urlConectarAds(redirect: string, state: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirect,
    response_type: "code",
    scope: `openid email ${ESCOPO_ADS}`,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return u.toString();
}

export async function concluirConexaoAds(code: string, redirect: string) {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.refresh_token)
    throw new Error(j.error_description || j.error || "o Google não devolveu a autorização");
  if (!String(j.scope || "").includes(ESCOPO_ADS))
    throw new Error("A permissão do Google Ads não foi marcada. Conecte de novo e marque a caixa.");
  let email: string | null = null;
  try {
    email = JSON.parse(Buffer.from(String(j.id_token).split(".")[1], "base64url").toString()).email;
  } catch {
    /* sem e-mail: só informativo */
  }
  acesso = { token: j.access_token, expira: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  await gravar({ gads_refresh: j.refresh_token, gads_email: email });
}

async function gravar(v: Record<string, string | null>) {
  const { prisma } = await import("./prisma");
  for (const [chave, valor] of Object.entries(v)) {
    if (valor)
      await prisma.configuracoes.upsert({
        where: { chave },
        create: { chave, valor },
        update: { valor },
      });
    else await prisma.configuracoes.deleteMany({ where: { chave } });
  }
}

export async function desconectarAds() {
  const c = await lerConfig();
  if (c.refresh)
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: c.refresh }),
    }).catch(() => {});
  acesso = null;
  await gravar({ gads_refresh: null, gads_email: null });
}

let acesso: { token: string; expira: number } | null = null;
async function token(refresh: string) {
  if (acesso && acesso.expira - Date.now() > 60_000) return acesso.token;
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token)
    throw new Error(
      j.error === "invalid_grant"
        ? "Google Ads: a autorização expirou ou foi removida. Conecte de novo."
        : `Google Ads: ${j.error_description || j.error || r.status}`,
    );
  acesso = { token: j.access_token, expira: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return acesso.token;
}

let versao: string | null = null;
async function chamar(caminho: string, corpo: unknown) {
  const c = await lerConfig();
  if (!c.refresh) throw new Error("Google Ads: conecte a conta Google no painel.");
  if (!c.devToken) throw new Error("Google Ads: falta o token de desenvolvedor.");
  if (!c.cliente) throw new Error("Google Ads: falta o ID da conta (123-456-7890).");
  const headers = {
    Authorization: `Bearer ${await token(c.refresh)}`,
    "developer-token": c.devToken,
    "Content-Type": "application/json",
    ...(c.gerente && { "login-customer-id": c.gerente }),
  };
  const lista = versao ? [versao] : VERSOES;
  let ultimo = "";
  for (const v of lista) {
    const r = await fetch(`${API}/${v}/customers/${c.cliente}/${caminho}`, {
      method: "POST",
      headers,
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(60_000),
    });
    const texto = await r.text();
    let j: any = null;
    try {
      j = JSON.parse(texto);
    } catch {
      j = null;
    }
    // Versão que não existe (nova demais ou já desligada): tenta a próxima
    if (r.status === 404 && !versao) {
      ultimo = `versão ${v} indisponível`;
      continue;
    }
    const erro = (Array.isArray(j) ? j[0]?.error : j?.error) ?? null;
    if (!r.ok || erro) {
      const det = erro?.details?.[0]?.errors?.[0];
      const codigo = det?.errorCode ? Object.values(det.errorCode)[0] : null;
      const msg =
        codigo === "DEVELOPER_TOKEN_NOT_APPROVED"
          ? "o token de desenvolvedor ainda só funciona com contas de teste. No Centro de API da MCC, peça o acesso “Explorador” ou “Básico”."
          : codigo === "USER_PERMISSION_DENIED"
            ? "a conta Google conectada não tem acesso a esta conta do Google Ads (confira o ID e, se houver, o ID da MCC)."
            : det?.message || erro?.message || `HTTP ${r.status}`;
      throw new Error(`Google Ads: ${msg}`);
    }
    versao = v;
    return j;
  }
  throw new Error(`Google Ads: nenhuma versão da API respondeu (${ultimo}).`);
}

// Consulta GAQL (searchStream devolve uma lista de lotes)
async function gaql(query: string): Promise<any[]> {
  const j = await chamar("googleAds:searchStream", { query });
  return (Array.isArray(j) ? j : [j]).flatMap((lote: any) => lote.results ?? []);
}

export async function contaGoogle() {
  const r = await gaql("SELECT customer.descriptive_name, customer.currency_code FROM customer");
  return {
    nome: String(r[0]?.customer?.descriptiveName ?? ""),
    moeda: String(r[0]?.customer?.currencyCode ?? "USD"),
  };
}

const STATUS: Record<string, CampanhaApi["status"]> = {
  ENABLED: "ATIVA",
  PAUSED: "PAUSADA",
  REMOVED: "REMOVIDA",
};
const micros = (v: unknown) => Number(v || 0) / 1e6;

export async function campanhasGoogle(): Promise<CampanhaApi[]> {
  const r = await gaql(
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
            campaign_budget.amount_micros, campaign_budget.resource_name, campaign_budget.explicitly_shared
     FROM campaign WHERE campaign.status != 'REMOVED'`,
  );
  return r.map((x) => ({
    id: String(x.campaign.id),
    nome: String(x.campaign.name),
    status: STATUS[x.campaign.status] ?? "OUTRO",
    statusOrigem: String(x.campaign.status ?? ""),
    orcamentoDiario:
      x.campaignBudget?.amountMicros != null ? micros(x.campaignBudget.amountMicros) : null,
    orcamentoRef: x.campaignBudget?.resourceName ?? null,
    compartilhado: !!x.campaignBudget?.explicitlyShared,
    objetivo: x.campaign.advertisingChannelType ?? null,
  }));
}

export async function diasGoogle(ini: string, fim: string): Promise<DiaApi[]> {
  const r = await gaql(
    `SELECT campaign.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks,
            metrics.conversions, metrics.conversions_value
     FROM campaign WHERE segments.date BETWEEN '${ini}' AND '${fim}'`,
  );
  return r.map((x) => ({
    id: String(x.campaign.id),
    dia: String(x.segments.date),
    gasto: micros(x.metrics?.costMicros),
    impressoes: Number(x.metrics?.impressions || 0),
    cliques: Number(x.metrics?.clicks || 0),
    // No Google, as "conversões" são as ações configuradas (lead do WhatsApp, cadastro, compra)
    conversoes: 0,
    valorConv: Number(x.metrics?.conversionsValue || 0),
    leads: Number(x.metrics?.conversions || 0),
  }));
}

export async function statusGoogle(id: string, ativa: boolean) {
  const c = await lerConfig();
  await chamar("campaigns:mutate", {
    operations: [
      {
        update: {
          resourceName: `customers/${c.cliente}/campaigns/${id}`,
          status: ativa ? "ENABLED" : "PAUSED",
        },
        updateMask: "status",
      },
    ],
  });
}

export async function orcamentoGoogle(orcamentoRef: string, valor: number) {
  await chamar("campaignBudgets:mutate", {
    operations: [
      {
        update: { resourceName: orcamentoRef, amountMicros: String(Math.round(valor * 1e6)) },
        updateMask: "amount_micros",
      },
    ],
  });
}
