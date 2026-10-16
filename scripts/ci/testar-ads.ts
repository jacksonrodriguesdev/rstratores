// Teste da Central de Anúncios com Meta e Google Ads FALSOS (servidores locais nesta execução).
// Roda com: npx tsx scripts/ci/testar-ads.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_ADS=1: apaga as tabelas ads_* e
// devolve as configurações que havia)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

const hoje = new Date();
const dia = (n: number) => new Date(hoje.getTime() - n * 86400000).toISOString().slice(0, 10);
const chamadas: string[] = [];

const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const json = (s: number, v: unknown) => {
    res.writeHead(s, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  const url = new URL(req.url!, "http://x");
  // ---------- Meta ----------
  if (url.pathname.startsWith("/v21.0/")) {
    const token =
      url.searchParams.get("access_token") ?? new URLSearchParams(corpo).get("access_token");
    if (token !== "token-meta")
      return json(400, { error: { code: 190, message: "Invalid token" } });
    if (url.pathname === "/v21.0/act_999")
      return json(200, { name: "AGRO PARTS UY", currency: "USD", account_status: 1 });
    if (url.pathname === "/v21.0/act_999/campaigns")
      return json(200, {
        data: [
          {
            id: "m1",
            name: "Repuestos Rocha",
            status: "ACTIVE",
            effective_status: "ACTIVE",
            daily_budget: "1000",
            objective: "OUTCOME_LEADS",
          },
          {
            id: "m2",
            name: "Conjuntos",
            status: "PAUSED",
            effective_status: "PAUSED",
            objective: "OUTCOME_TRAFFIC",
          },
        ],
      });
    if (url.pathname === "/v21.0/act_999/insights")
      return json(200, {
        data: [0, 1, 2].map((i) => ({
          campaign_id: "m1",
          date_start: dia(i),
          spend: "10.00",
          impressions: "1000",
          clicks: "50",
          actions: [
            { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "3" },
            { action_type: "link_click", value: "50" },
          ],
        })),
      });
    if (req.method === "POST" && url.pathname === "/v21.0/m1") {
      chamadas.push(`meta:${corpo.replace(/&?access_token=[^&]*/, "")}`);
      return json(200, { success: true });
    }
    return json(404, { error: { message: "rota Meta desconhecida " + url.pathname } });
  }
  // ---------- Google ----------
  if (url.pathname === "/token")
    return json(200, { access_token: "acesso-gads", expires_in: 3600 });
  if (url.pathname.startsWith("/v24/") || url.pathname.startsWith("/v23/"))
    return json(404, { error: { message: "not found" } });
  if (url.pathname.startsWith("/v22/customers/1234567890/")) {
    assert.equal(req.headers["developer-token"], "dev-token-teste");
    assert.equal(req.headers.authorization, "Bearer acesso-gads");
    const b = JSON.parse(corpo || "{}");
    if (url.pathname.endsWith("googleAds:searchStream")) {
      const q = String(b.query);
      if (q.includes("FROM customer"))
        return json(200, [
          { results: [{ customer: { descriptiveName: "AGRO PARTS", currencyCode: "UYU" } }] },
        ]);
      if (q.includes("segments.date"))
        return json(200, [
          {
            results: [0, 1].map((i) => ({
              campaign: { id: "g1" },
              segments: { date: dia(i) },
              metrics: {
                costMicros: "500000000",
                impressions: "2000",
                clicks: "80",
                conversions: 4,
                conversionsValue: 0,
              },
            })),
          },
        ]);
      return json(200, [
        {
          results: [
            {
              campaign: {
                id: "g1",
                name: "Busqueda John Deere",
                status: "ENABLED",
                advertisingChannelType: "SEARCH",
              },
              campaignBudget: {
                amountMicros: "800000000",
                resourceName: "customers/1234567890/campaignBudgets/77",
                explicitlyShared: false,
              },
            },
          ],
        },
      ]);
    }
    if (
      url.pathname.endsWith("campaigns:mutate") ||
      url.pathname.endsWith("campaignBudgets:mutate")
    ) {
      chamadas.push(`google:${JSON.stringify(b.operations[0])}`);
      return json(200, { results: [{}] });
    }
  }
  json(404, { error: { message: "rota desconhecida " + url.pathname } });
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  Object.assign(process.env, {
    META_GRAPH_URL: url,
    GADS_API_URL: url,
    GADS_TOKEN_URL: `${url}/token`,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "cliente-teste",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "segredo-teste",
  });
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_ADS === "1",
    "use um banco de teste",
  );
  const ads = await import("../../src/lib/ads.server");
  await ads.garantirTabelasAds();

  const CHAVES = [
    "mkt_meta_ad_account",
    "mkt_meta_ads_token",
    "mkt_gads_customer_id",
    "mkt_gads_dev_token",
    "gads_refresh",
  ];
  const guardado = await prisma.configuracoes.findMany({
    where: { OR: [{ chave: { in: CHAVES } }, { chave: { startsWith: "ads_" } }] },
  });
  const vis = `vis-teste-ads-${Date.now()}`;
  let carrinhoId = 0;
  try {
    await prisma.configuracoes.deleteMany({
      where: { OR: [{ chave: { in: CHAVES } }, { chave: { startsWith: "ads_" } }] },
    });
    await prisma.ads_dia.deleteMany({});
    await prisma.ads_campanha.deleteMany({});
    await prisma.configuracoes.createMany({
      data: [
        { chave: "mkt_meta_ad_account", valor: "act_999" },
        { chave: "mkt_meta_ads_token", valor: "token-meta" },
        { chave: "mkt_gads_customer_id", valor: "123-456-7890" },
        { chave: "mkt_gads_dev_token", valor: "dev-token-teste" },
        { chave: "gads_refresh", valor: "refresh-gads" },
      ],
    });
    const { limparCacheMarketing } = await import("../../src/lib/marketing-config.server");
    limparCacheMarketing();
    await prisma.cotacoes.create({ data: { par: "USD_UYU", valor: 40, fonte: "teste" } });

    // Site: visita com a UTM da campanha Meta (pelo ID), pedido no WhatsApp (pelo nome) e venda
    await prisma.site_visits.create({
      data: { path: "/", visitor_id: vis, session_id: vis, utm_campaign: "m1" },
    });
    await prisma.site_eventos.create({
      data: {
        tipo: "whatsapp",
        dado: "teste",
        visitor_id: vis,
        session_id: vis,
        utm_campaign: "Repuestos Rocha",
      },
    });
    const c = await prisma.carrinhos.create({
      data: { visitante_id: vis, itens: "[]", etapa: "GANHO", valor_fechado: 4000 },
    });
    carrinhoId = c.id;

    const r = await ads.sincronizarAds();
    assert.deepEqual(r.META, { campanhas: 2, linhas: 3 });
    assert.deepEqual(r.GOOGLE, { campanhas: 1, linhas: 2 });
    const est = await ads.estadoAds();
    assert.equal(est.meta.conta?.moeda, "USD");
    assert.equal(est.google.conta?.moeda, "UYU");

    const rel = await ads.relatorioAds(7);
    const m1 = rel.campanhas.find((x) => x.id === "m1")!;
    assert.equal(m1.gasto, 30, "Meta: 3 dias × US$ 10");
    assert.equal(m1.gastoUYU, 1200, "convertido a $U (cotação 40)");
    assert.equal(m1.leadsPlataforma, 9, "conversas iniciadas contam como lead");
    assert.equal(m1.orcamentoDiario, 10, "orçamento em centavos → US$ 10");
    assert.equal(m1.visitasSite, 1, "visita atribuída pelo ID");
    assert.equal(m1.leadsSite, 1, "pedido no WhatsApp atribuído pelo nome");
    assert.equal(m1.vendasSite, 1);
    assert.equal(m1.receitaSite, 4000);
    const g1 = rel.campanhas.find((x) => x.id === "g1")!;
    assert.equal(g1.gasto, 1000, "Google: 2 dias × $U 500 (micros)");
    assert.equal(g1.orcamentoDiario, 800);
    assert.equal(g1.leadsPlataforma, 8);
    assert.equal(rel.totais.gastoUYU, 2200);
    assert.ok(
      !rel.campanhas.some((x) => x.id === "m2" && x.orcamentoEditavel),
      "orçamento nos conjuntos não é editável",
    );

    // Ações
    await ads.alterarStatus("META", "m1", false, 1);
    assert.ok(chamadas.includes("meta:status=PAUSED"), "Meta recebeu a pausa");
    await ads.alterarStatus("GOOGLE", "g1", false, 1);
    assert.ok(
      chamadas.some((x) => x.includes('"status":"PAUSED"') && x.includes("campaigns/g1")),
      "Google recebeu a pausa",
    );
    await assert.rejects(
      ads.alterarOrcamento("META", "m1", 100, 1),
      /CONFIRMAR/,
      "10× pede confirmação",
    );
    await ads.alterarOrcamento("META", "m1", 15, 1);
    assert.ok(chamadas.includes("meta:daily_budget=1500"), "orçamento em centavos");
    await ads.alterarOrcamento("GOOGLE", "g1", 900, 1);
    assert.ok(
      chamadas.some((x) => x.includes('"amountMicros":"900000000"')),
      "orçamento em micros",
    );
    await assert.rejects(ads.alterarOrcamento("META", "m2", 20, 1), /conjuntos/);
    const acoes = await prisma.ads_acao.findMany({
      where: { admin_id: 1 },
      orderBy: { id: "desc" },
      take: 5,
    });
    assert.ok(
      acoes.some((a) => a.acao === "ORCAMENTO" && a.ok && a.para === "15 USD"),
      "histórico registrado",
    );
    assert.equal(
      (await prisma.ads_campanha.findFirst({ where: { id_externo: "m1" } }))?.status,
      "PAUSADA",
    );
    console.log("✔ central de anúncios: tudo certo");
  } finally {
    await prisma.ads_acao.deleteMany({ where: { id_externo: { in: ["m1", "m2", "g1"] } } });
    await prisma.ads_dia.deleteMany({});
    await prisma.ads_campanha.deleteMany({});
    await prisma.cotacoes.deleteMany({ where: { par: "USD_UYU", fonte: "teste" } });
    await prisma.site_visits.deleteMany({ where: { visitor_id: vis } });
    await prisma.site_eventos.deleteMany({ where: { visitor_id: vis } });
    if (carrinhoId) await prisma.carrinhos.delete({ where: { id: carrinhoId } });
    await prisma.configuracoes.deleteMany({
      where: { OR: [{ chave: { in: CHAVES } }, { chave: { startsWith: "ads_" } }] },
    });
    if (guardado.length)
      await prisma.configuracoes.createMany({ data: guardado.map(({ updated_at, ...c }) => c) });
    await prisma.$disconnect();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
