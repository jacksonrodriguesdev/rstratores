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

// ---------------------------------------------------------------- destaques públicos (landing)
// Carrosséis de produtos COM foto e SEM preço, para a página /empresas (pública, sem login).
export type DestaqueItem = { sku: string; nome: string; marca: string | null; foto: string };
export type Carrossel = { marca: string; itens: DestaqueItem[] };

export async function destaquesPublicos(): Promise<{ carrosseis: Carrossel[] }> {
  const prisma = await db();
  const { nomeProduto } = await import("../pecas-es");
  const marcas = ["John Deere", "Massey Ferguson", "New Holland", "Case IH", "Valtra"];
  const carrosseis: Carrossel[] = [];
  for (const marca of marcas) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sku, codigo_fabricante, nome, nome_es, marca, imagem_principal
       FROM agricolas
       WHERE duplicado_de IS NULL AND marca = ? AND estoque > 0
         AND imagem_principal IS NOT NULL AND imagem_principal <> '' AND imagem_principal NOT LIKE '%redeparts%'
       ORDER BY estoque DESC LIMIT 14`,
      marca,
    );
    if (rows.length >= 4)
      carrosseis.push({
        marca,
        itens: rows.map((r) => ({
          sku: String(r.sku).trim(),
          nome: nomeProduto(r as any),
          marca: r.marca ?? null,
          foto: r.imagem_principal as string,
        })),
      });
  }
  return { carrosseis };
}

// ---------------------------------------------------------------- detalhe do produto (modal)
export type ProdutoExpDetalhe = {
  sku: string;
  codigo: string;
  linha: LinhaExp;
  nome: string;
  marca: string | null;
  categoria: string | null;
  ncm: string | null;
  descricao: string | null;
  aplicacaoTexto: string | null;
  preco_usd: number | null;
  peso_cubado_kg: number | null;
  comp_cm: number | null;
  larg_cm: number | null;
  alt_cm: number | null;
  diam_cm: number | null;
  imagens: string[];
  aplicacoes: Array<{
    montadora: string;
    veiculo: string;
    ano: string | null;
    motor: string | null;
  }>;
  fichas: Array<{ chave: string; valor: string }>;
};

export async function produtoExportacao(
  sku: string,
  linha: LinhaExp,
): Promise<ProdutoExpDetalhe | null> {
  const prisma = await db();
  const { nomeProduto } = await import("../pecas-es");
  const usdPorReal = (await (await import("../b2b.server")).cambioUsd().catch(() => 0)) || 0;
  const incluir = {
    images: { orderBy: { sort_order: "asc" as const } },
    aplicacoes: true,
    fichas_tecnicas: true,
  };
  const p: any =
    linha === "AGRICOLA"
      ? await prisma.agricolas.findUnique({ where: { sku }, include: incluir })
      : await prisma.products.findUnique({ where: { sku }, include: incluir });
  if (!p || (linha !== "AGRICOLA" && p.linha !== linha)) return null;

  const [cub] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ncm, peso_cubado_kg, comp_cm, larg_cm, alt_cm, diam_cm FROM cubagem_ref WHERE catalogo = ? AND sku = ?`,
    linha,
    sku,
  );
  const limpa = (s?: string | null) => (s && !/redeparts/i.test(s) ? s : null);
  const imagens = [
    limpa(p.imagem_principal),
    ...(p.images ?? []).map((i: any) => limpa(i.image_path)),
  ].filter((v, i, arr): v is string => !!v && arr.indexOf(v) === i);
  const n = (v: unknown) => (v == null ? null : Number(v));

  return {
    sku: String(p.sku).trim(),
    codigo: String(p.codigo_fabricante || p.sku).trim(),
    linha,
    nome: nomeProduto(p),
    marca: p.marca ?? null,
    categoria: p.categoria ?? null,
    ncm: cub?.ncm ?? (p.ncm ? String(p.ncm).replace(/\D/g, "").slice(0, 8) : null),
    descricao: p.descricao_es || p.descricao || null,
    aplicacaoTexto: p.veiculos_compativeis ?? null,
    preco_usd: precoUsd(p.preco_brl, p.valor_promocional, usdPorReal),
    peso_cubado_kg: n(cub?.peso_cubado_kg),
    comp_cm: n(cub?.comp_cm),
    larg_cm: n(cub?.larg_cm),
    alt_cm: n(cub?.alt_cm),
    diam_cm: n(cub?.diam_cm),
    imagens,
    aplicacoes: (p.aplicacoes ?? []).map((a: any) => ({
      montadora: a.montadora,
      veiculo: a.veiculo,
      ano: a.ano ?? null,
      motor: a.motor ?? null,
    })),
    fichas: (p.fichas_tecnicas ?? []).map((f: any) => ({ chave: f.chave, valor: f.valor })),
  };
}
