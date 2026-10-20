// Teste das publicações no Instagram com uma API da Meta FALSA (servidor local nesta execução):
// conexão (token criptografado), post com primeiro comentário, carrossel, story, Reels (vídeo
// processando), regras da Meta, agendados, métricas e renovação do token. Nada vai para a Meta.
// Roda com: npx tsx scripts/ci/testar-instagram.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_INSTAGRAM=1)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

type Chamada = { metodo: string; caminho: string; p: Record<string, string> };
const chamadas: Chamada[] = [];
let n = 0;
const status = new Map<string, string[]>(); // id → sequência de status_code
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
  if (caminho === "/oauth/access_token")
    return p.code === "codigo-bom"
      ? json({ access_token: "curto", user_id: 1789 })
      : json({ error_message: "código inválido" }, 400);
  if (caminho === "/access_token")
    return json({ access_token: "token-longo", expires_in: 5184000 });
  if (caminho === "/refresh_access_token")
    return json({ access_token: "token-renovado", expires_in: 5184000 });
  const tk = p.access_token;
  if (!tk?.startsWith("token-")) return json({ error: { message: "token inválido" } }, 401);
  if (caminho === "/me")
    return json({
      user_id: "1789",
      username: "rsagroparts",
      profile_picture_url: "https://x/f.jpg",
      followers_count: 1200,
      media_count: 80,
    });
  if (caminho === "/1789/content_publishing_limit")
    return json({ data: [{ quota_usage: 2, config: { quota_total: 100 } }] });
  if (caminho === "/1789/media" && req.method === "POST") {
    const id = `c${++n}`;
    status.set(
      id,
      p.media_type === "REELS" || p.media_type === "VIDEO"
        ? ["IN_PROGRESS", "FINISHED"]
        : ["FINISHED"],
    );
    return json({ id });
  }
  if (caminho === "/1789/media_publish") return json({ id: `pub-${p.creation_id}` });
  const m = /^\/([\w-]+)(\/insights|\/comments)?$/.exec(caminho);
  if (m && m[2] === "/comments") return json({ id: "com1" });
  if (m && m[2] === "/insights")
    return p.metric === "views"
      ? json({ error: { message: "métrica indisponível" } }, 400)
      : json({
          data: [
            { values: [{ value: { reach: 340, saved: 12, shares: 5 }[p.metric as "reach"] ?? 0 }] },
          ],
        });
  if (m && p.fields === "status_code,status") {
    const fila = status.get(m[1]) ?? ["FINISHED"];
    return json({ status_code: fila.length > 1 ? fila.shift() : fila[0] });
  }
  if (m && p.fields === "permalink")
    return json({ permalink: `https://www.instagram.com/p/${m[1]}/` });
  if (m && p.fields === "like_count,comments_count")
    return json({ like_count: 42, comments_count: 3 });
  return json({ error: { message: `rota falsa desconhecida ${caminho}` } }, 404);
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  Object.assign(process.env, {
    INSTAGRAM_APP_ID: "app-teste",
    INSTAGRAM_APP_SECRET: "segredo-teste",
    INSTAGRAM_GRAPH_URL: url,
    INSTAGRAM_API_URL: url,
    INSTAGRAM_ESPERA_MS: "5",
  });
  process.env.JWT_SECRET ||= "segredo-local-do-teste-do-instagram-com-32-caracteres";
  const ig = await import("../../src/lib/instagram.server");

  // ---------- criptografia do token
  const c1 = ig.cifrar("abc"),
    c2 = ig.cifrar("abc");
  assert.notEqual(c1, c2, "cada cifra é diferente");
  assert.equal(ig.decifrar(c1), "abc");
  assert.ok(
    ig
      .urlConectar("https://agropartsuy.com", "st")
      .includes("redirect_uri=https%3A%2F%2Fagropartsuy.com%2Fapi%2Fadmin%2Finstagram%2Fcallback"),
  );

  // ---------- regras da Meta
  const img = (i: number) => ({ path: `instagram/t${i}.jpg`, tipo: "IMAGE" as const });
  assert.throws(() => ig.validarPost("FEED", [], ""), /pelo menos uma/);
  assert.throws(() => ig.validarPost("CARROSSEL", [img(1)], ""), /2 a 10/);
  assert.throws(() => ig.validarPost("REELS", [img(1)], ""), /vídeo/);
  assert.throws(
    () =>
      ig.validarPost("FEED", [img(1)], Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" ")),
    /30 hashtags/,
  );
  assert.equal(
    ig.urlPublica("instagram/a.jpg", "https://agropartsuy.com"),
    "https://agropartsuy.com/uploads/instagram/a.jpg",
  );

  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_INSTAGRAM === "1",
    "use um banco de teste",
  );
  await ig.garantirTabelaInstagram();
  const antes = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "ig_" } } });
  const posts: number[] = [];
  try {
    // ---------- conexão
    await assert.rejects(
      ig.concluirConexao("codigo-ruim", "https://agropartsuy.com"),
      /código inválido/,
    );
    assert.deepEqual(await ig.concluirConexao("codigo-bom", "https://agropartsuy.com"), {
      username: "rsagroparts",
    });
    const tokenSalvo = (await prisma.configuracoes.findUnique({ where: { chave: "ig_token" } }))!
      .valor;
    assert.ok(!tokenSalvo.includes("token-longo"), "token guardado criptografado");
    const st = await ig.statusInstagram();
    assert.equal(st.username, "rsagroparts");
    assert.deepEqual(st.limite, { usados: 2, total: 100 });

    const criar = async (tipo: string, midias: object[], extra: object = {}) => {
      const p = await prisma.instagram_posts.create({
        data: {
          tipo,
          midias: JSON.stringify(midias),
          legenda: "Pre Black -20% 🖤 #AgroParts",
          ...extra,
        },
      });
      posts.push(p.id);
      return p.id;
    };
    const ultimo = (caminho: string) => [...chamadas].reverse().find((c) => c.caminho === caminho)!;

    // ---------- post com primeiro comentário
    const feed = await criar("FEED", [img(1)], { comentario: "#PreBlackFriday #Tratores" });
    await ig.publicarPost(feed, "https://agropartsuy.com");
    let p = (await prisma.instagram_posts.findUnique({ where: { id: feed } }))!;
    assert.equal(p.status, "PUBLICADO", p.erro ?? "");
    assert.ok(p.permalink?.startsWith("https://www.instagram.com/p/"));
    assert.equal(
      chamadas.find(
        (c) => c.caminho === "/1789/media" && c.p.image_url?.endsWith("/uploads/instagram/t1.jpg"),
      )?.p.caption,
      "Pre Black -20% 🖤 #AgroParts",
    );
    assert.equal(
      ultimo(`/${p.ig_media_id}/comments`).p.message,
      "#PreBlackFriday #Tratores",
      "primeiro comentário",
    );

    // ---------- carrossel
    const n0 = chamadas.length;
    const car = await criar("CARROSSEL", [img(2), img(3), img(4)]);
    await ig.publicarPost(car, "https://agropartsuy.com");
    const novas = chamadas.slice(n0).filter((c) => c.caminho === "/1789/media");
    assert.equal(
      novas.filter((c) => c.p.is_carousel_item === "true").length,
      3,
      "3 itens do carrossel",
    );
    const pai = novas.find((c) => c.p.media_type === "CAROUSEL")!;
    assert.equal(pai.p.children.split(",").length, 3);
    assert.equal(
      (await prisma.instagram_posts.findUnique({ where: { id: car } }))!.status,
      "PUBLICADO",
    );

    // ---------- story (sem legenda nem comentário) e Reels (vídeo processando)
    const sto = await criar("STORY", [img(5)], { comentario: "ignorado" });
    await ig.publicarPost(sto, "https://agropartsuy.com");
    assert.equal(ultimo("/1789/media").p.media_type, "STORIES");
    assert.ok(
      !chamadas.some((c) => c.caminho.endsWith("/comments") && c.p.message === "ignorado"),
      "story não tem comentário",
    );
    const ree = await criar("REELS", [{ path: "instagram/v.mp4", tipo: "VIDEO" }]);
    await ig.publicarPost(ree, "https://agropartsuy.com");
    const r = (await prisma.instagram_posts.findUnique({ where: { id: ree } }))!;
    assert.equal(r.status, "PUBLICADO", r.erro ?? "");
    assert.ok(
      chamadas.some(
        (c) => c.p.media_type === "REELS" && c.p.video_url?.endsWith("/uploads/instagram/v.mp4"),
      ),
    );

    // ---------- erro gravado (carrossel com 1 mídia)
    const ruim = await criar("CARROSSEL", [img(6)]);
    await assert.rejects(ig.publicarPost(ruim, "https://agropartsuy.com"));
    assert.equal(
      (await prisma.instagram_posts.findUnique({ where: { id: ruim } }))!.status,
      "ERRO",
    );

    // ---------- agendado que chegou na hora
    const ag = await criar("FEED", [img(7)], {
      status: "AGENDADO",
      agendado_para: new Date(Date.now() - 60_000),
    });
    await ig.publicarAgendados();
    p = (await prisma.instagram_posts.findUnique({ where: { id: ag } }))!;
    assert.equal(p.status, "PUBLICADO", p.erro ?? "");
    assert.ok(
      ultimo("/1789/media").p.image_url.startsWith("https://agropartsuy.com/uploads/"),
      "agendado usa o endereço do site",
    );

    // ---------- métricas (uma métrica indisponível não derruba as outras)
    assert.ok((await ig.atualizarMetricas(true)) >= 5);
    const met = JSON.parse(
      (await prisma.instagram_posts.findUnique({ where: { id: feed } }))!.metricas!,
    );
    assert.deepEqual(met, {
      curtidas: 42,
      comentarios: 3,
      alcance: 340,
      salvos: 12,
      compartilhamentos: 5,
    });

    // ---------- renovação do token perto de vencer
    await prisma.configuracoes.update({
      where: { chave: "ig_expira" },
      data: { valor: String(Date.now() + 5 * 86400_000) },
    });
    await prisma.configuracoes.update({
      where: { chave: "ig_renovado" },
      data: { valor: String(Date.now() - 2 * 86400_000) },
    });
    await ig.statusInstagram();
    assert.ok(
      chamadas.some((c) => c.caminho === "/refresh_access_token"),
      "token renovado",
    );
    assert.equal(ultimo("/me").p.access_token, "token-renovado");

    console.log(
      "✔ instagram: conexão, post, carrossel, story, Reels, comentário, agendados, métricas e token",
    );
  } finally {
    await prisma.instagram_posts.deleteMany({ where: { id: { in: posts } } });
    await prisma.configuracoes.deleteMany({ where: { chave: { startsWith: "ig_" } } });
    for (const a of antes)
      await prisma.configuracoes.create({ data: { chave: a.chave, valor: a.valor } });
    await prisma.$disconnect();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
