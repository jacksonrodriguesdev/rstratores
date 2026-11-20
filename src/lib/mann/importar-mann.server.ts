// Importação única (no boot) do catálogo Mann para `agricolas`, em produção.
// Organiza em Colheitadeiras (categoria-pai) → 36 subgrupos (categorias-filhas).
// categoria de cada produto = "Colheitadeiras · <subgrupo>" (o pai e o carrossel pegam tudo
// por "Colheitadeiras"; cada subgrupo filtra pelo próprio nome). Marca = montadora, sem preço.
// Fotos = URL da Mann (hotlink, como a linha Diesel/bodipasa). Tag imagem_origem='mannpecas'.
// Auto-corretivo: se uma versão antiga já importou (categoria flat / foto /mann/), o boot conserta.
// Reverter: DELETE FROM agricolas WHERE imagem_origem='mannpecas'; (+ apagar categorias Colheitadeiras)
import dados from "./mann-dados.json";

type Item = { s: string; n: string; m: string; g: string; sg: string; i: 0 | 1 };
const ITENS = dados as Item[];
const PAI = "Colheitadeiras";
const URL_BASE = "https://mannpecas.com.br/wp-content/uploads/produtos/imagens/";
const catTexto = (sg: string) => `${PAI} · ${sg}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MARCA: Record<string, string> = {
  "JOHN DEERE": "John Deere",
  "PLANTADEIRA JOHN DEERE": "John Deere",
  "JOHN DEERE ALGODÃO": "John Deere",
  "NEW HOLLAND": "New Holland",
  CASE: "Case IH",
  "MASSEY FERGUSSON": "Massey Ferguson",
  "MASSEY FERGUSON": "Massey Ferguson",
  VALTRA: "Valtra",
  FENDT: "Fendt",
  MACDON: "MacDon",
  SEMEATO: "Semeato",
  "VENCE TUDO": "Vence Tudo",
  CAMECO: "Cameco",
  IDEAL: "Ideal",
  GTS: "GTS",
};

type Db = {
  $queryRawUnsafe: <T>(q: string, ...p: unknown[]) => Promise<T>;
  $executeRawUnsafe: (q: string, ...p: unknown[]) => Promise<number>;
};

// Garante uma categoria (linha AGRICOLA) com o pai informado e devolve o id.
async function garantirCategoria(
  prisma: Db,
  nome: string,
  parentId: number | null,
): Promise<number> {
  const achou = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    "SELECT id FROM categories WHERE nome=? AND linha='AGRICOLA' LIMIT 1",
    nome,
  );
  if (achou[0]?.id) {
    if (parentId != null)
      await prisma.$executeRawUnsafe(
        "UPDATE categories SET parent_id=? WHERE id=? AND (parent_id IS NULL OR parent_id<>?)",
        parentId,
        achou[0].id,
        parentId,
      );
    return achou[0].id;
  }
  await prisma.$executeRawUnsafe(
    "INSERT INTO categories (nome, parent_id, linha, created_at, updated_at) VALUES (?, ?, 'AGRICOLA', NOW(3), NOW(3))",
    nome,
    parentId,
  );
  const novo = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    "SELECT id FROM categories WHERE nome=? AND linha='AGRICOLA' ORDER BY id DESC LIMIT 1",
    nome,
  );
  return novo[0].id;
}

let processo: Promise<void> | null = null;
export function importarMannSeNecessario() {
  processo ??= executar().catch((e) => {
    processo = null;
    console.error("[mann] importação falhou", e);
  });
  return processo;
}

async function executar() {
  const { prisma } = await import("../prisma");
  // Categoria-pai + 36 subgrupos (filhos). subId: subgrupo -> category_id
  const paiId = await garantirCategoria(prisma, PAI, null);
  const subgrupos = [...new Set(ITENS.map((it) => it.sg))];
  const subId: Record<string, number> = {};
  for (const sg of subgrupos) subId[sg] = await garantirCategoria(prisma, sg, paiId);

  const [cont] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    "SELECT COUNT(*) n FROM agricolas WHERE imagem_origem='mannpecas'",
  );

  // Já importado (talvez por versão antiga): conserta categorias e fotos se preciso. Idempotente.
  if (Number(cont?.n ?? 0) > 0) {
    const [pend] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      "SELECT COUNT(*) n FROM agricolas WHERE imagem_origem='mannpecas' AND (categoria NOT LIKE 'Colheitadeiras · %' OR imagem_principal LIKE '/mann/%')",
    );
    if (Number(pend?.n ?? 0) === 0) return;
    // Re-mapeia cada produto para seu subgrupo (em lotes por sku)
    const porSub = new Map<string, string[]>();
    for (const it of ITENS) {
      const arr = porSub.get(it.sg) ?? [];
      arr.push(it.s);
      porSub.set(it.sg, arr);
    }
    for (const [sg, skus] of porSub) {
      for (let k = 0; k < skus.length; k += 500) {
        const lote = skus.slice(k, k + 500);
        const ph = lote.map(() => "?").join(",");
        await prisma.$executeRawUnsafe(
          `UPDATE agricolas SET category_id=?, categoria=? WHERE imagem_origem='mannpecas' AND sku IN (${ph})`,
          subId[sg],
          catTexto(sg),
          ...lote,
        );
        await sleep(80);
      }
    }
    await prisma.$executeRawUnsafe(
      `UPDATE agricolas SET imagem_principal=CONCAT('${URL_BASE}', sku, '.jpg') WHERE imagem_origem='mannpecas' AND imagem_principal LIKE '/mann/%'`,
    );
    console.log("[mann] catálogo reorganizado em Colheitadeiras › subgrupos + fotos por URL");
    return;
  }

  // Importação nova
  const COLS =
    "sku, nome, marca, marca_confirmada, categoria, category_id, veiculos_compativeis, codigo_fabricante, imagem_principal, imagem_origem, estoque, updated_at";
  let i = 0;
  for (let k = 0; k < ITENS.length; k += 300) {
    const lote = ITENS.slice(k, k + 300);
    const vals: unknown[] = [];
    const ph = lote
      .map((it) => {
        const marca = MARCA[(it.m || "").toUpperCase().trim()] || null;
        const veic = `COLHEITADEIRA${marca ? " " + marca.toUpperCase() : ""}`;
        vals.push(
          it.s,
          it.n || it.s,
          marca,
          marca ? 1 : 0,
          catTexto(it.sg),
          subId[it.sg],
          veic,
          it.s,
          it.i ? `${URL_BASE}${it.s}.jpg` : null,
          "mannpecas",
          0,
        );
        return "(?,?,?,?,?,?,?,?,?,?,?, NOW(3))";
      })
      .join(",");
    await prisma.$executeRawUnsafe(`INSERT IGNORE INTO agricolas (${COLS}) VALUES ${ph}`, ...vals);
    i += lote.length;
    await sleep(80);
  }
  console.log(`[mann] produtos importados: ${i} (Colheitadeiras › ${subgrupos.length} subgrupos)`);
}
