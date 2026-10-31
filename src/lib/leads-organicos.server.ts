// Leads do Google (busca orgânica): visitas que chegaram por uma busca sem anúncio (Google, Bing,
// DuckDuckGo…) e o que fizeram — pedido de preço no WhatsApp, cotação, carrinho. Mostra por qual
// página entraram (a página que o Google mostrou) e quais peças pediram. Admin → Google.
import { caminhoInterno } from "./caminhos-pt";
import { prisma } from "./prisma";
import { sqlHumano } from "./rastreio.server";

const H = 3600_000;
const FUSO = -3 * H; // Uruguai
const diaLocal = (d: Date) => new Date(d.getTime() + FUSO).toISOString().slice(0, 10);
const LEAD = ["whatsapp", "cotacao"];
const ACOES = [...LEAD, "carrinho"];

export type LeadsOrganicos = {
  sessoes: number;
  leads: number; // sessões com pedido no WhatsApp ou cotação
  shopping: { sessoes: number; leads: number };
  whatsapp: number;
  carrinho: number;
  taxa: number; // leads / sessões
  porDia: Array<{ dia: string; sessoes: number; leads: number }>;
  paginas: Array<{ pagina: string; sessoes: number; leads: number }>;
  pecas: Array<{ peca: string; pedidos: number }>;
  recentes: Array<{
    quando: string;
    entrada: string;
    acao: string;
    dado: string;
    cidade: string | null;
  }>;
};

// "/pt/produto/X" e "/produto/X" contam como a mesma página; parâmetros saem
const pagina = (p: string) => caminhoInterno(p.split(/[?#]/)[0]) || "/";

export async function leadsOrganicos(dias: number): Promise<LeadsOrganicos> {
  const { limparEstatisticas } = await import("./limpeza-estatisticas.server");
  await limparEstatisticas();
  const desde = new Date(Date.now() - dias * 24 * H);
  const linhas = await prisma.$queryRawUnsafe<
    Array<{
      session_id: string;
      path: string;
      created_at: Date;
      city: string | null;
      meio: string | null;
    }>
  >(
    `SELECT session_id, path, created_at, city, meio FROM site_visits
     WHERE created_at >= ? AND session_id IS NOT NULL AND meio IN ('orgânico', 'shopping') AND ${sqlHumano()}
     ORDER BY created_at ASC`,
    desde,
  );
  // Primeira página de cada sessão = a página que o buscador mostrou
  const sessoes = new Map<
    string,
    { entrada: string; dia: string; cidade: string | null; shopping: boolean }
  >();
  for (const l of linhas)
    if (!sessoes.has(l.session_id))
      sessoes.set(l.session_id, {
        entrada: pagina(l.path),
        dia: diaLocal(new Date(l.created_at)),
        cidade: l.city,
        shopping: l.meio === "shopping",
      });

  const ids = [...sessoes.keys()];
  const eventos: Array<{ session_id: string; tipo: string; dado: string; created_at: Date }> = [];
  for (let i = 0; i < ids.length; i += 500) {
    const lote = ids.slice(i, i + 500);
    eventos.push(
      ...(await prisma.$queryRawUnsafe<typeof eventos>(
        `SELECT session_id, tipo, dado, created_at FROM site_eventos
         WHERE session_id IN (${lote.map(() => "?").join(",")})
           AND tipo IN (${ACOES.map((t) => `'${t}'`).join(",")})
         ORDER BY created_at DESC`,
        ...lote,
      )),
    );
  }

  const comLead = new Set(eventos.filter((e) => LEAD.includes(e.tipo)).map((e) => e.session_id));
  const porDia = new Map<string, { sessoes: number; leads: number }>();
  const porPagina = new Map<string, { sessoes: number; leads: number }>();
  for (const [id, s] of sessoes) {
    const d = porDia.get(s.dia) ?? { sessoes: 0, leads: 0 };
    const p = porPagina.get(s.entrada) ?? { sessoes: 0, leads: 0 };
    d.sessoes++;
    p.sessoes++;
    if (comLead.has(id)) {
      d.leads++;
      p.leads++;
    }
    porDia.set(s.dia, d);
    porPagina.set(s.entrada, p);
  }
  const pecas = new Map<string, number>();
  for (const e of eventos)
    if (LEAD.includes(e.tipo) && e.dado) pecas.set(e.dado, (pecas.get(e.dado) ?? 0) + 1);

  // Dias sem visita também aparecem (gráfico contínuo)
  const serie: LeadsOrganicos["porDia"] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const dia = diaLocal(new Date(Date.now() - i * 24 * H));
    serie.push({ dia, ...(porDia.get(dia) ?? { sessoes: 0, leads: 0 }) });
  }

  const doShopping = [...sessoes].filter(([, s]) => s.shopping).map(([id]) => id);
  return {
    sessoes: sessoes.size,
    leads: comLead.size,
    // Parte que veio da aba Shopping (listagens grátis do Merchant Center)
    shopping: {
      sessoes: doShopping.length,
      leads: doShopping.filter((id) => comLead.has(id)).length,
    },
    whatsapp: eventos.filter((e) => e.tipo === "whatsapp").length,
    carrinho: eventos.filter((e) => e.tipo === "carrinho").length,
    taxa: sessoes.size ? comLead.size / sessoes.size : 0,
    porDia: serie,
    paginas: [...porPagina]
      .map(([pagina, v]) => ({ pagina, ...v }))
      .sort((a, b) => b.leads - a.leads || b.sessoes - a.sessoes)
      .slice(0, 20),
    pecas: [...pecas]
      .map(([peca, pedidos]) => ({ peca, pedidos }))
      .sort((a, b) => b.pedidos - a.pedidos)
      .slice(0, 15),
    recentes: eventos
      .filter((e) => LEAD.includes(e.tipo))
      .slice(0, 20)
      .map((e) => ({
        quando: new Date(e.created_at).toISOString(),
        entrada: sessoes.get(e.session_id)?.entrada ?? "",
        acao:
          (e.tipo === "whatsapp" ? "WhatsApp" : "Cotação") +
          (sessoes.get(e.session_id)?.shopping ? " (Shopping)" : ""),
        dado: e.dado,
        cidade: sessoes.get(e.session_id)?.cidade ?? null,
      })),
  };
}
