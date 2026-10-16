// Central de Anúncios: Google Ads + Meta Ads num painel só.
// - Importa campanhas e números por dia das duas plataformas (a cada 3 h; a primeira vez, 90 dias).
// - Cruza com o que o site registra: visitas, pedidos pelo WhatsApp e vendas fechadas (carrinho
//   "Ganho" ou link pago), atribuídos à campanha pela UTM da visita (utm_campaign = ID ou nome).
// - Pausar/ativar campanha e mudar o orçamento diário, com registro em ads_acao.
// Tráfego pago é só para o Uruguai: os valores totais saem em $U.
import { prisma } from "./prisma";
import * as meta from "./ads-meta.server";
import * as google from "./ads-google.server";
import { sqlHumano } from "./rastreio.server";
import type { CampanhaApi, DiaApi } from "./ads-meta.server";

export type Plataforma = "GOOGLE" | "META";

// ---------- Tabelas (produção não roda "prisma db push") ----------
const SQL = [
  `CREATE TABLE IF NOT EXISTS \`ads_campanha\` (
    \`plataforma\` VARCHAR(10) NOT NULL,
    \`id_externo\` VARCHAR(40) NOT NULL,
    \`nome\` VARCHAR(300) NOT NULL,
    \`status\` VARCHAR(20) NOT NULL,
    \`status_origem\` VARCHAR(40) NULL,
    \`orcamento_diario\` DOUBLE NULL,
    \`orcamento_ref\` VARCHAR(200) NULL,
    \`orcamento_compartilhado\` BOOLEAN NOT NULL DEFAULT false,
    \`objetivo\` VARCHAR(60) NULL,
    \`moeda\` VARCHAR(3) NOT NULL,
    \`atualizado_em\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`plataforma\`, \`id_externo\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`ads_dia\` (
    \`plataforma\` VARCHAR(10) NOT NULL,
    \`id_externo\` VARCHAR(40) NOT NULL,
    \`dia\` VARCHAR(10) NOT NULL,
    \`gasto\` DOUBLE NOT NULL DEFAULT 0,
    \`impressoes\` INTEGER NOT NULL DEFAULT 0,
    \`cliques\` INTEGER NOT NULL DEFAULT 0,
    \`conversoes\` DOUBLE NOT NULL DEFAULT 0,
    \`valor_conv\` DOUBLE NOT NULL DEFAULT 0,
    \`leads\` DOUBLE NOT NULL DEFAULT 0,
    INDEX \`ads_dia_dia_idx\`(\`dia\`),
    PRIMARY KEY (\`plataforma\`, \`id_externo\`, \`dia\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`ads_acao\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`plataforma\` VARCHAR(10) NOT NULL,
    \`id_externo\` VARCHAR(40) NOT NULL,
    \`nome\` VARCHAR(300) NOT NULL,
    \`acao\` VARCHAR(20) NOT NULL,
    \`de\` VARCHAR(60) NULL,
    \`para\` VARCHAR(60) NULL,
    \`admin_id\` INTEGER NULL,
    \`ok\` BOOLEAN NOT NULL DEFAULT false,
    \`erro\` TEXT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`ads_acao_created_at_idx\`(\`created_at\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let tabelas: Promise<void> | null = null;
export function garantirTabelasAds() {
  tabelas ??= (async () => {
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

// ---------- Estado de cada plataforma (configuracoes ads_*) ----------
async function lerEstado() {
  const rows = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "ads_" } } });
  return Object.fromEntries(rows.map((r) => [r.chave, r.valor])) as Record<string, string>;
}
async function gravar(v: Record<string, string | null>) {
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

export async function estadoAds() {
  const e = await lerEstado();
  const conta = (p: string) => {
    try {
      return JSON.parse(e[`ads_conta_${p}`] || "null") as { nome: string; moeda: string } | null;
    } catch {
      return null;
    }
  };
  const g = await google.estadoGoogleAds();
  return {
    google: {
      ...g,
      conta: conta("google"),
      ultimaSync: e.ads_sync_google || null,
      erro: e.ads_erro_google || null,
    },
    meta: {
      pronto: await meta.metaConfigurado(),
      conta: conta("meta"),
      ultimaSync: e.ads_sync_meta || null,
      erro: e.ads_erro_meta || null,
    },
  };
}

// ---------- Câmbio para $U ----------
const memoTaxa = new Map<string, { v: number; em: number }>();
export async function taxaUYU(moeda: string): Promise<number | null> {
  const m = moeda.toUpperCase();
  if (m === "UYU") return 1;
  const c = memoTaxa.get(m);
  if (c && Date.now() - c.em < 3600_000) return c.v;
  let v: number | null = null;
  if (m === "BRL") {
    const { configPrecos } = await import("./precos.server");
    v = (await configPrecos().catch(() => null))?.cotacao ?? null;
  } else {
    const par = `${m}_UYU`;
    const ultima = await prisma.cotacoes.findFirst({
      where: { par },
      orderBy: { created_at: "desc" },
    });
    if (ultima && Date.now() - ultima.created_at.getTime() < 12 * 3600_000) v = ultima.valor;
    else {
      try {
        const r = await fetch(`https://open.er-api.com/v6/latest/${m}`, {
          signal: AbortSignal.timeout(8000),
        });
        const j: any = await r.json();
        const x = Number(j?.rates?.UYU);
        if (x > 0) {
          v = x;
          await prisma.cotacoes.create({ data: { par, valor: x, fonte: "open.er-api.com" } });
        }
      } catch {
        v = ultima?.valor ?? null;
      }
    }
  }
  if (v) memoTaxa.set(m, { v, em: Date.now() });
  return v;
}

// ---------- Importação ----------
const diaIso = (d: Date) => d.toISOString().slice(0, 10);
const API: Record<
  Plataforma,
  {
    pronto: () => Promise<boolean>;
    conta: () => Promise<{ nome: string; moeda: string }>;
    campanhas: () => Promise<CampanhaApi[]>;
    dias: (ini: string, fim: string) => Promise<DiaApi[]>;
  }
> = {
  META: {
    pronto: meta.metaConfigurado,
    conta: meta.contaMeta,
    campanhas: meta.campanhasMeta,
    dias: meta.diasMeta,
  },
  GOOGLE: {
    pronto: async () => (await google.estadoGoogleAds()).pronto,
    conta: google.contaGoogle,
    campanhas: google.campanhasGoogle,
    dias: google.diasGoogle,
  },
};

async function gravarCampanhas(p: Plataforma, lista: CampanhaApi[], moeda: string) {
  for (const c of lista)
    await prisma.ads_campanha.upsert({
      where: { plataforma_id_externo: { plataforma: p, id_externo: c.id } },
      create: {
        plataforma: p,
        id_externo: c.id,
        nome: c.nome.slice(0, 300),
        status: c.status,
        status_origem: c.statusOrigem.slice(0, 40),
        orcamento_diario: c.orcamentoDiario,
        orcamento_ref: c.orcamentoRef,
        orcamento_compartilhado: c.compartilhado,
        objetivo: c.objetivo,
        moeda,
      },
      update: {
        nome: c.nome.slice(0, 300),
        status: c.status,
        status_origem: c.statusOrigem.slice(0, 40),
        orcamento_diario: c.orcamentoDiario,
        orcamento_ref: c.orcamentoRef,
        orcamento_compartilhado: c.compartilhado,
        objetivo: c.objetivo,
        moeda,
      },
    });
  // Campanha que sumiu da lista foi removida na plataforma
  await prisma.ads_campanha.updateMany({
    where: {
      plataforma: p,
      id_externo: { notIn: lista.map((c) => c.id) },
      status: { not: "REMOVIDA" },
    },
    data: { status: "REMOVIDA" },
  });
}

export type ResultadoSync = {
  campanhas?: number;
  linhas?: number;
  pulado?: boolean;
  erro?: string;
};
const rodando = new Map<Plataforma, Promise<ResultadoSync>>();
export function sincronizarPlataforma(p: Plataforma, dias?: number): Promise<ResultadoSync> {
  if (rodando.has(p)) return rodando.get(p)!;
  const chave = p.toLowerCase();
  const tarefa = (async (): Promise<ResultadoSync> => {
    await garantirTabelasAds();
    if (!(await API[p].pronto())) return { pulado: true };
    const conta = await API[p].conta();
    const campanhas = await API[p].campanhas();
    await gravarCampanhas(p, campanhas, conta.moeda);
    const temHistorico = (await prisma.ads_dia.count({ where: { plataforma: p } })) > 0;
    const n = dias ?? (temHistorico ? 7 : 90); // as plataformas revisam conversões dos últimos dias
    const fim = diaIso(new Date());
    const ini = diaIso(new Date(Date.now() - n * 86400000));
    const linhas = await API[p].dias(ini, fim);
    await prisma.$transaction(async (tx) => {
      await tx.ads_dia.deleteMany({ where: { plataforma: p, dia: { gte: ini, lte: fim } } });
      if (linhas.length)
        await tx.ads_dia.createMany({
          data: linhas.map((l) => ({
            plataforma: p,
            id_externo: l.id,
            dia: l.dia,
            gasto: l.gasto,
            impressoes: l.impressoes,
            cliques: l.cliques,
            conversoes: l.conversoes,
            valor_conv: l.valorConv,
            leads: l.leads,
          })),
          skipDuplicates: true,
        });
    });
    await gravar({
      [`ads_sync_${chave}`]: new Date().toISOString(),
      [`ads_erro_${chave}`]: null,
      [`ads_conta_${chave}`]: JSON.stringify(conta),
    });
    return { campanhas: campanhas.length, linhas: linhas.length };
  })()
    .catch(async (e) => {
      await gravar({ [`ads_erro_${chave}`]: String(e?.message ?? e).slice(0, 500) }).catch(
        () => {},
      );
      throw e;
    })
    .finally(() => rodando.delete(p));
  rodando.set(p, tarefa);
  return tarefa;
}

export async function sincronizarAds() {
  const r: Record<string, ResultadoSync> = {};
  for (const p of ["META", "GOOGLE"] as Plataforma[])
    r[p] = await sincronizarPlataforma(p).catch((e) => ({ erro: String(e?.message ?? e) }));
  return r;
}

// Agendador: a cada 3 h
export async function sincronizarAdsSeVencido() {
  const e = await lerEstado();
  for (const p of ["META", "GOOGLE"] as Plataforma[]) {
    const ultima = e[`ads_sync_${p.toLowerCase()}`];
    if (ultima && Date.now() - new Date(ultima).getTime() < 3 * 3600_000) continue;
    await sincronizarPlataforma(p).catch((err) => console.error(`ads ${p}:`, err?.message ?? err));
  }
}

// ---------- Ações (pausar / ativar / orçamento) ----------
async function registrar(d: {
  plataforma: Plataforma;
  id: string;
  nome: string;
  acao: string;
  de?: string | null;
  para?: string | null;
  adminId: number;
  ok: boolean;
  erro?: string | null;
}) {
  await prisma.ads_acao.create({
    data: {
      plataforma: d.plataforma,
      id_externo: d.id,
      nome: d.nome.slice(0, 300),
      acao: d.acao,
      de: d.de?.slice(0, 60) ?? null,
      para: d.para?.slice(0, 60) ?? null,
      admin_id: d.adminId,
      ok: d.ok,
      erro: d.erro?.slice(0, 2000) ?? null,
    },
  });
}

async function campanha(p: Plataforma, id: string) {
  await garantirTabelasAds();
  const c = await prisma.ads_campanha.findUnique({
    where: { plataforma_id_externo: { plataforma: p, id_externo: id } },
  });
  if (!c) throw new Error("Campanha não encontrada. Atualize os dados.");
  return c;
}

export async function alterarStatus(p: Plataforma, id: string, ativa: boolean, adminId: number) {
  const c = await campanha(p, id);
  if (c.status === "REMOVIDA") throw new Error("Campanha removida não pode ser ativada.");
  const de = c.status;
  const para = ativa ? "ATIVA" : "PAUSADA";
  try {
    if (p === "META") await meta.statusMeta(id, ativa);
    else await google.statusGoogle(id, ativa);
    await prisma.ads_campanha.update({
      where: { plataforma_id_externo: { plataforma: p, id_externo: id } },
      data: {
        status: para,
        status_origem: ativa ? (p === "META" ? "ACTIVE" : "ENABLED") : "PAUSED",
      },
    });
    await registrar({
      plataforma: p,
      id,
      nome: c.nome,
      acao: ativa ? "ATIVAR" : "PAUSAR",
      de,
      para,
      adminId,
      ok: true,
    });
  } catch (e: any) {
    await registrar({
      plataforma: p,
      id,
      nome: c.nome,
      acao: ativa ? "ATIVAR" : "PAUSAR",
      de,
      para,
      adminId,
      ok: false,
      erro: String(e?.message ?? e),
    });
    throw e;
  }
}

export async function alterarOrcamento(
  p: Plataforma,
  id: string,
  valor: number,
  adminId: number,
  confirmarAlto = false,
) {
  const c = await campanha(p, id);
  if (!(valor > 0) || valor > 1e9) throw new Error("Orçamento inválido.");
  if (c.orcamento_diario == null)
    throw new Error(
      p === "META"
        ? "Esta campanha usa orçamento nos conjuntos de anúncios (ou vitalício): mude no Gerenciador de Anúncios."
        : "Esta campanha não tem orçamento diário editável.",
    );
  if (p === "GOOGLE" && !c.orcamento_ref)
    throw new Error("Orçamento sem referência. Atualize os dados.");
  // Freio de segurança: mais de 3× (ou menos de 1/3) do atual pede confirmação dupla
  const fator = valor / c.orcamento_diario;
  if (!confirmarAlto && (fator > 3 || fator < 1 / 3))
    throw new Error(
      `CONFIRMAR: o novo orçamento é ${fator > 1 ? `${fator.toFixed(1)}× maior` : "menos de 1/3"} que o atual.`,
    );
  const de = `${c.orcamento_diario} ${c.moeda}`;
  const para = `${valor} ${c.moeda}`;
  try {
    if (p === "META") await meta.orcamentoMeta(id, valor);
    else await google.orcamentoGoogle(c.orcamento_ref!, valor);
    // Orçamento compartilhado (Google): todas as campanhas que o usam mudam juntas
    await prisma.ads_campanha.updateMany({
      where:
        p === "GOOGLE"
          ? { plataforma: p, orcamento_ref: c.orcamento_ref }
          : { plataforma: p, id_externo: id },
      data: { orcamento_diario: valor },
    });
    await registrar({
      plataforma: p,
      id,
      nome: c.nome,
      acao: "ORCAMENTO",
      de,
      para,
      adminId,
      ok: true,
    });
  } catch (e: any) {
    await registrar({
      plataforma: p,
      id,
      nome: c.nome,
      acao: "ORCAMENTO",
      de,
      para,
      adminId,
      ok: false,
      erro: String(e?.message ?? e),
    });
    throw e;
  }
}

// ---------- Relatório ----------
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_\-+]+/g, " ")
    .trim();

export type LinhaCampanha = {
  plataforma: Plataforma;
  id: string;
  nome: string;
  status: string;
  objetivo: string | null;
  moeda: string;
  orcamentoDiario: number | null;
  orcamentoEditavel: boolean;
  compartilhado: boolean;
  gasto: number; // moeda da conta
  gastoUYU: number | null;
  impressoes: number;
  cliques: number;
  leadsPlataforma: number;
  comprasPlataforma: number;
  visitasSite: number;
  leadsSite: number;
  vendasSite: number;
  receitaSite: number; // $U
};

export async function relatorioAds(dias: number) {
  await garantirTabelasAds();
  const fim = new Date();
  const ini = new Date(fim.getTime() - (dias - 1) * 86400000);
  const iniAnt = new Date(ini.getTime() - dias * 86400000);
  const d = { ini: diaIso(ini), fim: diaIso(fim), iniAnt: diaIso(iniAnt) };

  const [campanhas, numeros, anteriores] = await Promise.all([
    prisma.ads_campanha.findMany(),
    prisma.ads_dia.groupBy({
      by: ["plataforma", "id_externo"],
      where: { dia: { gte: d.ini, lte: d.fim } },
      _sum: {
        gasto: true,
        impressoes: true,
        cliques: true,
        conversoes: true,
        valor_conv: true,
        leads: true,
      },
    }),
    prisma.ads_dia.groupBy({
      by: ["plataforma", "id_externo"],
      where: { dia: { gte: d.iniAnt, lt: d.ini } },
      _sum: { gasto: true, leads: true, cliques: true },
    }),
  ]);
  const serieBruta = await prisma.ads_dia.groupBy({
    by: ["plataforma", "dia"],
    where: { dia: { gte: d.ini, lte: d.fim } },
    _sum: { gasto: true, cliques: true },
    orderBy: { dia: "asc" },
  });

  // Câmbio por moeda das contas
  const moedas = [...new Set(campanhas.map((c) => c.moeda))];
  const taxas = new Map<string, number | null>();
  for (const m of moedas) taxas.set(m, await taxaUYU(m).catch(() => null));
  const moedaDe = (p: string) => campanhas.find((c) => c.plataforma === p)?.moeda ?? "UYU";
  const emUYU = (v: number, moeda: string) => {
    const t = taxas.get(moeda);
    return t ? v * t : null;
  };

  // O que o site registrou, por utm_campaign
  const desde = new Date(`${d.ini}T00:00:00-03:00`);
  const [visitas, leads] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ utm: string; n: bigint }>>(
      `SELECT utm_campaign utm, COUNT(DISTINCT session_id) n FROM site_visits
       WHERE created_at >= ? AND utm_campaign IS NOT NULL AND utm_campaign <> '' AND ${sqlHumano()} GROUP BY utm_campaign`,
      desde,
    ),
    prisma
      .$queryRawUnsafe<Array<{ utm: string; n: bigint }>>(
        `SELECT utm_campaign utm, COUNT(*) n FROM site_eventos
       WHERE created_at >= ? AND tipo IN ('whatsapp','cotacao') AND utm_campaign IS NOT NULL AND utm_campaign <> ''
       GROUP BY utm_campaign`,
        desde,
      )
      .catch(() => []),
  ]);
  // Vendas fechadas no período: campanha da última visita paga do mesmo visitante (até 30 dias antes)
  const vendas = await prisma.$queryRawUnsafe<
    Array<{ utm: string | null; n: bigint; valor: number }>
  >(
    `SELECT (SELECT v.utm_campaign FROM site_visits v
             WHERE v.visitor_id = c.visitante_id AND v.utm_campaign IS NOT NULL AND v.utm_campaign <> ''
               AND v.created_at <= c.updated_at AND v.created_at >= c.updated_at - INTERVAL 30 DAY
             ORDER BY v.id DESC LIMIT 1) utm,
            COUNT(*) n, SUM(c.valor_fechado) valor
     FROM carrinhos c
     WHERE c.etapa = 'GANHO' AND c.valor_fechado > 0 AND c.updated_at >= ?
     GROUP BY utm`,
    desde,
  );

  const porUtm = new Map<
    string,
    { visitas: number; leads: number; vendas: number; receita: number }
  >();
  const add = (utm: string | null, k: "visitas" | "leads" | "vendas" | "receita", v: number) => {
    if (!utm) return;
    const key = norm(utm);
    const g = porUtm.get(key) ?? { visitas: 0, leads: 0, vendas: 0, receita: 0 };
    g[k] += v;
    porUtm.set(key, g);
  };
  visitas.forEach((x) => add(x.utm, "visitas", Number(x.n)));
  leads.forEach((x) => add(x.utm, "leads", Number(x.n)));
  vendas.forEach((x) => {
    add(x.utm, "vendas", Number(x.n));
    add(x.utm, "receita", Number(x.valor || 0));
  });
  const usados = new Set<string>();
  const doSite = (id: string, nome: string) => {
    const out = { visitas: 0, leads: 0, vendas: 0, receita: 0 };
    for (const k of new Set([norm(id), norm(nome)])) {
      const g = porUtm.get(k);
      if (!g) continue;
      usados.add(k);
      out.visitas += g.visitas;
      out.leads += g.leads;
      out.vendas += g.vendas;
      out.receita += g.receita;
    }
    return out;
  };

  const mapa = new Map(numeros.map((n) => [`${n.plataforma}|${n.id_externo}`, n._sum]));
  const linhas: LinhaCampanha[] = campanhas
    .map((c) => {
      const s = mapa.get(`${c.plataforma}|${c.id_externo}`);
      const site = doSite(c.id_externo, c.nome);
      const gasto = s?.gasto ?? 0;
      return {
        plataforma: c.plataforma as Plataforma,
        id: c.id_externo,
        nome: c.nome,
        status: c.status,
        objetivo: c.objetivo,
        moeda: c.moeda,
        orcamentoDiario: c.orcamento_diario,
        orcamentoEditavel:
          c.status !== "REMOVIDA" &&
          c.orcamento_diario != null &&
          (c.plataforma === "META" || !!c.orcamento_ref),
        compartilhado: c.orcamento_compartilhado,
        gasto,
        gastoUYU: emUYU(gasto, c.moeda),
        impressoes: s?.impressoes ?? 0,
        cliques: s?.cliques ?? 0,
        leadsPlataforma: s?.leads ?? 0,
        comprasPlataforma: s?.conversoes ?? 0,
        visitasSite: site.visitas,
        leadsSite: site.leads,
        vendasSite: site.vendas,
        receitaSite: site.receita,
      };
    })
    // Removida sem gasto no período não interessa
    .filter((l) => l.status !== "REMOVIDA" || l.gasto > 0)
    .sort((a, b) => (b.gastoUYU ?? b.gasto) - (a.gastoUYU ?? a.gasto));

  const somaUYU = (ls: LinhaCampanha[]) =>
    ls.some((l) => l.gasto > 0 && l.gastoUYU == null)
      ? null
      : ls.reduce((t, l) => t + (l.gastoUYU ?? 0), 0);
  const totais = (ls: LinhaCampanha[]) => ({
    gastoUYU: somaUYU(ls),
    impressoes: ls.reduce((t, l) => t + l.impressoes, 0),
    cliques: ls.reduce((t, l) => t + l.cliques, 0),
    leadsPlataforma: ls.reduce((t, l) => t + l.leadsPlataforma, 0),
    leadsSite: ls.reduce((t, l) => t + l.leadsSite, 0),
    vendasSite: ls.reduce((t, l) => t + l.vendasSite, 0),
    receitaSite: ls.reduce((t, l) => t + l.receitaSite, 0),
  });
  const anterior = (p?: string) => {
    const rows = anteriores.filter((a) => !p || a.plataforma === p);
    let gastoUYU: number | null = 0;
    for (const a of rows) {
      const v = emUYU(a._sum.gasto ?? 0, moedaDe(a.plataforma));
      if (v == null && (a._sum.gasto ?? 0) > 0) gastoUYU = null;
      else if (gastoUYU != null) gastoUYU += v ?? 0;
    }
    return {
      gastoUYU,
      cliques: rows.reduce((t, a) => t + (a._sum.cliques ?? 0), 0),
      leadsPlataforma: rows.reduce((t, a) => t + (a._sum.leads ?? 0), 0),
    };
  };

  const serieMap = new Map<string, { dia: string; GOOGLE: number; META: number }>();
  for (const s of serieBruta) {
    const g = serieMap.get(s.dia) ?? { dia: s.dia, GOOGLE: 0, META: 0 };
    g[s.plataforma as Plataforma] = emUYU(s._sum.gasto ?? 0, moedaDe(s.plataforma)) ?? 0;
    serieMap.set(s.dia, g);
  }

  // UTMs com resultado no site que não bateram com nenhuma campanha (nome/ID diferente)
  const soltas = [...porUtm.entries()]
    .filter(([k]) => !usados.has(k))
    .map(([utm, g]) => ({ utm, ...g }))
    .sort((a, b) => b.leads + b.vendas * 10 - (a.leads + a.vendas * 10))
    .slice(0, 20);

  const acoes = await prisma.ads_acao.findMany({ orderBy: { id: "desc" }, take: 30 });
  return {
    periodo: { ini: d.ini, fim: d.fim },
    totais: totais(linhas),
    anterior: anterior(),
    porPlataforma: (["GOOGLE", "META"] as Plataforma[]).map((p) => ({
      plataforma: p,
      moeda: moedaDe(p),
      ...totais(linhas.filter((l) => l.plataforma === p)),
      anterior: anterior(p),
    })),
    serie: [...serieMap.values()],
    campanhas: linhas,
    utmSoltas: soltas,
    taxas: Object.fromEntries(taxas),
    acoes: acoes.map((a) => ({
      id: a.id,
      plataforma: a.plataforma,
      nome: a.nome,
      acao: a.acao,
      de: a.de,
      para: a.para,
      ok: a.ok,
      erro: a.erro,
      quando: a.created_at.toISOString(),
    })),
  };
}
