import Papa from "papaparse";
import JSZip from "jszip";

export type CsvRow = {
  sku: string;
  nome: string;
  preco_brl: number | null;
  categoria: string | null;
  marca: string | null;
  estoque: number;
  peso: number | null;
  url: string | null;
  imagem: string | null;
  descricao: string | null;
  linha: string | null;
};

const BUCKET = "product-images";

function parseNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const s = String(v).replace(",", ".").trim();
  const n = Number(s);
  return isNaN(n) ? null : n;
}
function parseInt0(v: unknown): number {
  const n = parseNumber(v);
  return n == null ? 0 : Math.floor(n);
}
function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function parseCsv(file: File): Promise<{ rows: CsvRow[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const errors: string[] = [];
    const rows: CsvRow[] = [];
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        result.data.forEach((raw, i) => {
          let sku = str(raw.sku);
          const nome = str(raw.nome);
          if (!sku) {
            // Gera um SKU automaticamente baseado na data e aleatoriedade
            sku = `AUTO_${Date.now().toString(36).toUpperCase()}_${Math.floor(Math.random() * 1000)}`;
          }
          if (!nome) {
            errors.push(`Linha ${i + 2} (SKU ${sku}): nome vazio`);
            return;
          }
          rows.push({
            sku,
            nome,
            preco_brl: parseNumber(raw.preco_brl),
            categoria: str(raw.categoria),
            marca: str(raw.marca),
            estoque: parseInt0(raw.estoque),
            peso: parseNumber(raw.peso),
            url: str(raw.url),
            imagem: str(raw.imagem),
            descricao: str(raw.descricao),
            linha: str(raw.linha),
          });
        });
        resolve({ rows, errors });
      },
      error: (err) => reject(err),
    });
  });
}

export type ImportProgress = {
  processed: number;
  total: number;
  inserted: number;
  updated: number;
  failed: number;
  currentBatchErrors: string[];
};

export async function importProducts(
  rows: CsvRow[],
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportProgress> {
  const state: ImportProgress = {
    processed: 0,
    total: rows.length,
    inserted: 0,
    updated: 0,
    failed: 0,
    currentBatchErrors: [],
  };

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((r) => ({
      sku: r.sku,
      nome: r.nome,
      preco_brl: r.preco_brl,
      categoria: r.categoria,
      marca: r.marca,
      estoque: r.estoque,
      peso: r.peso,
      url: r.url,
      descricao: r.descricao,
      imagem_principal: r.imagem,
      linha: r.linha,
    }));

    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: chunk }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      state.inserted += data.count ?? chunk.length;
    } catch (err: any) {
      state.failed += chunk.length;
      state.currentBatchErrors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${err.message}`);
    }

    state.processed += chunk.length;
    onProgress?.({ ...state });
  }

  return state;
}

export type ZipImportProgress = {
  processed: number;
  total: number;
  uploaded: number;
  skipped: number;
  errors: string[];
};

export async function importImagesZip(
  file: File,
  onProgress?: (p: ZipImportProgress) => void,
): Promise<ZipImportProgress> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/images/import", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const result = await res.json();

  if (onProgress) {
    onProgress(result as ZipImportProgress);
  }

  return result as ZipImportProgress;
}

export function exportProductsCsv(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows);
}

export function downloadFile(content: string, filename: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
