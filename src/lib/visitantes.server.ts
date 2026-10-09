// Painel de visitantes: agrega site_visits (páginas vistas + eventos) por período.
// Horários no fuso do Uruguai (UTC-3, sem horário de verão).
import { prisma } from "./prisma";
import { PREFIXO_EVENTO } from "./eventos";
import type { Visitantes } from "./visitantes";

const FUSO = -3 * 3600 * 1000;
const diaLocal = (d: Date) => new Date(d.getTime() + FUSO).toISOString().slice(0, 10);

type Linha = {
  id: number;
  created_at: Date;
  path: string;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  visitor_id: string | null;
  session_id: string | null;
  ip_hash: string | null;
  fonte: string | null;
  meio: string | null;
  utm_campaign: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer_host: string | null;
};

function contar<K>(mapa: Map<K, number>, k: K, n = 1) {
  mapa.set(k, (mapa.get(k) ?? 0) + n);
}
const ordenar = <T extends Record<string, any>>(a: T[], campo: keyof T) => a.sort((x, y) => (y[campo] as number) - (x[campo] as number));

export async function resumoVisitantes(dias: number): Promise<Visitantes> {
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000);
  let linhas: Linha[];
  try {
    linhas = (await prisma.site_visits.findMany({
      where: { created_at: { gte: desde } },
      orderBy: { created_at: "asc" },
      take: 300000,
      select: {
        id: true, created_at: true, path: true, country: true, country_code: true, region: true, city: true,
        latitude: true, longitude: true, visitor_id: true, session_id: true, ip_hash: true, fonte: true,
        meio: true, utm_campaign: true, device: true, browser: true, os: true, referrer_host: true,
      },
    })) as Linha[];
  } catch {
    // Banco sem as colunas novas: só o básico
    linhas = (await prisma.site_visits.findMany({
      where: { created_at: { gte: desde } },
      orderBy: { created_at: "asc" },
      take: 300000,
      select: { id: true, created_at: true, path: true, country: true, country_code: true, region: true, city: true },
    })).map((l) => ({ ...l, latitude: null, longitude: null, visitor_id: null, session_id: null, ip_hash: null, fonte: null, meio: null, utm_campaign: null, device: null, browser: null, os: null, referrer_host: null }));
  }

  const visitante = (l: Linha) => l.visitor_id || l.ip_hash || `v${l.id}`;
  const sessaoDe = (l: Linha) => l.session_id || `${visitante(l)}|${diaLocal(l.created_at)}`;

  // Sessões: atributos da primeira linha (origem, local, aparelho) e se houve clique no WhatsApp
  type Sessao = { primeira: Linha; visitante: string; paginas: number; whatsapp: number; buscas: number; entrada: string };
  const sessoes = new Map<string, Sessao>();
  const visitas: Linha[] = [];
  let cliquesWhatsapp = 0;
  for (const l of linhas) {
    const k = sessaoDe(l);
    let s = sessoes.get(k);
    const evento = l.path.startsWith(PREFIXO_EVENTO);
    if (!s) {
      s = { primeira: l, visitante: visitante(l), paginas: 0, whatsapp: 0, buscas: 0, entrada: evento ? "" : l.path };
      sessoes.set(k, s);
    }
    if (!s.primeira.city && l.city) s.primeira = { ...s.primeira, city: l.city, region: l.region, country: l.country, country_code: l.country_code, latitude: l.latitude, longitude: l.longitude };
    if (evento) {
      const tipo = l.path.slice(PREFIXO_EVENTO.length).split("/")[0];
      if (tipo === "whatsapp" || tipo === "cotacao") { s.whatsapp++; cliquesWhatsapp++; }
      if (tipo === "busca") s.buscas++;
    } else {
      s.paginas++;
      if (!s.entrada) s.entrada = l.path;
      visitas.push(l);
    }
  }
  const lista = [...sessoes.values()].filter((s) => s.paginas > 0 || s.whatsapp > 0);

  // Por dia
  const porDia = new Map<string, { visitas: number; visitantes: Set<string>; sessoes: number; whatsapp: number }>();
  for (let d = 0; d < dias; d++) {
    porDia.set(diaLocal(new Date(Date.now() - (dias - 1 - d) * 24 * 3600 * 1000)), { visitas: 0, visitantes: new Set(), sessoes: 0, whatsapp: 0 });
  }
  for (const l of visitas) {
    const d = porDia.get(diaLocal(l.created_at));
    if (d) { d.visitas++; d.visitantes.add(visitante(l)); }
  }
  for (const s of lista) {
    const d = porDia.get(diaLocal(s.primeira.created_at));
    if (d) { d.sessoes++; d.whatsapp += s.whatsapp ? 1 : 0; }
  }

  // Agrupamentos por sessão
  const agrupar = (chave: (s: Sessao) => string | null) => {
    const m = new Map<string, { sessoes: number; visitantes: Set<string>; whatsapp: number; amostra: Sessao }>();
    for (const s of lista) {
      const k = chave(s);
      if (!k) continue;
      let g = m.get(k);
      if (!g) { g = { sessoes: 0, visitantes: new Set(), whatsapp: 0, amostra: s }; m.set(k, g); }
      g.sessoes++;
      g.visitantes.add(s.visitante);
      if (s.whatsapp) g.whatsapp++;
    }
    return [...m.entries()].map(([k, g]) => ({ k, sessoes: g.sessoes, visitantes: g.visitantes.size, whatsapp: g.whatsapp, amostra: g.amostra }));
  };

  const paises = ordenar(agrupar((s) => s.primeira.country_code).map((g) => ({ code: g.k, nome: g.amostra.primeira.country ?? g.k, visitantes: g.visitantes, sessoes: g.sessoes, whatsapp: g.whatsapp })), "visitantes");
  const regioes = ordenar(agrupar((s) => (s.primeira.region ? `${s.primeira.country_code}|${s.primeira.region}` : null)).map((g) => ({ region: g.amostra.primeira.region!, code: g.amostra.primeira.country_code, visitantes: g.visitantes, sessoes: g.sessoes, whatsapp: g.whatsapp })), "visitantes").slice(0, 30);
  const cidades = ordenar(agrupar((s) => (s.primeira.city ? `${s.primeira.country_code}|${s.primeira.region}|${s.primeira.city}` : null)).map((g) => ({
    city: g.amostra.primeira.city!, region: g.amostra.primeira.region, code: g.amostra.primeira.country_code,
    lat: g.amostra.primeira.latitude, lon: g.amostra.primeira.longitude, visitantes: g.visitantes, sessoes: g.sessoes, whatsapp: g.whatsapp,
  })), "visitantes").slice(0, 150);
  const fontes = ordenar(agrupar((s) => `${s.primeira.fonte ?? "sem dado"}|${s.primeira.meio ?? ""}`).map((g) => ({ fonte: g.amostra.primeira.fonte ?? "sem dado", meio: g.amostra.primeira.meio ?? "", visitantes: g.visitantes, sessoes: g.sessoes, whatsapp: g.whatsapp })), "sessoes");
  const campanhas = ordenar(agrupar((s) => s.primeira.utm_campaign).map((g) => ({ campanha: g.k, fonte: g.amostra.primeira.fonte ?? "", meio: g.amostra.primeira.meio ?? "", visitantes: g.visitantes, sessoes: g.sessoes, whatsapp: g.whatsapp })), "sessoes");
  const simples = (f: (s: Sessao) => string | null) => ordenar(agrupar(f).map((g) => ({ nome: g.k, sessoes: g.sessoes })), "sessoes");

  const paginas = new Map<string, number>();
  for (const l of visitas) contar(paginas, l.path);
  const entradas = new Map<string, number>();
  for (const s of lista) if (s.entrada) contar(entradas, s.entrada);

  // Mapa de calor: dia da semana x hora (início da sessão, hora do Uruguai)
  const horario = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of lista) {
    const d = new Date(s.primeira.created_at.getTime() + FUSO);
    horario[d.getUTCDay()][d.getUTCHours()]++;
  }

  const visitantesUnicos = new Set(lista.map((s) => s.visitante)).size;
  const comWhats = lista.filter((s) => s.whatsapp).length;
  const uy = lista.filter((s) => s.primeira.country_code === "UY").length;
  const comLocal = lista.filter((s) => s.primeira.country_code).length;

  return {
    dias,
    resumo: {
      visitas: visitas.length,
      visitantes: visitantesUnicos,
      sessoes: lista.length,
      paginasPorSessao: lista.length ? +(visitas.length / lista.length).toFixed(1) : 0,
      cliquesWhatsapp,
      sessoesComWhatsapp: comWhats,
      conversao: lista.length ? +((comWhats / lista.length) * 100).toFixed(1) : 0,
      pctUruguay: comLocal ? Math.round((uy / comLocal) * 100) : 0,
      pctComLocal: lista.length ? Math.round((comLocal / lista.length) * 100) : 0,
    },
    porDia: [...porDia.entries()].map(([dia, d]) => ({ dia, visitas: d.visitas, visitantes: d.visitantes.size, sessoes: d.sessoes, whatsapp: d.whatsapp })),
    paises,
    regioes,
    cidades,
    fontes,
    campanhas,
    dispositivos: simples((s) => s.primeira.device),
    navegadores: simples((s) => s.primeira.browser).slice(0, 8),
    sistemas: simples((s) => s.primeira.os),
    paginas: [...paginas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([path, visitas]) => ({ path, visitas })),
    entradas: [...entradas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([path, sessoes]) => ({ path, sessoes })),
    horario,
    recentes: visitas.slice(-60).reverse().map((l) => ({
      quando: l.created_at.toISOString(), path: l.path, city: l.city, region: l.region, code: l.country_code,
      fonte: l.fonte, device: l.device, browser: l.browser, visitante: visitante(l).slice(0, 8),
    })),
  };
}
