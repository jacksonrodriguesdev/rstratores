import { createServerFn } from "@tanstack/react-start";
import type { MarketingPublico, ChaveMkt } from "./marketing-config.server";

// IDs públicos das tags (rota raiz: entram no <head> de todas as páginas)
export const getMarketingPublicoFn = createServerFn({ method: "GET" }).handler(async (): Promise<MarketingPublico> => {
  const { marketingPublico } = await import("./marketing-config.server");
  return marketingPublico();
});

// ---------- Admin: Marketing → Integrações ----------
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export type EventoMkt = { id: number; plataforma: string; evento: string; ok: boolean; teste: boolean; detalhe: string | null; quando: string };

export const obterIntegracoesFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { configMarketing, CAMPOS, mascarar } = await import("./marketing-config.server");
  const c = await configMarketing();
  const valores = Object.fromEntries(
    (Object.keys(CAMPOS) as ChaveMkt[]).map((k) => [k, CAMPOS[k].segredo ? mascarar(c[k]) : c[k]]),
  ) as Record<ChaveMkt, string>;
  // Valores vindos de variável de ambiente não podem ser editados pela tela
  const doAmbiente = (Object.keys(CAMPOS) as ChaveMkt[]).filter((k) => !!process.env[k.toUpperCase()]?.trim());
  const { prisma } = await import("./prisma");
  const desde = new Date(Date.now() - 7 * 86400_000);
  let eventos: EventoMkt[] = [];
  let resumo: Array<{ plataforma: string; evento: string; ok: number; falha: number }> = [];
  try {
    const rows = await prisma.marketing_eventos.findMany({ orderBy: { id: "desc" }, take: 40 });
    eventos = rows.map((r) => ({ id: r.id, plataforma: r.plataforma, evento: r.evento, ok: r.ok, teste: r.teste, detalhe: r.detalhe, quando: r.created_at.toISOString() }));
    const g = await prisma.marketing_eventos.groupBy({ by: ["plataforma", "evento", "ok"], where: { created_at: { gte: desde } }, _count: true });
    const m = new Map<string, { plataforma: string; evento: string; ok: number; falha: number }>();
    for (const x of g) {
      const k = `${x.plataforma}|${x.evento}`;
      const v = m.get(k) ?? { plataforma: x.plataforma, evento: x.evento, ok: 0, falha: 0 };
      if (x.ok) v.ok += x._count;
      else v.falha += x._count;
      m.set(k, v);
    }
    resumo = [...m.values()];
  } catch {
    /* tabela ainda não criada */
  }
  return {
    valores,
    doAmbiente,
    status: {
      pixel: !!c.mkt_meta_pixel_id,
      capi: !!(c.mkt_meta_pixel_id && c.mkt_meta_capi_token),
      testeMeta: !!c.mkt_meta_test_code,
      ga4: !!c.mkt_ga4_id,
      ga4Servidor: !!(c.mkt_ga4_id && c.mkt_ga4_api_secret),
      gtm: !!c.mkt_gtm_id,
      gads: !!c.mkt_gads_id,
    },
    eventos,
    resumo,
  };
});

export const salvarIntegracoesFn = createServerFn({ method: "POST" })
  .validator((d: Partial<Record<ChaveMkt, string>>) => d)
  .handler(async ({ data }) => {
    await admin();
    const { salvarConfigMarketing } = await import("./marketing-config.server");
    // Formatos esperados: avisa antes de salvar um ID errado
    const erros: string[] = [];
    const conf = (k: ChaveMkt, re: RegExp, msg: string) => {
      const v = String(data[k] ?? "").trim();
      if (v && !v.startsWith("••••") && !re.test(v)) erros.push(msg);
    };
    conf("mkt_meta_pixel_id", /^\d{6,20}$/, "ID do Pixel: só números (ex.: 123456789012345).");
    conf("mkt_ga4_id", /^G-[A-Z0-9]{4,15}$/, "GA4: formato G-XXXXXXXXXX.");
    conf("mkt_gtm_id", /^GTM-[A-Z0-9]{4,12}$/, "Tag Manager: formato GTM-XXXXXXX.");
    conf("mkt_gads_id", /^AW-\d{6,15}$/, "Google Ads: formato AW-123456789.");
    conf("mkt_meta_ad_account", /^(act_)?\d{6,25}$/, "Conta de anúncios: números (com ou sem act_).");
    if (erros.length) throw new Error(erros.join(" "));
    await salvarConfigMarketing(data);
    return { ok: true };
  });

// Manda um evento de teste para o Meta (aparece em Gerenciador de Eventos → Testar eventos)
export const testarMetaFn = createServerFn({ method: "POST" }).handler(async () => {
  const sessao = await admin();
  const { enviarEventoMeta } = await import("./conversoes.server");
  const { SITE_URL } = await import("./site");
  return enviarEventoMeta({
    evento: "Lead",
    eventId: `teste_${Date.now()}`,
    pessoa: { email: sessao.email },
    navegador: { url: `${SITE_URL}/?teste_capi=1`, ua: "AGRO PARTS teste" },
    dados: { content_name: "teste do painel" },
    forcarTeste: true,
  });
});

export const testarGA4Fn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { enviarEventoGA4 } = await import("./conversoes.server");
  return enviarEventoGA4({ evento: "teste_painel", clientId: `teste.${Date.now()}`, params: { debug_mode: 1 } });
});
