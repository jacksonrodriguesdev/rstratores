import { prisma } from "./prisma";
import { PREFIXO_EVENTO } from "./eventos";
import { nomeEs } from "./pecas-es";
import type { Interesse } from "./interesse";

// Junta os eventos gravados por src/lib/eventos.ts nos últimos `dias` dias.
export async function resumoInteresse(dias: number): Promise<Interesse> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const [eventos, visitas] = await Promise.all([
    prisma.site_visits.findMany({
      where: { created_at: { gte: desde }, path: { startsWith: PREFIXO_EVENTO } },
      select: { path: true, created_at: true },
      take: 100000,
    }),
    prisma.site_visits.count({ where: { created_at: { gte: desde }, NOT: { path: { startsWith: PREFIXO_EVENTO } } } }),
  ]);

  const cliquesPorSku = new Map<string, number>();
  const termos = new Map<string, { termo: string; vezes: number; resultados: number }>();
  const porDia = new Map<string, { whatsapp: number; buscas: number }>();
  let cliquesWhatsapp = 0;
  let cotacoesCarrinho = 0;
  let buscas = 0;

  for (const e of eventos) {
    const [tipo, ...resto] = e.path.slice(PREFIXO_EVENTO.length).split("/");
    let dado = "";
    try {
      dado = decodeURIComponent(resto.join("/"));
    } catch {
      continue;
    }
    const dia = e.created_at.toISOString().slice(0, 10);
    const d = porDia.get(dia) ?? { whatsapp: 0, buscas: 0 };
    porDia.set(dia, d);

    if (tipo === "whatsapp" || tipo === "cotacao") {
      cliquesWhatsapp++;
      d.whatsapp++;
      if (tipo === "cotacao") cotacoesCarrinho++;
      for (const sku of dado.split(",")) {
        if (!sku || sku.startsWith("contato:")) continue;
        cliquesPorSku.set(sku, (cliquesPorSku.get(sku) ?? 0) + 1);
      }
    } else if (tipo === "busca") {
      buscas++;
      d.buscas++;
      const i = dado.indexOf("|");
      const total = Number(dado.slice(0, i));
      const termo = dado.slice(i + 1).trim().toLowerCase();
      if (!termo) continue;
      const t = termos.get(termo) ?? { termo, vezes: 0, resultados: total };
      t.vezes++;
      t.resultados = total;
      termos.set(termo, t);
    }
  }

  const topSkus = [...cliquesPorSku.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const nomes = topSkus.length
    ? await prisma.agricolas.findMany({ where: { sku: { in: topSkus.map(([s]) => s) } }, select: { sku: true, nome: true } })
    : [];
  const nomePorSku = new Map(nomes.map((n) => [n.sku, n.nome]));

  const listaTermos = [...termos.values()].sort((a, b) => b.vezes - a.vezes);
  return {
    dias,
    visitas,
    cliquesWhatsapp,
    cotacoesCarrinho,
    buscas,
    porDia: [...porDia.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([dia, v]) => ({ dia, ...v })),
    pecas: topSkus.map(([sku, cliques]) => {
      const nome = nomePorSku.get(sku) ?? "(peça não encontrada)";
      return { sku, nome, nomeEs: nomeEs(nome), cliques };
    }),
    termos: listaTermos.filter((t) => t.resultados > 0).slice(0, 30),
    semResultado: listaTermos.filter((t) => t.resultados === 0).slice(0, 50).map(({ termo, vezes }) => ({ termo, vezes })),
  };
}
