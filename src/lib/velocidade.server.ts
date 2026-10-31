// Velocidade real do site (Core Web Vitals) medida no aparelho de cada visitante (VisitTracker,
// evento "vitals": "<página>|<LCP ms>|<CLS>|<INP ms>|<celular|computador>"). O Google avalia pelo
// percentil 75 (o valor que 75% das visitas não passam). Limites "bom" do Google:
// LCP ≤ 2,5 s · CLS ≤ 0,1 · INP ≤ 200 ms.
import { caminhoInterno } from "./caminhos-pt";
import { prisma } from "./prisma";

export const LIMITES = { lcp: 2500, cls: 0.1, inp: 200 };

const p75 = (v: number[]) => {
  if (!v.length) return null;
  const o = [...v].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.ceil(o.length * 0.75) - 1)];
};

type Medidas = { visitas: number; lcp: number | null; cls: number | null; inp: number | null };
const resumir = (l: Array<{ lcp: number; cls: number; inp: number }>): Medidas => ({
  visitas: l.length,
  lcp: p75(l.map((x) => x.lcp)),
  cls: p75(l.map((x) => x.cls)),
  inp: p75(l.map((x) => x.inp).filter((x) => x > 0)),
});

// "/pt/produto/X" → "Peças (pt)": agrupa por tipo de página
const tipoDePagina = (p: string) => {
  const pt = p.startsWith("/pt");
  const c = caminhoInterno(p) || "/";
  const tipo =
    c === "/"
      ? "Início"
      : c.startsWith("/produto/")
        ? "Peça"
        : c.startsWith("/loja")
          ? "Loja / busca"
          : c.startsWith("/repuestos-agricolas")
            ? "Regiões"
            : c.startsWith("/repuestos")
              ? "Marcas e categorias"
              : "Outras";
  return `${tipo} (${pt ? "pt" : "es"})`;
};

export async function velocidade(dias: number) {
  const desde = new Date(Date.now() - dias * 86400_000);
  const rows = await prisma.site_eventos.findMany({
    where: { tipo: "vitals", created_at: { gte: desde } },
    select: { dado: true },
    take: 50_000,
  });
  const medidas = rows
    .map((r) => {
      const [pagina, lcp, cls, inp, aparelho] = r.dado.split("|");
      return {
        pagina,
        lcp: Number(lcp),
        cls: Number(cls),
        inp: Number(inp),
        aparelho: aparelho === "computador" ? "computador" : "celular",
      };
    })
    // Descarta medida quebrada (aba aberta horas em segundo plano etc.)
    .filter((m) => m.pagina && m.lcp > 0 && m.lcp < 60_000 && m.cls >= 0 && m.cls < 10);
  const grupos = new Map<string, typeof medidas>();
  for (const m of medidas) {
    const k = tipoDePagina(m.pagina);
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }
  return {
    limites: LIMITES,
    geral: resumir(medidas),
    celular: resumir(medidas.filter((m) => m.aparelho === "celular")),
    computador: resumir(medidas.filter((m) => m.aparelho === "computador")),
    porTipo: [...grupos]
      .map(([tipo, l]) => ({ tipo, ...resumir(l) }))
      .sort((a, b) => b.visitas - a.visitas),
  };
}
