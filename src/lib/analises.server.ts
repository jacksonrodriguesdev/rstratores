// Admin → Análises: 10 ferramentas sobre as visitas (site_visits). Páginas são as linhas sem
// "/_evento/"; eventos são "/_evento/<tipo>/<dado>" (whatsapp, cotacao, busca, carrinho, popup,
// clique, rolagem). Horários no fuso do Uruguai (UTC−3, sem horário de verão).
import { prisma } from "./prisma";

const EV = "/_evento/";
const H = 3600_000;
const FUSO = -3 * H;

type Pagina = {
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
type Evento = { created_at: Date; tipo: string; dado: string; visitor_id: string | null; session_id: string | null; city: string | null; region: string | null; country_code: string | null };

const local = (d: Date) => new Date(d.getTime() + FUSO);
const diaLocal = (d: Date) => local(d).toISOString().slice(0, 10);
const desdeDias = (dias: number) => new Date(Date.now() - dias * 24 * H);
const regiaoDe = (l: { region: string | null; city: string | null; country: string | null; country_code: string | null }) =>
  l.region || l.city || l.country || l.country_code || "Desconhecida";
const paisDe = (l: { country: string | null; country_code: string | null }) => l.country || l.country_code || "—";
// "pt:pt-BR" → "pt"; registros antigos (sem prefixo) eram todos do site em espanhol
const idiomaSite = (lang: string | null) => (lang?.startsWith("pt:") ? "pt" : "es");
const sessao = (l: { session_id: string | null; visitor_id: string | null; created_at: Date }) =>
  l.session_id || `${l.visitor_id ?? "?"}-${diaLocal(l.created_at)}`;
const canalDe = (f: string | null) => f || "direto";

async function paginas(desde: Date, ate?: Date): Promise<Pagina[]> {
  return (await prisma.site_visits.findMany({
    where: { created_at: { gte: desde, ...(ate && { lt: ate }) }, NOT: { path: { startsWith: EV } } },
    select: {
      created_at: true, path: true, visitor_id: true, session_id: true, city: true, region: true, country: true, country_code: true,
      latitude: true, longitude: true, fonte: true, device: true, browser: true, os: true, language: true,
    },
    orderBy: { created_at: "asc" },
    take: 300000,
  })) as Pagina[];
}

async function eventos(desde: Date, tipos: string[]): Promise<Evento[]> {
  const rows = await prisma.site_visits.findMany({
    where: { created_at: { gte: desde }, OR: tipos.map((t) => ({ path: { startsWith: `${EV}${t}/` } })) },
    select: { created_at: true, path: true, visitor_id: true, session_id: true, city: true, region: true, country_code: true },
    orderBy: { created_at: "asc" },
    take: 300000,
  });
  const out: Evento[] = [];
  for (const r of rows) {
    const resto = r.path.slice(EV.length);
    const i = resto.indexOf("/");
    let dado = "";
    try {
      dado = decodeURIComponent(resto.slice(i + 1));
    } catch {
      continue;
    }
    out.push({ ...r, tipo: resto.slice(0, i), dado });
  }
  return out;
}

const skuDaPagina = (path: string) => {
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

// Agrupa as páginas de peça em "/produto/*" para o mapa de cliques e a rolagem
const grupoPagina = (p: string) => (p.startsWith("/produto/") ? "/produto/*" : p.startsWith("/catalogos/") && p !== "/catalogos" ? "/catalogos/*" : p);

const topo = <T,>(m: Map<string, T>, por: (v: T) => number, n: number) => [...m.entries()].sort((a, b) => por(b[1]) - por(a[1])).slice(0, n);
const inc = (m: Map<string, number>, k: string, v = 1) => m.set(k, (m.get(k) ?? 0) + v);

// ---------------------------------------------------------------- 1. Resumo
export async function resumo(dias: number) {
  const desde = desdeDias(dias);
  const [ps, evs, anteriores] = await Promise.all([
    paginas(desde),
    eventos(desde, ["whatsapp", "cotacao", "busca", "carrinho", "popup"]),
    prisma.site_visits.count({ where: { created_at: { gte: desdeDias(dias * 2), lt: desde }, NOT: { path: { startsWith: EV } } } }),
  ]);
  const visitantes = new Set(ps.map((p) => p.visitor_id).filter(Boolean) as string[]);
  const sess = new Map<string, { n: number; ini: number; fim: number; acao: boolean }>();
  for (const p of ps) {
    const k = sessao(p);
    const s = sess.get(k) ?? { n: 0, ini: p.created_at.getTime(), fim: p.created_at.getTime(), acao: false };
    s.n++;
    s.fim = Math.max(s.fim, p.created_at.getTime());
    sess.set(k, s);
  }
  for (const e of evs) {
    const s = sess.get(sessao(e));
    if (s) {
      s.acao = true;
      s.fim = Math.max(s.fim, e.created_at.getTime());
    }
  }
  const lista = [...sess.values()];
  const rejeicao = lista.length ? lista.filter((s) => s.n === 1 && !s.acao).length / lista.length : 0;
  // Mediana (abas esquecidas abertas por horas distorcem a média), limitada a 1 h por sessão
  const duracoes = lista.filter((s) => s.n > 1 || s.acao).map((s) => Math.min(s.fim - s.ini, 3_600_000)).sort((x, y) => x - y);
  const duracaoMedia = duracoes.length ? duracoes[Math.floor(duracoes.length / 2)] / 1000 : 0;

  // Novos x recorrentes: quem já tinha aparecido antes do período
  const ids = [...visitantes];
  const antes = new Set<string>();
  for (let i = 0; i < ids.length && i < 20000; i += 2000) {
    const r = await prisma.site_visits.findMany({
      where: { created_at: { lt: desde }, visitor_id: { in: ids.slice(i, i + 2000) } },
      distinct: ["visitor_id"],
      select: { visitor_id: true },
    });
    for (const x of r) if (x.visitor_id) antes.add(x.visitor_id);
  }

  const porDia = new Map<string, { visitas: number; visitantes: Set<string>; acoes: number }>();
  for (let d = 0; d < dias; d++) porDia.set(diaLocal(new Date(Date.now() - (dias - 1 - d) * 24 * H)), { visitas: 0, visitantes: new Set(), acoes: 0 });
  for (const p of ps) {
    const x = porDia.get(diaLocal(p.created_at));
    if (!x) continue;
    x.visitas++;
    if (p.visitor_id) x.visitantes.add(p.visitor_id);
  }
  for (const e of evs) {
    const x = porDia.get(diaLocal(e.created_at));
    if (x && (e.tipo === "whatsapp" || e.tipo === "cotacao" || e.tipo === "carrinho")) x.acoes++;
  }
  const paginasTop = new Map<string, number>();
  for (const p of ps) inc(paginasTop, grupoPagina(p.path));
  return {
    visitas: ps.length,
    visitasAntes: anteriores,
    visitantes: visitantes.size,
    sessoes: sess.size,
    paginasPorSessao: sess.size ? ps.length / sess.size : 0,
    duracaoMedia,
    rejeicao,
    novos: ids.filter((v) => !antes.has(v)).length,
    recorrentes: antes.size,
    whatsapp: evs.filter((e) => e.tipo === "whatsapp" || e.tipo === "cotacao").length,
    carrinho: evs.filter((e) => e.tipo === "carrinho").length,
    buscas: evs.filter((e) => e.tipo === "busca").length,
    serie: [...porDia.entries()].map(([dia, x]) => ({ dia, visitas: x.visitas, visitantes: x.visitantes.size, acoes: x.acoes })),
    paginasTop: topo(paginasTop, (v) => v, 10).map(([pagina, visitas]) => ({ pagina, visitas })),
  };
}

// ---------------------------------------------------------------- 2. Mapa de calor 3D (dia × hora)
export async function calor(dias: number) {
  const ps = await paginas(desdeDias(dias));
  const m = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const p of ps) {
    const d = local(p.created_at);
    m[d.getUTCDay()][d.getUTCHours()]++;
  }
  let pico = { dia: 0, hora: 0, visitas: 0 };
  m.forEach((linha, dia) => linha.forEach((v, hora) => v > pico.visitas && (pico = { dia, hora, visitas: v })));
  const porHora = Array.from({ length: 24 }, (_, h) => m.reduce((t, l) => t + l[h], 0));
  const porDia = m.map((l) => l.reduce((a, b) => a + b, 0));
  return { matriz: m, pico, porHora, porDia, total: ps.length };
}

// ---------------------------------------------------------------- 3. Relevo 3D das regiões
export async function regioes(dias: number) {
  const ps = await paginas(desdeDias(dias));
  const celulas = new Map<string, { lat: number; lon: number; visitas: number; visitantes: Set<string>; cidades: Map<string, number> }>();
  const cidades = new Map<string, { cidade: string; regiao: string; pais: string; visitas: number; visitantes: Set<string>; lat: number | null; lon: number | null }>();
  const passo = 0.25; // ~25 km
  for (const p of ps) {
    const cidade = p.city || "Desconhecida";
    const kc = `${cidade}|${p.region ?? ""}|${p.country_code ?? ""}`;
    const c = cidades.get(kc) ?? { cidade, regiao: p.region || "—", pais: paisDe(p), visitas: 0, visitantes: new Set(), lat: p.latitude, lon: p.longitude };
    c.visitas++;
    if (p.visitor_id) c.visitantes.add(p.visitor_id);
    cidades.set(kc, c);
    if (p.latitude == null || p.longitude == null) continue;
    const lat = Math.round(p.latitude / passo) * passo;
    const lon = Math.round(p.longitude / passo) * passo;
    const k = `${lat}|${lon}`;
    const x = celulas.get(k) ?? { lat, lon, visitas: 0, visitantes: new Set(), cidades: new Map() };
    x.visitas++;
    if (p.visitor_id) x.visitantes.add(p.visitor_id);
    inc(x.cidades, cidade);
    celulas.set(k, x);
  }
  const porPais = new Map<string, number>();
  for (const p of ps) inc(porPais, paisDe(p));
  return {
    celulas: [...celulas.values()].map((c) => ({
      lat: c.lat,
      lon: c.lon,
      visitas: c.visitas,
      visitantes: c.visitantes.size,
      cidade: [...c.cidades.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
    })),
    cidades: [...cidades.values()]
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 60)
      .map((c) => ({ cidade: c.cidade, regiao: c.regiao, pais: c.pais, visitas: c.visitas, visitantes: c.visitantes.size, lat: c.lat, lon: c.lon })),
    paises: topo(porPais, (v) => v, 12).map(([pais, visitas]) => ({ pais, visitas })),
  };
}

// ---------------------------------------------------------------- 4. Peças mais acessadas
export async function produtos(dias: number) {
  const desde = desdeDias(dias);
  const [ps, evs] = await Promise.all([paginas(desde), eventos(desde, ["whatsapp", "cotacao", "carrinho"])]);
  const m = new Map<string, { vistas: number; visitantes: Set<string>; carrinho: number; whatsapp: number; regioes: Map<string, number>; pt: number }>();
  const pega = (sku: string) => {
    let x = m.get(sku);
    if (!x) m.set(sku, (x = { vistas: 0, visitantes: new Set(), carrinho: 0, whatsapp: 0, regioes: new Map(), pt: 0 }));
    return x;
  };
  for (const p of ps) {
    const sku = skuDaPagina(p.path);
    if (!sku) continue;
    const x = pega(sku);
    x.vistas++;
    if (p.visitor_id) x.visitantes.add(p.visitor_id);
    inc(x.regioes, regiaoDe(p));
    if (idiomaSite(p.language) === "pt") x.pt++;
  }
  for (const e of evs) {
    if (e.tipo === "carrinho" && e.dado) pega(e.dado.trim()).carrinho++;
    else if (e.tipo === "whatsapp" && e.dado && !e.dado.startsWith("contato:")) pega(e.dado.trim()).whatsapp++;
    else if (e.tipo === "cotacao") for (const s of e.dado.split(",")) if (s.trim()) pega(s.trim()).whatsapp++;
  }
  const lista = topo(m, (v) => v.vistas * 10 + v.whatsapp * 5 + v.carrinho * 3, 50);
  const nomes = await nomesDasPecas(lista.map(([s]) => s));
  return {
    totalPecasVistas: [...m.values()].filter((v) => v.vistas > 0).length,
    lista: lista.map(([sku, v]) => ({
      sku,
      nome: nomes.get(sku)?.nome ?? sku,
      imagem: nomes.get(sku)?.imagem ?? null,
      vistas: v.vistas,
      visitantes: v.visitantes.size,
      carrinho: v.carrinho,
      whatsapp: v.whatsapp,
      conversao: v.vistas ? v.whatsapp / v.vistas : 0,
      regiao: [...v.regioes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
      brasil: v.vistas ? v.pt / v.vistas : 0,
    })),
  };
}

// ---------------------------------------------------------------- 5. Peça × região
export async function produtoRegiao(dias: number, sku?: string) {
  const ps = await paginas(desdeDias(dias));
  const vistas = ps.filter((p) => p.path.startsWith("/produto/"));
  if (sku) {
    const doSku = vistas.filter((p) => skuDaPagina(p.path) === sku);
    const cidades = new Map<string, { cidade: string; regiao: string; pais: string; visitas: number; lat: number | null; lon: number | null }>();
    for (const p of doSku) {
      const k = `${p.city}|${p.region}`;
      const c = cidades.get(k) ?? { cidade: p.city || "Desconhecida", regiao: p.region || "—", pais: paisDe(p), visitas: 0, lat: p.latitude, lon: p.longitude };
      c.visitas++;
      cidades.set(k, c);
    }
    const nomes = await nomesDasPecas([sku]);
    return { modo: "peca" as const, sku, nome: nomes.get(sku)?.nome ?? sku, total: doSku.length, cidades: [...cidades.values()].sort((a, b) => b.visitas - a.visitas) };
  }
  const porSku = new Map<string, number>();
  const porReg = new Map<string, number>();
  for (const p of vistas) {
    const s = skuDaPagina(p.path);
    if (!s) continue;
    inc(porSku, s);
    inc(porReg, regiaoDe(p));
  }
  const skus = topo(porSku, (v) => v, 12).map(([s]) => s);
  const regs = topo(porReg, (v) => v, 10).map(([r]) => r);
  const matriz = skus.map(() => regs.map(() => 0));
  for (const p of vistas) {
    const i = skus.indexOf(skuDaPagina(p.path) ?? "");
    const j = regs.indexOf(regiaoDe(p));
    if (i >= 0 && j >= 0) matriz[i][j]++;
  }
  const nomes = await nomesDasPecas(skus);
  return { modo: "matriz" as const, skus: skus.map((s) => ({ sku: s, nome: nomes.get(s)?.nome ?? s })), regioes: regs, matriz };
}

// ---------------------------------------------------------------- 6. Mapa de cliques
export async function cliques(dias: number, pagina?: string) {
  const evs = await eventos(desdeDias(dias), ["clique"]);
  const pontos: Array<{ p: string; x: number; y: number; tela: string; alvo: string }> = [];
  for (const e of evs) {
    const [p, x, y, tela, ...alvo] = e.dado.split("|");
    if (!p || isNaN(Number(x)) || isNaN(Number(y))) continue;
    pontos.push({ p: grupoPagina(p), x: Number(x), y: Number(y), tela: tela || "d", alvo: alvo.join("|") });
  }
  const porPagina = new Map<string, number>();
  for (const c of pontos) inc(porPagina, c.p);
  const paginasLista = topo(porPagina, (v) => v, 25).map(([p, n]) => ({ pagina: p, cliques: n }));
  const escolhida = pagina || paginasLista[0]?.pagina || "/";
  const daPagina = pontos.filter((c) => c.p === escolhida);
  const alvos = new Map<string, number>();
  for (const c of daPagina) inc(alvos, c.alvo || "?");
  // Grade 20 × 50 (largura × altura da página) para o mapa de calor
  const grade = new Map<string, number>();
  for (const c of daPagina) inc(grade, `${Math.min(19, Math.floor(c.x / 5))}|${Math.min(49, Math.floor(c.y / 2))}`);
  return {
    paginas: paginasLista,
    pagina: escolhida,
    total: daPagina.length,
    celular: daPagina.filter((c) => c.tela === "m").length,
    grade: [...grade.entries()].map(([k, n]) => {
      const [gx, gy] = k.split("|").map(Number);
      return [gx, gy, n] as [number, number, number];
    }),
    alvos: topo(alvos, (v) => v, 15).map(([alvo, n]) => ({ alvo, cliques: n })),
  };
}

// ---------------------------------------------------------------- 7. Rolagem
export async function rolagem(dias: number) {
  const evs = await eventos(desdeDias(dias), ["rolagem"]);
  const m = new Map<string, number[]>();
  for (const e of evs) {
    const i = e.dado.lastIndexOf("|");
    const pct = Number(e.dado.slice(i + 1));
    if (i < 0 || isNaN(pct)) continue;
    const p = grupoPagina(e.dado.slice(0, i));
    if (!m.has(p)) m.set(p, []);
    m.get(p)!.push(Math.max(0, Math.min(100, pct)));
  }
  const alcance = (l: number[], n: number) => (l.length ? l.filter((v) => v >= n).length / l.length : 0);
  return {
    paginas: [...m.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20)
      .map(([pagina, l]) => ({
        pagina,
        visitas: l.length,
        media: l.reduce((a, b) => a + b, 0) / l.length,
        a25: alcance(l, 25),
        a50: alcance(l, 50),
        a75: alcance(l, 75),
        a100: alcance(l, 95),
      })),
  };
}

// ---------------------------------------------------------------- 8. Funil
export async function funil(dias: number) {
  const desde = desdeDias(dias);
  const [ps, evs] = await Promise.all([paginas(desde), eventos(desde, ["whatsapp", "cotacao", "carrinho", "popup"])]);
  type S = { canal: string; peca: boolean; carrinho: boolean; whatsapp: boolean; cadastro: boolean };
  const sess = new Map<string, S>();
  for (const p of ps) {
    const k = sessao(p);
    const s = sess.get(k) ?? { canal: canalDe(p.fonte), peca: false, carrinho: false, whatsapp: false, cadastro: false };
    if (p.path.startsWith("/produto/")) s.peca = true;
    sess.set(k, s);
  }
  for (const e of evs) {
    const s = sess.get(sessao(e));
    if (!s) continue;
    if (e.tipo === "carrinho") s.carrinho = true;
    if (e.tipo === "whatsapp" || e.tipo === "cotacao") s.whatsapp = true;
    if (e.tipo === "popup" && (e.dado === "cadastro" || e.dado === "login")) s.cadastro = true;
  }
  const etapas = (l: S[]) => [l.length, l.filter((s) => s.peca).length, l.filter((s) => s.carrinho).length, l.filter((s) => s.whatsapp).length, l.filter((s) => s.cadastro).length];
  const todas = [...sess.values()];
  const porCanal = new Map<string, S[]>();
  for (const s of todas) {
    if (!porCanal.has(s.canal)) porCanal.set(s.canal, []);
    porCanal.get(s.canal)!.push(s);
  }
  return {
    etapas: ["Visitaram o site", "Viram uma peça", "Adicionaram ao carrinho", "Pediram preço no WhatsApp", "Criaram conta / entraram"],
    total: etapas(todas),
    canais: [...porCanal.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([canal, l]) => ({ canal, valores: etapas(l) })),
  };
}

// ---------------------------------------------------------------- 9. Canais, aparelhos e idioma
export async function canais(dias: number) {
  const ps = await paginas(desdeDias(dias));
  const fontes = new Map<string, number>();
  for (const p of ps) inc(fontes, canalDe(p.fonte));
  const topFontes = topo(fontes, (v) => v, 6).map(([f]) => f);
  const porDia = new Map<string, Map<string, number>>();
  for (let d = 0; d < dias; d++) porDia.set(diaLocal(new Date(Date.now() - (dias - 1 - d) * 24 * H)), new Map());
  for (const p of ps) {
    const m = porDia.get(diaLocal(p.created_at));
    if (m) inc(m, topFontes.includes(canalDe(p.fonte)) ? canalDe(p.fonte) : "outros");
  }
  const conta = (f: (p: Pagina) => string) => {
    const m = new Map<string, number>();
    for (const p of ps) inc(m, f(p));
    return topo(m, (v) => v, 10).map(([nome, visitas]) => ({ nome, visitas }));
  };
  const series = [...topFontes, "outros"].map((f) => ({ nome: f, valores: [...porDia.values()].map((m) => m.get(f) ?? 0) }));
  return {
    dias: [...porDia.keys()],
    series: series.filter((s) => s.valores.some(Boolean)),
    aparelhos: conta((p) => p.device || "desconhecido"),
    navegadores: conta((p) => p.browser || "desconhecido"),
    sistemas: conta((p) => p.os || "desconhecido"),
    idiomaSite: conta((p) => (idiomaSite(p.language) === "pt" ? "Português (/pt)" : "Espanhol")),
    paises: conta(paisDe),
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
