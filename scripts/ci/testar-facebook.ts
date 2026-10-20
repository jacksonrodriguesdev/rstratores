// Teste do Facebook (página e anúncios) com uma API da Meta FALSA: conexão (tokens
// criptografados), escolha da página e da conta de anúncios, Central de Anúncios usando a
// conexão, post no Instagram que também vai para a página (foto e várias fotos) e os números
// das duas redes. Nada vai para a Meta. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-facebook.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_FACEBOOK=1)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

type Chamada = { metodo: string; caminho: string; p: Record<string, string> };
const chamadas: Chamada[] = [];
let n = 0;
const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const u = new URL(req.url!, "http://x");
  const p = Object.fromEntries(req.method === "POST" ? new URLSearchParams(corpo) : u.searchParams);
  const caminho = u.pathname.replace(/^\/v\d+\.\d+/, "");
  chamadas.push({ metodo: req.method!, caminho, p });
  const json = (v: unknown, s = 200) => {
    res.writeHead(s, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  // Instagram (login do Instagram)
  if (caminho === "/oauth/access_token" && req.method === "POST")
    return json({ access_token: "curto-ig" });
  if (caminho === "/access_token") return json({ access_token: "token-ig", expires_in: 5184000 });
  if (caminho === "/me" && p.access_token === "token-ig")
    return json({
      user_id: "1789",
      username: "rsagroparts",
      followers_count: 1243,
      media_count: 86,
    });
  if (caminho === "/1789/insights")
    return json({
      data: [
        {
          total_value: {
            value: {
              reach: 5400,
              profile_views: 310,
              total_interactions: 920,
              accounts_engaged: 610,
            }[p.metric],
          },
        },
      ],
    });
  if (caminho === "/1789/media" && req.method === "GET")
    return json({
      data: [
        {
          id: "m1",
          caption: "Feito pelo app",
          media_type: "IMAGE",
          media_url: "https://x/a.jpg",
          permalink: "https://instagram.com/p/m1",
          timestamp: "2026-10-18T12:00:00+0000",
          like_count: 25,
          comments_count: 4,
        },
      ],
    });
  if (caminho === "/1789/media") return json({ id: `c${++n}` });
  if (caminho === "/1789/media_publish") return json({ id: `pub${n}` });
  if (p.fields === "status_code,status") return json({ status_code: "FINISHED" });
  if (p.fields === "permalink") return json({ permalink: "https://www.instagram.com/p/x/" });
  // Facebook
  if (caminho === "/oauth/access_token" && p.code)
    return p.code === "codigo-fb"
      ? json({ access_token: "curto-fb" })
      : json({ error: { message: "código inválido" } }, 400);
  if (caminho === "/oauth/access_token" && p.grant_type === "fb_exchange_token")
    return json({ access_token: "token-fb-usuario", expires_in: 5184000 });
  if (caminho === "/me" && p.access_token === "token-fb-usuario")
    return json({ id: "u1", name: "Jackson" });
  if (caminho === "/me/accounts")
    return json({
      data: [
        {
          id: "pg1",
          name: "AGRO PARTS",
          access_token: "token-fb-pagina",
          picture: { data: { url: "https://x/p.jpg" } },
        },
        { id: "pg2", name: "Outra página", access_token: "token-fb-outra" },
      ],
    });
  if (caminho === "/me/adaccounts")
    return json({ data: [{ id: "act_555", name: "AGRO PARTS Ads", currency: "UYU" }] });
  if (caminho === "/act_555" && p.access_token === "token-fb-usuario")
    return json({ name: "AGRO PARTS Ads", currency: "UYU", account_status: 1 });
  if (caminho.startsWith("/pg1/")) {
    if (p.access_token !== "token-fb-pagina")
      return json({ error: { message: "token da página errado" } }, 400);
    if (caminho === "/pg1/photos")
      return json(
        p.published === "false"
          ? { id: `foto${++n}` }
          : { id: `foto${++n}`, post_id: `pg1_post${n}` },
      );
    if (caminho === "/pg1/feed") return json({ id: `pg1_feed${++n}` });
    if (caminho === "/pg1/videos") return json({ id: `vid${++n}` });
    if (caminho === "/pg1/insights") {
      const v = { page_impressions_unique: 100, page_post_engagements: 20, page_follows: 3 }[
        p.metric
      ];
      return v == null
        ? json({ error: { message: "métrica obsoleta" } }, 400)
        : json({
            data: [
              {
                values: [
                  { value: v, end_time: "2026-10-18T07:00:00+0000" },
                  { value: v, end_time: "2026-10-19T07:00:00+0000" },
                ],
              },
            ],
          });
    }
    if (caminho === "/pg1/published_posts")
      return json({
        data: [
          {
            id: "pg1_1",
            message: "Post da página",
            created_time: "2026-10-18T12:00:00+0000",
            permalink_url: "https://facebook.com/1",
            reactions: { summary: { total_count: 12 } },
            comments: { summary: { total_count: 2 } },
            shares: { count: 1 },
          },
        ],
      });
  }
  if (caminho === "/pg1")
    return json({
      name: "AGRO PARTS",
      followers_count: 3400,
      link: "https://facebook.com/agroparts",
    });
  return json({ error: { message: `rota falsa desconhecida ${caminho}` } }, 404);
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  Object.assign(process.env, {
    INSTAGRAM_APP_ID: "ig-app",
    INSTAGRAM_APP_SECRET: "ig-seg",
    INSTAGRAM_GRAPH_URL: url,
    INSTAGRAM_API_URL: url,
    INSTAGRAM_ESPERA_MS: "5",
    META_APP_ID: "fb-app",
    META_APP_SECRET: "fb-seg",
    META_GRAPH_URL: url,
  });
  process.env.JWT_SECRET ||= "segredo-local-do-teste-do-facebook-com-32-caracteres";
  const fb = await import("../../src/lib/facebook.server");
  const ig = await import("../../src/lib/instagram.server");
  const ads = await import("../../src/lib/ads-meta.server");
  const { limparCacheMarketing } = await import("../../src/lib/marketing-config.server");

  const u = new URL(fb.urlConectarFacebook("https://agropartsuy.com", "st"));
  assert.equal(
    u.searchParams.get("redirect_uri"),
    "https://agropartsuy.com/api/admin/facebook/callback",
  );
  assert.ok(
    u.searchParams.get("scope")!.includes("pages_manage_posts") &&
      u.searchParams.get("scope")!.includes("ads_management"),
  );

  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_FACEBOOK === "1",
    "use um banco de teste",
  );
  await ig.garantirTabelaInstagram();
  const antes = await prisma.configuracoes.findMany({
    where: {
      OR: [
        { chave: { startsWith: "fb_" } },
        { chave: { startsWith: "ig_" } },
        { chave: { in: ["mkt_meta_ads_token", "mkt_meta_ad_account"] } },
      ],
    },
  });
  await prisma.configuracoes.deleteMany({ where: { chave: { in: antes.map((a) => a.chave) } } });
  limparCacheMarketing();
  const posts: number[] = [];
  try {
    // ---------- conexão
    await assert.rejects(
      fb.concluirFacebook("codigo-ruim", "https://agropartsuy.com"),
      /código inválido/,
    );
    assert.deepEqual(await fb.concluirFacebook("codigo-fb", "https://agropartsuy.com"), {
      usuario: "Jackson",
      paginas: 2,
      contas: 1,
    });
    const salvos = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "fb_" } } });
    assert.ok(!salvos.some((s) => /token-fb/.test(s.valor)), "tokens guardados criptografados");
    let st = await fb.statusFacebook();
    assert.equal(st.pagina, null, "duas páginas: espera escolher");
    assert.equal(st.contaAds, "act_555", "uma conta de anúncios: escolhida sozinha");
    await assert.rejects(fb.escolherFacebook({ pagina: "pg9" }), /não encontrada/);
    await fb.escolherFacebook({ pagina: "pg1" });
    st = await fb.statusFacebook();
    assert.equal(st.pagina?.nome, "AGRO PARTS");

    // ---------- Central de Anúncios usa a conexão (sem token colado em Integrações)
    limparCacheMarketing();
    assert.equal(await ads.metaConfigurado(), true);
    assert.equal((await ads.contaMeta()).nome, "AGRO PARTS Ads");

    // ---------- Instagram + página do Facebook
    await ig.concluirConexao("x", "https://agropartsuy.com");
    const criar = async (tipo: string, midias: object[]) => {
      const p = await prisma.instagram_posts.create({
        data: {
          tipo,
          midias: JSON.stringify(midias),
          legenda: "Pre Black -20%",
          comentario: "#AgroParts",
          facebook: true,
        },
      });
      posts.push(p.id);
      return p.id;
    };
    const img = (i: number) => ({ path: `instagram/f${i}.jpg`, tipo: "IMAGE" });
    const um = await criar("FEED", [img(1)]);
    await ig.publicarPost(um, "https://agropartsuy.com");
    let p = (await prisma.instagram_posts.findUnique({ where: { id: um } }))!;
    assert.equal(p.status, "PUBLICADO", p.erro ?? "");
    assert.ok(p.fb_post_id?.startsWith("pg1_post"), "foi para a página");
    const foto = chamadas.find((c) => c.caminho === "/pg1/photos")!;
    assert.equal(foto.p.url, "https://agropartsuy.com/uploads/instagram/f1.jpg");
    assert.equal(foto.p.caption, "Pre Black -20%\n\n#AgroParts", "legenda + hashtags no Facebook");

    const varios = await criar("CARROSSEL", [img(2), img(3), img(4)]);
    await ig.publicarPost(varios, "https://agropartsuy.com");
    p = (await prisma.instagram_posts.findUnique({ where: { id: varios } }))!;
    assert.ok(p.fb_post_id?.startsWith("pg1_feed"), "carrossel vira post com várias fotos");
    const feed = chamadas.filter((c) => c.caminho === "/pg1/feed").at(-1)!;
    assert.ok(
      feed.p["attached_media[0]"] && feed.p["attached_media[2]"] && !feed.p["attached_media[3]"],
      "3 fotos anexadas",
    );

    // Falha no Facebook não derruba o Instagram
    await fb.escolherFacebook({ pagina: "pg2" });
    const falha = await criar("FEED", [img(5)]);
    await ig.publicarPost(falha, "https://agropartsuy.com");
    p = (await prisma.instagram_posts.findUnique({ where: { id: falha } }))!;
    assert.equal(p.status, "PUBLICADO");
    assert.match(p.erro ?? "", /Facebook falhou/);
    await fb.escolherFacebook({ pagina: "pg1" });

    // ---------- números das duas redes
    const di = await ig.desempenhoInstagram(28);
    assert.deepEqual(
      [di.seguidores, di.alcance, di.visitas, di.interacoes],
      [1243, 5400, 310, 920],
    );
    assert.equal(di.recentes[0].legenda, "Feito pelo app", "posts feitos pelo app também aparecem");
    const dp = await fb.desempenhoPagina(28);
    assert.deepEqual(
      [dp.seguidores, dp.alcance, dp.engajamento, dp.novosSeguidores],
      [3400, 200, 40, 6],
      "métricas que existem; as obsoletas são puladas",
    );
    assert.equal(dp.posts[0].reacoes, 12);

    // Conexão vencida: a Central de Anúncios para de usar
    await prisma.configuracoes.update({
      where: { chave: "fb_expira" },
      data: { valor: String(Date.now() - 1000) },
    });
    assert.equal(await fb.anunciosDaConexao(), null);

    console.log(
      "✔ facebook: conexão, página, conta de anúncios, post na página, números e anúncios",
    );
  } finally {
    await prisma.instagram_posts.deleteMany({ where: { id: { in: posts } } });
    await prisma.configuracoes.deleteMany({
      where: { OR: [{ chave: { startsWith: "fb_" } }, { chave: { startsWith: "ig_" } }] },
    });
    for (const a of antes)
      await prisma.configuracoes.upsert({
        where: { chave: a.chave },
        update: { valor: a.valor },
        create: { chave: a.chave, valor: a.valor },
      });
    await prisma.$disconnect();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
