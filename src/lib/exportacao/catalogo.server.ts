// Catálogo de exportação (AGRO PARTS Mayorista): categorias e produtos cadastrados no admin só para
// o atacado do Uruguai, com os dados que a exportação pede (NCM, origem e prova, peso e medidas,
// embalagem, preço em USD). As empresas acham estes itens no portal e na cotação; na cotação, o item
// do catálogo de exportação tem prioridade sobre a peça da loja e leva sku "EXP-<id>".
import { normalizarCodigo } from "../b2b-comum";
import { ncmValida, soNcm, type StatusOrigem } from "../aduana/aduana-comum";

const SQL = [
  `CREATE TABLE IF NOT EXISTS \`b2b_categorias\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`nome_es\` VARCHAR(120) NOT NULL,
  \`nome_pt\` VARCHAR(120) NULL,
  \`descricao\` VARCHAR(400) NULL,
  \`ordem\` INTEGER NOT NULL DEFAULT 0,
  \`ativa\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`b2b_produtos\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`categoria_id\` INTEGER NULL,
  \`codigo\` VARCHAR(64) NOT NULL,
  \`codigo_norm\` VARCHAR(64) NOT NULL,
  \`codigos_alt\` VARCHAR(400) NULL,
  \`sku_loja\` VARCHAR(191) NULL,
  \`nome_es\` VARCHAR(200) NOT NULL,
  \`nome_pt\` VARCHAR(200) NULL,
  \`descricao_es\` TEXT NULL,
  \`aplicacao\` VARCHAR(400) NULL,
  \`marca\` VARCHAR(120) NULL,
  \`fabricante\` VARCHAR(160) NULL,
  \`pais_origem\` VARCHAR(2) NULL,
  \`ncm\` VARCHAR(8) NULL,
  \`origem_status\` VARCHAR(12) NOT NULL DEFAULT 'A_VERIFICAR',
  \`prova\` VARCHAR(20) NULL,
  \`prova_data\` VARCHAR(10) NULL,
  \`prova_ref\` VARCHAR(200) NULL,
  \`aec\` DOUBLE NULL,
  \`unidade\` VARCHAR(6) NOT NULL DEFAULT 'UN',
  \`embalagem\` INTEGER NULL,
  \`minimo\` INTEGER NULL,
  \`peso_liquido\` DOUBLE NULL,
  \`peso_bruto\` DOUBLE NULL,
  \`comprimento\` DOUBLE NULL,
  \`largura\` DOUBLE NULL,
  \`altura\` DOUBLE NULL,
  \`preco_usd\` DOUBLE NULL,
  \`custo_brl\` DOUBLE NULL,
  \`estoque\` INTEGER NULL,
  \`prazo\` VARCHAR(80) NULL,
  \`foto\` VARCHAR(400) NULL,
  \`ativo\` TINYINT(1) NOT NULL DEFAULT 1,
  \`nota\` TEXT NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`b2b_produtos_codigo_key\`(\`codigo_norm\`),
  INDEX \`b2b_produtos_categoria_idx\`(\`categoria_id\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let pronto: Promise<void> | null = null;
export function garantirTabelasCatalogo() {
  pronto ??= (async () => {
    const { prisma } = await import("../prisma");
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    pronto = null;
    throw e;
  });
  return pronto;
}
const db = async () => {
  await garantirTabelasCatalogo();
  return (await import("../prisma")).prisma;
};
const txt = (s: unknown, max: number) => {
  const t = String(s ?? "")
    .trim()
    .slice(0, max);
  return t || null;
};
const num = (v: unknown, max = 1e9) => {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.min(max, n) : null;
};
const int = (v: unknown) => {
  const n = num(v);
  return n == null ? null : Math.round(n);
};

export const UNIDADES = {
  UN: "Unidad",
  PAR: "Par",
  JG: "Juego",
  KIT: "Kit",
  CX: "Caja",
  M: "Metro",
  KG: "Kilo",
} as const;

// ---------------------------------------------------------------- categorias
export type Categoria = {
  id: number;
  nome_es: string;
  nome_pt: string | null;
  descricao: string | null;
  ordem: number;
  ativa: boolean;
  produtos: number;
};
export async function listarCategorias(soAtivas = false): Promise<Categoria[]> {
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT c.*, (SELECT COUNT(*) FROM b2b_produtos p WHERE p.categoria_id = c.id AND p.ativo = 1) AS produtos
     FROM b2b_categorias c ${soAtivas ? "WHERE c.ativa = 1" : ""} ORDER BY c.ordem, c.nome_es`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    nome_es: r.nome_es,
    nome_pt: r.nome_pt,
    descricao: r.descricao,
    ordem: Number(r.ordem),
    ativa: !!Number(r.ativa),
    produtos: Number(r.produtos),
  }));
}
export async function salvarCategoria(d: Partial<Categoria>) {
  const prisma = await db();
  const nome = txt(d.nome_es, 120);
  if (!nome) throw new Error("Nome da categoria (em espanhol) é obrigatório.");
  const vals = [
    nome,
    txt(d.nome_pt, 120),
    txt(d.descricao, 400),
    int(d.ordem) ?? 0,
    d.ativa === false ? 0 : 1,
  ];
  if (d.id) {
    await prisma.$executeRaw`
      UPDATE b2b_categorias SET nome_es = ${vals[0]}, nome_pt = ${vals[1]}, descricao = ${vals[2]},
        ordem = ${vals[3]}, ativa = ${vals[4]} WHERE id = ${Number(d.id)}`;
    return Number(d.id);
  }
  await prisma.$executeRaw`
    INSERT INTO b2b_categorias (nome_es, nome_pt, descricao, ordem, ativa)
    VALUES (${vals[0]}, ${vals[1]}, ${vals[2]}, ${vals[3]}, ${vals[4]})`;
  const [r] = await prisma.$queryRaw<any[]>`SELECT MAX(id) AS id FROM b2b_categorias`;
  return Number(r.id);
}
export async function apagarCategoria(id: number) {
  const prisma = await db();
  // Produtos da categoria ficam "sem categoria" (não somem do catálogo)
  await prisma.$executeRaw`UPDATE b2b_produtos SET categoria_id = NULL WHERE categoria_id = ${id}`;
  await prisma.$executeRaw`DELETE FROM b2b_categorias WHERE id = ${id}`;
  return true;
}

// ---------------------------------------------------------------- produtos
export type Produto = {
  id: number;
  categoria_id: number | null;
  codigo: string;
  codigos_alt: string | null;
  sku_loja: string | null;
  nome_es: string;
  nome_pt: string | null;
  descricao_es: string | null;
  aplicacao: string | null;
  marca: string | null;
  fabricante: string | null;
  pais_origem: string | null;
  ncm: string | null;
  origem_status: StatusOrigem;
  prova: string | null;
  prova_data: string | null;
  prova_ref: string | null;
  aec: number | null;
  unidade: keyof typeof UNIDADES;
  embalagem: number | null;
  minimo: number | null;
  peso_liquido: number | null;
  peso_bruto: number | null;
  comprimento: number | null;
  largura: number | null;
  altura: number | null;
  preco_usd: number | null;
  custo_brl: number | null;
  estoque: number | null;
  prazo: string | null;
  foto: string | null;
  ativo: boolean;
  nota: string | null;
  updated_at: string;
};
const NUMS = [
  "aec",
  "peso_liquido",
  "peso_bruto",
  "comprimento",
  "largura",
  "altura",
  "preco_usd",
  "custo_brl",
] as const;
const INTS = ["categoria_id", "embalagem", "minimo", "estoque"] as const;
export const paraProduto = (r: any): Produto => {
  const p: any = {
    ...r,
    id: Number(r.id),
    ativo: !!Number(r.ativo),
    updated_at: new Date(r.updated_at).toISOString(),
  };
  for (const k of NUMS) p[k] = r[k] == null ? null : Number(r[k]);
  for (const k of INTS) p[k] = r[k] == null ? null : Number(r[k]);
  delete p.codigo_norm;
  return p;
};
export const skuExp = (id: number) => `EXP-${id}`;
export const idDoSku = (sku: string | null | undefined) => {
  const m = String(sku ?? "").match(/^EXP-(\d+)$/);
  return m ? Number(m[1]) : null;
};

export async function listarProdutos(f: {
  q?: string;
  categoria?: number | null;
  soAtivos?: boolean;
  limite?: number;
  pendencia?: string;
}) {
  const prisma = await db();
  const conds: string[] = [];
  const args: unknown[] = [];
  if (f.soAtivos) conds.push("p.ativo = 1");
  if (f.categoria) {
    conds.push("p.categoria_id = ?");
    args.push(f.categoria);
  } else if (f.categoria === 0) conds.push("p.categoria_id IS NULL");
  const q = String(f.q ?? "").trim();
  if (q) {
    conds.push(
      "(p.codigo_norm LIKE ? OR p.codigos_alt LIKE ? OR p.nome_es LIKE ? OR p.aplicacao LIKE ? OR p.marca LIKE ? OR p.ncm LIKE ?)",
    );
    const n = `%${normalizarCodigo(q)}%`;
    args.push(n, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q.replace(/\D/g, "") || q}%`);
  }
  if (f.pendencia === "SEM_NCM") conds.push("(p.ncm IS NULL OR p.ncm = '')");
  if (f.pendencia === "SEM_ORIGEM") conds.push("p.origem_status <> 'COMPROVADA'");
  if (f.pendencia === "SEM_PRECO") conds.push("p.preco_usd IS NULL");
  if (f.pendencia === "SEM_PESO") conds.push("p.peso_liquido IS NULL");
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT p.*, c.nome_es AS categoria FROM b2b_produtos p LEFT JOIN b2b_categorias c ON c.id = p.categoria_id
     ${conds.length ? "WHERE " + conds.join(" AND ") : ""}
     ORDER BY c.ordem, p.nome_es LIMIT ${Math.min(500, f.limite ?? 200)}`,
    ...args,
  );
  return rows.map((r) => ({
    ...paraProduto(r),
    categoria: (r.categoria ?? null) as string | null,
  }));
}

export async function produtoPorId(id: number) {
  const prisma = await db();
  const [r] = await prisma.$queryRaw<any[]>`SELECT * FROM b2b_produtos WHERE id = ${id}`;
  return r ? paraProduto(r) : null;
}

export async function salvarProduto(d: Partial<Produto>) {
  const prisma = await db();
  const codigo = txt(d.codigo, 64);
  const nome = txt(d.nome_es, 200);
  if (!codigo) throw new Error("Código (part number) é obrigatório.");
  if (!nome) throw new Error("Nome em espanhol é obrigatório.");
  const norm = normalizarCodigo(codigo);
  const ncm = soNcm(d.ncm) || null;
  if (ncm && !ncmValida(ncm)) throw new Error("A NCM tem 8 dígitos.");
  const status = (["COMPROVADA", "INFORMADA", "EXTRAZONA", "A_VERIFICAR"] as const).includes(
    d.origem_status as StatusOrigem,
  )
    ? (d.origem_status as StatusOrigem)
    : "A_VERIFICAR";
  const provaData = d.prova_data && /^\d{4}-\d{2}-\d{2}$/.test(d.prova_data) ? d.prova_data : null;
  if (status === "COMPROVADA" && (!ncm || !d.prova || !provaData))
    throw new Error("Origem comprovada precisa de NCM, tipo de prova e data do documento.");
  const dup = await prisma.$queryRaw<any[]>`
    SELECT id FROM b2b_produtos WHERE codigo_norm = ${norm} AND id <> ${Number(d.id) || 0}`;
  if (dup.length)
    throw new Error("Já existe um produto com esse código no catálogo de exportação.");
  const v = {
    categoria_id: int(d.categoria_id),
    codigo,
    norm,
    codigos_alt: txt(d.codigos_alt, 400),
    sku_loja: txt(d.sku_loja, 191),
    nome_es: nome,
    nome_pt: txt(d.nome_pt, 200),
    descricao_es: txt(d.descricao_es, 5000),
    aplicacao: txt(d.aplicacao, 400),
    marca: txt(d.marca, 120),
    fabricante: txt(d.fabricante, 160),
    pais: txt(d.pais_origem, 2)?.toUpperCase() ?? null,
    ncm,
    status,
    prova: txt(d.prova, 20),
    provaData,
    provaRef: txt(d.prova_ref, 200),
    aec: num(d.aec, 100),
    unidade: d.unidade && d.unidade in UNIDADES ? d.unidade : "UN",
    embalagem: int(d.embalagem),
    minimo: int(d.minimo),
    pl: num(d.peso_liquido),
    pb: num(d.peso_bruto),
    c: num(d.comprimento),
    l: num(d.largura),
    a: num(d.altura),
    preco: num(d.preco_usd),
    custo: num(d.custo_brl),
    estoque: int(d.estoque),
    prazo: txt(d.prazo, 80),
    foto: txt(d.foto, 400),
    ativo: d.ativo === false ? 0 : 1,
    nota: txt(d.nota, 2000),
  };
  if (d.id) {
    await prisma.$executeRaw`
      UPDATE b2b_produtos SET categoria_id = ${v.categoria_id}, codigo = ${v.codigo}, codigo_norm = ${v.norm},
        codigos_alt = ${v.codigos_alt}, sku_loja = ${v.sku_loja}, nome_es = ${v.nome_es}, nome_pt = ${v.nome_pt},
        descricao_es = ${v.descricao_es}, aplicacao = ${v.aplicacao}, marca = ${v.marca}, fabricante = ${v.fabricante},
        pais_origem = ${v.pais}, ncm = ${v.ncm}, origem_status = ${v.status}, prova = ${v.prova},
        prova_data = ${v.provaData}, prova_ref = ${v.provaRef}, aec = ${v.aec}, unidade = ${v.unidade},
        embalagem = ${v.embalagem}, minimo = ${v.minimo}, peso_liquido = ${v.pl}, peso_bruto = ${v.pb},
        comprimento = ${v.c}, largura = ${v.l}, altura = ${v.a}, preco_usd = ${v.preco}, custo_brl = ${v.custo},
        estoque = ${v.estoque}, prazo = ${v.prazo}, foto = ${v.foto}, ativo = ${v.ativo}, nota = ${v.nota}
      WHERE id = ${Number(d.id)}`;
    return Number(d.id);
  }
  await prisma.$executeRaw`
    INSERT INTO b2b_produtos (categoria_id, codigo, codigo_norm, codigos_alt, sku_loja, nome_es, nome_pt,
      descricao_es, aplicacao, marca, fabricante, pais_origem, ncm, origem_status, prova, prova_data, prova_ref,
      aec, unidade, embalagem, minimo, peso_liquido, peso_bruto, comprimento, largura, altura, preco_usd,
      custo_brl, estoque, prazo, foto, ativo, nota)
    VALUES (${v.categoria_id}, ${v.codigo}, ${v.norm}, ${v.codigos_alt}, ${v.sku_loja}, ${v.nome_es}, ${v.nome_pt},
      ${v.descricao_es}, ${v.aplicacao}, ${v.marca}, ${v.fabricante}, ${v.pais}, ${v.ncm}, ${v.status}, ${v.prova},
      ${v.provaData}, ${v.provaRef}, ${v.aec}, ${v.unidade}, ${v.embalagem}, ${v.minimo}, ${v.pl}, ${v.pb}, ${v.c},
      ${v.l}, ${v.a}, ${v.preco}, ${v.custo}, ${v.estoque}, ${v.prazo}, ${v.foto}, ${v.ativo}, ${v.nota})`;
  const [r] = await prisma.$queryRaw<
    any[]
  >`SELECT id FROM b2b_produtos WHERE codigo_norm = ${v.norm}`;
  return Number(r.id);
}

export async function apagarProduto(id: number) {
  const prisma = await db();
  await prisma.$executeRaw`DELETE FROM b2b_produtos WHERE id = ${id}`;
  return true;
}

// Só a NCM (cotação e painel do despachante gravam a classificação)
export async function gravarNcmProduto(id: number, ncm: string) {
  const n = soNcm(ncm);
  if (!ncmValida(n)) return;
  const prisma = await db();
  await prisma.$executeRaw`UPDATE b2b_produtos SET ncm = ${n} WHERE id = ${id}`;
}

// Pré-preenche um produto novo a partir de uma peça da loja (nome, código, marca, NCM, peso, foto)
export async function dadosDaLoja(q: string) {
  const prisma = await db();
  const t = q.trim();
  if (t.length < 2) return [];
  const rows = await prisma.agricolas.findMany({
    where: {
      duplicado_de: null,
      OR: [
        { sku: { contains: t } },
        { codigo_fabricante: { contains: t } },
        { nome: { contains: t } },
      ],
    },
    orderBy: { estoque: "desc" },
    take: 12,
  });
  const { nomeProduto } = await import("../pecas-es");
  return rows.map((r) => ({
    sku_loja: r.sku.trim(),
    codigo: (r.codigo_fabricante || r.sku).trim(),
    nome_es: nomeProduto(r as any),
    nome_pt: r.nome.trim(),
    descricao_es: r.descricao_es ?? null,
    marca: r.marca ?? null,
    fabricante: r.fabricante ?? null,
    ncm: soNcm(r.ncm) || null,
    peso_liquido: r.peso && r.peso > 0 ? r.peso : null,
    comprimento: r.profundidade ?? null,
    largura: r.largura ?? null,
    altura: r.altura ?? null,
    custo_brl: r.valor_compra ?? null,
    foto: r.imagem_principal ?? null,
    aplicacao: r.veiculos_compativeis?.slice(0, 400) ?? null,
  }));
}

// ---------------------------------------------------------------- busca da cotação
// Acha produtos ativos pelo código principal ou alternativo (normalizado)
export async function acharProdutosExp(codigos: string[]) {
  const lista = [...new Set(codigos.map(normalizarCodigo).filter((c) => c.length >= 3))].slice(
    0,
    300,
  );
  const mapa = new Map<string, Produto>();
  if (!lista.length) return mapa;
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM b2b_produtos WHERE ativo = 1 AND codigo_norm IN (${lista.map(() => "?").join(",")})`,
    ...lista,
  );
  for (const r of rows) mapa.set(r.codigo_norm, paraProduto(r));
  // Códigos alternativos (separados por vírgula/espaço)
  const alt = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM b2b_produtos WHERE ativo = 1 AND codigos_alt IS NOT NULL AND codigos_alt <> ''`,
  );
  for (const r of alt) {
    const p = paraProduto(r);
    for (const c of String(r.codigos_alt)
      .split(/[,;\s]+/)
      .map(normalizarCodigo))
      if (c && lista.includes(c) && !mapa.has(c)) mapa.set(c, p);
  }
  return mapa;
}

// Portal: catálogo para empresa aprovada (com preço indicativo quando a loja liberou)
export async function catalogoPortal(f: { q?: string; categoria?: number | null }) {
  const [categorias, produtos] = await Promise.all([
    listarCategorias(true),
    listarProdutos({ ...f, soAtivos: true, limite: 120 }),
  ]);
  return {
    categorias: categorias.filter((c) => c.produtos > 0),
    produtos: produtos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome_es,
      categoria: p.categoria,
      categoria_id: p.categoria_id,
      aplicacao: p.aplicacao,
      marca: p.marca,
      foto: p.foto,
      ncm: p.ncm,
      unidade: p.unidade,
      embalagem: p.embalagem,
      minimo: p.minimo,
      peso: p.peso_liquido,
      mercosul: p.origem_status === "COMPROVADA",
      preco_usd: p.preco_usd,
      prazo: p.prazo,
      estoque: p.estoque,
    })),
  };
}

// Classificação e origem (o despachante também ajusta): sem mexer em preço, foto e textos
export async function salvarClassificacao(
  id: number,
  d: Pick<
    Partial<Produto>,
    | "ncm"
    | "origem_status"
    | "prova"
    | "prova_data"
    | "prova_ref"
    | "aec"
    | "pais_origem"
    | "fabricante"
  >,
) {
  const p = await produtoPorId(id);
  if (!p) throw new Error("Produto não encontrado.");
  return salvarProduto({ ...p, ...d, id });
}
