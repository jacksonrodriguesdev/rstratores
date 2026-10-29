// Visitantes anônimos quentes (Admin → Captação): quem viu várias peças sem conta. Não dá para
// chamar quem não deixou contato, mas mostra de onde vem gente interessada que não converte
// (anúncio, campanha, página de entrada, cidade) e quais peças ela olha. Cada visitante é o
// identificador anônimo do navegador (visitor_id); o IP nunca é gravado.
import { prisma } from "./prisma";

const PECA = /^(?:\/pt)?\/produto\/([^/?#]+)/;
const skuDe = (path: string) => {
  const m = path.match(PECA);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).trim();
  } catch {
    return m[1];
  }
};

export type SituacaoVisitante = "sem_contato" | "deixou_whatsapp" | "pediu_whatsapp";
export type VisitanteQuente = {
  id: string; // 8 primeiros caracteres do visitor_id
  pecas: number; // peças diferentes vistas
  vistas: number; // páginas de peça abertas
  sessoes: number;
  dias: number; // dias diferentes em que voltou
  primeira: string;
  ultima: string;
  cidade: string | null;
  pais: string | null;
  aparelho: string | null;
  origem: string; // fonte · campanha da primeira visita
  entrada: string | null; // página de entrada da primeira visita
  situacao: SituacaoVisitante;
  telefone: string | null; // se deixou o WhatsApp no pop-up
  top: Array<{ sku: string; nome: string; vezes: number }>;
};
export type GrupoQuente = {
  chave: string;
  visitantes: number;
  quentes: number;
  semContato: number;
  contato: number; // quentes que deixaram contato ou pediram
};

export async function visitantesQuentes(dias = 30, minimo = 3, pais = "UY") {
  const desde = new Date(Date.now() - dias * 86400_000);
  // Visitantes com conta (em qualquer momento) não são anônimos
  const vistas = await prisma.site_visits.findMany({
    where: {
      created_at: { gte: desde },
      visitor_id: { not: null },
      ...(pais && { country_code: pais }),
    },
    select: {
      visitor_id: true,
      session_id: true,
      path: true,
      created_at: true,
      user_id: true,
      city: true,
      country_code: true,
      device: true,
      fonte: true,
      utm_campaign: true,
      entrada: true,
    },
    orderBy: { id: "asc" },
    take: 400_000,
  });

  type Acc = {
    vid: string;
    comConta: boolean;
    pecas: Map<string, number>;
    vistas: number;
    sessoes: Set<string>;
    dias: Set<string>;
    primeira: Date;
    ultima: Date;
    cidade: string | null;
    pais: string | null;
    aparelho: string | null;
    origem: string;
    entrada: string | null;
  };
  const porVis = new Map<string, Acc>();
  for (const v of vistas) {
    const vid = v.visitor_id!;
    let a = porVis.get(vid);
    if (!a) {
      a = {
        vid,
        comConta: false,
        pecas: new Map(),
        vistas: 0,
        sessoes: new Set(),
        dias: new Set(),
        primeira: v.created_at,
        ultima: v.created_at,
        cidade: v.city,
        pais: v.country_code,
        aparelho: v.device,
        origem: [v.fonte || "direto", v.utm_campaign].filter(Boolean).join(" · "),
        entrada: v.path.startsWith("/_evento") ? null : v.path.split("?")[0].slice(0, 120),
      };
      porVis.set(vid, a);
    }
    if (v.user_id) a.comConta = true;
    if (v.session_id) a.sessoes.add(v.session_id);
    a.dias.add(v.created_at.toISOString().slice(0, 10));
    a.ultima = v.created_at;
    if (!a.cidade && v.city) a.cidade = v.city;
    const sku = skuDe(v.path);
    if (sku) {
      a.vistas++;
      a.pecas.set(sku, (a.pecas.get(sku) ?? 0) + 1);
    }
  }
  const anonimos = [...porVis.values()].filter((a) => !a.comConta);
  const quentes = anonimos.filter((a) => a.pecas.size >= minimo);
  const ids = quentes.map((q) => q.vid);

  // Quem pediu pelo WhatsApp/cotação e quem deixou o WhatsApp no pop-up
  const [pediram, contatos] = await Promise.all([
    ids.length
      ? prisma.site_eventos.findMany({
          where: { visitor_id: { in: ids }, tipo: { in: ["whatsapp", "cotacao"] } },
          select: { visitor_id: true },
          distinct: ["visitor_id"],
        })
      : [],
    ids.length
      ? prisma
          .$queryRawUnsafe<Array<{ visitor_id: string; telefone: string }>>(
            `SELECT visitor_id, telefone FROM contatos_whatsapp WHERE visitor_id IN (${ids.map(() => "?").join(",")})`,
            ...ids,
          )
          .catch(() => [])
      : [],
  ]);
  const pediu = new Set(pediram.map((p) => p.visitor_id));
  const tel = new Map(contatos.map((c) => [c.visitor_id, c.telefone]));
  const situacao = (vid: string): SituacaoVisitante =>
    tel.has(vid) ? "deixou_whatsapp" : pediu.has(vid) ? "pediu_whatsapp" : "sem_contato";

  // Nomes das peças mais vistas
  const skus = new Set<string>();
  for (const q of quentes)
    [...q.pecas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([s]) => skus.add(s));
  const nomes = skus.size
    ? await prisma.agricolas.findMany({
        where: { sku: { in: [...skus] } },
        select: { sku: true, nome: true, nome_es: true },
      })
    : [];
  const nome = new Map(nomes.map((n) => [n.sku.trim(), n.nome_es || n.nome]));

  // Por origem, página de entrada e cidade: onde está a gente interessada que não converte
  const agrupar = (chave: (a: Acc) => string | null) => {
    const g = new Map<string, GrupoQuente>();
    for (const a of anonimos) {
      const k = chave(a);
      if (!k) continue;
      const x = g.get(k) ?? { chave: k, visitantes: 0, quentes: 0, semContato: 0, contato: 0 };
      x.visitantes++;
      if (a.pecas.size >= minimo) {
        x.quentes++;
        if (situacao(a.vid) === "sem_contato") x.semContato++;
        else x.contato++;
      }
      g.set(k, x);
    }
    return [...g.values()]
      .filter((x) => x.quentes > 0)
      .sort((a, b) => b.semContato - a.semContato || b.quentes - a.quentes)
      .slice(0, 15);
  };

  const lista: VisitanteQuente[] = quentes
    .sort((a, b) => b.pecas.size - a.pecas.size || +b.ultima - +a.ultima)
    .slice(0, 150)
    .map((a) => ({
      id: a.vid.slice(0, 8),
      pecas: a.pecas.size,
      vistas: a.vistas,
      sessoes: a.sessoes.size,
      dias: a.dias.size,
      primeira: a.primeira.toISOString(),
      ultima: a.ultima.toISOString(),
      cidade: a.cidade,
      pais: a.pais,
      aparelho: a.aparelho,
      origem: a.origem,
      entrada: a.entrada,
      situacao: situacao(a.vid),
      telefone: tel.get(a.vid) ?? null,
      top: [...a.pecas.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 5)
        .map(([sku, vezes]) => ({ sku, nome: nome.get(sku) ?? sku, vezes })),
    }));

  const semContato = quentes.filter((q) => situacao(q.vid) === "sem_contato").length;
  return {
    dias,
    minimo,
    pais,
    resumo: {
      anonimos: anonimos.length,
      viramPecas: anonimos.filter((a) => a.pecas.size > 0).length,
      quentes: quentes.length,
      semContato,
      deixaramWhatsapp: quentes.filter((q) => tel.has(q.vid)).length,
      pediram: quentes.filter((q) => !tel.has(q.vid) && pediu.has(q.vid)).length,
      voltaram: quentes.filter((q) => q.dias.size > 1).length,
    },
    porOrigem: agrupar((a) => a.origem),
    porEntrada: agrupar((a) => a.entrada),
    porCidade: agrupar((a) => a.cidade),
    lista,
  };
}
