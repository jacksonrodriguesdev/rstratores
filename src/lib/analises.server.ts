// Admin → Análises: 10 ferramentas sobre as visitas. As ferramentas 1–9 somam os resumos diários
// (src/lib/resumo-diario.server.ts, tabela analise_dia); só o "tempo real" lê as linhas dos últimos
// 30 minutos. Páginas ficam em site_visits; eventos (whatsapp, cotacao, busca, carrinho, popup,
// clique, rolagem) em site_eventos. Horários no fuso do Uruguai (UTC−3, sem horário de verão).
import { prisma } from "./prisma";
import { resumosDoPeriodo, visitantesDoPeriodo, visitasAntes, somar, topoDe, medianaDuracao, grupoPagina, type ResumoDia, type Cont } from "./resumo-diario.server";

const EV = "/_evento/";
const H = 3600_000;
const FUSO = -3 * H;

export type Pagina = {
  created_at: Date;
  path: string;
  visitor_id: string | null;
  session_id: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  fonte: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  language: string | null;
};
export type Evento = { created_at: Date; tipo: string; dado: string; visitor_id: string | null; session_id: string | null; city: string | null; region: string | null; country_code: string | null };

export const local = (d: Date) => new Date(d.getTime() + FUSO);
export const diaLocal = (d: Date) => local(d).toISOString().slice(0, 10);
export const desdeDias = (dias: number) => new Date(Date.now() - dias * 24 * H);
const regiaoDe = (l: { region: string | null; city: string | null; country: string | null; country_code: string | null }) =>
  l.region || l.city || l.country || l.country_code || "Desconhecida";
const paisDe = (l: { country: string | null; country_code: string | null }) => l.country || l.country_code || "—";
// "pt:pt-BR" → "pt"; registros antigos (sem prefixo) eram todos do site em espanhol
export const idiomaSite = (lang: string | null) => (lang?.startsWith("pt:") ? "pt" : "es");
export const sessao = (l: { session_id: string | null; visitor_id: string | null; created_at: Date }) =>
  l.session_id || `${l.visitor_id ?? "?"}-${diaLocal(l.created_at)}`;
export const canalDe = (f: string | null) => f || "direto";

export async function paginas(desde: Date, ate?: Date): Promise<Pagina[]> {
  return (await prisma.site_visits.findMany({
    where: { created_at: { gte: desde, ...(ate && { lt: ate }) }, NOT: { path: { startsWith: EV } } },
    select: {
      created_at: true, path: true, visitor_id: true, session_id: true, city: true, region: true, country: true, country_code: true,
      latitude: true, longitude: true, fonte: true, device: true, browser: true, os: true, language: true,
    },
    orderBy: { created_at: "asc" },
    take: 20000,
  })) as Pagina[];
}

export async function eventos(desde: Date, tipos: string[]): Promise<Evento[]> {
  const { eventosProntos } = await import("./eventos-db.server");
  await eventosProntos();
  return prisma.site_eventos.findMany({
    where: { created_at: { gte: desde }, tipo: { in: tipos } },
    select: { created_at: true, tipo: true, dado: true, visitor_id: true, session_id: true, city: true, region: true, country_code: true },
    orderBy: { created_at: "asc" },
    take: 50000,
  });
}

export const skuDaPagina = (path: string) => {
  if (!path.startsWith("/produto/")) return null;
  try {
    return decodeURIComponent(path.slice(9)).trim();
  } catch {
    return null;
  }
};

async function nomesDasPecas(skus: string[]) {
  if (!skus.length) return new Map<string, { nome: string; imagem: string | null }>();
  const rows = await prisma.agricolas.findMany({
    where: { sku: { in: skus } },
    select: { sku: true, nome: true, nome_es: true, imagem_principal: true },
  });
  const { nomeProduto } = await import("./pecas-es");
  return new Map(rows.map((r) => [r.sku.trim(), { nome: nomeProduto(r as any), imagem: r.imagem_principal && !/redeparts/i.test(r.imagem_principal) ? r.imagem_principal : null }]));
}


const topo = <T,>(m: Map<string, T>, por: (v: T) => number, n: number) => [...m.entries()].sort((a, b) => por(b[1]) - por(a[1])).slice(0, n);
export const inc = (m: Map<string, number>, k: string, v = 1) => m.set(k, (m.get(k) ?? 0) + v);

// ---------------------------------------------------------------- 1. Resumo
export async function resumo(dias: number) {
  const [ds, unicos, anteriores] = await Promise.all([resumosDoPeriodo(dias), visitantesDoPeriodo(dias), visitasAntes(dias)]);
  const soma = (f: (d: ResumoDia) => number) => ds.reduce((a, d) => a + f(d), 0);
  const visitas = soma((d) => d.visitas);
  const sessoes = soma((d) => d.sessoes);
  const duracoes: Cont = {};
  const paginasTop: Cont = {};
  for (const d of ds) {
    somar(duracoes, d.duracoes);
    somar(paginasTop, d.paginas);
  }
  return {
    visitas,
    visitasAntes: anteriores,
    visitantes: unicos.total,
    sessoes,
    paginasPorSessao: sessoes ? visitas / sessoes : 0,
    // Mediana (abas esquecidas abertas por horas distorcem a média), limitada a 1 h por sessão
    duracaoMedia: medianaDuracao(duracoes),
    rejeicao: sessoes ? soma((d) => d.rejeitadas) / sessoes : 0,
    novos: unicos.novos,
    recorrentes: unicos.recorrentes,
    whatsapp: soma((d) => d.whatsapp),
    carrinho: soma((d) => d.carrinho),
    buscas: soma((d) => d.buscas),
    serie: ds.map((d) => ({ dia: d.dia, visitas: d.visitas, visitantes: d.visitantes, acoes: d.acoes })),
    paginasTop: topoDe(paginasTop, 10).map(([pagina, visitas]) => ({ pagina, visitas })),
  };
}

// ---------------------------------------------------------------- 2. Mapa de calor 3D (dia × hora)
export async function calor(dias: number) {
  const ds = await resumosDoPeriodo(dias);
  const m = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const d of ds) d.horas.forEach((v, h) => (m[d.dow][h] += v));
  let pico = { dia: 0, hora: 0, visitas: 0 };
  m.forEach((linha, dia) => linha.forEach((v, hora) => v > pico.visitas && (pico = { dia, hora, visitas: v })));
  const porHora = Array.from({ length: 24 }, (_, h) => m.reduce((t, l) => t + l[h], 0));
  const porDia = m.map((l) => l.reduce((a, b) => a + b, 0));
  return { matriz: m, pico, porHora, porDia, total: ds.reduce((a, d) => a + d.visitas, 0) };
}

// ---------------------------------------------------------------- 3. Relevo 3D das regiões
// (visitantes por cidade/célula = soma dos visitantes únicos de cada dia)
export async function regioes(dias: number) {
  const ds = await resumosDoPeriodo(dias);
  const celulas = new Map<string, { lat: number; lon: number; visitas: number; visitantes: number; cidades: Cont }>();
  const cidades = new Map<string, { cidade: string; regiao: string; pais: string; visitas: number; visitantes: number; lat: number | null; lon: number | null }>();
  const porPais: Cont = {};
  for (const d of ds) {
    for (const [k, c] of Object.entries(d.celulas)) {
      const x = celulas.get(k) ?? { lat: c.lat, lon: c.lon, visitas: 0, visitantes: 0, cidades: {} };
      x.visitas += c.v;
      x.visitantes += c.u;
      somar(x.cidades, c.c);
      celulas.set(k, x);
    }
    for (const [k, c] of Object.entries(d.cidades)) {
      const x = cidades.get(k) ?? { cidade: c.cidade, regiao: c.regiao, pais: c.pais, visitas: 0, visitantes: 0, lat: c.lat, lon: c.lon };
      x.visitas += c.v;
      x.visitantes += c.u;
      cidades.set(k, x);
    }
    somar(porPais, d.paises);
  }
  return {
    celulas: [...celulas.values()].map((c) => ({ lat: c.lat, lon: c.lon, visitas: c.visitas, visitantes: c.visitantes, cidade: topoDe(c.cidades, 1)[0]?.[0] ?? "" })),
    cidades: [...cidades.values()].sort((a, b) => b.visitas - a.visitas).slice(0, 60),
    paises: topoDe(porPais, 12).map(([pais, visitas]) => ({ pais, visitas })),
  };
}

// Soma as peças de todos os dias do período
function somarSkus(ds: ResumoDia[]) {
  const m = new Map<string, { vistas: number; visitantes: number; carrinho: number; whatsapp: number; regioes: Cont; pt: number; cidades: Map<string, { cidade: string; regiao: string; pais: string; visitas: number; lat: number | null; lon: number | null }> }>();
  for (const d of ds)
    for (const [sku, s] of Object.entries(d.skus)) {
      const x = m.get(sku) ?? { vistas: 0, visitantes: 0, carrinho: 0, whatsapp: 0, regioes: {}, pt: 0, cidades: new Map() };
      x.vistas += s.v;
      x.visitantes += s.u;
      x.carrinho += s.c;
      x.whatsapp += s.w;
      x.pt += s.pt;
      somar(x.regioes, s.r);
      for (const [k, c] of Object.entries(s.cid)) {
        const y = x.cidades.get(k) ?? { cidade: c.cidade, regiao: c.regiao, pais: c.pais, visitas: 0, lat: c.lat, lon: c.lon };
        y.visitas += c.v;
        x.cidades.set(k, y);
      }
      m.set(sku, x);
    }
  return m;
}

// ---------------------------------------------------------------- 4. Peças mais acessadas
export async function produtos(dias: number) {
  const m = somarSkus(await resumosDoPeriodo(dias));
  const lista = topo(m, (v) => v.vistas * 10 + v.whatsapp * 5 + v.carrinho * 3, 50);
  const nomes = await nomesDasPecas(lista.map(([s]) => s));
  return {
    totalPecasVistas: [...m.values()].filter((v) => v.vistas > 0).length,
    lista: lista.map(([sku, v]) => ({
      sku,
      nome: nomes.get(sku)?.nome ?? sku,
      imagem: nomes.get(sku)?.imagem ?? null,
      vistas: v.vistas,
      visitantes: v.visitantes,
      carrinho: v.carrinho,
      whatsapp: v.whatsapp,
      conversao: v.vistas ? v.whatsapp / v.vistas : 0,
      regiao: topoDe(v.regioes, 1)[0]?.[0] ?? "—",
      brasil: v.vistas ? v.pt / v.vistas : 0,
    })),
  };
}

// ---------------------------------------------------------------- 5. Peça × região
export async function produtoRegiao(dias: number, sku?: string) {
  const m = somarSkus(await resumosDoPeriodo(dias));
  if (sku) {
    const x = m.get(sku);
    const nomes = await nomesDasPecas([sku]);
    return { modo: "peca" as const, sku, nome: nomes.get(sku)?.nome ?? sku, total: x?.vistas ?? 0, cidades: [...(x?.cidades.values() ?? [])].sort((a, b) => b.visitas - a.visitas) };
  }
  const vistos = [...m.entries()].filter(([, v]) => v.vistas > 0);
  const porReg: Cont = {};
  for (const [, v] of vistos) somar(porReg, v.regioes);
  const skus = vistos.sort((a, b) => b[1].vistas - a[1].vistas).slice(0, 12).map(([s]) => s);
  const regs = topoDe(porReg, 10).map(([r]) => r);
  const matriz = skus.map((s) => regs.map((r) => m.get(s)!.regioes[r] ?? 0));
  const nomes = await nomesDasPecas(skus);
  return { modo: "matriz" as const, skus: skus.map((s) => ({ sku: s, nome: nomes.get(s)?.nome ?? s })), regioes: regs, matriz };
}

// ---------------------------------------------------------------- 6. Mapa de cliques
export async function cliques(dias: number, pagina?: string) {
  const ds = await resumosDoPeriodo(dias);
  const porPagina = new Map<string, { n: number; m: number; g: Cont; a: Cont }>();
  for (const d of ds)
    for (const [p, c] of Object.entries(d.cliques)) {
      const x = porPagina.get(p) ?? { n: 0, m: 0, g: {}, a: {} };
      x.n += c.n;
      x.m += c.m;
      somar(x.g, c.g);
      somar(x.a, c.a);
      porPagina.set(p, x);
    }
  const paginasLista = topo(porPagina, (v) => v.n, 25).map(([p, v]) => ({ pagina: p, cliques: v.n }));
  const escolhida = pagina || paginasLista[0]?.pagina || "/";
  const x = porPagina.get(escolhida) ?? { n: 0, m: 0, g: {}, a: {} };
  return {
    paginas: paginasLista,
    pagina: escolhida,
    total: x.n,
    celular: x.m,
    // Grade 20 × 50 (largura × altura da página) para o mapa de calor
    grade: Object.entries(x.g).map(([k, n]) => {
      const [gx, gy] = k.split("|").map(Number);
      return [gx, gy, n] as [number, number, number];
    }),
    alvos: topoDe(x.a, 15).map(([alvo, n]) => ({ alvo, cliques: n })),
  };
}

// ---------------------------------------------------------------- 7. Rolagem
export async function rolagem(dias: number) {
  const ds = await resumosDoPeriodo(dias);
  const m = new Map<string, { n: number; soma: number; a25: number; a50: number; a75: number; a100: number }>();
  for (const d of ds)
    for (const [p, r] of Object.entries(d.rolagem)) {
      const x = m.get(p) ?? { n: 0, soma: 0, a25: 0, a50: 0, a75: 0, a100: 0 };
      for (const k of ["n", "soma", "a25", "a50", "a75", "a100"] as const) x[k] += r[k];
      m.set(p, x);
    }
  return {
    paginas: [...m.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 20)
      .map(([pagina, x]) => ({ pagina, visitas: x.n, media: x.soma / x.n, a25: x.a25 / x.n, a50: x.a50 / x.n, a75: x.a75 / x.n, a100: x.a100 / x.n })),
  };
}

// ---------------------------------------------------------------- 8. Funil
export async function funil(dias: number) {
  const ds = await resumosDoPeriodo(dias);
  const porCanal = new Map<string, number[]>();
  for (const d of ds)
    for (const [canal, v] of Object.entries(d.funil)) {
      const x = porCanal.get(canal) ?? [0, 0, 0, 0, 0];
      v.forEach((n, i) => (x[i] += n));
      porCanal.set(canal, x);
    }
  const total = [0, 0, 0, 0, 0];
  for (const v of porCanal.values()) v.forEach((n, i) => (total[i] += n));
  return {
    etapas: ["Visitaram o site", "Viram uma peça", "Adicionaram ao carrinho", "Pediram preço no WhatsApp", "Criaram conta / entraram"],
    total,
    canais: [...porCanal.entries()].sort((a, b) => b[1][0] - a[1][0]).slice(0, 8).map(([canal, valores]) => ({ canal, valores })),
  };
}

// ---------------------------------------------------------------- 9. Canais, aparelhos e idioma
export async function canais(dias: number) {
  const ds = await resumosDoPeriodo(dias);
  const fontes: Cont = {};
  const ap: Cont = {}, nav: Cont = {}, so: Cont = {}, idi: Cont = {}, pa: Cont = {};
  for (const d of ds) {
    somar(fontes, d.fontes);
    somar(ap, d.aparelhos);
    somar(nav, d.navegadores);
    somar(so, d.sistemas);
    somar(idi, d.idiomas);
    somar(pa, d.paises);
  }
  const topFontes = topoDe(fontes, 6).map(([f]) => f);
  const conta = (m: Cont) => topoDe(m, 10).map(([nome, visitas]) => ({ nome, visitas }));
  const series = [...topFontes, "outros"].map((f) => ({
    nome: f,
    valores: ds.map((d) => (f === "outros" ? Object.entries(d.fontes).filter(([k]) => !topFontes.includes(k)).reduce((a, [, v]) => a + v, 0) : d.fontes[f] ?? 0)),
  }));
  return {
    dias: ds.map((d) => d.dia),
    series: series.filter((s) => s.valores.some(Boolean)),
    aparelhos: conta(ap),
    navegadores: conta(nav),
    sistemas: conta(so),
    idiomaSite: conta({ "Espanhol": idi.es ?? 0, "Português (/pt)": idi.pt ?? 0 }).filter((x) => x.visitas),
    paises: conta(pa),
  };
}

// ---------------------------------------------------------------- 10. Tempo real
export async function tempoReal() {
  const desde = new Date(Date.now() - 30 * 60_000);
  const ps = await paginas(desde);
  const agora = Date.now();
  const ativos = new Set(ps.filter((p) => agora - p.created_at.getTime() < 5 * 60_000).map((p) => p.visitor_id).filter(Boolean));
  const porMinuto = Array(30).fill(0) as number[];
  for (const p of ps) {
    const i = 29 - Math.floor((agora - p.created_at.getTime()) / 60_000);
    if (i >= 0 && i < 30) porMinuto[i]++;
  }
  const paginasAgora = new Map<string, number>();
  for (const p of ps) inc(paginasAgora, grupoPagina(p.path));
  const skus = [...new Set(ps.map((p) => skuDaPagina(p.path)).filter(Boolean) as string[])].slice(0, 50);
  const nomes = await nomesDasPecas(skus);
  return {
    ativos: ativos.size,
    visitantes30: new Set(ps.map((p) => p.visitor_id).filter(Boolean)).size,
    porMinuto,
    paginas: topo(paginasAgora, (v) => v, 10).map(([pagina, visitas]) => ({ pagina, visitas })),
    ultimas: ps
      .slice(-40)
      .reverse()
      .map((p) => {
        const sku = skuDaPagina(p.path);
        return {
          quando: p.created_at.toISOString(),
          pagina: sku ? `Peça: ${nomes.get(sku)?.nome ?? sku}` : p.path,
          cidade: [p.city, p.region].filter(Boolean).join(", ") || paisDe(p),
          aparelho: p.device || "—",
          canal: canalDe(p.fonte),
          idioma: idiomaSite(p.language),
          visitante: (p.visitor_id ?? "").slice(0, 8),
        };
      }),
  };
}
