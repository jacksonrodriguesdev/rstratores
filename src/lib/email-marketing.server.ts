// E-mail marketing avançado: anúncios por e-mail, cliques por link, análise e funil de remarketing.
// Tabelas novas (email_cliques, email_anuncios, email_anuncio_exibicoes): criadas sozinhas em
// produção, sem tocar nas tabelas que já existem.
import { createHash } from "crypto";

const SQL = [
  `CREATE TABLE IF NOT EXISTS \`email_cliques\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`envio_id\` INTEGER NOT NULL,
    \`campanha_id\` INTEGER NULL,
    \`automacao_id\` INTEGER NULL,
    \`anuncio_id\` INTEGER NULL,
    \`url\` VARCHAR(1000) NOT NULL,
    \`dispositivo\` VARCHAR(20) NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`email_cliques_created_at_idx\`(\`created_at\`),
    INDEX \`email_cliques_campanha_id_idx\`(\`campanha_id\`),
    INDEX \`email_cliques_automacao_id_idx\`(\`automacao_id\`),
    INDEX \`email_cliques_anuncio_id_idx\`(\`anuncio_id\`),
    INDEX \`email_cliques_envio_id_idx\`(\`envio_id\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`email_anuncios\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`nome\` VARCHAR(150) NOT NULL,
    \`titulo\` VARCHAR(200) NOT NULL,
    \`texto\` TEXT NULL,
    \`imagem\` VARCHAR(500) NULL,
    \`link\` VARCHAR(500) NOT NULL,
    \`botao\` VARCHAR(80) NULL,
    \`onde\` VARCHAR(20) NOT NULL DEFAULT 'TODOS',
    \`peso\` INTEGER NOT NULL DEFAULT 1,
    \`ativo\` BOOLEAN NOT NULL DEFAULT false,
    \`inicio\` DATETIME(3) NULL,
    \`fim\` DATETIME(3) NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`email_anuncio_exibicoes\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`anuncio_id\` INTEGER NOT NULL,
    \`resend_id\` VARCHAR(64) NULL,
    \`user_id\` INTEGER NULL,
    \`origem\` VARCHAR(20) NOT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`email_anuncio_exibicoes_anuncio_id_created_at_idx\`(\`anuncio_id\`, \`created_at\`),
    INDEX \`email_anuncio_exibicoes_resend_id_idx\`(\`resend_id\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let tabelas: Promise<void> | null = null;
export function garantirTabelasMarketing() {
  tabelas ??= (async () => {
    const { prisma } = await import("./prisma");
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

// ---------------------------------------------------------------- anúncios
export type OrigemEmail = "CAMPANHA" | "AUTOMACAO";
export type AnuncioRender = {
  id: number;
  titulo: string;
  texto: string | null;
  imagem: string | null;
  link: string;
  botao: string | null;
  peso: number;
};

let memo: { ate: number; lista: Map<OrigemEmail, AnuncioRender[]> } | null = null;
export const limparCacheAnuncios = () => {
  memo = null;
};

// Anúncios no ar para esse tipo de e-mail (ativos e dentro do período)
export async function anunciosAtivos(origem: OrigemEmail): Promise<AnuncioRender[]> {
  if (memo && memo.ate > Date.now()) return memo.lista.get(origem) ?? [];
  await garantirTabelasMarketing();
  const { prisma } = await import("./prisma");
  const agora = new Date();
  const rows = await prisma.email_anuncios.findMany({
    where: {
      ativo: true,
      OR: [{ inicio: null }, { inicio: { lte: agora } }],
      AND: [{ OR: [{ fim: null }, { fim: { gt: agora } }] }],
    },
    orderBy: { id: "asc" },
  });
  const lista = new Map<OrigemEmail, AnuncioRender[]>();
  for (const o of ["CAMPANHA", "AUTOMACAO"] as const)
    lista.set(
      o,
      rows
        .filter((r) => r.onde === "TODOS" || r.onde === `${o}S`)
        .map((r) => ({
          id: r.id,
          titulo: r.titulo,
          texto: r.texto,
          imagem: r.imagem,
          link: r.link,
          botao: r.botao,
          peso: Math.max(1, r.peso),
        })),
    );
  memo = { ate: Date.now() + 30_000, lista };
  return lista.get(origem) ?? [];
}

// Rodízio por peso, sempre o mesmo anúncio para o mesmo cliente no mesmo dia (sem "piscar")
export function escolherAnuncio(lista: AnuncioRender[], chave: string | number) {
  if (!lista.length) return null;
  const total = lista.reduce((s, a) => s + a.peso, 0);
  const dia = new Date().toISOString().slice(0, 10);
  const h = createHash("sha1").update(`${chave}:${dia}`).digest().readUInt32BE(0) % total;
  let acc = 0;
  for (const a of lista) {
    acc += a.peso;
    if (h < acc) return a;
  }
  return lista[0];
}

export async function registrarExibicoes(
  rows: Array<{
    anuncio_id: number;
    resend_id: string | null;
    user_id: number | null;
    origem: OrigemEmail;
  }>,
) {
  if (!rows.length) return;
  await garantirTabelasMarketing();
  const { prisma } = await import("./prisma");
  await prisma.email_anuncio_exibicoes.createMany({ data: rows });
}

// ---------------------------------------------------------------- cliques (webhook do Resend)
export function dispositivo(ua: string | null | undefined) {
  if (!ua) return null;
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "celular";
  return "computador";
}
// Link do anúncio leva utm_content=anuncio-<id>
export function anuncioDoLink(url: string) {
  const m = /[?&]utm_content=anuncio-(\d+)/.exec(url);
  return m ? Number(m[1]) : null;
}
export async function registrarClique(
  envio: { id: number; campanha_id: number | null; automacao_id: number | null },
  url: string,
  ua?: string | null,
) {
  if (!url) return;
  await garantirTabelasMarketing();
  const { prisma } = await import("./prisma");
  await prisma.email_cliques.create({
    data: {
      envio_id: envio.id,
      campanha_id: envio.campanha_id,
      automacao_id: envio.automacao_id,
      anuncio_id: anuncioDoLink(url),
      url: url.slice(0, 1000),
      dispositivo: dispositivo(ua),
    },
  });
}

// ---------------------------------------------------------------- análise e funil
const TIPOS_ENVIO = ["CAMPANHA", "AUTOMACAO", "CARRINHO"];
const DIA = 86_400_000;
// Janelas de atribuição: visita e WhatsApp até 7 dias depois do e-mail; compra até 14 dias
export const JANELA = { visita: 7 * DIA, whatsapp: 7 * DIA, compra: 14 * DIA };

export type Filtro = { campanha?: number | null; automacao?: number | null; dias?: number };

type Envio = {
  id: number;
  campanha_id: number | null;
  automacao_id: number | null;
  user_id: number | null;
  status: string;
  created_at: Date;
  aberto_em: Date | null;
  clicado_em: Date | null;
};

async function envios(f: Filtro): Promise<Envio[]> {
  const { prisma } = await import("./prisma");
  const where: any = { tipo: { in: TIPOS_ENVIO }, status: { not: "FALHA" } };
  if (f.dias) where.created_at = { gte: new Date(Date.now() - f.dias * DIA) };
  if (f.campanha) where.campanha_id = f.campanha;
  if (f.automacao) where.automacao_id = f.automacao;
  return prisma.email_envios.findMany({
    where,
    select: {
      id: true,
      campanha_id: true,
      automacao_id: true,
      user_id: true,
      status: true,
      created_at: true,
      aberto_em: true,
      clicado_em: true,
    },
    orderBy: { id: "asc" },
  });
}

// O que cada e-mail gerou depois: visita ao site vinda de e-mail, WhatsApp e compra (por cliente)
async function atribuir(lista: Envio[]) {
  const { prisma } = await import("./prisma");
  const ids = [...new Set(lista.map((e) => e.user_id).filter((x): x is number => !!x))];
  const res = new Map<
    number,
    { visitou: boolean; whatsapp: boolean; comprou: boolean; receita: Record<string, number> }
  >();
  if (!ids.length) return res;
  const desde = new Date(Math.min(...lista.map((e) => e.created_at.getTime())));
  const [visitas, zaps, compras] = await Promise.all([
    prisma.site_visits.findMany({
      where: { user_id: { in: ids }, created_at: { gte: desde }, utm_source: "email" },
      select: { user_id: true, created_at: true },
    }),
    prisma.site_eventos.findMany({
      where: { user_id: { in: ids }, created_at: { gte: desde }, tipo: "whatsapp" },
      select: { user_id: true, created_at: true },
    }),
    prisma.links_pagamento.findMany({
      where: { user_id: { in: ids }, status: "PAGO", pago_em: { gte: desde } },
      select: { user_id: true, pago_em: true, total: true, moeda: true },
    }),
  ]);
  const porUser = <T extends { user_id: number | null }>(xs: T[]) => {
    const m = new Map<number, T[]>();
    for (const x of xs)
      if (x.user_id) (m.get(x.user_id) ?? m.set(x.user_id, []).get(x.user_id)!).push(x);
    return m;
  };
  const V = porUser(visitas),
    W = porUser(zaps),
    C = porUser(compras);
  const dentro = (t: Date | null, ini: Date, janela: number) =>
    !!t && t.getTime() >= ini.getTime() && t.getTime() <= ini.getTime() + janela;
  for (const e of lista) {
    if (!e.user_id) continue;
    const comp = (C.get(e.user_id) ?? []).filter((c) =>
      dentro(c.pago_em, e.created_at, JANELA.compra),
    );
    const receita: Record<string, number> = {};
    for (const c of comp) receita[c.moeda] = (receita[c.moeda] ?? 0) + c.total / 100;
    res.set(e.id, {
      visitou: (V.get(e.user_id) ?? []).some((v) =>
        dentro(v.created_at, e.created_at, JANELA.visita),
      ),
      whatsapp: (W.get(e.user_id) ?? []).some((w) =>
        dentro(w.created_at, e.created_at, JANELA.whatsapp),
      ),
      comprou: comp.length > 0,
      receita,
    });
  }
  return res;
}

const entregue = (e: Envio) =>
  ["ENTREGUE", "ABERTO", "CLICADO"].includes(e.status) || !!e.aberto_em;

function contar(lista: Envio[], at: Awaited<ReturnType<typeof atribuir>>) {
  let entregues = 0,
    abertos = 0,
    clicados = 0,
    visitaram = 0,
    whatsapp = 0,
    compraram = 0,
    rebotes = 0;
  const receita: Record<string, number> = {};
  for (const e of lista) {
    if (entregue(e)) entregues++;
    if (e.aberto_em) abertos++;
    if (e.clicado_em) clicados++;
    if (e.status === "REBOTADO" || e.status === "QUEIXA") rebotes++;
    const a = at.get(e.id);
    if (a?.visitou) visitaram++;
    if (a?.whatsapp) whatsapp++;
    if (a?.comprou) {
      compraram++;
      for (const [m, v] of Object.entries(a.receita)) receita[m] = (receita[m] ?? 0) + v;
    }
  }
  return {
    enviados: lista.length,
    entregues,
    abertos,
    clicados,
    visitaram,
    whatsapp,
    compraram,
    rebotes,
    receita,
  };
}

const diaUY = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Montevideo" });
const horaUY = (d: Date) =>
  Number(
    d.toLocaleString("en-US", { timeZone: "America/Montevideo", hour: "2-digit", hour12: false }),
  ) % 24;
const semanaUY = (d: Date) =>
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    d.toLocaleDateString("en-US", { timeZone: "America/Montevideo", weekday: "short" }),
  );

export async function resumoEmails(dias: number) {
  await garantirTabelasMarketing();
  const { prisma } = await import("./prisma");
  const lista = await envios({ dias });
  const at = await atribuir(lista);
  const total = contar(lista, at);

  // Por dia (coorte do dia do envio)
  const porDia = new Map<string, { enviados: number; abertos: number; clicados: number }>();
  for (let k = dias - 1; k >= 0; k--)
    porDia.set(diaUY(new Date(Date.now() - k * DIA)), { enviados: 0, abertos: 0, clicados: 0 });
  for (const e of lista) {
    const d = porDia.get(diaUY(e.created_at));
    if (!d) continue;
    d.enviados++;
    if (e.aberto_em) d.abertos++;
    if (e.clicado_em) d.clicados++;
  }
  // Melhor horário e dia da semana para abrir
  const horas = Array(24).fill(0);
  const semana = Array(7).fill(0);
  for (const e of lista)
    if (e.aberto_em) {
      horas[horaUY(e.aberto_em)]++;
      semana[semanaUY(e.aberto_em)]++;
    }

  // Ranking por campanha e por automação
  const grupos = new Map<string, Envio[]>();
  for (const e of lista) {
    const k = e.campanha_id
      ? `c${e.campanha_id}`
      : e.automacao_id
        ? `a${e.automacao_id}`
        : "outros";
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(e);
  }
  const [camps, autos] = await Promise.all([
    prisma.email_campanhas.findMany({
      where: { id: { in: lista.map((e) => e.campanha_id).filter((x): x is number => !!x) } },
      select: { id: true, nome: true },
    }),
    prisma.email_automacoes.findMany({
      where: { id: { in: lista.map((e) => e.automacao_id).filter((x): x is number => !!x) } },
      select: { id: true, nome: true, tipo: true },
    }),
  ]);
  const nome = (k: string) =>
    k.startsWith("c")
      ? (camps.find((c) => `c${c.id}` === k)?.nome ?? "Campanha")
      : k.startsWith("a")
        ? (autos.find((a) => `a${a.id}` === k)?.nome ?? "Automação")
        : "Lembrete de carrinho";
  const ranking = [...grupos]
    .map(([k, es]) => ({
      chave: k,
      tipo: k.startsWith("c") ? "campanha" : k.startsWith("a") ? "automacao" : "outros",
      id: k === "outros" ? null : Number(k.slice(1)),
      nome: nome(k),
      ...contar(es, at),
    }))
    .sort((a, b) => b.enviados - a.enviados);

  // Cliques por link e por aparelho
  const cliques = await prisma.email_cliques.findMany({
    where: { created_at: { gte: new Date(Date.now() - dias * DIA) } },
    select: { url: true, dispositivo: true, anuncio_id: true },
  });
  const limpa = (u: string) => {
    try {
      const x = new URL(u);
      for (const p of [...x.searchParams.keys()])
        if (p.startsWith("utm_")) x.searchParams.delete(p);
      return x.toString().replace(/\?$/, "");
    } catch {
      return u;
    }
  };
  const links = new Map<string, { url: string; cliques: number; anuncio: boolean }>();
  const aparelhos: Record<string, number> = {};
  for (const c of cliques) {
    const u = limpa(c.url);
    // Clique no anúncio fica separado do mesmo link clicado no corpo do e-mail
    const k = c.anuncio_id ? `anuncio-${c.anuncio_id}:${u}` : u;
    const l = links.get(k) ?? links.set(k, { url: u, cliques: 0, anuncio: !!c.anuncio_id }).get(k)!;
    l.cliques++;
    const d = c.dispositivo ?? "desconhecido";
    aparelhos[d] = (aparelhos[d] ?? 0) + 1;
  }
  return {
    dias,
    total,
    serie: [...porDia].map(([dia, v]) => ({ dia, ...v })),
    horas,
    semana,
    ranking,
    links: [...links.values()].sort((a, b) => b.cliques - a.cliques).slice(0, 15),
    aparelhos,
    cliquesRegistrados: cliques.length,
  };
}

export type Etapa = "nao_abriu" | "abriu_nao_clicou" | "clicou_nao_comprou";

export async function funilEmails(f: Filtro) {
  await garantirTabelasMarketing();
  const lista = await envios(f);
  const at = await atribuir(lista);
  const c = contar(lista, at);
  // Segmentos de remarketing (clientes únicos, só quem ainda aceita e-mails entra no envio)
  const seg = await segmentos(lista, at);
  return {
    etapas: [
      { k: "enviados", v: c.enviados },
      { k: "entregues", v: c.entregues },
      { k: "abertos", v: c.abertos },
      { k: "clicados", v: c.clicados },
      { k: "visitaram", v: c.visitaram },
      { k: "whatsapp", v: c.whatsapp },
      { k: "compraram", v: c.compraram },
    ],
    receita: c.receita,
    rebotes: c.rebotes,
    segmentos: Object.fromEntries(Object.entries(seg).map(([k, v]) => [k, v.length])) as Record<
      Etapa,
      number
    >,
  };
}

async function segmentos(lista: Envio[], at: Awaited<ReturnType<typeof atribuir>>) {
  const porUser = new Map<number, { abriu: boolean; clicou: boolean; comprou: boolean }>();
  for (const e of lista) {
    if (!e.user_id) continue;
    const u = porUser.get(e.user_id) ?? { abriu: false, clicou: false, comprou: false };
    u.abriu ||= !!e.aberto_em;
    u.clicou ||= !!e.clicado_em;
    u.comprou ||= !!at.get(e.id)?.comprou;
    porUser.set(e.user_id, u);
  }
  const out: Record<Etapa, number[]> = {
    nao_abriu: [],
    abriu_nao_clicou: [],
    clicou_nao_comprou: [],
  };
  for (const [id, u] of porUser) {
    if (!u.abriu) out.nao_abriu.push(id);
    else if (!u.clicou) out.abriu_nao_clicou.push(id);
    else if (!u.comprou) out.clicou_nao_comprou.push(id);
  }
  return out;
}

// Clientes de um segmento (público «remarketing» das campanhas)
export async function idsSegmento(f: Filtro, etapa: Etapa): Promise<number[]> {
  const lista = await envios({ campanha: f.campanha, automacao: f.automacao });
  const at = await atribuir(lista);
  return (await segmentos(lista, at))[etapa] ?? [];
}

// Números de cada anúncio: exibições (e-mails com o anúncio), aberturas e cliques
export async function estatisticasAnuncios() {
  await garantirTabelasMarketing();
  const { prisma } = await import("./prisma");
  const [exib, cliques] = await Promise.all([
    prisma.email_anuncio_exibicoes.findMany({ select: { anuncio_id: true, resend_id: true } }),
    prisma.email_cliques.groupBy({
      by: ["anuncio_id"],
      _count: true,
      where: { anuncio_id: { not: null } },
    }),
  ]);
  const resendIds = exib.map((e) => e.resend_id).filter((x): x is string => !!x);
  const abertos = new Set(
    (
      await prisma.email_envios.findMany({
        where: { resend_id: { in: resendIds }, aberto_em: { not: null } },
        select: { resend_id: true },
      })
    ).map((e) => e.resend_id),
  );
  const st = new Map<number, { exibicoes: number; abertos: number; cliques: number }>();
  for (const e of exib) {
    const s = st.get(e.anuncio_id) ?? { exibicoes: 0, abertos: 0, cliques: 0 };
    s.exibicoes++;
    if (e.resend_id && abertos.has(e.resend_id)) s.abertos++;
    st.set(e.anuncio_id, s);
  }
  for (const c of cliques) {
    if (!c.anuncio_id) continue;
    const s = st.get(c.anuncio_id) ?? { exibicoes: 0, abertos: 0, cliques: 0 };
    s.cliques += c._count;
    st.set(c.anuncio_id, s);
  }
  return Object.fromEntries(st);
}
