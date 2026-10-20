// Teste do Meta Ads completo com uma API da Meta FALSA: conta e saldo, visão geral, retorno no
// site, campanhas/conjuntos/anúncios, prévia, pausar e orçamento, público, cidades e rotas, leads
// (formulários + site) e criar anúncio (com desfazer se a Meta recusar). Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-meta-ads.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_META_ADS=1)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

type Chamada = { metodo: string; caminho: string; p: Record<string, string> };
const chamadas: Chamada[] = [];
let recusarAnuncio = false;
const ins = (extra: object = {}) => ({
  spend: "100.50",
  impressions: "10000",
  reach: "6000",
  clicks: "300",
  inline_link_clicks: "200",
  ctr: "3",
  cpc: "0.5",
  cpm: "10",
  frequency: "1.6",
  actions: [
    { action_type: "landing_page_view", value: "150" },
    { action_type: "lead", value: "4" },
    { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "6" },
  ],
  ...extra,
});
const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const u = new URL(req.url!, "http://x");
  const p = Object.fromEntries(req.method === "POST" ? new URLSearchParams(corpo) : u.searchParams);
  const c = u.pathname.replace(/^\/v\d+\.\d+/, "");
  chamadas.push({ metodo: req.method!, caminho: c, p });
  const j = (v: unknown, s = 200) => {
    res.writeHead(s, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  // Conexão do Facebook (para a página)
  if (c === "/oauth/access_token" && p.code) return j({ access_token: "curto" });
  if (c === "/oauth/access_token") return j({ access_token: "token-usuario", expires_in: 5184000 });
  if (c === "/me") return j({ id: "u1", name: "Jackson" });
  if (c === "/me/accounts")
    return j({
      data: [
        {
          id: "pg1",
          name: "AGRO PARTS",
          access_token: "token-pagina",
          instagram_business_account: { id: "ig77" },
        },
      ],
    });
  if (c === "/me/adaccounts") return j({ data: [] });
  // Leads da página
  if (c === "/pg1/leadgen_forms") return j({ data: [{ id: "f1", name: "Cotação rápida" }] });
  if (c === "/f1/leads")
    return j({
      data: [
        {
          id: "L1",
          created_time: "2026-10-18T12:00:00+0000",
          ad_name: "Ad filtros",
          campaign_name: "Pre Black",
          field_data: [
            { name: "full_name", values: ["Ana Pérez"] },
            { name: "phone_number", values: ["+59899111222"] },
            { name: "city", values: ["Rivera"] },
            { name: "qué_pieza", values: ["filtro"] },
          ],
        },
      ],
    });
  // Anúncios
  if (p.access_token !== "token-ads") return j({ error: { code: 190, message: "token" } }, 400);
  if (c === "/act_555" && req.method === "GET")
    return j({
      name: "AGRO PARTS Ads",
      currency: "UYU",
      balance: "125000",
      amount_spent: "9900000",
      spend_cap: "0",
      account_status: 1,
      funding_source_details: { display_string: "Visa ****1234" },
    });
  if (c === "/act_555/insights") {
    if (p.time_increment) return j({ data: [{ date_start: "2026-10-18", ...ins() }] });
    if (p.breakdowns === "age,gender")
      return j({
        data: [
          { age: "25-34", gender: "male", ...ins() },
          { age: "25-34", gender: "female", ...ins({ clicks: "100" }) },
        ],
      });
    if (p.breakdowns === "region")
      return j({
        data: [
          { region: "Rivera", ...ins() },
          { region: "Montevideo", ...ins({ spend: "300" }) },
        ],
      });
    if (p.breakdowns)
      return j({
        data: [
          {
            publisher_platform: "instagram",
            platform_position: "feed",
            impression_device: "iphone",
            ...ins(),
          },
        ],
      });
    if (p.level === "campaign") return j({ data: [{ campaign_id: "c1", ...ins() }] });
    if (p.level === "adset") return j({ data: [{ adset_id: "s1", ...ins() }] });
    if (p.level === "ad") return j({ data: [{ ad_id: "a1", ...ins() }] });
    return j({ data: [ins()] });
  }
  if (c === "/act_555/campaigns" && req.method === "GET")
    return j({
      data: [
        {
          id: "c1",
          name: "Pre Black",
          status: "ACTIVE",
          effective_status: "ACTIVE",
          objective: "OUTCOME_TRAFFIC",
          daily_budget: "50000",
        },
        { id: "c2", name: "Vieja", status: "PAUSED", objective: "OUTCOME_ENGAGEMENT" },
      ],
    });
  if (c === "/act_555/adsets" && req.method === "GET")
    return j({
      data: [
        {
          id: "s1",
          name: "Uruguay 25-65",
          status: "ACTIVE",
          campaign_id: "c1",
          optimization_goal: "LANDING_PAGE_VIEWS",
          targeting: { age_min: 25, age_max: 65, geo_locations: { countries: ["UY"] } },
        },
      ],
    });
  if (c === "/act_555/ads" && req.method === "GET")
    return j({
      data: [
        {
          id: "a1",
          name: "Ad filtros",
          status: "ACTIVE",
          created_time: "2026-10-18T10:00:00+0000",
          campaign: { name: "Pre Black" },
          adset: { name: "Uruguay" },
          creative: {
            thumbnail_url: "https://x/t.jpg",
            title: "-20%",
            body: "Pre Black",
            call_to_action_type: "SHOP_NOW",
          },
        },
      ],
    });
  if (c === "/a1/previews")
    return j({
      data: [
        {
          body: '<iframe src="https://www.facebook.com/ads/api/preview_iframe.php?d=abc&amp;t=1" width="540"></iframe>',
        },
      ],
    });
  // Criar
  if (c === "/act_555/adimages") return j({ images: { "x.jpg": { hash: "HASH1" } } });
  if (c === "/act_555/campaigns") return j({ id: "novaC" });
  if (c === "/act_555/adsets") return j({ id: "novoS" });
  if (c === "/act_555/adcreatives")
    return recusarAnuncio
      ? j({ error: { message: "Texto recusado pela política" } }, 400)
      : j({ id: "novoCr" });
  if (c === "/act_555/ads") return j({ id: "novoA" });
  if (req.method === "POST" && /^\/\w+$/.test(c)) return j({ success: true }); // status / orçamento
  return j({ error: { message: `rota falsa desconhecida ${c}` } }, 404);
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  Object.assign(process.env, {
    META_GRAPH_URL: url,
    META_APP_ID: "app",
    META_APP_SECRET: "seg",
    MKT_META_ADS_TOKEN: "token-ads",
    MKT_META_AD_ACCOUNT: "act_555",
  });
  process.env.JWT_SECRET ||= "segredo-local-do-teste-de-meta-ads-com-32-caracteres";
  const m = await import("../../src/lib/meta-ads.server");
  const fb = await import("../../src/lib/facebook.server");
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_META_ADS === "1",
    "use um banco de teste",
  );
  await m.garantirTabelaLeads();
  const antesFb = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "fb_" } } });
  const suf = `${process.pid}-${Date.now()}`;
  const users: number[] = [];
  const marcas = { visitas: [] as number[], eventos: [] as number[], leads: [] as string[] };
  try {
    // ---------- conta, visão geral
    const conta = await m.contaCompleta();
    assert.deepEqual(
      [
        conta.nome,
        conta.moeda,
        conta.saldoDevido,
        conta.gastoTotal,
        conta.limiteGasto,
        conta.ativa,
      ],
      ["AGRO PARTS Ads", "UYU", 1250, 99000, null, true],
    );
    assert.ok(conta.linkPagamento.includes("asset_id=555"));
    const g = await m.visaoGeral(7);
    assert.deepEqual(
      [g.total.gasto, g.total.cliquesLink, g.total.visitasPagina, g.total.leads, g.total.conversas],
      [100.5, 200, 150, 4, 6],
    );
    assert.equal(g.serie.length, 7, "um ponto por dia, com zeros nos dias sem gasto");
    assert.equal(g.serie.find((d) => d.dia === "2026-10-18")?.gasto ?? 100.5, 100.5);

    // ---------- estrutura, anúncios, prévia, pausar, orçamento
    const e = await m.estrutura(30);
    assert.equal(e[0].id, "c1", "campanha com mais gasto primeiro");
    assert.equal(e[0].orcamentoDiario, 500);
    assert.equal(e[0].conjuntos[0].publico, "25–65 anos · UY");
    const ads = await m.anuncios(30);
    assert.deepEqual(
      [ads[0].titulo, ads[0].imagem, ads[0].numeros.gasto],
      ["-20%", "https://x/t.jpg", 100.5],
    );
    assert.equal(
      await m.previaAnuncio("a1", "MOBILE_FEED_STANDARD"),
      "https://www.facebook.com/ads/api/preview_iframe.php?d=abc&t=1",
    );
    await m.alterarObjeto("2220001", { ativo: false });
    assert.equal(chamadas.at(-1)!.p.status, "PAUSED");
    await m.alterarObjeto("1110001", { orcamento: 750.5 });
    assert.equal(chamadas.at(-1)!.p.daily_budget, "75050", "orçamento em centavos");
    await assert.rejects(m.alterarObjeto("abc", { ativo: true }), /inválido/);

    // ---------- público
    const pub = await m.publico(30);
    assert.deepEqual(pub.idade[0], {
      rotulo: "25-34",
      Homens: 300,
      Mulheres: 100,
      "Não informado": 0,
      gasto: 201,
      cliques: 400,
      resultados: 20,
    });
    assert.equal(pub.regiao[0].rotulo, "Montevideo", "região com mais gasto primeiro");

    // ---------- site: retorno, cidades, rotas e leads do site
    const u = await prisma.users.create({
      data: {
        nome_completo: "Bruno Ads",
        email: `ads-${suf}@teste.invalid`,
        senha_hash: "x",
        telefone: "+59899000111",
        cidade: "Tacuarembó",
      },
    });
    users.push(u.id);
    const agora = new Date();
    const sess = `s-${suf}`;
    for (const [i, path] of ["/black-friday", "/loja", "/produto/la5013"].entries()) {
      const v = await prisma.site_visits.create({
        data: {
          path,
          session_id: sess,
          visitor_id: `v-${suf}`,
          user_id: u.id,
          city: "Tacuarembó",
          region: "Tacuarembó",
          created_at: new Date(agora.getTime() + i * 1000),
          ...(i === 0 && { fonte: "instagram", meio: "pago", entrada: true }),
        },
      });
      marcas.visitas.push(v.id);
    }
    const ev = await prisma.site_eventos.create({
      data: {
        tipo: "whatsapp",
        dado: "LA5013",
        pagina: "/produto/la5013",
        fonte: "instagram",
        meio: "pago",
        user_id: u.id,
        city: "Tacuarembó",
        utm_campaign: "preblack",
      },
    });
    marcas.eventos.push(ev.id);
    const ret = await m.retornoSite(7);
    assert.ok(
      ret.sessoes >= 1 && ret.whatsapp >= 1 && ret.cadastros >= 1,
      `retorno ${JSON.stringify(ret)}`,
    );
    const cr = await m.cidadesERotas(7);
    assert.ok(cr.cidades.some((c) => c.cidade === "Tacuarembó" && c.whatsapp >= 1));
    assert.ok(
      cr.rotas.some((r) => r.k === "/black-friday → /loja → /produto/la5013"),
      "rota de 3 passos",
    );

    // ---------- leads (formulário do anúncio + WhatsApp do site + cadastro)
    await fb.concluirFacebook("x", "https://agropartsuy.com");
    const s1 = await m.sincronizarLeads(30);
    assert.deepEqual(s1.avisos, []);
    const form = await prisma.leads.findUnique({
      where: { origem_ref: { origem: "FORMULARIO", ref: "L1" } },
    });
    marcas.leads.push("L1");
    assert.deepEqual(
      [form?.nome, form?.telefone, form?.cidade, form?.campanha],
      ["Ana Pérez", "+59899111222", "Rivera", "Pre Black"],
    );
    assert.match(form!.detalhe!, /qué_pieza: filtro/);
    const zap = await prisma.leads.findUnique({
      where: { origem_ref: { origem: "WHATSAPP", ref: String(ev.id) } },
    });
    assert.equal(zap?.nome, "Bruno Ads", "lead do site com os dados do cliente");
    assert.ok(
      await prisma.leads.findUnique({
        where: { origem_ref: { origem: "CADASTRO", ref: String(u.id) } },
      }),
      "cadastro vindo de anúncio",
    );
    const s2 = await m.sincronizarLeads(30);
    assert.equal(s2.novos, 0, "sincronizar de novo não duplica");

    // ---------- criar anúncio (Uruguai, pausado) e desfazer quando a Meta recusa
    const base = {
      nome: "Teste",
      objetivo: "TRAFEGO" as const,
      orcamentoDiario: 300,
      idadeMin: 25,
      idadeMax: 65,
      genero: "TODOS" as const,
      imagemBase64: "QUJD",
      texto: "Pre Black -20%",
      titulo: "-20%",
      link: "https://agropartsuy.com/black-friday",
      botao: "SHOP_NOW",
      ativar: false,
    };
    const r = await m.criarAnuncio(base);
    assert.deepEqual(r, { campanha: "novaC", conjunto: "novoS", anuncio: "novoA", ativo: false });
    const conj = chamadas.find((c) => c.caminho === "/act_555/adsets" && c.metodo === "POST")!;
    assert.deepEqual(
      JSON.parse(conj.p.targeting).geo_locations,
      { countries: ["UY"] },
      "só Uruguai",
    );
    assert.equal(conj.p.status, "PAUSED");
    assert.equal(conj.p.daily_budget, "30000");
    const crt = JSON.parse(
      chamadas.find((c) => c.caminho === "/act_555/adcreatives")!.p.object_story_spec,
    );
    assert.deepEqual(
      [crt.page_id, crt.instagram_user_id, crt.link_data.image_hash],
      ["pg1", "ig77", "HASH1"],
    );
    await assert.rejects(m.criarAnuncio({ ...base, link: "agropartsuy.com" }), /https/);
    recusarAnuncio = true;
    await assert.rejects(m.criarAnuncio(base), /política/);
    assert.ok(
      chamadas.some((c) => c.caminho === "/novaC" && c.p.status === "DELETED"),
      "campanha pela metade foi apagada",
    );

    console.log(
      "✔ meta ads: conta, visão, campanhas, anúncios, prévia, público, cidades/rotas, leads e criar anúncio",
    );
  } finally {
    await prisma.leads.deleteMany({
      where: {
        OR: [
          { ref: { in: marcas.leads } },
          { ref: { in: marcas.eventos.map(String) }, origem: { in: ["WHATSAPP", "COTACAO"] } },
          { ref: { in: users.map(String) }, origem: "CADASTRO" },
        ],
      },
    });
    await prisma.site_visits.deleteMany({ where: { id: { in: marcas.visitas } } });
    await prisma.site_eventos.deleteMany({ where: { id: { in: marcas.eventos } } });
    await prisma.users.deleteMany({ where: { id: { in: users } } });
    await prisma.configuracoes.deleteMany({ where: { chave: { startsWith: "fb_" } } });
    for (const a of antesFb)
      await prisma.configuracoes.create({ data: { chave: a.chave, valor: a.valor } });
    await prisma.$disconnect();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
