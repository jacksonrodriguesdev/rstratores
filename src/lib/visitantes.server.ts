// Painel de visitantes: agrega as sessões (visitas) do período — as dos dias fechados vêm prontas
// de analise_sessao (src/lib/jornadas.server.ts → sessoesDoPeriodo), só as de hoje são montadas na hora.
// Horários no fuso do Uruguai (UTC-3, sem horário de verão).
import { prisma } from "./prisma";
import { PREFIXO_EVENTO } from "./eventos";
import type { Visitantes } from "./visitantes";
import type { SessaoBase } from "./jornadas.server";

const FUSO = -3 * 3600 * 1000;
const diaLocal = (d: Date) => new Date(d.getTime() + FUSO).toISOString().slice(0, 10);

function contar<K>(mapa: Map<K, number>, k: K, n = 1) {
  mapa.set(k, (mapa.get(k) ?? 0) + n);
}
const ordenar = <T extends Record<string, any>>(a: T[], campo: keyof T) =>
  a.sort((x, y) => (y[campo] as number) - (x[campo] as number));

// pais: "UY" = só sessões localizadas no Uruguai (o tráfego pago é segmentado para o Uruguai)
export async function resumoVisitantes(
  dias: number,
  pais: string | null = null,
): Promise<Visitantes> {
  const { sessoesDoPeriodo } = await import("./jornadas.server");
  const { diasAte } = await import("./resumo-diario.server");
  const [{ sessoes: lista }, recentes] = await Promise.all([
    sessoesDoPeriodo(dias, pais),
    // As últimas páginas vistas (linhas brutas: só 60)
    prisma.site_visits.findMany({
      where: { NOT: { path: { startsWith: PREFIXO_EVENTO } }, ...(pais && { country_code: pais }) },
      orderBy: { id: "desc" },
      take: 60,
      select: {
        created_at: true,
        path: true,
        city: true,
        region: true,
        country_code: true,
        fonte: true,
        device: true,
        browser: true,
        visitor_id: true,
        ip_hash: true,
        id: true,
      },
    }),
  ]);
  const inicioLocal = (s: SessaoBase) => new Date(Date.parse(s.inicio) + FUSO);

  // Por dia (dia em que a sessão começou)
  const porDia = new Map<
    string,
    { visitas: number; visitantes: Set<string>; sessoes: number; whatsapp: number }
  >();
  for (const d of diasAte(dias))
    porDia.set(d, { visitas: 0, visitantes: new Set(), sessoes: 0, whatsapp: 0 });
  for (const s of lista) {
    const d = porDia.get(diaLocal(new Date(s.inicio)));
    if (!d) continue;
    d.visitas += s.paginas;
    d.visitantes.add(s.visitante);
    d.sessoes++;
    if (s.acoes.whatsapp) d.whatsapp++;
  }

  // Agrupamentos por sessão
  const agrupar = (chave: (s: SessaoBase) => string | null) => {
    const m = new Map<
      string,
      { sessoes: number; visitantes: Set<string>; whatsapp: number; amostra: SessaoBase }
    >();
    for (const s of lista) {
      const k = chave(s);
      if (!k) continue;
      let g = m.get(k);
      if (!g) {
        g = { sessoes: 0, visitantes: new Set(), whatsapp: 0, amostra: s };
        m.set(k, g);
      }
      g.sessoes++;
      g.visitantes.add(s.visitante);
      if (s.acoes.whatsapp) g.whatsapp++;
    }
    return [...m.entries()].map(([k, g]) => ({
      k,
      sessoes: g.sessoes,
      visitantes: g.visitantes.size,
      whatsapp: g.whatsapp,
      amostra: g.amostra,
    }));
  };

  const paises = ordenar(
    agrupar((s) => s.pais).map((g) => ({
      code: g.k,
      nome: g.amostra.paisNome ?? g.k,
      visitantes: g.visitantes,
      sessoes: g.sessoes,
      whatsapp: g.whatsapp,
    })),
    "visitantes",
  );
  const regioes = ordenar(
    agrupar((s) => (s.regiao ? `${s.pais}|${s.regiao}` : null)).map((g) => ({
      region: g.amostra.regiao!,
      code: g.amostra.pais,
      visitantes: g.visitantes,
      sessoes: g.sessoes,
      whatsapp: g.whatsapp,
    })),
    "visitantes",
  ).slice(0, 30);
  const cidades = ordenar(
    agrupar((s) => (s.cidade ? `${s.pais}|${s.regiao}|${s.cidade}` : null)).map((g) => ({
      city: g.amostra.cidade!,
      region: g.amostra.regiao,
      code: g.amostra.pais,
      lat: g.amostra.lat,
      lon: g.amostra.lon,
      visitantes: g.visitantes,
      sessoes: g.sessoes,
      whatsapp: g.whatsapp,
    })),
    "visitantes",
  ).slice(0, 150);
  const fontes = ordenar(
    agrupar((s) => `${s.fonte ?? "sem dado"}|${s.meio ?? ""}`).map((g) => ({
      fonte: g.amostra.fonte ?? "sem dado",
      meio: g.amostra.meio ?? "",
      visitantes: g.visitantes,
      sessoes: g.sessoes,
      whatsapp: g.whatsapp,
    })),
    "sessoes",
  );
  const campanhas = ordenar(
    agrupar((s) => s.campanha).map((g) => ({
      campanha: g.k,
      fonte: g.amostra.fonte ?? "",
      meio: g.amostra.meio ?? "",
      visitantes: g.visitantes,
      sessoes: g.sessoes,
      whatsapp: g.whatsapp,
    })),
    "sessoes",
  );
  const simples = (f: (s: SessaoBase) => string | null) =>
    ordenar(
      agrupar(f).map((g) => ({ nome: g.k, sessoes: g.sessoes })),
      "sessoes",
    );

  const paginas = new Map<string, number>();
  for (const s of lista)
    for (const [p, n] of Object.entries(s.caminhos ?? {})) contar(paginas, p, n);
  const entradas = new Map<string, number>();
  for (const s of lista) if (s.entrada) contar(entradas, s.entrada);

  // Mapa de calor: dia da semana x hora (início da sessão, hora do Uruguai)
  const horario = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of lista) {
    const d = inicioLocal(s);
    horario[d.getUTCDay()][d.getUTCHours()]++;
  }

  const visitas = lista.reduce((t, s) => t + s.paginas, 0);
  const visitantesUnicos = new Set(lista.map((s) => s.visitante)).size;
  const comWhats = lista.filter((s) => s.acoes.whatsapp).length;
  const uy = lista.filter((s) => s.pais === "UY").length;
  const comLocal = lista.filter((s) => s.pais).length;

  return {
    dias,
    resumo: {
      visitas,
      visitantes: visitantesUnicos,
      sessoes: lista.length,
      paginasPorSessao: lista.length ? +(visitas / lista.length).toFixed(1) : 0,
      cliquesWhatsapp: lista.reduce((t, s) => t + s.acoes.whatsapp, 0),
      sessoesComWhatsapp: comWhats,
      conversao: lista.length ? +((comWhats / lista.length) * 100).toFixed(1) : 0,
      pctUruguay: comLocal ? Math.round((uy / comLocal) * 100) : 0,
      pctComLocal: lista.length ? Math.round((comLocal / lista.length) * 100) : 0,
    },
    porDia: [...porDia.entries()].map(([dia, d]) => ({
      dia,
      visitas: d.visitas,
      visitantes: d.visitantes.size,
      sessoes: d.sessoes,
      whatsapp: d.whatsapp,
    })),
    paises,
    regioes,
    // Tráfego pago (anúncios) por departamento: onde o dinheiro dos anúncios está rendendo
    pagoPorRegiao: ordenar(
      agrupar((s) => (s.meio === "pago" ? (s.regiao ?? "(sem local)") : null)).map((g) => ({
        region: g.k,
        code: g.amostra.pais,
        visitantes: g.visitantes,
        sessoes: g.sessoes,
        whatsapp: g.whatsapp,
      })),
      "sessoes",
    ),
    pagoForaDoPais: pais
      ? 0
      : lista.filter((s) => s.meio === "pago" && s.pais && s.pais !== "UY").length,
    cidades,
    fontes,
    campanhas,
    dispositivos: simples((s) => s.aparelho),
    navegadores: simples((s) => s.navegador).slice(0, 8),
    sistemas: simples((s) => s.sistema),
    paginas: [...paginas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([path, visitas]) => ({ path, visitas })),
    entradas: [...entradas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([path, sessoes]) => ({ path, sessoes })),
    horario,
    recentes: recentes.map((l) => ({
      quando: l.created_at.toISOString(),
      path: l.path,
      city: l.city,
      region: l.region,
      code: l.country_code,
      fonte: l.fonte,
      device: l.device,
      browser: l.browser,
      visitante: (l.visitor_id || l.ip_hash || `v${l.id}`).slice(0, 8),
    })),
  };
}
