// IDs e chaves das plataformas de marketing (Meta, Google), editáveis em Marketing → Integrações.
// Ficam na tabela configuracoes (chaves mkt_*). Os SEGREDOS (tokens) só são lidos no servidor e
// nunca voltam inteiros para o navegador. Variáveis de ambiente com o mesmo nome em maiúsculas
// (ex.: MKT_META_CAPI_TOKEN) têm prioridade, para quem preferir guardar fora do banco.

export const CAMPOS = {
  mkt_meta_pixel_id: { segredo: false },
  mkt_meta_capi_token: { segredo: true },
  mkt_meta_test_code: { segredo: false }, // "TEST12345" do Gerenciador de Eventos (modo teste)
  mkt_meta_ad_account: { segredo: false }, // act_123... (Fase 3)
  mkt_meta_ads_token: { segredo: true }, // token com ads_read (Fase 3)
  mkt_meta_page_id: { segredo: false }, // Fase 5
  mkt_meta_page_token: { segredo: true }, // Fase 5
  mkt_meta_ig_id: { segredo: false }, // Fase 5
  mkt_meta_dominio: { segredo: false }, // código de verificação do domínio (facebook-domain-verification)
  mkt_ga4_id: { segredo: false },
  mkt_ga4_api_secret: { segredo: true }, // Measurement Protocol (vendas fechadas no WhatsApp)
  mkt_gtm_id: { segredo: false },
  mkt_gads_id: { segredo: false }, // AW-123456789
  mkt_gads_label_lead: { segredo: false },
  mkt_gads_label_cadastro: { segredo: false },
  mkt_gads_label_compra: { segredo: false },
  // Central de Anúncios (API do Google Ads): conta, conta de gerente (MCC) e token de desenvolvedor
  mkt_gads_customer_id: { segredo: false }, // 123-456-7890
  mkt_gads_login_customer_id: { segredo: false }, // MCC, se a conta é gerenciada por uma
  mkt_gads_dev_token: { segredo: true },
  mkt_google_verificacao: { segredo: false }, // google-site-verification (Search Console/Merchant)
  mkt_merchant_id: { segredo: false },
  mkt_clarity_id: { segredo: false }, // Microsoft Clarity: gravações de sessão e mapas de calor
} as const;
export type ChaveMkt = keyof typeof CAMPOS;
export type ConfigMkt = Record<ChaveMkt, string>;

// IDs públicos (aparecem no HTML de qualquer site): valem quando o painel não tem outro salvo
const PADRAO: Partial<ConfigMkt> = {
  mkt_ga4_id: "G-M8WS1HTBES",
  mkt_meta_pixel_id: "1513637917487644",
};

let memo: { cfg: ConfigMkt; em: number } | null = null;
export const limparCacheMarketing = () => {
  memo = null;
};

export async function configMarketing(): Promise<ConfigMkt> {
  if (memo && Date.now() - memo.em < 60_000) return memo.cfg;
  const { prisma } = await import("./prisma");
  let rows: Array<{ chave: string; valor: string }> = [];
  try {
    rows = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "mkt_" } } });
  } catch {
    /* banco fora do ar: segue com o padrão */
  }
  const doBanco = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  const cfg = {} as ConfigMkt;
  for (const k of Object.keys(CAMPOS) as ChaveMkt[]) {
    cfg[k] = (process.env[k.toUpperCase()]?.trim() || doBanco[k]?.trim() || PADRAO[k] || "").trim();
  }
  memo = { cfg, em: Date.now() };
  return cfg;
}

export async function salvarConfigMarketing(valores: Partial<Record<ChaveMkt, string>>) {
  const { prisma } = await import("./prisma");
  for (const [chave, bruto] of Object.entries(valores)) {
    if (!(chave in CAMPOS)) continue;
    const valor = String(bruto ?? "")
      .trim()
      .slice(0, 2000);
    // Segredo mascarado ("••••1234") volta do formulário sem mudança: mantém o salvo
    if (CAMPOS[chave as ChaveMkt].segredo && valor.startsWith("••••")) continue;
    if (valor)
      await prisma.configuracoes.upsert({
        where: { chave },
        create: { chave, valor },
        update: { valor },
      });
    else await prisma.configuracoes.deleteMany({ where: { chave } });
  }
  limparCacheMarketing();
}

export const mascarar = (v: string) => (v ? `••••${v.slice(-4)}` : "");

// Só o que pode ir para o HTML público (IDs; nunca tokens)
export type MarketingPublico = {
  pixel: string;
  ga4: string;
  gtm: string;
  gads: string;
  gadsLead: string;
  gadsCadastro: string;
  metaDominio: string;
  googleVerificacao: string;
  clarity: string;
};
const id = (s: string, re: RegExp) => (re.test(s) ? s : "");
export async function marketingPublico(): Promise<MarketingPublico> {
  const c = await configMarketing();
  return {
    pixel: id(c.mkt_meta_pixel_id, /^\d{6,20}$/),
    ga4: id(c.mkt_ga4_id, /^G-[A-Z0-9]{4,15}$/),
    gtm: id(c.mkt_gtm_id, /^GTM-[A-Z0-9]{4,12}$/),
    gads: id(c.mkt_gads_id, /^AW-\d{6,15}$/),
    gadsLead: id(c.mkt_gads_label_lead, /^[A-Za-z0-9_-]{4,40}$/),
    gadsCadastro: id(c.mkt_gads_label_cadastro, /^[A-Za-z0-9_-]{4,40}$/),
    metaDominio: id(c.mkt_meta_dominio, /^[a-z0-9]{10,60}$/),
    googleVerificacao: id(c.mkt_google_verificacao, /^[A-Za-z0-9_-]{20,80}$/),
    clarity: id(c.mkt_clarity_id, /^[a-z0-9]{6,20}$/),
  };
}
