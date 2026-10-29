// Resumo diário das visitas (tabela analise_dia): cada dia fechado (horário do Uruguai) é calculado
// uma vez, a partir das linhas daquele dia só, e guardado como JSON. Admin → Análises e o Criador
// de anúncios somam os resumos do período em vez de carregar centenas de milhares de linhas.
// O dia de hoje é calculado na hora (com cache de 1 minuto). Mudou o formato? Suba VERSAO:
// os dias são recalculados sozinhos na próxima consulta.
import { whereHumano, sqlHumano } from "./rastreio.server";
import { prisma } from "./prisma";
import { localDe } from "./locais-anuncio";
import { eventosProntos, caminhoDoEvento } from "./eventos-db.server";
import { sessoesDeLinhas, SELECT_LINHA, type Linha, type SessaoBase } from "./jornadas.server";

export const VERSAO = 3; // 2: grava também as sessões do dia (analise_sessao); 3: sem robôs (whereHumano)
const H = 3600_000;
const FUSO = -3 * H; // Uruguai (UTC−3, sem horário de verão)
const EV = "/_evento/";

export type Cont = Record<string, number>;
type Celula = { lat: number; lon: number; v: number; u: number; c: Cont };
type Cidade = {
  cidade: string;
  regiao: string;
  pais: string;
  v: number;
  u: number;
  lat: number | null;
  lon: number | null;
};
type CidadeSku = {
  cidade: string;
  regiao: string;
  pais: string;
  v: number;
  lat: number | null;
  lon: number | null;
};
export type SkuDia = {
  v: number;
  u: number;
  c: number;
  w: number;
  r: Cont;
  pt: number;
  cid: Record<string, CidadeSku>;
};
export type LocalDia = {
  nome: string;
  pais: string;
  v: number;
  u: number;
  s: number;
  mob: number;
  leads: number;
  car: number;
  bus: number;
  cid: Cont;
  skus: Cont;
  termos: Cont;
};
export type SegmentoDia = {
  n: number;
  mob: number;
  lead: number;
  loc: Cont;
  can: Cont;
  horas: number[];
  skus: Cont;
};
export const SEGMENTOS_IDS = [
  "produtor",
  "oficina",
  "comparador",
  "decidido",
  "catalogo",
  "fronteira",
] as const;

export type ResumoDia = {
  dia: string; // AAAA-MM-DD
  dow: number; // 0 = domingo
  visitas: number;
  visitantes: number; // únicos no dia
  sessoes: number;
  rejeitadas: number; // 1 página e nenhuma ação
  duracoes: Cont; // segundos (de 10 em 10) → sessões com mais de 1 página ou ação
  whatsapp: number;
  carrinho: number;
  buscas: number;
  cadastros: number;
  acoes: number; // WhatsApp + carrinho
  paginas: Cont;
  horas: number[]; // 24
  celulas: Record<string, Celula>;
  cidades: Record<string, Cidade>;
  paises: Cont;
  skus: Record<string, SkuDia>;
  cliques: Record<string, { n: number; m: number; g: Cont; a: Cont }>;
  rolagem: Record<
    string,
    { n: number; soma: number; a25: number; a50: number; a75: number; a100: number }
  >;
  funil: Record<string, number[]>; // canal → [sessões, viram peça, carrinho, WhatsApp, cadastro]
  fontes: Cont;
  aparelhos: Cont;
  navegadores: Cont;
  sistemas: Cont;
  idiomas: Cont; // es / pt (idioma do site)
  // Criador de anúncios
  locais: Record<string, LocalDia>;
  termos: Record<string, { n: number; r: number }>; // busca → vezes, resultados
  sessMobile: number;
  sessPt: number;
  sessLead: number;
  sessCanal: Cont;
  leadsCanal: Cont;
  segmentos: Record<string, SegmentoDia>;
};

const inc = (m: Cont, k: string, v = 1) => {
  m[k] = (m[k] ?? 0) + v;
};
export const hojeLocal = () => new Date(Date.now() + FUSO).toISOString().slice(0, 10);
export const inicioDia = (dia: string) => new Date(`${dia}T00:00:00.000-03:00`);
// Os últimos n dias (do mais antigo para hoje)
export function diasAte(n: number) {
  const hoje = inicioDia(hojeLocal()).getTime();
  return Array.from({ length: n }, (_, i) =>
    new Date(hoje - (n - 1 - i) * 24 * H + 12 * H + FUSO).toISOString().slice(0, 10),
  );
}
export const grupoPagina = (p: string) =>
  p.startsWith("/produto/")
    ? "/produto/*"
    : p.startsWith("/catalogos/") && p !== "/catalogos"
      ? "/catalogos/*"
      : p;
const skuDaPagina = (path: string) => {
  if (!path.startsWith("/produto/")) return null;
  try {
    return decodeURIComponent(path.slice(9)).trim() || null;
  } catch {
    return null;
  }
};
const paisDe = (l: { country: string | null; country_code: string | null }) =>
  l.country || l.country_code || "—";
const regiaoDe = (l: {
  region: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
}) => l.region || l.city || l.country || l.country_code || "Desconhecida";
const canalDe = (f: string | null) => f || "direto";

function vazio(dia: string): ResumoDia {
  return {
    dia,
    dow: new Date(`${dia}T12:00:00Z`).getUTCDay(),
    visitas: 0,
    visitantes: 0,
    sessoes: 0,
    rejeitadas: 0,
    duracoes: {},
    whatsapp: 0,
    carrinho: 0,
    buscas: 0,
    cadastros: 0,
    acoes: 0,
    paginas: {},
    horas: Array(24).fill(0),
    celulas: {},
    cidades: {},
    paises: {},
    skus: {},
    cliques: {},
    rolagem: {},
    funil: {},
    fontes: {},
    aparelhos: {},
    navegadores: {},
    sistemas: {},
    idiomas: {},
    locais: {},
    termos: {},
    sessMobile: 0,
    sessPt: 0,
    sessLead: 0,
    sessCanal: {},
    leadsCanal: {},
    segmentos: {},
  };
}

// ---------------------------------------------------------------- cálculo de um dia
// O resumo do dia e as sessões do dia (para a Jornada e Visitantes), com uma leitura só
export async function calcularDiaCompleto(
  dia: string,
): Promise<{ resumo: ResumoDia; sessoes: SessaoBase[] }> {
  const ini = inicioDia(dia);
  const fim = new Date(ini.getTime() + 24 * H);
  const [ps, evs] = await Promise.all([
    prisma.site_visits.findMany({
      where: {
        created_at: { gte: ini, lt: fim },
        NOT: { path: { startsWith: EV } },
        ...whereHumano,
      },
      select: { ...SELECT_LINHA, path: true, language: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.site_eventos.findMany({
      where: { created_at: { gte: ini, lt: fim } },
      select: { ...SELECT_LINHA, tipo: true, dado: true },
      orderBy: { created_at: "asc" },
    }),
  ]);
  const r = vazio(dia);
  if (!ps.length && !evs.length) return { resumo: r, sessoes: [] };

  // Visitantes de hoje que já tinham vindo antes (recorrentes): perfil "oficina"
  const ids = [...new Set(ps.map((p) => p.visitor_id).filter(Boolean) as string[])];
  const voltou = new Set<string>();
  for (let i = 0; i < ids.length; i += 2000) {
    const rows = await prisma.site_visits.findMany({
      where: { created_at: { lt: ini }, visitor_id: { in: ids.slice(i, i + 2000) } },
      distinct: ["visitor_id"],
      select: { visitor_id: true },
    });
    for (const x of rows) if (x.visitor_id) voltou.add(x.visitor_id);
  }

  const sessaoDe = (l: { session_id: string | null; visitor_id: string | null }) =>
    l.session_id || `${l.visitor_id ?? "?"}-${dia}`;
  type S = {
    n: number;
    ini: number;
    fim: number;
    acao: boolean;
    canal: string;
    peca: boolean;
    carrinho: boolean;
    whatsapp: boolean;
    cadastro: boolean;
    localChave: string;
    localNome: string;
    localPais: string;
    mobile: boolean;
    pt: boolean;
    hora: number;
    pecas: Set<string>;
    leads: number;
    catalogos: boolean;
    b2b: boolean;
    voltou: boolean;
  };
  const sess = new Map<string, S>();
  const visitantes = new Set<string>();
  const uCel = new Map<string, Set<string>>();
  const uCid = new Map<string, Set<string>>();
  const uSku = new Map<string, Set<string>>();
  const uLoc = new Map<string, Set<string>>();
  const addU = (m: Map<string, Set<string>>, k: string, v: string | null) => {
    if (!v) return;
    (m.get(k) ?? m.set(k, new Set()).get(k)!).add(v);
  };
  const passo = 0.25; // ~25 km

  for (const p of ps) {
    const t = new Date(p.created_at.getTime() + FUSO);
    const hora = t.getUTCHours();
    const loc = localDe(p);
    const sku = skuDaPagina(p.path);
    const pt = p.language?.startsWith("pt:") ? "pt" : "es";
    r.visitas++;
    if (p.visitor_id) visitantes.add(p.visitor_id);
    r.horas[hora]++;
    inc(r.paginas, grupoPagina(p.path));
    inc(r.fontes, canalDe(p.fonte));
    inc(r.aparelhos, p.device || "desconhecido");
    inc(r.navegadores, p.browser || "desconhecido");
    inc(r.sistemas, p.os || "desconhecido");
    inc(r.idiomas, pt);
    inc(r.paises, paisDe(p));
    // Cidades e células do mapa
    const cidade = p.city || "Desconhecida";
    const kc = `${cidade}|${p.region ?? ""}|${p.country_code ?? ""}`;
    r.cidades[kc] ??= {
      cidade,
      regiao: p.region || "—",
      pais: paisDe(p),
      v: 0,
      u: 0,
      lat: p.latitude,
      lon: p.longitude,
    };
    r.cidades[kc].v++;
    addU(uCid, kc, p.visitor_id);
    if (p.latitude != null && p.longitude != null) {
      const lat = Math.round(p.latitude / passo) * passo;
      const lon = Math.round(p.longitude / passo) * passo;
      const k = `${lat}|${lon}`;
      r.celulas[k] ??= { lat, lon, v: 0, u: 0, c: {} };
      r.celulas[k].v++;
      inc(r.celulas[k].c, cidade);
      addU(uCel, k, p.visitor_id);
    }
    // Peças
    if (sku) {
      const x = (r.skus[sku] ??= { v: 0, u: 0, c: 0, w: 0, r: {}, pt: 0, cid: {} });
      x.v++;
      inc(x.r, regiaoDe(p));
      if (pt === "pt") x.pt++;
      const kk = `${p.city}|${p.region}`;
      x.cid[kk] ??= {
        cidade: p.city || "Desconhecida",
        regiao: p.region || "—",
        pais: paisDe(p),
        v: 0,
        lat: p.latitude,
        lon: p.longitude,
      };
      x.cid[kk].v++;
      addU(uSku, sku, p.visitor_id);
    }
    // Locais (Criador de anúncios)
    const L = (r.locais[loc.chave] ??= {
      nome: loc.nome,
      pais: loc.pais,
      v: 0,
      u: 0,
      s: 0,
      mob: 0,
      leads: 0,
      car: 0,
      bus: 0,
      cid: {},
      skus: {},
      termos: {},
    });
    L.v++;
    if (p.city) inc(L.cid, p.city);
    if (sku) inc(L.skus, sku);
    addU(uLoc, loc.chave, p.visitor_id);
    // Sessão
    const k = sessaoDe(p);
    let s = sess.get(k);
    if (!s) {
      s = {
        n: 0,
        ini: p.created_at.getTime(),
        fim: p.created_at.getTime(),
        acao: false,
        canal: canalDe(p.fonte),
        peca: false,
        carrinho: false,
        whatsapp: false,
        cadastro: false,
        localChave: loc.chave,
        localNome: loc.nome,
        localPais: loc.pais,
        mobile: p.device === "mobile" || p.device === "tablet",
        pt: pt === "pt",
        hora,
        pecas: new Set(),
        leads: 0,
        catalogos: false,
        b2b: false,
        voltou: !!p.visitor_id && voltou.has(p.visitor_id),
      };
      sess.set(k, s);
    }
    s.n++;
    s.fim = Math.max(s.fim, p.created_at.getTime());
    if (sku) {
      s.peca = true;
      s.pecas.add(sku);
    }
    if (p.path.startsWith("/catalogos")) s.catalogos = true;
    if (p.path.startsWith("/cotizar") || p.path.startsWith("/pedido-rapido")) s.b2b = true;
  }

  for (const e of evs) {
    const s = sess.get(sessaoDe(e));
    const loc = localDe(e);
    const L = r.locais[loc.chave];
    if (s && ["whatsapp", "cotacao", "busca", "carrinho", "popup"].includes(e.tipo)) {
      s.acao = true;
      s.fim = Math.max(s.fim, e.created_at.getTime());
    }
    if (e.tipo === "whatsapp" || e.tipo === "cotacao") {
      r.whatsapp++;
      r.acoes++;
      if (L) L.leads++;
      if (s) {
        s.whatsapp = true;
        s.leads++;
        inc(r.leadsCanal, s.canal);
      }
      const lista =
        e.tipo === "cotacao" ? e.dado.split(",") : e.dado.startsWith("contato:") ? [] : [e.dado];
      for (const sk of lista)
        if (sk.trim())
          (r.skus[sk.trim()] ??= { v: 0, u: 0, c: 0, w: 0, r: {}, pt: 0, cid: {} }).w++;
    } else if (e.tipo === "carrinho") {
      r.carrinho++;
      r.acoes++;
      if (L) L.car++;
      if (s) s.carrinho = true;
      if (e.dado.trim())
        (r.skus[e.dado.trim()] ??= { v: 0, u: 0, c: 0, w: 0, r: {}, pt: 0, cid: {} }).c++;
    } else if (e.tipo === "busca") {
      r.buscas++;
      if (L) L.bus++;
      const i = e.dado.indexOf("|");
      const termo = e.dado
        .slice(i + 1)
        .trim()
        .toLowerCase()
        .slice(0, 100);
      if (termo.length >= 2) {
        r.termos[termo] ??= { n: 0, r: 0 };
        r.termos[termo].n++;
        r.termos[termo].r = Number(e.dado.slice(0, i)) || 0;
        if (L) inc(L.termos, termo);
      }
    } else if (e.tipo === "popup") {
      if (e.dado === "cadastro" || e.dado === "login") {
        r.cadastros++;
        if (s) s.cadastro = true;
      }
    } else if (e.tipo === "clique") {
      const [p, x, y, tela, ...alvo] = e.dado.split("|");
      if (!p || isNaN(Number(x)) || isNaN(Number(y))) continue;
      const c = (r.cliques[grupoPagina(p)] ??= { n: 0, m: 0, g: {}, a: {} });
      c.n++;
      if (tela === "m") c.m++;
      inc(
        c.g,
        `${Math.min(19, Math.floor(Number(x) / 5))}|${Math.min(49, Math.floor(Number(y) / 2))}`,
      );
      inc(c.a, alvo.join("|") || "?");
    } else if (e.tipo === "rolagem") {
      const i = e.dado.lastIndexOf("|");
      const pct = Number(e.dado.slice(i + 1));
      if (i < 0 || isNaN(pct)) continue;
      const v = Math.max(0, Math.min(100, pct));
      const x = (r.rolagem[grupoPagina(e.dado.slice(0, i))] ??= {
        n: 0,
        soma: 0,
        a25: 0,
        a50: 0,
        a75: 0,
        a100: 0,
      });
      x.n++;
      x.soma += v;
      if (v >= 25) x.a25++;
      if (v >= 50) x.a50++;
      if (v >= 75) x.a75++;
      if (v >= 95) x.a100++;
    }
  }

  // Sessões → contagens, funil e perfis
  const novoSeg = (): SegmentoDia => ({
    n: 0,
    mob: 0,
    lead: 0,
    loc: {},
    can: {},
    horas: Array(24).fill(0),
    skus: {},
  });
  for (const s of sess.values()) {
    r.sessoes++;
    if (s.n === 1 && !s.acao) r.rejeitadas++;
    if (s.n > 1 || s.acao)
      inc(r.duracoes, String(Math.floor(Math.min(s.fim - s.ini, H) / 10_000) * 10));
    const f = (r.funil[s.canal] ??= [0, 0, 0, 0, 0]);
    f[0]++;
    if (s.peca) f[1]++;
    if (s.carrinho) f[2]++;
    if (s.whatsapp) f[3]++;
    if (s.cadastro) f[4]++;
    if (s.mobile) r.sessMobile++;
    if (s.pt) r.sessPt++;
    if (s.leads) r.sessLead++;
    inc(r.sessCanal, s.canal);
    const L = r.locais[s.localChave];
    if (L) {
      L.s++;
      if (s.mobile) L.mob++;
    }
    const interior = s.localPais === "UY" && !["Montevideo", "Canelones"].includes(s.localNome);
    const de: Record<string, boolean> = {
      produtor: interior && s.mobile,
      oficina: s.b2b || s.pecas.size >= 5 || s.voltou,
      comparador: s.pecas.size >= 2 && s.leads === 0,
      decidido: s.leads > 0 && s.n <= 3,
      catalogo: s.catalogos,
      fronteira: s.pt || s.localPais === "RS",
    };
    for (const id of SEGMENTOS_IDS) {
      if (!de[id]) continue;
      const g = (r.segmentos[id] ??= novoSeg());
      g.n++;
      if (s.mobile) g.mob++;
      if (s.leads) g.lead++;
      inc(g.loc, s.localNome);
      inc(g.can, s.canal);
      g.horas[s.hora]++;
      for (const sk of s.pecas) inc(g.skus, sk);
    }
  }
  r.visitantes = visitantes.size;
  for (const [k, u] of uCel) r.celulas[k].u = u.size;
  for (const [k, u] of uCid) r.cidades[k].u = u.size;
  for (const [k, u] of uSku) r.skus[k].u = u.size;
  for (const [k, u] of uLoc) r.locais[k].u = u.size;

  // Sessões (as mesmas regras da Jornada): páginas + eventos, sem cliques e rolagem
  const linhas: Linha[] = [
    ...(ps as Linha[]),
    ...evs
      .filter((e) => e.tipo !== "clique" && e.tipo !== "rolagem" && e.tipo !== "vitals")
      .map(
        ({ tipo, dado, id, ...e }) =>
          ({ ...e, id: -id, path: caminhoDoEvento({ tipo, dado }) }) as Linha,
      ),
  ].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  return { resumo: r, sessoes: sessoesDeLinhas(linhas) };
}

export const calcularDia = async (dia: string) => (await calcularDiaCompleto(dia)).resumo;

// ---------------------------------------------------------------- período
let primeira: { em: number; dia: string | null } | null = null;
async function primeiroDia() {
  if (primeira && Date.now() - primeira.em < 3600_000) return primeira.dia;
  const r = await prisma.site_visits.findFirst({
    orderBy: { created_at: "asc" },
    select: { created_at: true },
  });
  primeira = {
    em: Date.now(),
    dia: r ? new Date(r.created_at.getTime() + FUSO).toISOString().slice(0, 10) : null,
  };
  return primeira.dia;
}
let cacheHoje: { dia: string; em: number; r: Promise<ResumoDia> } | null = null;

// Calcula e grava um dia fechado: sessões em analise_sessao e o resumo em analise_dia (por último:
// o resumo salvo é o sinal de que o dia está completo)
// Gravações uma de cada vez (apagar e regravar sessões de dias diferentes ao mesmo tempo dá
// deadlock no MySQL); conflito com outro processo: tenta de novo
let filaGravacao: Promise<unknown> = Promise.resolve();
function naFila<T>(f: () => Promise<T>): Promise<T> {
  const r = filaGravacao.then(async () => {
    for (let tentativa = 1; ; tentativa++) {
      try {
        return await f();
      } catch (e: any) {
        if (e?.code !== "P2034" || tentativa >= 4) throw e;
        await new Promise((ok) => setTimeout(ok, 200 * tentativa));
      }
    }
  });
  filaGravacao = r.catch(() => {});
  return r;
}

async function gravarDia(d: string) {
  const { resumo, sessoes } = await calcularDiaCompleto(d);
  const dados = JSON.stringify(resumo);
  await naFila(() =>
    prisma.$transaction([
      prisma.analise_sessao.deleteMany({ where: { dia: d } }),
      ...(sessoes.length
        ? [
            prisma.analise_sessao.createMany({
              data: sessoes.map((x) => ({
                dia: d,
                id: x.id.slice(0, 191),
                visitante: x.visitante.slice(0, 191),
                inicio: new Date(x.inicio),
                pais: x.pais?.slice(0, 8) ?? null,
                dados: JSON.stringify(x),
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
      prisma.analise_dia.upsert({
        where: { dia: d },
        create: { dia: d, versao: VERSAO, dados },
        update: { versao: VERSAO, dados, gerado_em: new Date() },
      }),
    ]),
  );
  return resumo;
}

// Garante que os dias fechados pedidos estão calculados e gravados. Devolve os que calculou agora.
export async function garantirDias(fechados: string[], jaProntos?: Set<string>) {
  await eventosProntos();
  const prontos =
    jaProntos ??
    new Set(
      (fechados.length
        ? await prisma.analise_dia.findMany({
            where: { dia: { in: fechados }, versao: VERSAO },
            select: { dia: true },
          })
        : []
      ).map((x) => x.dia),
    );
  const inicio = await primeiroDia();
  // Antes da primeira visita do site: nada a calcular
  const calcular = fechados.filter((d) => !prontos.has(d) && inicio && d >= inicio);
  const novos = new Map<string, ResumoDia>();
  for (let i = 0; i < calcular.length; i += 4) {
    await Promise.all(
      calcular.slice(i, i + 4).map(async (d) => {
        // Outra tela já calculando o mesmo dia: espera o mesmo resultado
        let p = emCalculo.get(d);
        if (!p) {
          p = gravarDia(d).finally(() => emCalculo.delete(d));
          emCalculo.set(d, p);
        }
        novos.set(d, await p);
      }),
    );
  }
  return novos;
}
const emCalculo = new Map<string, Promise<ResumoDia>>();

// Dias de `de` até `ate` (AAAA-MM-DD, horário do Uruguai), inclusive
export function diasEntre(de: string, ate: string) {
  const out: string[] = [];
  for (let t = Date.parse(`${de}T12:00:00Z`); t <= Date.parse(`${ate}T12:00:00Z`); t += 24 * H)
    out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

// Resumos dos últimos `dias` dias (o último é hoje). Dias fechados que faltam são calculados e salvos.
export const resumosDoPeriodo = (dias: number) => resumosDosDias(diasAte(dias));

// Resumos de uma lista de dias (dias futuros saem vazios)
export async function resumosDosDias(lista: string[]): Promise<ResumoDia[]> {
  await eventosProntos();
  await (await import("./limpeza-estatisticas.server")).limparEstatisticas();
  const hoje = hojeLocal();
  const fechados = lista.filter((d) => d < hoje);
  const salvos = fechados.length
    ? await prisma.analise_dia.findMany({ where: { dia: { in: fechados }, versao: VERSAO } })
    : [];
  const porDia = new Map<string, ResumoDia>();
  for (const s of salvos) {
    try {
      porDia.set(s.dia, JSON.parse(s.dados));
    } catch {
      /* JSON corrompido: o dia é recalculado */
    }
  }
  for (const [d, r] of await garantirDias(fechados, new Set(porDia.keys()))) porDia.set(d, r);
  if (lista.includes(hoje)) {
    if (!cacheHoje || cacheHoje.dia !== hoje || Date.now() - cacheHoje.em > 60_000)
      cacheHoje = { dia: hoje, em: Date.now(), r: calcularDia(hoje) };
    porDia.set(hoje, await cacheHoje.r.catch(() => vazio(hoje)));
  }
  return lista.map((d) => porDia.get(d) ?? vazio(d));
}

// ---------------------------------------------------------------- ajudantes para somar
export const somar = (alvo: Cont, m: Cont, peso = 1) => {
  for (const k in m) alvo[k] = (alvo[k] ?? 0) + m[k] * peso;
  return alvo;
};
export const topoDe = (m: Cont, n: number) =>
  Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
// Mediana a partir do histograma de durações (segundos)
export function medianaDuracao(h: Cont) {
  const pares = Object.entries(h)
    .map(([k, v]) => [Number(k), v] as const)
    .sort((a, b) => a[0] - b[0]);
  const total = pares.reduce((a, [, v]) => a + v, 0);
  if (!total) return 0;
  let acum = 0;
  for (const [seg, v] of pares) {
    acum += v;
    if (acum > total / 2) return seg + 5;
  }
  return pares[pares.length - 1][0];
}

// Visitantes únicos do período e quantos voltaram: já tinham vindo antes do período ou vieram
// em dois dias diferentes dentro dele (direto no MySQL)
export async function visitantesDoPeriodo(dias: number) {
  await (await import("./limpeza-estatisticas.server")).limparEstatisticas();
  const desde = inicioDia(diasAte(dias)[0]);
  const [[a], [b]] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(DISTINCT visitor_id) AS n FROM site_visits WHERE created_at >= ? AND visitor_id IS NOT NULL AND ${sqlHumano()}`,
      desde,
    ),
    prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*) AS n FROM (
         SELECT v.visitor_id FROM site_visits v WHERE v.created_at >= ? AND v.visitor_id IS NOT NULL AND ${sqlHumano("v.")}
           GROUP BY v.visitor_id HAVING COUNT(DISTINCT DATE(DATE_SUB(v.created_at, INTERVAL 3 HOUR))) >= 2
         UNION
         SELECT DISTINCT v.visitor_id FROM site_visits v WHERE v.created_at >= ? AND v.visitor_id IS NOT NULL AND ${sqlHumano("v.")}
           AND EXISTS (SELECT 1 FROM site_visits o WHERE o.visitor_id = v.visitor_id AND o.created_at < ?)
       ) x`,
      desde,
      desde,
      desde,
    ),
  ]);
  const total = Number(a?.n ?? 0);
  const recorrentes = Number(b?.n ?? 0);
  return { total, recorrentes, novos: Math.max(0, total - recorrentes) };
}

// Visitas (páginas) no período imediatamente anterior, para comparar
export async function visitasAntes(dias: number) {
  const ini = inicioDia(diasAte(dias)[0]);
  return prisma.site_visits.count({
    where: {
      created_at: { gte: new Date(ini.getTime() - dias * 24 * H), lt: ini },
      NOT: { path: { startsWith: EV } },
      ...whereHumano,
    },
  });
}
