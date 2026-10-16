// Google Search Console (Admin → Posições no Google). Só leitura.
// O admin conecta uma vez com a conta Google dona da propriedade (mesmo GOOGLE_CLIENT_ID /
// GOOGLE_CLIENT_SECRET do "Entrar com Google", escopo webmasters.readonly). O refresh token fica
// na tabela configuracoes (gsc_*), nunca vai para o navegador.
// Todo dia o agendador importa os últimos dias (o Google demora ~2 dias para fechar os números):
//   gsc_dia (totais por país), gsc_consulta (buscas), gsc_pagina (páginas).
// GSC_API_URL / GSC_TOKEN_URL só servem para testes locais (servidor falso).
import { prisma } from "./prisma";

const API = (process.env.GSC_API_URL || "https://www.googleapis.com").replace(/\/+$/, "");
const TOKEN_URL = process.env.GSC_TOKEN_URL || "https://oauth2.googleapis.com/token";
export const ESCOPO = "https://www.googleapis.com/auth/webmasters.readonly";

// ---------- Tabelas (produção não roda "prisma db push") ----------
const SQL = [
  `CREATE TABLE IF NOT EXISTS \`gsc_dia\` (
    \`dia\` VARCHAR(10) NOT NULL,
    \`pais\` VARCHAR(3) NOT NULL,
    \`cliques\` INTEGER NOT NULL DEFAULT 0,
    \`impressoes\` INTEGER NOT NULL DEFAULT 0,
    \`pos_soma\` DOUBLE NOT NULL DEFAULT 0,
    PRIMARY KEY (\`dia\`, \`pais\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`gsc_consulta\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`dia\` VARCHAR(10) NOT NULL,
    \`pais\` VARCHAR(3) NOT NULL,
    \`consulta\` VARCHAR(400) NOT NULL,
    \`cliques\` INTEGER NOT NULL DEFAULT 0,
    \`impressoes\` INTEGER NOT NULL DEFAULT 0,
    \`pos_soma\` DOUBLE NOT NULL DEFAULT 0,
    INDEX \`gsc_consulta_dia_idx\`(\`dia\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`gsc_pagina\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`dia\` VARCHAR(10) NOT NULL,
    \`pais\` VARCHAR(3) NOT NULL,
    \`pagina\` VARCHAR(600) NOT NULL,
    \`cliques\` INTEGER NOT NULL DEFAULT 0,
    \`impressoes\` INTEGER NOT NULL DEFAULT 0,
    \`pos_soma\` DOUBLE NOT NULL DEFAULT 0,
    INDEX \`gsc_pagina_dia_idx\`(\`dia\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let tabelas: Promise<void> | null = null;
export function garantirTabelasGsc() {
  tabelas ??= (async () => {
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

// ---------- Configuração (configuracoes gsc_*) ----------
type ChaveGsc = "gsc_refresh" | "gsc_site" | "gsc_email" | "gsc_sync" | "gsc_sitemaps" | "gsc_erro";
async function ler(): Promise<Partial<Record<ChaveGsc, string>>> {
  const rows = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "gsc_" } } });
  return Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
}
async function gravar(v: Partial<Record<ChaveGsc, string | null>>) {
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

export async function estadoGsc() {
  const { googleConfigurado } = await import("./google-oauth.server");
  const c = await ler();
  let sitemaps: Sitemap[] = [];
  try {
    sitemaps = JSON.parse(c.gsc_sitemaps || "[]");
  } catch {
    /* sem sitemaps salvos */
  }
  return {
    credencial: googleConfigurado(),
    conectado: !!c.gsc_refresh,
    site: c.gsc_site || null,
    email: c.gsc_email || null,
    ultimaSync: c.gsc_sync || null,
    erro: c.gsc_erro || null,
    sitemaps,
  };
}

// ---------- OAuth ----------
export function urlConectar(redirect: string, state: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirect,
    response_type: "code",
    scope: `openid email ${ESCOPO}`,
    access_type: "offline", // devolve refresh token
    prompt: "consent", // garante o refresh token mesmo se já autorizou antes
    include_granted_scopes: "true",
    state,
  }).toString();
  return u.toString();
}

export async function concluirConexao(code: string, redirect: string) {
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
  if (!String(j.scope || "").includes(ESCOPO))
    throw new Error(
      "A permissão do Search Console não foi marcada. Conecte de novo e marque a caixa.",
    );
  let email: string | null = null;
  try {
    email = JSON.parse(Buffer.from(String(j.id_token).split(".")[1], "base64url").toString()).email;
  } catch {
    /* sem e-mail: só informativo */
  }
  acesso = { token: j.access_token, expira: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  await gravar({ gsc_refresh: j.refresh_token, gsc_email: email, gsc_erro: null });
  // Propriedade: a que tem o domínio do site
  const sites = await listarSites();
  const { SITE_URL } = await import("./site");
  const host = new URL(SITE_URL).hostname.replace(/^www\./, "");
  const site =
    sites.find((s) => s === `sc-domain:${host}`) ??
    sites.find((s) => s.includes(host)) ??
    sites[0] ??
    null;
  await gravar({ gsc_site: site });
  return { site, sites };
}

export async function desconectar() {
  const c = await ler();
  if (c.gsc_refresh)
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: c.gsc_refresh }),
    }).catch(() => {});
  acesso = null;
  await gravar({ gsc_refresh: null, gsc_email: null, gsc_site: null, gsc_erro: null });
}

let acesso: { token: string; expira: number } | null = null;
async function token() {
  if (acesso && acesso.expira - Date.now() > 60_000) return acesso.token;
  const c = await ler();
  if (!c.gsc_refresh) throw new Error("Search Console não conectado.");
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: c.gsc_refresh,
      grant_type: "refresh_token",
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    const msg =
      j.error === "invalid_grant"
        ? "A autorização do Google expirou ou foi removida. Conecte de novo."
        : `Google: ${j.error_description || j.error || r.status}`;
    await gravar({ gsc_erro: msg });
    throw new Error(msg);
  }
  acesso = { token: j.access_token, expira: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return acesso.token;
}

async function api(caminho: string, corpo?: unknown) {
  const r = await fetch(`${API}${caminho}`, {
    method: corpo ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${await token()}`,
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Search Console: ${j.error?.message || r.status}`);
  return j;
}

export async function listarSites(): Promise<string[]> {
  const j = await api("/webmasters/v3/sites");
  return (j.siteEntry ?? [])
    .filter((s: any) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s: any) => String(s.siteUrl));
}

export async function escolherSite(site: string) {
  const sites = await listarSites();
  if (!sites.includes(site)) throw new Error("Propriedade não encontrada nesta conta.");
  await gravar({ gsc_site: site });
}

// ---------- Importação ----------
type Linha = { keys: string[]; clicks: number; impressions: number; position: number };
const diaIso = (d: Date) => d.toISOString().slice(0, 10);

async function consultar(site: string, ini: string, fim: string, dimensions: string[]) {
  const linhas: Linha[] = [];
  for (let startRow = 0; startRow < 250_000; startRow += 25_000) {
    const j = await api(`/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      startDate: ini,
      endDate: fim,
      dimensions,
      type: "web",
      dataState: "all", // inclui os dias mais recentes (ainda parciais)
      rowLimit: 25_000,
      startRow,
    });
    const rows: Linha[] = j.rows ?? [];
    linhas.push(...rows);
    if (rows.length < 25_000) break;
  }
  return linhas;
}

export type Sitemap = {
  caminho: string;
  enviados: number;
  erros: number;
  avisos: number;
  lido: string | null;
};

let rodando: Promise<unknown> | null = null;
// Importa [hoje - dias, hoje]. Sem "dias": 5 dias se já tem histórico, senão 16 meses.
export function sincronizar(dias?: number) {
  rodando ??= (async () => {
    await garantirTabelasGsc();
    const c = await ler();
    if (!c.gsc_refresh || !c.gsc_site) throw new Error("Search Console não conectado.");
    const site = c.gsc_site;
    const temHistorico = (await prisma.gsc_dia.count()) > 0;
    const n = dias ?? (temHistorico ? 5 : 480);
    const fim = diaIso(new Date());
    const ini = diaIso(new Date(Date.now() - n * 86400000));

    const [porPais, total, consultas, paginas] = await Promise.all([
      consultar(site, ini, fim, ["date", "country"]),
      consultar(site, ini, fim, ["date"]),
      consultar(site, ini, fim, ["date", "country", "query"]),
      consultar(site, ini, fim, ["date", "country", "page"]),
    ]);
    const dias_ = [...new Set(total.map((l) => l.keys[0]))];
    const num = (l: Linha) => ({
      cliques: Math.round(l.clicks),
      impressoes: Math.round(l.impressions),
      pos_soma: l.position * l.impressions,
    });

    // Troca os dias importados (o Google revisa os números dos últimos dias)
    await prisma.$transaction(
      async (tx) => {
        await tx.gsc_dia.deleteMany({ where: { dia: { gte: ini, lte: fim } } });
        await tx.gsc_consulta.deleteMany({ where: { dia: { gte: ini, lte: fim } } });
        await tx.gsc_pagina.deleteMany({ where: { dia: { gte: ini, lte: fim } } });
        await tx.gsc_dia.createMany({
          data: [
            ...total.map((l) => ({ dia: l.keys[0], pais: "*", ...num(l) })),
            ...porPais.map((l) => ({ dia: l.keys[0], pais: l.keys[1].slice(0, 3), ...num(l) })),
          ],
        });
        for (let i = 0; i < consultas.length; i += 2000)
          await tx.gsc_consulta.createMany({
            data: consultas.slice(i, i + 2000).map((l) => ({
              dia: l.keys[0],
              pais: l.keys[1].slice(0, 3),
              consulta: l.keys[2].slice(0, 400),
              ...num(l),
            })),
          });
        for (let i = 0; i < paginas.length; i += 2000)
          await tx.gsc_pagina.createMany({
            data: paginas.slice(i, i + 2000).map((l) => ({
              dia: l.keys[0],
              pais: l.keys[1].slice(0, 3),
              pagina: l.keys[2].slice(0, 600),
              ...num(l),
            })),
          });
      },
      { timeout: 120_000 },
    );

    // Sitemaps: quantas URLs o Google recebeu e se há erros
    let sitemaps: Sitemap[] = [];
    try {
      const j = await api(`/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`);
      sitemaps = (j.sitemap ?? []).map((s: any) => ({
        caminho: String(s.path),
        enviados: (s.contents ?? []).reduce((t: number, x: any) => t + Number(x.submitted || 0), 0),
        erros: Number(s.errors || 0),
        avisos: Number(s.warnings || 0),
        lido: s.lastDownloaded ?? null,
      }));
    } catch {
      /* sitemaps é extra: não derruba a importação */
    }
    await gravar({
      gsc_sync: new Date().toISOString(),
      gsc_erro: null,
      gsc_sitemaps: JSON.stringify(sitemaps),
    });
    return { dias: dias_.length, consultas: consultas.length, paginas: paginas.length };
  })()
    .catch(async (e) => {
      await gravar({ gsc_erro: String(e?.message ?? e).slice(0, 500) }).catch(() => {});
      throw e;
    })
    .finally(() => {
      rodando = null;
    });
  return rodando as Promise<{ dias: number; consultas: number; paginas: number }>;
}

// Agendador: uma importação a cada 12 h
export async function sincronizarSeVencido() {
  const c = await ler();
  if (!c.gsc_refresh || !c.gsc_site) return;
  if (c.gsc_sync && Date.now() - new Date(c.gsc_sync).getTime() < 12 * 3600_000) return;
  await sincronizar();
}

// ---------- Relatório ----------
export type Agregado = { cliques: number; impressoes: number; ctr: number; posicao: number | null };
const agregado = (c: number, i: number, p: number): Agregado => ({
  cliques: c,
  impressoes: i,
  ctr: i ? c / i : 0,
  posicao: i ? p / i : null,
});

export async function relatorio(opc: { dias: number; pais: string }) {
  await garantirTabelasGsc();
  // Último dia com dados (o Google atrasa ~2 dias): os períodos contam a partir dele
  const ultimo = await prisma.gsc_dia.findFirst({ where: { pais: "*" }, orderBy: { dia: "desc" } });
  if (!ultimo) return null;
  const fim = new Date(`${ultimo.dia}T12:00:00Z`);
  const menos = (n: number) => diaIso(new Date(fim.getTime() - n * 86400000));
  const atual = { ini: menos(opc.dias - 1), fim: ultimo.dia };
  const anterior = { ini: menos(opc.dias * 2 - 1), fim: menos(opc.dias) };
  const pais = opc.pais || "*";

  const serie = await prisma.gsc_dia.findMany({
    where: { pais, dia: { gte: anterior.ini, lte: atual.fim } },
    orderBy: { dia: "asc" },
  });
  const soma = (de: string, ate: string) => {
    const r = serie.filter((d) => d.dia >= de && d.dia <= ate);
    return agregado(
      r.reduce((t, d) => t + d.cliques, 0),
      r.reduce((t, d) => t + d.impressoes, 0),
      r.reduce((t, d) => t + d.pos_soma, 0),
    );
  };

  // Buscas e páginas: agrega por termo nos dois períodos
  const filtroPais = pais === "*" ? {} : { pais };
  type Grupo = { c: number; i: number; p: number };
  async function porChave(modelo: "consulta" | "pagina") {
    const linhas =
      modelo === "consulta"
        ? await prisma.gsc_consulta.groupBy({
            by: ["consulta", "dia"],
            where: { ...filtroPais, dia: { gte: anterior.ini, lte: atual.fim } },
            _sum: { cliques: true, impressoes: true, pos_soma: true },
          })
        : await prisma.gsc_pagina.groupBy({
            by: ["pagina", "dia"],
            where: { ...filtroPais, dia: { gte: anterior.ini, lte: atual.fim } },
            _sum: { cliques: true, impressoes: true, pos_soma: true },
          });
    const m = new Map<string, { a: Grupo; b: Grupo }>();
    for (const l of linhas as any[]) {
      const k = String(l.consulta ?? l.pagina);
      const g = m.get(k) ?? { a: { c: 0, i: 0, p: 0 }, b: { c: 0, i: 0, p: 0 } };
      const alvo = l.dia >= atual.ini ? g.a : g.b;
      alvo.c += l._sum.cliques ?? 0;
      alvo.i += l._sum.impressoes ?? 0;
      alvo.p += l._sum.pos_soma ?? 0;
      m.set(k, g);
    }
    return [...m.entries()].map(([chave, g]) => ({
      chave,
      atual: agregado(g.a.c, g.a.i, g.a.p),
      anterior: agregado(g.b.c, g.b.i, g.b.p),
    }));
  }
  const [consultas, paginas, paises] = await Promise.all([
    porChave("consulta"),
    porChave("pagina"),
    prisma.gsc_dia.groupBy({
      by: ["pais"],
      where: { pais: { not: "*" }, dia: { gte: atual.ini, lte: atual.fim } },
      _sum: { cliques: true, impressoes: true, pos_soma: true },
      orderBy: { _sum: { impressoes: "desc" } },
      take: 8,
    }),
  ]);
  return {
    periodo: atual,
    periodoAnterior: anterior,
    atual: soma(atual.ini, atual.fim),
    anterior: soma(anterior.ini, anterior.fim),
    serie: serie
      .filter((d) => d.dia >= atual.ini)
      .map((d) => ({
        dia: d.dia,
        cliques: d.cliques,
        impressoes: d.impressoes,
        posicao: d.impressoes ? d.pos_soma / d.impressoes : null,
      })),
    consultas: consultas.filter((x) => x.atual.impressoes > 0 || x.anterior.impressoes > 0),
    paginas: paginas.filter((x) => x.atual.impressoes > 0 || x.anterior.impressoes > 0),
    paises: paises.map((p) => ({
      pais: p.pais,
      ...agregado(p._sum.cliques ?? 0, p._sum.impressoes ?? 0, p._sum.pos_soma ?? 0),
    })),
    primeiroDia: (await prisma.gsc_dia.findFirst({ where: { pais: "*" }, orderBy: { dia: "asc" } }))
      ?.dia,
  };
}
