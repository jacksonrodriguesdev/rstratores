// Importação única (no boot) do catálogo Mann para `agricolas`, em produção.
// Insere os produtos (INSERT IGNORE: pula SKUs já existentes), sem preço, marca = montadora,
// em Colheitadeiras (veiculos_compativeis) + categoria agrícola. Tag imagem_origem='mannpecas'.
// As fotos são auto-hospedadas em agroparts-uploads/mann (subidas por ZIP) e servidas em /mann/<sku>.jpg.
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
const CAT: Record<string, [number, string]> = {
  CALDEIRARIA: [125, "Estrutura e Suspensão"],
  SOLDADOS: [125, "Estrutura e Suspensão"],
  USINADOS: [125, "Estrutura e Suspensão"],
  TÊMPERA: [125, "Estrutura e Suspensão"],
  TEMPERA: [125, "Estrutura e Suspensão"],
  PENEIRAS: [125, "Estrutura e Suspensão"],
  VEDANTES: [120, "Vedações"],
  REVENDA: [128, "Outros Componentes"],
};
const CAT_PADRAO: [number, string] = [128, "Outros Componentes"];

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
  const [cont] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    "SELECT COUNT(*) n FROM agricolas WHERE imagem_origem='mannpecas'",
  );
  if (Number(cont?.n ?? 0) > 0) return; // já importado

  const COLS =
    "sku, nome, marca, marca_confirmada, categoria, category_id, veiculos_compativeis, codigo_fabricante, imagem_principal, imagem_origem, estoque, updated_at";
  let i = 0;
  for (let k = 0; k < ITENS.length; k += 300) {
    const lote = ITENS.slice(k, k + 300);
    const vals: unknown[] = [];
    const ph = lote
      .map((it) => {
        const marca = MARCA[(it.m || "").toUpperCase().trim()] || null;
        const [catId, catNome] = CAT[(it.g || "").toUpperCase().trim()] || CAT_PADRAO;
        const veic = `COLHEITADEIRA${marca ? " " + marca.toUpperCase() : ""}`;
        vals.push(
          it.s,
          it.n || it.s,
          marca,
          marca ? 1 : 0,
          catNome,
          catId,
          veic,
          it.s,
          it.i ? `/mann/${it.s}.jpg` : null,
          "mannpecas",
          0,
        );
        return "(?,?,?,?,?,?,?,?,?,?,?, NOW(3))";
      })
      .join(",");
    await prisma.$executeRawUnsafe(`INSERT IGNORE INTO agricolas (${COLS}) VALUES ${ph}`, ...vals);
    i += lote.length;
  }
  console.log(`[mann] produtos importados: ${i} (fotos em /mann/<sku>.jpg)`);
}
