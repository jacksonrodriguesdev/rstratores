// Home personalizada («Para vos»): a partir do que o visitante já fez no site — peças abertas
// (no navegador e no histórico anônimo do servidor), buscas, carrinho e pedidos no WhatsApp —
// escolhe peças da marca e da categoria que mais interessam e repete a última busca.
// Tudo anônimo (identificador do navegador, sem dados pessoais). Só peças com foto e preço.
import { fotoInvalida } from "./fotos";

const DIA = 86_400_000;
export type SecaoParaVoce = {
  tipo: "vistos" | "marca" | "categoria" | "busca";
  titulo: { es: string; pt: string };
  link?: string;
  produtos: any[];
};

const conta = (m: Map<string, number>, k: string | null | undefined, n: number) => {
  if (k) m.set(k, (m.get(k) ?? 0) + n);
};
const maior = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

export async function paraVoce(o: { vistos: string[]; visitorId?: string | null }) {
  const { prisma } = await import("./prisma");
  const { semCusto } = await import("./precos.server");
  const { categoriaEs } = await import("./pecas-es");
  const vid = String(o.visitorId ?? "")
    .trim()
    .slice(0, 64);
  const desde = new Date(Date.now() - 90 * DIA);

  // ---- histórico: navegador + servidor (anônimo, pelo identificador do navegador)
  const [visitas, eventos] = vid
    ? await Promise.all([
        prisma.site_visits.findMany({
          where: {
            visitor_id: vid,
            created_at: { gte: desde },
            OR: [{ path: { startsWith: "/produto/" } }, { path: { startsWith: "/pt/produto/" } }],
          },
          select: { path: true },
          orderBy: { created_at: "desc" },
          take: 300,
        }),
        prisma.site_eventos.findMany({
          where: {
            visitor_id: vid,
            created_at: { gte: desde },
            tipo: { in: ["busca", "carrinho", "whatsapp"] },
          },
          select: { tipo: true, dado: true },
          orderBy: { created_at: "desc" },
          take: 100,
        }),
      ])
    : [[], []];
  const skuDoCaminho = (p: string) => {
    try {
      return decodeURIComponent(p.replace(/^\/(pt\/)?produto\//, "").split(/[?#/]/)[0]).trim();
    } catch {
      return "";
    }
  };
  const vistos = [
    ...new Set([
      ...o.vistos.map((s) => String(s).trim()),
      ...visitas.map((v) => skuDoCaminho(v.path)),
    ]),
  ]
    .filter(Boolean)
    .slice(0, 60);
  const fortes = eventos
    .filter((e) => e.tipo !== "busca")
    .map((e) => String(e.dado ?? "").trim())
    .filter(Boolean);
  const ultimaBusca = eventos
    .filter((e) => e.tipo === "busca")
    .map((e) => {
      const [n, ...t] = String(e.dado ?? "").split("|");
      return { resultados: Number(n) || 0, termo: t.join("|").trim() };
    })
    .find((b) => b.resultados > 0 && b.termo.length >= 3)?.termo;

  if (!vistos.length && !fortes.length && !ultimaBusca) return { secoes: [] as SecaoParaVoce[] };

  // ---- perfil: marcas e categorias (peça vista vale 1; carrinho/WhatsApp vale 3)
  const conhecidas = await prisma.agricolas.findMany({
    where: {
      OR: [
        { sku: { in: [...vistos, ...fortes].slice(0, 120) } },
        { codigo_fabricante: { in: fortes.slice(0, 40) } },
      ],
    },
    select: { sku: true, marca: true, categoria: true, codigo_fabricante: true },
  });
  const marcas = new Map<string, number>();
  const categorias = new Map<string, number>();
  for (const p of conhecidas) {
    const forte =
      fortes.includes(p.sku.trim()) ||
      (!!p.codigo_fabricante && fortes.includes(p.codigo_fabricante.trim()));
    conta(marcas, p.marca, forte ? 3 : 1);
    conta(categorias, p.categoria, forte ? 3 : 1);
  }
  const marca = maior(marcas);
  const categoria = maior(categorias);
  const jaVistos = new Set(vistos);

  // Peças com foto válida e preço, sem as já vistas
  const comFoto = (rows: any[]) =>
    rows.filter((r) => !fotoInvalida(r.imagem_principal) && !jaVistos.has(String(r.sku).trim()));
  const buscar = async (where: any, n = 12, excluir: string[] = []) => {
    const rows = await prisma.agricolas.findMany({
      where: {
        duplicado_de: null,
        preco_brl: { gt: 0 },
        imagem_principal: { not: null },
        sku: { notIn: [...vistos, ...excluir].slice(0, 200) },
        ...where,
      },
      orderBy: [{ estoque: "desc" }, { sku: "asc" }],
      take: n * 3,
    });
    return comFoto(rows)
      .slice(0, n)
      .map((r) => semCusto(r));
  };

  const secoes: SecaoParaVoce[] = [];
  // 1. Seguí viendo (ordem do mais recente)
  if (vistos.length) {
    const rows = await prisma.agricolas.findMany({
      where: { sku: { in: vistos.slice(0, 12) }, duplicado_de: null },
    });
    const porSku = new Map(rows.map((r) => [r.sku.trim(), r]));
    const lista = vistos
      .slice(0, 12)
      .map((s) => porSku.get(s))
      .filter(Boolean)
      .map((r) => semCusto(r as any));
    if (lista.length)
      secoes.push({
        tipo: "vistos",
        titulo: { es: "Seguí viendo", pt: "Continue vendo" },
        produtos: lista,
      });
  }
  // 2. Marca que mais interessa
  const usados: string[] = [];
  if (marca) {
    const lista = await buscar({ marca });
    if (lista.length >= 4) {
      usados.push(...lista.map((p: any) => p.sku));
      secoes.push({
        tipo: "marca",
        titulo: { es: `Más repuestos ${marca} para vos`, pt: `Mais peças ${marca} para você` },
        link: `/loja?marca=${encodeURIComponent(marca)}`,
        produtos: lista,
      });
    }
  }
  // 3. Categoria que mais interessa (prefere a mesma marca; se faltar, todas)
  if (categoria) {
    let lista = marca ? await buscar({ categoria, marca }, 12, usados) : [];
    if (lista.length < 4) lista = await buscar({ categoria }, 12, usados);
    if (lista.length >= 4) {
      usados.push(...lista.map((p: any) => p.sku));
      secoes.push({
        tipo: "categoria",
        titulo: {
          es: `Porque miraste ${categoriaEs(categoria).toLowerCase()}`,
          pt: `Porque você viu ${categoria.toLowerCase()}`,
        },
        link: `/loja?categoria=${encodeURIComponent(categoria)}`,
        produtos: lista,
      });
    }
  }
  // 4. Última busca com resultado
  if (ultimaBusca) {
    const { buscaParaPortugues } = await import("./pecas-es");
    const t = ultimaBusca.slice(0, 60);
    const pt = buscaParaPortugues(t);
    const lista = await buscar(
      {
        OR: [
          { nome: { contains: pt } },
          { nome: { contains: t } },
          { codigo_fabricante: { contains: t } },
          { sku: { contains: t } },
        ],
      },
      12,
      usados,
    );
    if (lista.length >= 3)
      secoes.push({
        tipo: "busca",
        titulo: { es: `Tu búsqueda: «${t}»`, pt: `Sua busca: «${t}»` },
        link: `/loja?q=${encodeURIComponent(t)}`,
        produtos: lista,
      });
  }
  return { secoes };
}
