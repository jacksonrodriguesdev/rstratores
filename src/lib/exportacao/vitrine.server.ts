// Vitrine de importação (AGRO PARTS Mayorista): TODO o catálogo da loja liberado para as empresas
// cotarem exportação — agrícola + caminhões + diesel — navegável por montadora, linha e categoria,
// com NCM, peso cubado e preço indicativo em USD. Itens sem preço entram como "a pedido".

export type LinhaExp = "AGRICOLA" | "CAMINHOES" | "DIESEL";
const LINHAS: LinhaExp[] = ["AGRICOLA", "CAMINHOES", "DIESEL"];

const db = async () => (await import("../prisma")).prisma;

// Preço indicativo em USD a partir do preço de varejo em R$ (promoção quando houver).
const precoUsd = (precoBrl: number | null, promo: number | null, usdPorReal: number) => {
  const brl = promo && promo > 0 ? promo : (precoBrl ?? 0);
  if (!brl || brl <= 0 || !usdPorReal) return null;
  return Math.round(brl * usdPorReal * 100) / 100;
};

export type FacetsExportacao = {
  linhas: Array<{ linha: LinhaExp; n: number }>;
  montadoras: Array<{ marca: string; n: number }>; // marcas da linha agrícola (JD, Massey, Case, NH, Valtra…)
  categorias: Record<LinhaExp, Array<{ nome: string; n: number }>>;
};

export async function facetsExportacao(): Promise<FacetsExportacao> {
  const prisma = await db();
  // Totais por linha
  const agN = await prisma.agricolas.count({ where: { duplicado_de: null } });
  const [cam, die] = await Promise.all([
    prisma.products.count({ where: { linha: "CAMINHOES" } }),
    prisma.products.count({ where: { linha: "DIESEL" } }),
  ]);
  // Montadoras (marcas) da agrícola, as maiores
  const marcas = await prisma.agricolas.groupBy({
    by: ["marca"],
    where: { duplicado_de: null, marca: { not: null } },
    _count: true,
    orderBy: { _count: { marca: "desc" } },
    take: 16,
  });
  // Categorias por linha
  const catAg = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COALESCE(c.nome, a.categoria) nome, COUNT(*) n
     FROM agricolas a LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.duplicado_de IS NULL AND COALESCE(c.nome, a.categoria) IS NOT NULL AND COALESCE(c.nome, a.categoria) <> ''
     GROUP BY nome ORDER BY n DESC`,
  );
  const catLinha = async (linha: string) =>
    (
      await prisma.$queryRawUnsafe<any[]>(
        `SELECT categoria nome, COUNT(*) n FROM products WHERE linha = ? AND categoria IS NOT NULL AND categoria <> ''
         GROUP BY categoria ORDER BY n DESC`,
        linha,
      )
    ).map((r) => ({ nome: String(r.nome), n: Number(r.n) }));
  const [catCam, catDie] = await Promise.all([catLinha("CAMINHOES"), catLinha("DIESEL")]);
  return {
    linhas: [
      { linha: "AGRICOLA", n: agN },
      { linha: "CAMINHOES", n: cam },
      { linha: "DIESEL", n: die },
    ],
    montadoras: marcas.map((m) => ({ marca: String(m.marca), n: Number((m as any)._count) })),
    categorias: {
      AGRICOLA: catAg.map((r) => ({ nome: String(r.nome), n: Number(r.n) })),
      CAMINHOES: catCam,
      DIESEL: catDie,
    },
  };
}

export type FiltroVitrine = {
  linha?: LinhaExp;
  marca?: string;
  categoria?: string;
  busca?: string;
  soComPreco?: boolean;
  pagina?: number;
  porPagina?: number;
};
export type ItemVitrine = {
  sku: string;
  codigo: string;
  linha: LinhaExp;
  nome: string;
  marca: string | null;
  categoria: string | null;
  foto: string | null;
  ncm: string | null;
  peso_cubado_kg: number | null;
  preco_usd: number | null; // indicativo (sem descontos); null = a pedido
  aplicacao: string | null;
};

const FOTO_OK = (col: string) =>
  `${col} IS NOT NULL AND ${col} <> '' AND ${col} NOT LIKE '%redeparts%'`;

export async function vitrineExportacao(f: FiltroVitrine) {
  const prisma = await db();
  const linha: LinhaExp = LINHAS.includes(f.linha as LinhaExp) ? (f.linha as LinhaExp) : "AGRICOLA";
  const porPagina = Math.min(Math.max(Number(f.porPagina) || 24, 6), 60);
  const pagina = Math.max(1, Number(f.pagina) || 1);
  const off = (pagina - 1) * porPagina;
  const usdPorReal = (await (await import("../b2b.server")).cambioUsd().catch(() => 0)) || 0;
  const { nomeProduto } = await import("../pecas-es");
  const conds: string[] = [];
  const args: unknown[] = [];
  const q = (f.busca || "").trim();

  const tabela = linha === "AGRICOLA" ? "agricolas" : "products";
  if (linha === "AGRICOLA") conds.push("a.duplicado_de IS NULL");
  else {
    conds.push("a.linha = ?");
    args.push(linha);
  }
  if (f.marca) {
    conds.push("a.marca = ?");
    args.push(f.marca);
  }
  if (f.categoria) {
    if (linha === "AGRICOLA") {
      conds.push("(c.nome = ? OR a.categoria = ?)");
      args.push(f.categoria, f.categoria);
    } else {
      conds.push("a.categoria = ?");
      args.push(f.categoria);
    }
  }
  if (q) {
    conds.push("(a.sku LIKE ? OR a.codigo_fabricante LIKE ? OR a.nome LIKE ? OR a.nome_es LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (f.soComPreco) conds.push("(a.valor_promocional > 0 OR a.preco_brl > 0)");
  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const joinCat = linha === "AGRICOLA" ? "LEFT JOIN categories c ON c.id = a.category_id" : "";

  const [tot] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) n FROM ${tabela} a ${joinCat} ${where}`,
    ...args,
  );
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT a.sku, a.codigo_fabricante, a.nome, a.nome_es, a.marca,
            ${linha === "AGRICOLA" ? "COALESCE(c.nome, a.categoria)" : "a.categoria"} categoria,
            a.imagem_principal, a.preco_brl, a.valor_promocional, a.veiculos_compativeis,
            cr.ncm, cr.peso_cubado_kg
     FROM ${tabela} a ${joinCat}
     LEFT JOIN cubagem_ref cr ON cr.catalogo = ? AND cr.sku = a.sku
     ${where}
     ORDER BY (${FOTO_OK("a.imagem_principal")}) DESC, a.estoque DESC, a.nome ASC
     LIMIT ${porPagina} OFFSET ${off}`,
    linha,
    ...args,
  );
  const itens: ItemVitrine[] = rows.map((r) => ({
    sku: String(r.sku).trim(),
    codigo: String(r.codigo_fabricante || r.sku).trim(),
    linha,
    nome: nomeProduto(r as any),
    marca: r.marca ?? null,
    categoria: r.categoria ?? null,
    foto: r.imagem_principal && !/redeparts/i.test(r.imagem_principal) ? r.imagem_principal : null,
    ncm: r.ncm ?? null,
    peso_cubado_kg: r.peso_cubado_kg == null ? null : Number(r.peso_cubado_kg),
    preco_usd: precoUsd(r.preco_brl, r.valor_promocional, usdPorReal),
    aplicacao: r.veiculos_compativeis?.toString().slice(0, 200) ?? null,
  }));
  return { total: Number(tot.n), pagina, porPagina, linha, itens };
}
