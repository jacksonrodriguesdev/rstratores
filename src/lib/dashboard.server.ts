// Dashboard do admin (/admin): todos os números do período escolhido, dia a dia, e o mesmo período
// imediatamente anterior para comparar. Fontes:
//  - vendas (Financeiro): faturamento, custo das peças, taxas, frete → lucro bruto (em R$, câmbio
//    da venda, igual ao financeiro.server.ts);
//  - ads_dia: gasto, cliques, impressões e leads do Google Ads e do Meta Ads (sincronizados);
//  - analise_dia (resumo-diario.server.ts): visitas, sessões, WhatsApp, carrinho, cadastros,
//    funil, fontes, aparelhos, horários e peças vistas (só humanos);
//  - email_envios, quotes, users, contatos_whatsapp, avisos_preco.
import { prisma } from "./prisma";

const H = 3600_000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const diaUY = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Montevideo" });

export type SerieDia = {
  dia: string;
  receita: number;
  lucro: number; // lucro bruto (receita − peças − taxas − frete)
  vendas: number;
  ads: number;
  adsGoogle: number;
  adsMeta: number;
  visitas: number;
  visitantes: number;
  sessoes: number;
  whatsapp: number;
  carrinho: number;
  cadastros: number;
  emails: number;
  abertos: number;
  cliques: number;
  cotacoes: number;
  contatos: number;
};
type Chave = Exclude<keyof SerieDia, "dia">;
const CHAVES: Chave[] = [
  "receita",
  "lucro",
  "vendas",
  "ads",
  "adsGoogle",
  "adsMeta",
  "visitas",
  "visitantes",
  "sessoes",
  "whatsapp",
  "carrinho",
  "cadastros",
  "emails",
  "abertos",
  "cliques",
  "cotacoes",
  "contatos",
];
const vazioDia = (dia: string): SerieDia =>
  Object.assign({ dia }, Object.fromEntries(CHAVES.map((k) => [k, 0]))) as unknown as SerieDia;

type Cont = Record<string, number>;
const inc = (m: Cont, k: string, v = 1) => (m[k] = (m[k] ?? 0) + v);
const topo = (m: Cont, n: number) =>
  Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([nome, valor]) => ({ nome, valor: r2(valor) }));

// Conta por dia (horário do Uruguai) direto no MySQL
async function porDia(sql: string, ini: Date, fim: Date): Promise<Map<string, number>> {
  const rows = await prisma
    .$queryRawUnsafe<Array<{ d: string; n: bigint | number }>>(
      sql.replace("{DIA}", "DATE_FORMAT(DATE_SUB(created_at, INTERVAL 3 HOUR), '%Y-%m-%d')"),
      ini,
      fim,
    )
    .catch(() => []);
  return new Map(rows.map((r) => [String(r.d), Number(r.n)]));
}

// Um período: séries por dia + detalhes (só para o período atual)
async function periodo(dias: string[], detalhes: boolean) {
  const { resumosDosDias, inicioDia, hojeLocal } = await import("./resumo-diario.server");
  const { cotacoes, converter } = await import("./financeiro.server");
  const ini = inicioDia(dias[0]);
  const fim = new Date(inicioDia(dias[dias.length - 1]).getTime() + 24 * H);
  const hoje = hojeLocal();
  const diasValidos = dias.filter((d) => d <= hoje);
  const serie = new Map(dias.map((d) => [d, vazioDia(d)]));
  const c = await cotacoes();

  const [resumos, vendas, ads, campanhas, emails, abertos, cliques, cotacoesSite, contatos] =
    await Promise.all([
      diasValidos.length ? resumosDosDias(diasValidos) : Promise.resolve([]),
      prisma.vendas.findMany({
        where: { status: { not: "CANCELADA" }, created_at: { gte: ini, lt: fim } },
        orderBy: { created_at: "desc" },
      }),
      prisma.ads_dia.findMany({ where: { dia: { gte: dias[0], lte: dias[dias.length - 1] } } }),
      prisma.ads_campanha.findMany({ select: { plataforma: true, id_externo: true, moeda: true } }),
      porDia(
        "SELECT {DIA} d, COUNT(*) n FROM email_envios WHERE created_at >= ? AND created_at < ? AND tipo <> 'TESTE' AND status <> 'FALHA' GROUP BY d",
        ini,
        fim,
      ),
      porDia(
        "SELECT {DIA} d, COUNT(*) n FROM email_envios WHERE created_at >= ? AND created_at < ? AND tipo <> 'TESTE' AND aberto_em IS NOT NULL GROUP BY d",
        ini,
        fim,
      ),
      porDia(
        "SELECT {DIA} d, COUNT(*) n FROM email_envios WHERE created_at >= ? AND created_at < ? AND tipo <> 'TESTE' AND clicado_em IS NOT NULL GROUP BY d",
        ini,
        fim,
      ),
      porDia(
        "SELECT {DIA} d, COUNT(*) n FROM quotes WHERE created_at >= ? AND created_at < ? GROUP BY d",
        ini,
        fim,
      ),
      porDia(
        "SELECT {DIA} d, COUNT(*) n FROM contatos_whatsapp WHERE created_at >= ? AND created_at < ? GROUP BY d",
        ini,
        fim,
      ),
    ]);

  // ---- Visitas (resumos diários)
  const fontes: Cont = {};
  const aparelhos: Cont = {};
  const paises: Cont = {};
  const idiomas: Cont = {};
  const skusVistos: Cont = {};
  const horas = Array(24).fill(0);
  const funil = [0, 0, 0, 0, 0]; // sessões, viram peça, carrinho, WhatsApp, cadastro
  let rejeitadas = 0;
  let sessLead = 0;
  let sessMobile = 0;
  for (const r of resumos) {
    const s = serie.get(r.dia);
    if (!s) continue;
    s.visitas = r.visitas;
    s.visitantes = r.visitantes;
    s.sessoes = r.sessoes;
    s.whatsapp = r.whatsapp;
    s.carrinho = r.carrinho;
    s.cadastros = r.cadastros;
    rejeitadas += r.rejeitadas;
    sessLead += r.sessLead ?? 0;
    sessMobile += r.sessMobile ?? 0;
    if (!detalhes) continue;
    for (const k in r.fontes) inc(fontes, k, r.fontes[k]);
    for (const k in r.aparelhos) inc(aparelhos, k, r.aparelhos[k]);
    for (const k in r.paises) inc(paises, k, r.paises[k]);
    for (const k in r.idiomas ?? {}) inc(idiomas, k, r.idiomas[k]);
    for (const k in r.skus) inc(skusVistos, k, r.skus[k].v);
    r.horas.forEach((v, i) => (horas[i] += v));
    for (const k in r.funil) r.funil[k].forEach((v, i) => (funil[i] += v));
  }

  // ---- Vendas (mesma conta do Financeiro)
  const canais: Cont = {};
  const porPais: Record<string, { vendas: number; receita: number }> = {};
  const vendidas: Record<string, { nome: string; qtd: number; receita: number }> = {};
  let semCusto = 0;
  for (const v of vendas) {
    const s = serie.get(diaUY(v.created_at));
    if (!s) continue;
    const cot = v.cotacao_brl ?? c.real;
    const brl = (x: number) => (v.moeda === "BRL" ? x : cot ? x / cot : 0);
    const itens = JSON.parse(v.itens || "[]") as Array<{
      sku: string;
      nome: string;
      qtd: number;
      valor: number;
      custo?: number | null;
    }>;
    const receita = v.total + v.frete_cobrado - v.desconto;
    const custo =
      itens.reduce((t, i) => t + i.qtd * (i.custo ?? 0), 0) +
      (v.taxa_pagamento ?? 0) +
      (v.frete_custo ?? 0);
    semCusto += itens.filter((i) => i.custo == null).length;
    s.vendas++;
    s.receita += brl(receita);
    s.lucro += brl(receita - custo);
    if (!detalhes) continue;
    inc(canais, v.canal || (v.origem === "LINK" ? "LINK" : "OUTRO"), brl(receita));
    const p = (porPais[v.pais === "BR" ? "BR" : "UY"] ??= { vendas: 0, receita: 0 });
    p.vendas++;
    p.receita += brl(receita);
    const fator = v.total ? (v.total - v.desconto) / v.total : 1;
    for (const i of itens) {
      const x = (vendidas[i.sku] ??= { nome: i.nome, qtd: 0, receita: 0 });
      x.qtd += i.qtd;
      x.receita += brl(i.qtd * i.valor * fator);
    }
  }

  // ---- Anúncios (moeda da conta → R$)
  const moeda = new Map(campanhas.map((k) => [`${k.plataforma}|${k.id_externo}`, k.moeda]));
  const plat = {
    GOOGLE: { gasto: 0, cliques: 0, impressoes: 0, leads: 0, conversoes: 0 },
    META: { gasto: 0, cliques: 0, impressoes: 0, leads: 0, conversoes: 0 },
  };
  let semCambio = false;
  for (const a of ads) {
    const s = serie.get(a.dia);
    const p = plat[a.plataforma as "GOOGLE" | "META"];
    if (!s || !p) continue;
    const m = moeda.get(`${a.plataforma}|${a.id_externo}`) ?? "USD";
    const g = converter(a.gasto, m, "BRL", c);
    if (g == null && a.gasto) semCambio = true;
    const gasto = g ?? 0;
    s.ads += gasto;
    if (a.plataforma === "GOOGLE") s.adsGoogle += gasto;
    else s.adsMeta += gasto;
    p.gasto += gasto;
    p.cliques += a.cliques;
    p.impressoes += a.impressoes;
    p.leads += a.leads;
    p.conversoes += a.conversoes;
  }

  // Contagens por dia que vêm direto do MySQL
  const colocar = (m: Map<string, number>, k: Chave) => {
    for (const [d, n] of m) {
      const x = serie.get(d);
      if (x) x[k] = n;
    }
  };
  colocar(emails, "emails");
  colocar(abertos, "abertos");
  colocar(cliques, "cliques");
  colocar(cotacoesSite, "cotacoes");
  colocar(contatos, "contatos");

  const lista = [...serie.values()].map((s) => {
    for (const k of CHAVES) (s as any)[k] = r2((s as any)[k]);
    return s;
  });
  const total = Object.fromEntries(
    CHAVES.map((k) => [k, r2(lista.reduce((t, s) => t + (s[k] as number), 0))]),
  ) as Record<Chave, number>;

  // Visitantes únicos do período inteiro (não é a soma dos dias)
  const { sqlHumano } = await import("./rastreio.server");
  const [u] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(DISTINCT visitor_id) n FROM site_visits WHERE created_at >= ? AND created_at < ? AND visitor_id IS NOT NULL AND ${sqlHumano()}`,
    ini,
    fim,
  );

  // Nomes das peças mais vistas
  const vistasTop = detalhes ? topo(skusVistos, 6) : [];
  const nomesVistas = vistasTop.length
    ? await prisma.agricolas.findMany({
        where: { sku: { in: vistasTop.map((x) => x.nome) } },
        select: { sku: true, nome: true, nome_es: true },
      })
    : [];
  const nomeVista = new Map(nomesVistas.map((p) => [p.sku.trim(), p.nome_es || p.nome]));

  return {
    serie: lista,
    total: {
      ...total,
      unicos: Number(u?.n ?? 0),
      rejeitadas,
      sessLead,
      sessMobile,
    },
    ads: plat,
    semCambio,
    semCusto,
    detalhe: detalhes
      ? {
          fontes: topo(fontes, 8),
          aparelhos: topo(aparelhos, 4),
          paises: topo(paises, 6),
          idiomas: topo(idiomas, 3),
          horas,
          funil,
          canais: topo(canais, 8),
          porPais: Object.entries(porPais).map(([pais, x]) => ({
            pais,
            vendas: x.vendas,
            receita: r2(x.receita),
          })),
          vendidas: Object.entries(vendidas)
            .sort((a, b) => b[1].receita - a[1].receita)
            .slice(0, 6)
            .map(([sku, x]) => ({ sku, nome: x.nome, qtd: x.qtd, receita: r2(x.receita) })),
          vistas: vistasTop.map((x) => ({
            sku: x.nome,
            nome: nomeVista.get(x.nome) ?? x.nome,
            vezes: x.valor,
          })),
          ultimas: vendas.slice(0, 6).map((v) => ({
            codigo: v.codigo,
            cliente: v.cliente_nome,
            pais: v.pais,
            total: v.total,
            moeda: v.moeda,
            etapa: v.etapa,
            quando: v.created_at.toISOString(),
          })),
        }
      : null,
  };
}

// Pendências agora (não dependem do período): o que está esperando alguém da equipe
async function pendencias() {
  const q = (sql: string) =>
    prisma
      .$queryRawUnsafe<Array<{ n: bigint }>>(sql)
      .then((r) => Number(r[0]?.n ?? 0))
      .catch(() => 0);
  const [cotacoes, contatos, avisos, aguardando, embalar] = await Promise.all([
    prisma.quotes.count({ where: { status: "NOVA" } }),
    q("SELECT COUNT(*) n FROM contatos_whatsapp WHERE status = 'NOVO'"),
    q("SELECT COUNT(*) n FROM avisos_preco WHERE status = 'WHATSAPP'"),
    prisma.vendas.count({ where: { status: { not: "CANCELADA" }, etapa: "AGUARDANDO" } }),
    prisma.vendas.count({
      where: { status: { not: "CANCELADA" }, etapa: { in: ["CHEGOU", "EMBALANDO"] } },
    }),
  ]);
  return { cotacoes, contatos, avisos, aguardando, embalar };
}

export async function painelDashboard(de: string, ate: string) {
  const { diasEntre } = await import("./resumo-diario.server");
  const dias = diasEntre(de, ate);
  const n = dias.length;
  // Período anterior do mesmo tamanho, logo antes
  const antesAte = new Date(Date.parse(`${de}T12:00:00Z`) - 24 * H).toISOString().slice(0, 10);
  const antesDe = new Date(Date.parse(`${de}T12:00:00Z`) - n * 24 * H).toISOString().slice(0, 10);
  // Gasto de anúncios: sincroniza em segundo plano se a última vez já venceu (não segura o painel)
  void import("./ads.server").then((m) => m.sincronizarAdsSeVencido()).catch(() => {});
  const { cotacoes } = await import("./financeiro.server");
  const [atual, anterior, pend, cot] = await Promise.all([
    periodo(dias, true),
    periodo(diasEntre(antesDe, antesAte), false),
    pendencias(),
    cotacoes(),
  ]);
  return {
    de,
    ate,
    antes: { de: antesDe, ate: antesAte },
    atual,
    anterior: { total: anterior.total, ads: anterior.ads },
    pendencias: pend,
    cotacao: cot.real, // R$ 1 = $U x
    geradoEm: new Date().toISOString(),
  };
}
export type Dashboard = Awaited<ReturnType<typeof painelDashboard>>;
