// Base de cubagem / logística (AGRO PARTS). Fonte única por código de referência (`cubagem_ref`) e
// média robusta por classe fiscal (`cubagem_ncm`). As medidas do catálogo Pellegrino (que já vêm
// classificadas e medidas, via Bling) são a base "doadora": delas sai a média por NCM que estima a
// cubagem das peças ainda não medidas das outras linhas (agrícola, caminhões, diesel).
//
// Produção não roda `prisma db push`: a coluna nova e as tabelas são criadas por SQL idempotente
// aqui (mesmo padrão de email.server.ts / catalogo.server.ts).
import { volumeM3, pesoCubado, dimOk, pesoOk, LIMITES, type Fonte } from "./cubagem";
import { soNcm, acordoDaNcm } from "../aduana/aduana-comum";
import { classificarPeca } from "./classificador";
import { normalizarCodigo } from "../b2b-comum";
import {
  calcularFrete,
  TARIFA_FRETE_PADRAO,
  type TarifaFrete,
  type EstimativaFrete,
} from "./frete";

// ---------------------------------------------------------------- coluna nova: diametro
let colunaDiametro: Promise<void> | null = null;
export function garantirColunaDiametro() {
  colunaDiametro ??= (async () => {
    const { prisma } = await import("../prisma");
    for (const tabela of ["products", "agricolas"]) {
      const tem = await prisma.$queryRawUnsafe<Array<{ c: string }>>(
        `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        tabela,
      );
      if (tem.length && !tem.some((x) => x.c === "diametro"))
        await prisma.$executeRawUnsafe(
          `ALTER TABLE \`${tabela}\` ADD COLUMN \`diametro\` DOUBLE NULL AFTER \`profundidade\``,
        );
    }
  })().catch((e) => {
    colunaDiametro = null;
    throw e;
  });
  return colunaDiametro;
}

// ---------------------------------------------------------------- tabelas da base de cubagem
const SQL = [
  // Uma linha POR PRODUTO (item por item): PK (catalogo, sku). codigo_norm indexado para agrupar a
  // mesma peça física entre catálogos. Medidas em cm, peso em kg.
  `CREATE TABLE IF NOT EXISTS \`cubagem_ref\` (
  \`catalogo\` VARCHAR(16) NOT NULL,
  \`sku\` VARCHAR(191) NOT NULL,
  \`codigo\` VARCHAR(64) NULL,
  \`codigo_norm\` VARCHAR(64) NULL,
  \`nome\` VARCHAR(300) NULL,
  \`ncm\` VARCHAR(8) NULL,
  \`familia\` VARCHAR(80) NULL,
  \`marca\` VARCHAR(120) NULL,
  \`peso_kg\` DOUBLE NULL,
  \`comp_cm\` DOUBLE NULL,
  \`larg_cm\` DOUBLE NULL,
  \`alt_cm\` DOUBLE NULL,
  \`diam_cm\` DOUBLE NULL,
  \`volume_m3\` DOUBLE NULL,
  \`peso_cubado_kg\` DOUBLE NULL,
  \`fonte\` VARCHAR(16) NOT NULL DEFAULT 'MEDIA_NCM',
  \`confianca\` VARCHAR(10) NOT NULL DEFAULT 'ESTIMADA',
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`catalogo\`, \`sku\`),
  INDEX \`cubagem_ref_ncm_idx\`(\`ncm\`),
  INDEX \`cubagem_ref_codigo_idx\`(\`codigo_norm\`),
  INDEX \`cubagem_ref_familia_idx\`(\`familia\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`cubagem_ncm\` (
  \`ncm\` VARCHAR(8) NOT NULL,
  \`amostra\` INTEGER NOT NULL DEFAULT 0,
  \`peso_kg\` DOUBLE NULL,
  \`comp_cm\` DOUBLE NULL,
  \`larg_cm\` DOUBLE NULL,
  \`alt_cm\` DOUBLE NULL,
  \`volume_m3\` DOUBLE NULL,
  \`peso_cubado_kg\` DOUBLE NULL,
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`ncm\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let tabelas: Promise<void> | null = null;
export function garantirTabelasCubagem() {
  tabelas ??= (async () => {
    const { prisma } = await import("../prisma");
    await garantirColunaDiametro();
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}
const db = async () => {
  await garantirTabelasCubagem();
  return (await import("../prisma")).prisma;
};

// ---------------------------------------------------------------- unidades
// O Pellegrino grava medidas em METROS. Convertemos para cm (×100) e aplicamos faixa de sanidade.
export const metroParaCm = (m: unknown): number | null => {
  const n = typeof m === "number" ? m : Number(String(m ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const cm = n * 100;
  return cm >= LIMITES.dimMinCm && cm <= LIMITES.dimMaxCm ? Math.round(cm * 10) / 10 : null;
};

const mediana = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ---------------------------------------------------------------- média robusta por NCM (Pellegrino)
// Mediana por NCM de peso e de cada medida, descartando outliers/placeholders. A mediana é robusta:
// mesmo com alguns valores de lixo na base, o valor central continua representativo.
export async function recalcularMediasNcm() {
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ ncm: string; peso: number; altura: number; largura: number; profundidade: number }>
  >(
    `SELECT ncm, peso, altura, largura, profundidade FROM products
     WHERE linha = 'PELLEGRINO' AND ncm IS NOT NULL AND ncm <> ''
       AND peso > 0 AND altura > 0 AND largura > 0 AND profundidade > 0`,
  );
  const grupos = new Map<
    string,
    { peso: number[]; comp: number[]; larg: number[]; alt: number[] }
  >();
  const add = (k: string, peso: number, comp: number, larg: number, alt: number) => {
    const g = grupos.get(k) ?? { peso: [], comp: [], larg: [], alt: [] };
    g.peso.push(peso);
    g.comp.push(comp);
    g.larg.push(larg);
    g.alt.push(alt);
    grupos.set(k, g);
  };
  for (const r of rows) {
    const ncm = soNcm(r.ncm); // products.ncm vem formatada (0000.00.00) — normaliza para 8 dígitos
    if (ncm.length !== 8) continue;
    const peso = Number(r.peso);
    const comp = metroParaCm(r.profundidade); // profundidade = comprimento da caixa
    const larg = metroParaCm(r.largura);
    const alt = metroParaCm(r.altura);
    if (!pesoOk(peso) || !dimOk(comp) || !dimOk(larg) || !dimOk(alt)) continue;
    // Grava a medida na NCM de 8 dígitos e também nos "pais" de 4 e 2 dígitos (posição e capítulo),
    // para o cascateamento: uma peça com NCM sem amostra própria usa a média da posição/capítulo.
    add(ncm, peso, comp!, larg!, alt!);
    add(ncm.slice(0, 4), peso, comp!, larg!, alt!);
    add(ncm.slice(0, 2), peso, comp!, larg!, alt!);
  }
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE cubagem_ncm`);
  let gravados = 0;
  for (const [ncm, g] of grupos) {
    // amostra mínima: 3 para NCM exata (8 díg.), 5 para as médias de posição/capítulo
    if (g.peso.length < (ncm.length === 8 ? 3 : 5)) continue;
    const peso = mediana(g.peso);
    const comp = mediana(g.comp);
    const larg = mediana(g.larg);
    const alt = mediana(g.alt);
    const vol = volumeM3(comp, larg, alt);
    const cubado = pesoCubado(peso, vol);
    await prisma.$executeRaw`
      INSERT INTO cubagem_ncm (ncm, amostra, peso_kg, comp_cm, larg_cm, alt_cm, volume_m3, peso_cubado_kg)
      VALUES (${ncm}, ${g.peso.length}, ${peso}, ${comp}, ${larg}, ${alt}, ${vol}, ${cubado})
      ON DUPLICATE KEY UPDATE amostra = VALUES(amostra), peso_kg = VALUES(peso_kg),
        comp_cm = VALUES(comp_cm), larg_cm = VALUES(larg_cm), alt_cm = VALUES(alt_cm),
        volume_m3 = VALUES(volume_m3), peso_cubado_kg = VALUES(peso_cubado_kg)`;
    gravados++;
  }
  return { ncmsComAmostra: grupos.size, gravados, pecasAnalisadas: rows.length };
}

export type MediaNcm = {
  ncm: string;
  amostra: number;
  peso_kg: number | null;
  comp_cm: number | null;
  larg_cm: number | null;
  alt_cm: number | null;
  volume_m3: number | null;
  peso_cubado_kg: number | null;
};
export async function mediasNcm(): Promise<MediaNcm[]> {
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM cubagem_ncm ORDER BY amostra DESC`,
  );
  return rows.map((r) => ({
    ncm: r.ncm,
    amostra: Number(r.amostra),
    peso_kg: r.peso_kg == null ? null : Number(r.peso_kg),
    comp_cm: r.comp_cm == null ? null : Number(r.comp_cm),
    larg_cm: r.larg_cm == null ? null : Number(r.larg_cm),
    alt_cm: r.alt_cm == null ? null : Number(r.alt_cm),
    volume_m3: r.volume_m3 == null ? null : Number(r.volume_m3),
    peso_cubado_kg: r.peso_cubado_kg == null ? null : Number(r.peso_cubado_kg),
  }));
}

// ---------------------------------------------------------------- tarifa da transportadora + frete
const CHAVES_FRETE = ["frete_por_kg", "frete_taxa_fixa", "frete_minimo", "frete_moeda"] as const;

export async function tarifaFrete(): Promise<TarifaFrete> {
  const { prisma } = await import("../prisma");
  const rows = await prisma.configuracoes.findMany({
    where: { chave: { in: CHAVES_FRETE as unknown as string[] } },
  });
  const m = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  return {
    porKg: Number(m.frete_por_kg) || 0,
    taxaFixa: Number(m.frete_taxa_fixa) || 0,
    minimo: Number(m.frete_minimo) || 0,
    moeda: m.frete_moeda || TARIFA_FRETE_PADRAO.moeda,
  };
}

export async function salvarTarifaFrete(t: Partial<TarifaFrete>) {
  const { prisma } = await import("../prisma");
  const pares: Array<[string, string]> = [];
  if (t.porKg != null) pares.push(["frete_por_kg", String(Math.max(0, Number(t.porKg) || 0))]);
  if (t.taxaFixa != null)
    pares.push(["frete_taxa_fixa", String(Math.max(0, Number(t.taxaFixa) || 0))]);
  if (t.minimo != null) pares.push(["frete_minimo", String(Math.max(0, Number(t.minimo) || 0))]);
  if (t.moeda != null) pares.push(["frete_moeda", t.moeda === "BRL" ? "BRL" : "USD"]);
  for (const [chave, valor] of pares)
    await prisma.configuracoes.upsert({
      where: { chave },
      update: { valor },
      create: { chave, valor },
    });
  return { ok: true };
}

// Estima o frete de uma lista de itens (código + quantidade), somando o peso cubado de cada um.
export async function estimarFrete(
  itens: Array<{ codigo: string; qtd: number }>,
): Promise<EstimativaFrete> {
  const prisma = await db();
  const t = await tarifaFrete();
  const norms = [
    ...new Set(itens.map((i) => normalizarCodigo(i.codigo)).filter((c) => c.length >= 2)),
  ];
  const mapa = new Map<string, number>();
  if (norms.length) {
    const rows = await prisma.$queryRawUnsafe<Array<{ codigo_norm: string; pc: number | null }>>(
      `SELECT codigo_norm, peso_cubado_kg pc FROM cubagem_ref WHERE codigo_norm IN (${norms.map(() => "?").join(",")})`,
      ...norms,
    );
    for (const r of rows)
      if (r.pc != null && !mapa.has(r.codigo_norm)) mapa.set(r.codigo_norm, Number(r.pc));
  }
  let pesoCubadoKg = 0;
  let achados = 0;
  let semDado = 0;
  for (const i of itens) {
    const pc = mapa.get(normalizarCodigo(i.codigo));
    if (pc == null) {
      semDado++;
      continue;
    }
    achados++;
    pesoCubadoKg += pc * Math.max(0, i.qtd || 0);
  }
  pesoCubadoKg = Math.round(pesoCubadoKg * 1000) / 1000;
  const configurada = t.porKg > 0 || t.taxaFixa > 0 || t.minimo > 0;
  return {
    tarifa: t,
    pesoCubadoKg,
    frete: configurada ? calcularFrete(pesoCubadoKg, t) : 0,
    achados,
    semDado,
    configurada,
  };
}

// Cubagem por código (para a proforma/packing list): peso, peso cubado, volume e medidas por código.
export type CubagemItem = {
  peso_kg: number | null;
  peso_cubado_kg: number | null;
  volume_m3: number | null;
  comp_cm: number | null;
  larg_cm: number | null;
  alt_cm: number | null;
  diam_cm: number | null;
  ncm: string | null;
  nome: string | null;
  confianca: string | null;
};
export async function cubagemPorCodigos(codigos: string[]): Promise<Map<string, CubagemItem>> {
  const mapa = new Map<string, CubagemItem>();
  const norms = [...new Set(codigos.map((c) => normalizarCodigo(c)).filter((c) => c.length >= 2))];
  if (!norms.length) return mapa;
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT codigo_norm, peso_kg, peso_cubado_kg, volume_m3, comp_cm, larg_cm, alt_cm, diam_cm, ncm, nome, confianca
     FROM cubagem_ref WHERE codigo_norm IN (${norms.map(() => "?").join(",")})`,
    ...norms,
  );
  const n = (v: unknown) => (v == null ? null : Number(v));
  for (const r of rows)
    if (!mapa.has(r.codigo_norm))
      mapa.set(r.codigo_norm, {
        peso_kg: n(r.peso_kg),
        peso_cubado_kg: n(r.peso_cubado_kg),
        volume_m3: n(r.volume_m3),
        comp_cm: n(r.comp_cm),
        larg_cm: n(r.larg_cm),
        alt_cm: n(r.alt_cm),
        diam_cm: n(r.diam_cm),
        ncm: r.ncm ?? null,
        nome: r.nome ?? null,
        confianca: r.confianca ?? null,
      });
  return mapa;
}

// Catálogos que entram na base de cubagem (escopo: linhas sem dados; Pellegrino fica só como doador).
export const CATALOGOS_CUBAGEM = ["AGRICOLA", "CAMINHOES", "DIESEL"] as const;
export type CatalogoCubagem = (typeof CATALOGOS_CUBAGEM)[number];
export const _fontes: Fonte[] = ["MEDIDO", "CASADO", "MEDIA_NCM", "MEDIA_FAMILIA", "MANUAL"];

// ---------------------------------------------------------------- popular cubagem_ref (item por item)
// Para cada produto das 3 linhas: classifica (-> NCM), e preenche peso/medidas com o que o produto já
// tem ou, na falta, com a média da NCM (base Pellegrino). Grava uma linha por produto. Rebuild total.
type LinhaProduto = {
  sku: string;
  codigo_fabricante: string | null;
  nome: string | null;
  categoria: string | null;
  descricao: string | null;
  marca: string | null;
  peso: number | null;
  altura: number | null;
  largura: number | null;
  profundidade: number | null;
  diametro: number | null;
};

export async function popularCubagemRef() {
  const prisma = await db();
  const medias = new Map((await mediasNcm()).map((m) => [m.ncm, m]));
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE cubagem_ref`);

  const COLS = 17;
  let total = 0;
  const gravarLote = async (vals: unknown[]) => {
    if (!vals.length) return;
    const linhas = vals.length / COLS;
    const ph = Array.from({ length: linhas }, () => `(${Array(COLS).fill("?").join(",")})`).join(
      ",",
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO cubagem_ref (catalogo, sku, codigo, codigo_norm, nome, ncm, familia, marca,
        peso_kg, comp_cm, larg_cm, alt_cm, diam_cm, volume_m3, peso_cubado_kg, fonte, confianca)
       VALUES ${ph}`,
      ...vals,
    );
  };

  const processar = async (catalogo: CatalogoCubagem, sql: string) => {
    let off = 0,
      n = 0;
    do {
      const rows = await prisma.$queryRawUnsafe<LinhaProduto[]>(`${sql} LIMIT 2000 OFFSET ${off}`);
      const lote: unknown[] = [];
      for (const r of rows) {
        const cls = classificarPeca(r.nome, r.categoria, r.descricao);
        // Cascata: média da NCM exata (8) -> posição (4) -> capítulo (2 díg.)
        const mExata = medias.get(cls.ncm);
        const m =
          mExata ?? medias.get(cls.ncm.slice(0, 4)) ?? medias.get(cls.ncm.slice(0, 2)) ?? null;
        const peso = r.peso && r.peso > 0 ? r.peso : (m?.peso_kg ?? null);
        const comp = r.profundidade && r.profundidade > 0 ? r.profundidade : (m?.comp_cm ?? null);
        const larg = r.largura && r.largura > 0 ? r.largura : (m?.larg_cm ?? null);
        const alt = r.altura && r.altura > 0 ? r.altura : (m?.alt_cm ?? null);
        const medidoProprio = r.peso! > 0 && r.altura! > 0 && r.largura! > 0 && r.profundidade! > 0;
        const vol = volumeM3(comp, larg, alt);
        const cubado = pesoCubado(peso, vol);
        const fonte: Fonte = medidoProprio ? "MEDIDO" : mExata ? "MEDIA_NCM" : "MEDIA_FAMILIA";
        const confianca = medidoProprio ? "ALTA" : "ESTIMADA";
        const codigo = (r.codigo_fabricante || r.sku || "").slice(0, 64);
        lote.push(
          catalogo,
          r.sku,
          codigo,
          normalizarCodigo(codigo).slice(0, 64),
          (r.nome ?? "").slice(0, 300),
          cls.ncm,
          cls.familia.slice(0, 80),
          (r.marca ?? "")?.slice(0, 120) || null,
          peso,
          comp,
          larg,
          alt,
          r.diametro ?? null,
          vol,
          cubado,
          fonte,
          confianca,
        );
      }
      await gravarLote(lote);
      n = rows.length;
      off += n;
      total += n;
    } while (n === 2000);
    return off;
  };

  const base =
    "sku, codigo_fabricante, nome, categoria, descricao, marca, peso, altura, largura, profundidade, diametro";
  const a = await processar(
    "AGRICOLA",
    `SELECT ${base} FROM agricolas WHERE duplicado_de IS NULL ORDER BY sku`,
  );
  const c = await processar(
    "CAMINHOES",
    `SELECT ${base} FROM products WHERE linha='CAMINHOES' ORDER BY sku`,
  );
  const d = await processar(
    "DIESEL",
    `SELECT ${base} FROM products WHERE linha='DIESEL' ORDER BY sku`,
  );
  return { total, agricola: a, caminhoes: c, diesel: d };
}

// ---------------------------------------------------------------- cobertura / estatísticas
export async function coberturaCubagem() {
  const prisma = await db();
  const [tot] = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) n FROM cubagem_ref`);
  const porCat = await prisma.$queryRawUnsafe<any[]>(
    `SELECT catalogo, COUNT(*) n FROM cubagem_ref GROUP BY catalogo`,
  );
  const [comCub] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) n FROM cubagem_ref WHERE peso_cubado_kg IS NOT NULL`,
  );
  const [medido] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) n FROM cubagem_ref WHERE fonte='MEDIDO'`,
  );
  const [fallback] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) n FROM cubagem_ref WHERE familia LIKE '(Outras%'`,
  );
  // Mercosul: agrupa por NCM e soma pelo acordo
  const porNcm = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ncm, COUNT(*) n FROM cubagem_ref WHERE ncm IS NOT NULL GROUP BY ncm`,
  );
  let ace02 = 0,
    ace18 = 0;
  for (const r of porNcm) {
    const a = acordoDaNcm(r.ncm);
    if (a?.acordo === "ACE02") ace02 += Number(r.n);
    else ace18 += Number(r.n);
  }
  return {
    total: Number(tot.n),
    porCatalogo: Object.fromEntries(porCat.map((r) => [r.catalogo, Number(r.n)])),
    comCubagem: Number(comCub.n),
    medidoProprio: Number(medido.n),
    fallback: Number(fallback.n),
    ace02,
    ace18,
  };
}

// ---------------------------------------------------------------- listar (paginado, item por item)
export type FiltroCubagem = {
  catalogo?: string;
  familia?: string;
  confianca?: string;
  soFallback?: boolean;
  busca?: string;
  pagina?: number;
  porPagina?: number;
};
export async function listarCubagemRef(f: FiltroCubagem) {
  const prisma = await db();
  const conds: string[] = [];
  const args: unknown[] = [];
  if (f.catalogo) {
    conds.push("catalogo = ?");
    args.push(f.catalogo);
  }
  if (f.familia) {
    conds.push("familia = ?");
    args.push(f.familia);
  }
  if (f.confianca) {
    conds.push("confianca = ?");
    args.push(f.confianca);
  }
  if (f.soFallback) conds.push("familia LIKE '(Outras%'");
  const q = (f.busca || "").trim();
  if (q) {
    conds.push("(sku LIKE ? OR codigo LIKE ? OR nome LIKE ? OR ncm LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q.replace(/\D/g, "") || q}%`);
  }
  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const porPagina = Math.min(Math.max(Number(f.porPagina) || 50, 10), 200);
  const pagina = Math.max(1, Number(f.pagina) || 1);
  const [tot] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) n FROM cubagem_ref ${where}`,
    ...args,
  );
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM cubagem_ref ${where} ORDER BY catalogo, sku LIMIT ${porPagina} OFFSET ${(pagina - 1) * porPagina}`,
    ...args,
  );
  const num = (v: any) => (v == null ? null : Number(v));
  return {
    total: Number(tot.n),
    pagina,
    porPagina,
    rows: rows.map((r) => {
      const ac = acordoDaNcm(r.ncm);
      return {
        catalogo: r.catalogo,
        sku: r.sku,
        codigo: r.codigo,
        nome: r.nome,
        ncm: r.ncm as string | null,
        familia: r.familia as string | null,
        marca: r.marca as string | null,
        peso_kg: num(r.peso_kg),
        comp_cm: num(r.comp_cm),
        larg_cm: num(r.larg_cm),
        alt_cm: num(r.alt_cm),
        diam_cm: num(r.diam_cm),
        volume_m3: num(r.volume_m3),
        peso_cubado_kg: num(r.peso_cubado_kg),
        fonte: r.fonte as string,
        confianca: r.confianca as string,
        acordo: ac?.acordo ?? null,
      };
    }),
  };
}

export async function familiasCubagem(): Promise<string[]> {
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT familia, COUNT(*) n FROM cubagem_ref WHERE familia IS NOT NULL GROUP BY familia ORDER BY n DESC`,
  );
  return rows.map((r) => r.familia as string);
}

// ---------------------------------------------------------------- editar um item (ajuste manual)
export async function editarCubagem(
  catalogo: string,
  sku: string,
  d: {
    ncm?: string | null;
    peso_kg?: number | null;
    comp_cm?: number | null;
    larg_cm?: number | null;
    alt_cm?: number | null;
    diam_cm?: number | null;
  },
) {
  const prisma = await db();
  const [atual] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM cubagem_ref WHERE catalogo = ? AND sku = ?`,
    catalogo,
    sku,
  );
  if (!atual) throw new Error("Item não encontrado na base de cubagem.");
  const n = (v: unknown, cur: any) =>
    v === undefined
      ? cur == null
        ? null
        : Number(cur)
      : v === null || v === ""
        ? null
        : Number(v);
  const ncm = d.ncm === undefined ? atual.ncm : soNcm(d.ncm) || null;
  const peso = n(d.peso_kg, atual.peso_kg);
  const comp = n(d.comp_cm, atual.comp_cm);
  const larg = n(d.larg_cm, atual.larg_cm);
  const alt = n(d.alt_cm, atual.alt_cm);
  const diam = n(d.diam_cm, atual.diam_cm);
  const vol = volumeM3(comp, larg, alt);
  const cubado = pesoCubado(peso, vol);
  await prisma.$executeRawUnsafe(
    `UPDATE cubagem_ref SET ncm=?, peso_kg=?, comp_cm=?, larg_cm=?, alt_cm=?, diam_cm=?,
       volume_m3=?, peso_cubado_kg=?, fonte='MANUAL', confianca='ALTA' WHERE catalogo=? AND sku=?`,
    ncm,
    peso,
    comp,
    larg,
    alt,
    diam,
    vol,
    cubado,
    catalogo,
    sku,
  );
  return { ok: true };
}

// ---------------------------------------------------------------- export CSV (item por item)
export async function exportarCubagemCsv(f: FiltroCubagem) {
  const prisma = await db();
  const conds: string[] = [];
  const args: unknown[] = [];
  if (f.catalogo) {
    conds.push("catalogo = ?");
    args.push(f.catalogo);
  }
  if (f.soFallback) conds.push("familia LIKE '(Outras%'");
  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM cubagem_ref ${where} ORDER BY catalogo, sku`,
    ...args,
  );
  const cab = [
    "catalogo",
    "sku",
    "codigo",
    "nome",
    "ncm",
    "familia",
    "marca",
    "acordo_mercosul",
    "regra_origem",
    "peso_kg",
    "comp_cm",
    "larg_cm",
    "alt_cm",
    "diam_cm",
    "volume_m3",
    "peso_cubado_kg",
    "fonte",
    "confianca",
  ];
  const cell = (v: unknown) =>
    v == null
      ? ""
      : /[",\n;]/.test(String(v))
        ? '"' + String(v).replace(/"/g, '""') + '"'
        : String(v);
  const linhas = [cab.join(";")];
  for (const r of rows) {
    const ac = acordoDaNcm(r.ncm);
    linhas.push(
      [
        r.catalogo,
        r.sku,
        r.codigo,
        r.nome,
        r.ncm,
        r.familia,
        r.marca,
        ac?.acordo ?? "",
        ac?.regra ?? "",
        r.peso_kg,
        r.comp_cm,
        r.larg_cm,
        r.alt_cm,
        r.diam_cm,
        r.volume_m3,
        r.peso_cubado_kg,
        r.fonte,
        r.confianca,
      ]
        .map(cell)
        .join(";"),
    );
  }
  return "﻿" + linhas.join("\n");
}
