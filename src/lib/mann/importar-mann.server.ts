// Importação única (no boot) do catálogo Mann para `agricolas`, em produção.
// Insere os produtos (INSERT IGNORE: pula SKUs já existentes), sem preço, marca = montadora,
// em Colheitadeiras (veiculos_compativeis) + categoria agrícola. Tag imagem_origem='mannpecas'.
// As fotos apontam direto para a URL da Mann (mesmo padrão da linha Diesel, que usa bodipasa).
// Guardada por contagem: roda uma vez. Reverter: DELETE FROM agricolas WHERE imagem_origem='mannpecas';
import dados from "./mann-dados.json";

type Item = { s: string; n: string; m: string; g: string; i: 0 | 1 };
const ITENS = dados as Item[];

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
const CATEGORIA_NOME = "Colheitadeiras";

// Garante a categoria "Colheitadeiras" (linha AGRICOLA) e devolve o id.
async function garantirCategoria(prisma: {
  $queryRawUnsafe: <T>(q: string, ...p: unknown[]) => Promise<T>;
  $executeRawUnsafe: (q: string, ...p: unknown[]) => Promise<number>;
}): Promise<number> {
  const achou = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    "SELECT id FROM categories WHERE nome=? AND linha='AGRICOLA' LIMIT 1",
    CATEGORIA_NOME,
  );
  if (achou[0]?.id) return achou[0].id;
  await prisma.$executeRawUnsafe(
    "INSERT INTO categories (nome, linha, created_at, updated_at) VALUES (?, 'AGRICOLA', NOW(3), NOW(3))",
    CATEGORIA_NOME,
  );
  const novo = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    "SELECT id FROM categories WHERE nome=? AND linha='AGRICOLA' ORDER BY id DESC LIMIT 1",
    CATEGORIA_NOME,
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

const URL_BASE = "https://mannpecas.com.br/wp-content/uploads/produtos/imagens/";

async function executar() {
  const { prisma } = await import("../prisma");
  const catId = await garantirCategoria(prisma);
  const [cont] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    "SELECT COUNT(*) n FROM agricolas WHERE imagem_origem='mannpecas'",
  );

  // Já importado (talvez por uma versão antiga): conserta categoria e fotos se ainda estiverem
  // no esquema antigo (category_id diferente / imagem em /mann/... em vez da URL). Idempotente.
  if (Number(cont?.n ?? 0) > 0) {
    const [pend] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      "SELECT COUNT(*) n FROM agricolas WHERE imagem_origem='mannpecas' AND (category_id <> ? OR imagem_principal LIKE '/mann/%')",
      catId,
    );
    if (Number(pend?.n ?? 0) > 0) {
      await prisma.$executeRawUnsafe(
        "UPDATE agricolas SET category_id=?, categoria=? WHERE imagem_origem='mannpecas' AND category_id <> ?",
        catId,
        CATEGORIA_NOME,
        catId,
      );
      await prisma.$executeRawUnsafe(
        `UPDATE agricolas SET imagem_principal=CONCAT('${URL_BASE}', sku, '.jpg') WHERE imagem_origem='mannpecas' AND imagem_principal LIKE '/mann/%'`,
      );
      console.log("[mann] catálogo corrigido (categoria Colheitadeiras + fotos por URL)");
    }
    return;
  }

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
          CATEGORIA_NOME,
          catId,
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
  }
  console.log(`[mann] produtos importados: ${i} (categoria Colheitadeiras, fotos por URL)`);
}
