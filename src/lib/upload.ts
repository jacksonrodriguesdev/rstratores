import { supabase } from "@/integrations/supabase/client";
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
      complete: (result) => {
        result.data.forEach((raw, i) => {
          const sku = str(raw.sku);
          const nome = str(raw.nome);
          if (!sku) {
            errors.push(`Linha ${i + 2}: SKU vazio`);
            return;
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
      imagem_principal: r.imagem, // stores external URL from CSV
    }));

    const { error, count } = await supabase
      .from("products")
      .upsert(chunk, { onConflict: "sku", count: "exact" });

    if (error) {
      state.failed += chunk.length;
      state.currentBatchErrors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    } else {
      // Supabase upsert doesn't easily distinguish insert vs update — count as processed
      state.inserted += count ?? chunk.length;
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
  const zip = await JSZip.loadAsync(file);

  // Group entries by SKU
  const bySku = new Map<string, { path: string; entry: JSZip.JSZipObject }[]>();
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    // Expect paths like "produtos/SKU_7239/main.jpg" or "SKU_7239/main.jpg"
    const parts = relativePath.split("/").filter(Boolean);
    const skuFolder = parts.find((p) => /^SKU[_-]/i.test(p));
    if (!skuFolder) return;
    const sku = skuFolder.replace(/^SKU[_-]/i, "");
    const fileName = parts[parts.length - 1];
    if (!/\.(jpe?g|png|webp|gif)$/i.test(fileName)) return;
    if (!bySku.has(sku)) bySku.set(sku, []);
    bySku.get(sku)!.push({ path: fileName, entry });
  });

  // Fetch known SKUs (in chunks to avoid URL limits)
  const allSkus = Array.from(bySku.keys());
  const knownSkus = new Set<string>();
  for (let i = 0; i < allSkus.length; i += 500) {
    const slice = allSkus.slice(i, i + 500);
    const { data } = await supabase.from("products").select("sku").in("sku", slice);
    data?.forEach((r: { sku: string }) => knownSkus.add(r.sku));
  }

  const state: ZipImportProgress = {
    processed: 0,
    total: allSkus.length,
    uploaded: 0,
    skipped: 0,
    errors: [],
  };

  for (const sku of allSkus) {
    if (!knownSkus.has(sku)) {
      state.skipped += 1;
      state.processed += 1;
      onProgress?.({ ...state });
      continue;
    }

    const files = bySku.get(sku)!;
    const imageRows: { sku: string; image_path: string; image_type: string; sort_order: number }[] = [];
    let mainPath: string | null = null;

    for (const { path, entry } of files) {
      const storagePath = `SKU_${sku}/${path}`;
      const blob = await entry.async("blob");
      const contentType = path.match(/\.png$/i)
        ? "image/png"
        : path.match(/\.webp$/i)
          ? "image/webp"
          : path.match(/\.gif$/i)
            ? "image/gif"
            : "image/jpeg";

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, blob, { contentType, upsert: true });

      if (upErr) {
        state.errors.push(`SKU ${sku} / ${path}: ${upErr.message}`);
        continue;
      }
      state.uploaded += 1;

      const isMain = /^main\./i.test(path);
      if (isMain) mainPath = storagePath;
      const orderMatch = path.match(/thumb[_-]?(\d+)/i);
      const sortOrder = isMain ? 0 : orderMatch ? Number(orderMatch[1]) : 99;
      imageRows.push({
        sku,
        image_path: storagePath,
        image_type: isMain ? "main" : "thumb",
        sort_order: sortOrder,
      });
    }

    if (imageRows.length > 0) {
      await supabase.from("product_images").upsert(imageRows, { onConflict: "sku,image_path" });
    }
    if (mainPath) {
      await supabase.from("products").update({ imagem_principal: mainPath }).eq("sku", sku);
    }

    state.processed += 1;
    onProgress?.({ ...state });
  }

  return state;
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
