// Publicações no Instagram pela API oficial da Meta («Instagram API com login do Instagram»).
// Precisa de INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET (Meta for Developers → app → Instagram →
// Configuração da API com login do Instagram) no hPanel, e do redirecionamento
// https://<domínio>/api/admin/instagram/callback cadastrado no app.
// O token da conta fica CRIPTOGRAFADO na tabela configuracoes (ig_*) e nunca vai ao navegador.
import crypto from "crypto";

const GRAPH = () =>
  (process.env.INSTAGRAM_GRAPH_URL || "https://graph.instagram.com").replace(/\/+$/, "");
const API = () =>
  (process.env.INSTAGRAM_API_URL || "https://api.instagram.com").replace(/\/+$/, "");
const VERSAO = () => process.env.INSTAGRAM_API_VERSION || "v23.0";
export const ESCOPOS = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
  "instagram_business_manage_comments",
];

export const instagramConfigurado = () =>
  !!(process.env.INSTAGRAM_APP_ID?.trim() && process.env.INSTAGRAM_APP_SECRET?.trim());
export const callbackInstagram = (origem: string) => `${origem}/api/admin/instagram/callback`;

// ---------------------------------------------------------------- tabela
const SQL = `CREATE TABLE IF NOT EXISTS \`instagram_posts\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`tipo\` VARCHAR(20) NOT NULL,
  \`legenda\` TEXT NULL,
  \`comentario\` TEXT NULL,
  \`midias\` TEXT NOT NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'RASCUNHO',
  \`agendado_para\` DATETIME(3) NULL,
  \`publicado_em\` DATETIME(3) NULL,
  \`ig_media_id\` VARCHAR(64) NULL,
  \`permalink\` VARCHAR(300) NULL,
  \`erro\` TEXT NULL,
  \`metricas\` TEXT NULL,
  \`metricas_em\` DATETIME(3) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL,
  INDEX \`instagram_posts_status_agendado_para_idx\`(\`status\`, \`agendado_para\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
let tabela: Promise<void> | null = null;
export function garantirTabelaInstagram() {
  tabela ??= (async () => {
    const { prisma } = await import("./prisma");
    await prisma.$executeRawUnsafe(SQL);
    // Colunas novas (Facebook) em tabelas já criadas
    const cols = await prisma.$queryRaw<Array<{ c: string }>>`
      SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instagram_posts'`;
    if (!cols.some((x) => x.c === "facebook"))
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `instagram_posts` ADD COLUMN `facebook` BOOLEAN NOT NULL DEFAULT false, ADD COLUMN `fb_post_id` VARCHAR(80) NULL",
      );
  })().catch((e) => {
    tabela = null;
    throw e;
  });
  return tabela;
}

// ---------------------------------------------------------------- token criptografado
function chave() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET ausente");
  return crypto.createHash("sha256").update(`instagram:${s}`).digest();
}
export function cifrar(texto: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const dado = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dado].map((b) => b.toString("base64url")).join(".");
}
export function decifrar(valor: string) {
  const [iv, tag, dado] = valor.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dado), d.final()]).toString("utf8");
}

type Conta = {
  token: string;
  userId: string;
  username: string | null;
  foto: string | null;
  expira: number; // ms
  renovadoEm: number;
};
async function lerConfig() {
  const { prisma } = await import("./prisma");
  const rows = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "ig_" } } });
  return Object.fromEntries(rows.map((r) => [r.chave, r.valor])) as Record<string, string>;
}
async function gravar(v: Record<string, string | null>) {
  const { prisma } = await import("./prisma");
  for (const [chave, valor] of Object.entries(v)) {
    if (valor === null) await prisma.configuracoes.deleteMany({ where: { chave } });
    else
      await prisma.configuracoes.upsert({
        where: { chave },
        update: { valor },
        create: { chave, valor },
      });
  }
}
async function lerConta(): Promise<Conta | null> {
  const c = await lerConfig();
  if (!c.ig_token || !c.ig_user_id) return null;
  try {
    return {
      token: decifrar(c.ig_token),
      userId: c.ig_user_id,
      username: c.ig_username ?? null,
      foto: c.ig_foto ?? null,
      expira: Number(c.ig_expira) || 0,
      renovadoEm: Number(c.ig_renovado) || 0,
    };
  } catch {
    return null; // JWT_SECRET mudou: precisa conectar de novo
  }
}

// ---------------------------------------------------------------- chamadas
async function graph(
  caminho: string,
  params: Record<string, string> = {},
  metodo: "GET" | "POST" = "GET",
) {
  const url = new URL(`${GRAPH()}/${VERSAO()}/${caminho.replace(/^\//, "")}`);
  const corpo = new URLSearchParams(params);
  if (metodo === "GET") url.search = corpo.toString();
  const r = await fetch(url, {
    method: metodo,
    ...(metodo === "POST" && {
      body: corpo,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error)
    throw new Error(
      j.error?.error_user_msg || j.error?.message || `Instagram respondeu ${r.status}`,
    );
  return j;
}

// 1) Link de autorização (o admin entra com o próprio Instagram, na tela da Meta)
export function urlConectar(origem: string, state: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.search = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!.trim(),
    redirect_uri: callbackInstagram(origem),
    response_type: "code",
    scope: ESCOPOS.join(","),
    state,
    enable_fb_login: "0",
    force_authentication: "1",
  }).toString();
  return u.toString();
}

// 2) Volta: código → token curto → token de 60 dias → perfil
export async function concluirConexao(code: string, origem: string) {
  const r = await fetch(`${API()}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!.trim(),
      client_secret: process.env.INSTAGRAM_APP_SECRET!.trim(),
      grant_type: "authorization_code",
      redirect_uri: callbackInstagram(origem),
      code: code.replace(/#_$/, ""),
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  const curto = j.access_token ?? j.data?.[0]?.access_token;
  if (!r.ok || !curto)
    throw new Error(j.error_message || j.error?.message || "A Meta recusou a autorização.");
  const longo = await fetch(
    `${GRAPH()}/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: process.env.INSTAGRAM_APP_SECRET!.trim(), access_token: curto })}`,
  ).then((x) => x.json() as Promise<any>);
  if (!longo.access_token)
    throw new Error(longo.error?.message || "Não foi possível obter o token de 60 dias.");
  const perfil = await fetch(
    `${GRAPH()}/${VERSAO()}/me?${new URLSearchParams({ fields: "user_id,username,profile_picture_url,account_type", access_token: longo.access_token })}`,
  ).then((x) => x.json() as Promise<any>);
  if (!perfil.user_id && !perfil.id)
    throw new Error(perfil.error?.message || "Não foi possível ler o perfil.");
  await gravar({
    ig_token: cifrar(longo.access_token),
    ig_user_id: String(perfil.user_id ?? perfil.id),
    ig_username: perfil.username ?? null,
    ig_foto: perfil.profile_picture_url ?? null,
    ig_expira: String(Date.now() + (Number(longo.expires_in) || 60 * 86400) * 1000),
    ig_renovado: String(Date.now()),
    ig_erro: null,
  });
  return { username: perfil.username as string };
}

export async function desconectar() {
  await gravar({
    ig_token: null,
    ig_user_id: null,
    ig_username: null,
    ig_foto: null,
    ig_expira: null,
    ig_renovado: null,
    ig_erro: null,
  });
}

// Token válido: renova sozinho quando faltam menos de 20 dias (a Meta só renova com 24 h de uso)
async function conta(): Promise<Conta> {
  const c = await lerConta();
  if (!c) throw new Error("Instagram não conectado: clique em «Conectar Instagram».");
  const faltam = c.expira - Date.now();
  if (faltam < 20 * 86400_000 && Date.now() - c.renovadoEm > 86400_000) {
    const j: any = await fetch(
      `${GRAPH()}/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: c.token })}`,
    )
      .then((x) => x.json())
      .catch(() => ({}));
    if (j.access_token) {
      c.token = j.access_token;
      c.expira = Date.now() + (Number(j.expires_in) || 60 * 86400) * 1000;
      c.renovadoEm = Date.now();
      await gravar({
        ig_token: cifrar(c.token),
        ig_expira: String(c.expira),
        ig_renovado: String(c.renovadoEm),
      });
    } else if (faltam <= 0) {
      await gravar({ ig_erro: "A conexão com o Instagram venceu: conecte de novo." });
      throw new Error("A conexão com o Instagram venceu: conecte de novo.");
    }
  }
  return c;
}

export async function statusInstagram() {
  const c = await lerConta();
  const cfg = await lerConfig();
  let perfil: any = null;
  let limite: { usados: number; total: number } | null = null;
  if (c) {
    try {
      const cc = await conta();
      perfil = await graph("me", {
        fields:
          "user_id,username,name,profile_picture_url,followers_count,follows_count,media_count",
        access_token: cc.token,
      });
      const l = await graph(`${cc.userId}/content_publishing_limit`, {
        fields: "config,quota_usage",
        access_token: cc.token,
      }).catch(() => null);
      if (l?.data?.[0])
        limite = {
          usados: l.data[0].quota_usage ?? 0,
          total: l.data[0].config?.quota_total ?? 100,
        };
    } catch (e: any) {
      return {
        configurado: instagramConfigurado(),
        conectado: true,
        erro: e.message,
        username: c.username,
        foto: c.foto,
        expira: c.expira,
      };
    }
  }
  return {
    configurado: instagramConfigurado(),
    conectado: !!c,
    erro: cfg.ig_erro ?? null,
    username: perfil?.username ?? c?.username ?? null,
    nome: perfil?.name ?? null,
    foto: perfil?.profile_picture_url ?? c?.foto ?? null,
    seguidores: perfil?.followers_count ?? null,
    posts: perfil?.media_count ?? null,
    expira: c?.expira ?? null,
    limite,
  };
}

// ---------------------------------------------------------------- publicar
export type Midia = { path: string; tipo: "IMAGE" | "VIDEO" };
export type TipoPost = "FEED" | "CARROSSEL" | "STORY" | "REELS";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A Meta baixa a mídia por um link público do site
export const urlPublica = (path: string, origem: string) =>
  /^https?:\/\//.test(path) ? path : `${origem}/uploads/${path.replace(/^\/?(uploads\/)?/, "")}`;

// Vídeo (e às vezes imagem) precisa terminar de processar antes de publicar
async function aguardar(id: string, token: string, maxMs: number) {
  const ate = Date.now() + maxMs;
  for (;;) {
    const j = await graph(id, { fields: "status_code,status", access_token: token });
    if (j.status_code === "FINISHED" || j.status_code === "PUBLISHED" || !j.status_code) return;
    if (j.status_code === "ERROR" || j.status_code === "EXPIRED")
      throw new Error(`A Meta não conseguiu processar a mídia (${j.status ?? j.status_code}).`);
    if (Date.now() > ate)
      throw new Error("A Meta demorou demais para processar o vídeo; tente de novo.");
    await espera(Number(process.env.INSTAGRAM_ESPERA_MS) || 4000);
  }
}

export function validarPost(tipo: TipoPost, midias: Midia[], legenda: string) {
  if (!midias.length) throw new Error("Adicione pelo menos uma imagem ou vídeo.");
  if (tipo === "CARROSSEL" && (midias.length < 2 || midias.length > 10))
    throw new Error("O carrossel precisa de 2 a 10 imagens/vídeos.");
  if (tipo !== "CARROSSEL" && midias.length > 1)
    throw new Error("Esse tipo de publicação leva uma mídia só.");
  if (tipo === "REELS" && midias[0].tipo !== "VIDEO")
    throw new Error("Reels precisa de um vídeo (MP4).");
  if ((legenda ?? "").length > 2200) throw new Error("A legenda passa de 2.200 caracteres.");
  if (((legenda ?? "").match(/#[\p{L}\p{N}_]+/gu) ?? []).length > 30)
    throw new Error("Máximo de 30 hashtags.");
}

export async function publicarPost(id: number, origem: string) {
  await garantirTabelaInstagram();
  const { prisma } = await import("./prisma");
  const p = await prisma.instagram_posts.findUnique({ where: { id } });
  if (!p || p.status === "PUBLICADO" || p.status === "PUBLICANDO") return;
  await prisma.instagram_posts.update({
    where: { id },
    data: { status: "PUBLICANDO", erro: null },
  });
  try {
    const c = await conta();
    const midias = JSON.parse(p.midias) as Midia[];
    const tipo = p.tipo as TipoPost;
    validarPost(tipo, midias, p.legenda ?? "");
    const tk = { access_token: c.token };
    const item = (m: Midia, extra: Record<string, string>) =>
      m.tipo === "VIDEO"
        ? { video_url: urlPublica(m.path, origem), ...extra }
        : { image_url: urlPublica(m.path, origem), ...extra };
    let criacao: string;
    if (tipo === "CARROSSEL") {
      const filhos: string[] = [];
      for (const m of midias) {
        const f = await graph(
          `${c.userId}/media`,
          {
            ...item(m, {
              is_carousel_item: "true",
              ...(m.tipo === "VIDEO" && { media_type: "VIDEO" }),
            }),
            ...tk,
          },
          "POST",
        );
        if (m.tipo === "VIDEO") await aguardar(f.id, c.token, 300_000);
        filhos.push(f.id);
      }
      criacao = (
        await graph(
          `${c.userId}/media`,
          { media_type: "CAROUSEL", children: filhos.join(","), caption: p.legenda ?? "", ...tk },
          "POST",
        )
      ).id;
    } else if (tipo === "STORY") {
      criacao = (
        await graph(
          `${c.userId}/media`,
          { ...item(midias[0], { media_type: "STORIES" }), ...tk },
          "POST",
        )
      ).id;
    } else if (tipo === "REELS") {
      criacao = (
        await graph(
          `${c.userId}/media`,
          {
            ...item(midias[0], {
              media_type: "REELS",
              caption: p.legenda ?? "",
              share_to_feed: "true",
            }),
            ...tk,
          },
          "POST",
        )
      ).id;
    } else {
      criacao = (
        await graph(
          `${c.userId}/media`,
          {
            ...item(midias[0], {
              caption: p.legenda ?? "",
              ...(midias[0].tipo === "VIDEO" && { media_type: "REELS" }),
            }),
            ...tk,
          },
          "POST",
        )
      ).id;
    }
    await aguardar(criacao, c.token, 600_000);
    const pub = await graph(`${c.userId}/media_publish`, { creation_id: criacao, ...tk }, "POST");
    const info = await graph(pub.id, { fields: "permalink", ...tk }).catch(() => ({}) as any);
    // Primeiro comentário (ex.: hashtags) — story não tem comentários
    const avisos: string[] = [];
    if (p.comentario?.trim() && tipo !== "STORY")
      await graph(`${pub.id}/comments`, { message: p.comentario.trim(), ...tk }, "POST").catch(
        (e) => {
          avisos.push(`O primeiro comentário falhou: ${e.message}`);
        },
      );
    // Também na página do Facebook (a API do Instagram não compartilha sozinha no Facebook)
    let fbPost: string | null = null;
    if (p.facebook) {
      try {
        const fb = await import("./facebook.server");
        fbPost =
          tipo === "STORY" && midias[0].tipo === "IMAGE"
            ? await fb.publicarStoryNaPagina(urlPublica(midias[0].path, origem))
            : await fb.publicarNaPagina(
                tipo,
                midias.map((m) => ({ url: urlPublica(m.path, origem), tipo: m.tipo })),
                [p.legenda ?? "", p.comentario ?? ""].filter((x) => x.trim()).join("\n\n"),
              );
      } catch (e: any) {
        avisos.push(`Publicado no Instagram, mas o Facebook falhou: ${e?.message ?? e}`);
      }
    }
    await prisma.instagram_posts.update({
      where: { id },
      data: {
        status: "PUBLICADO",
        publicado_em: new Date(),
        ig_media_id: pub.id,
        permalink: info.permalink ?? null,
        fb_post_id: fbPost,
        erro: avisos.length ? avisos.join(" · ") : null,
      },
    });
  } catch (e: any) {
    await prisma.instagram_posts.update({
      where: { id },
      data: { status: "ERRO", erro: String(e?.message ?? e).slice(0, 1000) },
    });
    throw e;
  }
}

// Agendador (a cada 10 min): publica os agendados que chegaram na hora
export async function publicarAgendados() {
  if (!instagramConfigurado()) return;
  await garantirTabelaInstagram();
  const { prisma } = await import("./prisma");
  const { SITE_URL } = await import("./site");
  const prontos = await prisma.instagram_posts.findMany({
    where: { status: "AGENDADO", agendado_para: { lte: new Date() } },
    orderBy: { agendado_para: "asc" },
    take: 10,
  });
  for (const p of prontos)
    await publicarPost(p.id, SITE_URL).catch((e) => console.error("instagram", p.id, e?.message));
}

// Métricas dos posts publicados nos últimos 60 dias (a cada 6 h, ou pelo botão do painel)
export async function atualizarMetricas(forcar = false) {
  await garantirTabelaInstagram();
  const { prisma } = await import("./prisma");
  const c = await lerConta();
  if (!c) return 0;
  const cc = await conta();
  const posts = await prisma.instagram_posts.findMany({
    where: {
      status: "PUBLICADO",
      ig_media_id: { not: null },
      publicado_em: { gte: new Date(Date.now() - 60 * 86400_000) },
      ...(!forcar && {
        OR: [{ metricas_em: null }, { metricas_em: { lt: new Date(Date.now() - 6 * 3600_000) } }],
      }),
    },
  });
  for (const p of posts) {
    const m: Record<string, number> = {};
    const base = await graph(p.ig_media_id!, {
      fields: "like_count,comments_count",
      access_token: cc.token,
    }).catch(() => ({}) as any);
    if (base.like_count != null) m.curtidas = base.like_count;
    if (base.comments_count != null) m.comentarios = base.comments_count;
    // Cada métrica separada: se uma não existir para o tipo de mídia, as outras vêm
    for (const [met, nome] of [
      ["reach", "alcance"],
      ["saved", "salvos"],
      ["shares", "compartilhamentos"],
      ["views", "views"],
    ] as const) {
      const j = await graph(`${p.ig_media_id}/insights`, {
        metric: met,
        access_token: cc.token,
      }).catch(() => null);
      const v = j?.data?.[0]?.values?.[0]?.value ?? j?.data?.[0]?.total_value?.value;
      if (typeof v === "number") m[nome] = v;
    }
    await prisma.instagram_posts.update({
      where: { id: p.id },
      data: { metricas: JSON.stringify(m), metricas_em: new Date() },
    });
  }
  return posts.length;
}

let ultimaMetrica = 0;
export async function tarefasInstagram() {
  await publicarAgendados();
  if (Date.now() - ultimaMetrica > 6 * 3600_000 && (await lerConta())) {
    ultimaMetrica = Date.now();
    await atualizarMetricas().catch((e) => console.error("instagram métricas", e?.message));
  }
}

// ---------------------------------------------------------------- desempenho da conta
// Alcance, visitas ao perfil e interações dos últimos N dias + posts recentes (inclusive os
// feitos pelo app do Instagram), cada um com curtidas e comentários.
export async function desempenhoInstagram(dias = 28) {
  const c = await conta();
  const ate = Math.floor(Date.now() / 1000);
  const de = ate - Math.min(30, dias) * 86400; // a Meta aceita até 30 dias por consulta
  const total = async (metrica: string) => {
    const j = await graph(`${c.userId}/insights`, {
      metric: metrica,
      period: "day",
      metric_type: "total_value",
      since: String(de),
      until: String(ate),
      access_token: c.token,
    }).catch(() => null);
    const v = j?.data?.[0]?.total_value?.value;
    return typeof v === "number" ? v : null;
  };
  const [perfil, alcance, visitas, interacoes, engajadas, midias] = await Promise.all([
    graph("me", { fields: "username,followers_count,media_count", access_token: c.token }),
    total("reach"),
    total("profile_views"),
    total("total_interactions"),
    total("accounts_engaged"),
    graph(`${c.userId}/media`, {
      fields:
        "id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count",
      limit: "18",
      access_token: c.token,
    }).catch(() => ({ data: [] })),
  ]);
  return {
    seguidores: perfil.followers_count ?? null,
    posts: perfil.media_count ?? null,
    alcance,
    visitas,
    interacoes,
    engajadas,
    recentes: (midias.data ?? []).map((m: any) => ({
      id: String(m.id),
      legenda: String(m.caption ?? ""),
      tipo: String(
        m.media_product_type === "STORY"
          ? "STORY"
          : m.media_product_type === "REELS"
            ? "REELS"
            : m.media_type,
      ),
      imagem: m.thumbnail_url ?? (m.media_type === "VIDEO" ? null : m.media_url) ?? null,
      link: m.permalink ?? null,
      quando: String(m.timestamp ?? ""),
      curtidas: m.like_count ?? 0,
      comentarios: m.comments_count ?? 0,
    })),
  };
}
