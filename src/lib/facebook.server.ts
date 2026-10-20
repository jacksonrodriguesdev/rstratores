// Facebook (página e anúncios) pelo login do Facebook: Admin → Instagram e Facebook → «Conectar
// Facebook». Precisa de META_APP_ID e META_APP_SECRET (app principal do Meta for Developers, o
// mesmo dos anúncios) no hPanel e do redirecionamento https://<domínio>/api/admin/facebook/callback
// em «Login do Facebook para Empresas → Configurações». Opcional: META_LOGIN_CONFIG_ID (a
// configuração do Login para Empresas com as permissões abaixo).
// Tokens criptografados na tabela configuracoes (fb_*): o da página não vence; o do usuário (usado
// nos anúncios) vale 60 dias e o painel avisa para reconectar.
import { cifrar, decifrar } from "./instagram.server";

const GRAPH = () =>
  (process.env.META_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
const DIALOGO = () =>
  (process.env.META_DIALOG_URL || "https://www.facebook.com").replace(/\/+$/, "");
const V = "v21.0";
export const ESCOPOS_FB = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "read_insights",
  "ads_read",
  "ads_management",
  "business_management",
  "leads_retrieval",
  "pages_manage_ads",
];

export const facebookConfigurado = () =>
  !!(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
export const callbackFacebook = (origem: string) => `${origem}/api/admin/facebook/callback`;

async function ler() {
  const { prisma } = await import("./prisma");
  const rows = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "fb_" } } });
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
  const { limparCacheMarketing } = await import("./marketing-config.server");
  limparCacheMarketing();
}
const abrir = (v?: string) => {
  if (!v) return null;
  try {
    return decifrar(v);
  } catch {
    return null; // JWT_SECRET mudou: conectar de novo
  }
};

async function graph(
  caminho: string,
  params: Record<string, string> = {},
  metodo: "GET" | "POST" = "GET",
) {
  const url = new URL(
    caminho.startsWith("http") ? caminho : `${GRAPH()}/${V}/${caminho.replace(/^\//, "")}`,
  );
  const corpo = new URLSearchParams(params);
  if (metodo === "GET") for (const [k, v] of corpo) url.searchParams.set(k, v);
  const r = await fetch(url, {
    method: metodo,
    ...(metodo === "POST" && {
      body: corpo,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = j.error ?? {};
    throw new Error(
      e.code === 190
        ? "a conexão com o Facebook venceu: clique em «Reconectar Facebook»"
        : e.error_user_msg || e.message || `Facebook respondeu ${r.status}`,
    );
  }
  return j;
}

// ---------------------------------------------------------------- conexão
export function urlConectarFacebook(origem: string, state: string) {
  const u = new URL(`${DIALOGO()}/${V}/dialog/oauth`);
  const config = process.env.META_LOGIN_CONFIG_ID?.trim();
  u.search = new URLSearchParams({
    client_id: process.env.META_APP_ID!.trim(),
    redirect_uri: callbackFacebook(origem),
    state,
    response_type: "code",
    // Pede de novo as permissões novas ou recusadas (ex.: leads) ao reconectar
    auth_type: "rerequest",
    ...(config ? { config_id: config } : { scope: ESCOPOS_FB.join(",") }),
  }).toString();
  return u.toString();
}

export async function concluirFacebook(code: string, origem: string) {
  const curto = await graph("oauth/access_token", {
    client_id: process.env.META_APP_ID!.trim(),
    client_secret: process.env.META_APP_SECRET!.trim(),
    redirect_uri: callbackFacebook(origem),
    code,
  });
  // Token de 60 dias
  const longo = await graph("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!.trim(),
    client_secret: process.env.META_APP_SECRET!.trim(),
    fb_exchange_token: curto.access_token,
  });
  const token = String(longo.access_token);
  const eu = await graph("me", { fields: "id,name", access_token: token });
  const [paginas, contas] = await Promise.all([
    graph("me/accounts", {
      fields: "id,name,access_token,picture{url},instagram_business_account",
      limit: "100",
      access_token: token,
    }).catch(() => ({ data: [] })),
    graph("me/adaccounts", {
      fields: "id,name,currency,account_status",
      limit: "100",
      access_token: token,
    }).catch(() => ({ data: [] })),
  ]);
  const atual = await ler();
  const listaPaginas = (paginas.data ?? []).map((p: any) => ({
    id: String(p.id),
    nome: String(p.name),
    foto: p.picture?.data?.url ?? null,
    // Conta do Instagram ligada à página (identidade dos anúncios no Instagram)
    ig: p.instagram_business_account?.id ? String(p.instagram_business_account.id) : null,
  }));
  const tokensPaginas = Object.fromEntries(
    (paginas.data ?? []).map((p: any) => [String(p.id), String(p.access_token)]),
  );
  const listaContas = (contas.data ?? []).map((c: any) => ({
    id: String(c.id),
    nome: String(c.name ?? c.id),
    moeda: String(c.currency ?? ""),
  }));
  // Página escolhida: a que já estava, ou a única
  const pagina =
    listaPaginas.find((p: any) => p.id === atual.fb_pagina_id) ??
    (listaPaginas.length === 1 ? listaPaginas[0] : null);
  const conta =
    listaContas.find((c: any) => c.id === atual.fb_conta_ads) ??
    (listaContas.length === 1 ? listaContas[0] : null);
  await gravar({
    fb_token: cifrar(token),
    fb_expira: String(Date.now() + (Number(longo.expires_in) || 60 * 86400) * 1000),
    fb_usuario: String(eu.name ?? ""),
    fb_paginas: cifrar(JSON.stringify(tokensPaginas)),
    fb_lista: JSON.stringify({ paginas: listaPaginas, contas: listaContas }),
    fb_pagina_id: pagina?.id ?? null,
    fb_conta_ads: conta?.id ?? null,
    fb_erro: null,
  });
  return {
    usuario: String(eu.name ?? ""),
    paginas: listaPaginas.length,
    contas: listaContas.length,
  };
}

export async function escolherFacebook(o: { pagina?: string | null; conta?: string | null }) {
  const c = await ler();
  const lista = JSON.parse(c.fb_lista || "{}");
  if (o.pagina !== undefined) {
    if (o.pagina && !lista.paginas?.some((p: any) => p.id === o.pagina))
      throw new Error("Página não encontrada");
    await gravar({ fb_pagina_id: o.pagina || null });
  }
  if (o.conta !== undefined) {
    if (o.conta && !lista.contas?.some((x: any) => x.id === o.conta))
      throw new Error("Conta de anúncios não encontrada");
    await gravar({ fb_conta_ads: o.conta || null });
  }
}

export async function desconectarFacebook() {
  await gravar({
    fb_token: null,
    fb_expira: null,
    fb_usuario: null,
    fb_paginas: null,
    fb_lista: null,
    fb_pagina_id: null,
    fb_conta_ads: null,
    fb_erro: null,
  });
}

export async function statusFacebook() {
  const c = await ler();
  const lista = JSON.parse(c.fb_lista || "{}");
  const pagina = lista.paginas?.find((p: any) => p.id === c.fb_pagina_id) ?? null;
  return {
    configurado: facebookConfigurado(),
    conectado: !!abrir(c.fb_token),
    usuario: c.fb_usuario ?? null,
    expira: c.fb_expira ? Number(c.fb_expira) : null,
    paginas: (lista.paginas ?? []) as Array<{ id: string; nome: string; foto: string | null }>,
    contas: (lista.contas ?? []) as Array<{ id: string; nome: string; moeda: string }>,
    pagina,
    contaAds: c.fb_conta_ads ?? null,
    erro: c.fb_erro ?? null,
  };
}

// Token e conta para a Central de Anúncios (quando não há token colado em Integrações)
export async function anunciosDaConexao(): Promise<{ token: string; conta: string } | null> {
  const c = await ler();
  const token = abrir(c.fb_token);
  if (!token || !c.fb_conta_ads) return null;
  if (c.fb_expira && Number(c.fb_expira) < Date.now()) return null;
  return { token, conta: c.fb_conta_ads };
}

// Página escolhida (id, token da página e o Instagram ligado a ela): anúncios e leads
export async function paginaAtual() {
  const c = await ler();
  const tokens = JSON.parse(abrir(c.fb_paginas) || "{}");
  if (!c.fb_pagina_id || !tokens[c.fb_pagina_id])
    throw new Error("Facebook: conecte e escolha a página.");
  const lista = JSON.parse(c.fb_lista || "{}");
  const ig = lista.paginas?.find((p: any) => p.id === c.fb_pagina_id)?.ig ?? null;
  return { id: c.fb_pagina_id, token: String(tokens[c.fb_pagina_id]), ig: ig as string | null };
}

// ---------------------------------------------------------------- publicar na página
export async function publicarNaPagina(
  tipo: string,
  midias: Array<{ url: string; tipo: "IMAGE" | "VIDEO" }>,
  texto: string,
): Promise<string> {
  const p = await paginaAtual();
  const tk = { access_token: p.token };
  const video = midias.find((m) => m.tipo === "VIDEO");
  if (tipo === "REELS" || (midias.length === 1 && video)) {
    const r = await graph(
      `${p.id}/videos`,
      { file_url: (video ?? midias[0]).url, description: texto, ...tk },
      "POST",
    );
    return String(r.id);
  }
  const fotos = midias.filter((m) => m.tipo === "IMAGE");
  if (fotos.length === 1) {
    const r = await graph(`${p.id}/photos`, { url: fotos[0].url, caption: texto, ...tk }, "POST");
    return String(r.post_id ?? r.id);
  }
  // Várias fotos: sobe sem publicar e junta num post só
  const ids: string[] = [];
  for (const f of fotos)
    ids.push(
      String((await graph(`${p.id}/photos`, { url: f.url, published: "false", ...tk }, "POST")).id),
    );
  const anexos = Object.fromEntries(
    ids.map((id, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid: id })]),
  );
  const r = await graph(`${p.id}/feed`, { message: texto, ...anexos, ...tk }, "POST");
  return String(r.id);
}

// Story da página: sobe a foto sem publicar e publica como story (uma foto por story)
export async function publicarStoryNaPagina(url: string): Promise<string> {
  const p = await paginaAtual();
  const tk = { access_token: p.token };
  const foto = await graph(`${p.id}/photos`, { url, published: "false", ...tk }, "POST");
  const r = await graph(`${p.id}/photo_stories`, { photo_id: String(foto.id), ...tk }, "POST");
  return String(r.post_id ?? r.id ?? foto.id);
}

// ---------------------------------------------------------------- desempenho da página
// A Meta troca nomes de métricas com o tempo: tenta cada uma separada e usa as que existirem
async function metricaDia(
  id: string,
  token: string,
  nomes: string[],
  since: number,
  until: number,
) {
  for (const n of nomes) {
    const j = await graph(`${id}/insights`, {
      metric: n,
      period: "day",
      since: String(since),
      until: String(until),
      access_token: token,
    }).catch(() => null);
    const vals = j?.data?.[0]?.values;
    if (Array.isArray(vals))
      return vals.map((v: any) => ({
        dia: String(v.end_time).slice(0, 10),
        v: Number(v.value) || 0,
      }));
  }
  return null;
}

export async function desempenhoPagina(dias = 28) {
  const p = await paginaAtual();
  const ate = Math.floor(Date.now() / 1000);
  const de = ate - dias * 86400;
  const [info, alcance, engaj, seguidores, posts] = await Promise.all([
    graph(p.id, {
      fields: "name,followers_count,fan_count,picture{url},link",
      access_token: p.token,
    }),
    metricaDia(p.id, p.token, ["page_total_media_view_unique", "page_impressions_unique"], de, ate),
    metricaDia(p.id, p.token, ["page_post_engagements"], de, ate),
    metricaDia(
      p.id,
      p.token,
      ["page_daily_follows_unique", "page_follows", "page_fan_adds_unique"],
      de,
      ate,
    ),
    graph(`${p.id}/published_posts`, {
      fields:
        "id,message,created_time,permalink_url,full_picture,shares,reactions.summary(total_count),comments.summary(total_count)",
      limit: "12",
      access_token: p.token,
    }).catch(() => ({ data: [] })),
  ]);
  const soma = (x: Array<{ v: number }> | null) => (x ? x.reduce((s, d) => s + d.v, 0) : null);
  return {
    nome: String(info.name ?? ""),
    link: info.link ?? null,
    foto: info.picture?.data?.url ?? null,
    seguidores: info.followers_count ?? info.fan_count ?? null,
    alcance: soma(alcance),
    engajamento: soma(engaj),
    novosSeguidores: soma(seguidores),
    serie: alcance ?? [],
    posts: (posts.data ?? []).map((x: any) => ({
      id: String(x.id),
      texto: String(x.message ?? ""),
      quando: String(x.created_time ?? ""),
      link: x.permalink_url ?? null,
      imagem: x.full_picture ?? null,
      reacoes: x.reactions?.summary?.total_count ?? 0,
      comentarios: x.comments?.summary?.total_count ?? 0,
      compartilhamentos: x.shares?.count ?? 0,
    })),
  };
}
