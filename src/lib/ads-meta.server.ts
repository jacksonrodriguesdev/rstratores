// API de Marketing do Meta (Facebook/Instagram Ads) para a Central de Anúncios.
// Usa a conta de anúncios (mkt_meta_ad_account, "act_123…") e o token do usuário do sistema
// (mkt_meta_ads_token) cadastrados em Marketing → Integrações. Para ler basta ads_read; para
// pausar/ativar e mudar orçamento o token precisa de ads_management.
// META_GRAPH_URL só serve para testes locais (servidor falso).
const GRAPH = (process.env.META_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
const VERSAO = "v21.0";

export type CampanhaApi = {
  id: string;
  nome: string;
  status: "ATIVA" | "PAUSADA" | "REMOVIDA" | "OUTRO";
  statusOrigem: string;
  orcamentoDiario: number | null; // moeda da conta
  orcamentoRef: string | null;
  compartilhado: boolean;
  objetivo: string | null;
};
export type DiaApi = {
  id: string;
  dia: string;
  gasto: number;
  impressoes: number;
  cliques: number;
  conversoes: number;
  valorConv: number;
  leads: number;
};

async function cfg() {
  const { configMarketing } = await import("./marketing-config.server");
  const c = await configMarketing();
  const conta = c.mkt_meta_ad_account.replace(/^act_/i, "").replace(/\D/g, "");
  return { conta: conta ? `act_${conta}` : "", token: c.mkt_meta_ads_token };
}
export async function metaConfigurado() {
  const c = await cfg();
  return !!(c.conta && c.token);
}

async function chamar(
  caminho: string,
  params: Record<string, string> = {},
  metodo: "GET" | "POST" = "GET",
) {
  const c = await cfg();
  if (!c.conta || !c.token) throw new Error("Meta: falta a conta de anúncios ou o token.");
  const corpo = new URLSearchParams({ ...params, access_token: c.token });
  const url = caminho.startsWith("http") ? caminho : `${GRAPH}/${VERSAO}/${caminho}`;
  const r = await fetch(metodo === "GET" ? `${url}${url.includes("?") ? "&" : "?"}${corpo}` : url, {
    method: metodo,
    ...(metodo === "POST" && {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = j.error ?? {};
    const msg =
      e.code === 190
        ? "o token do Meta expirou ou foi revogado"
        : e.code === 200 || e.code === 10
          ? "o token não tem permissão (precisa de ads_read para ler e ads_management para alterar)"
          : e.error_user_msg || e.message || `HTTP ${r.status}`;
    throw new Error(`Meta: ${msg}`);
  }
  return j;
}

// Percorre as páginas ("paging.next") da Graph API
async function todas(caminho: string, params: Record<string, string>) {
  const out: any[] = [];
  let j = await chamar(caminho, params);
  for (let i = 0; i < 50; i++) {
    out.push(...(j.data ?? []));
    if (!j.paging?.next) break;
    // O "next" já traz o token; troca o host para o configurado (testes)
    const prox = String(j.paging.next).replace(/^https:\/\/graph\.facebook\.com/, GRAPH);
    const r = await fetch(prox, { signal: AbortSignal.timeout(30_000) });
    j = await r.json();
    if (j.error) throw new Error(`Meta: ${j.error.message}`);
  }
  return out;
}

export async function contaMeta() {
  const c = await cfg();
  const j = await chamar(c.conta, { fields: "name,currency,account_status,timezone_name" });
  return {
    nome: String(j.name ?? ""),
    moeda: String(j.currency ?? "USD"),
    status: Number(j.account_status),
  };
}

const STATUS: Record<string, CampanhaApi["status"]> = {
  ACTIVE: "ATIVA",
  PAUSED: "PAUSADA",
  DELETED: "REMOVIDA",
  ARCHIVED: "REMOVIDA",
};

export async function campanhasMeta(): Promise<CampanhaApi[]> {
  const c = await cfg();
  const rows = await todas(`${c.conta}/campaigns`, {
    fields: "id,name,status,effective_status,daily_budget,lifetime_budget,objective",
    limit: "200",
  });
  return rows.map((x) => ({
    id: String(x.id),
    nome: String(x.name ?? x.id),
    status: STATUS[x.status] ?? "OUTRO",
    statusOrigem: String(x.effective_status ?? x.status ?? ""),
    // O Meta guarda o orçamento na menor unidade da moeda (centavos)
    orcamentoDiario: x.daily_budget ? Number(x.daily_budget) / 100 : null,
    orcamentoRef: x.daily_budget ? "campanha" : x.lifetime_budget ? "vitalicio" : "conjunto",
    compartilhado: false,
    objetivo: x.objective ? String(x.objective) : null,
  }));
}

// Ações que contam como lead (formulário, pixel, conversa iniciada no WhatsApp/Messenger)
const LEADS = [
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "onsite_conversion.messaging_conversation_started_7d",
  "contact",
  "offsite_conversion.fb_pixel_contact",
];
const soma = (lista: any[] | undefined, tipos: string[]) =>
  (lista ?? [])
    .filter((a) => tipos.includes(a.action_type))
    .reduce((t, a) => t + Number(a.value || 0), 0);
// "purchase" já soma pixel + API de Conversões; se não vier, usa o do pixel
const compra = (lista: any[] | undefined) => {
  const p = (lista ?? []).find(
    (a) => a.action_type === "purchase" || a.action_type === "omni_purchase",
  );
  if (p) return Number(p.value || 0);
  return soma(lista, ["offsite_conversion.fb_pixel_purchase"]);
};

export async function diasMeta(ini: string, fim: string): Promise<DiaApi[]> {
  const c = await cfg();
  const rows = await todas(`${c.conta}/insights`, {
    level: "campaign",
    time_increment: "1",
    time_range: JSON.stringify({ since: ini, until: fim }),
    fields: "campaign_id,spend,impressions,clicks,actions,action_values",
    limit: "500",
  });
  return rows.map((x) => ({
    id: String(x.campaign_id),
    dia: String(x.date_start),
    gasto: Number(x.spend || 0),
    impressoes: Number(x.impressions || 0),
    cliques: Number(x.clicks || 0),
    conversoes: compra(x.actions),
    valorConv: compra(x.action_values),
    leads: soma(x.actions, LEADS),
  }));
}

export async function statusMeta(id: string, ativa: boolean) {
  await chamar(id, { status: ativa ? "ACTIVE" : "PAUSED" }, "POST");
}

export async function orcamentoMeta(id: string, valor: number) {
  await chamar(id, { daily_budget: String(Math.round(valor * 100)) }, "POST");
}
