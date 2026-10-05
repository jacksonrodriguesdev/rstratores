import fs from "fs";
import Papa from "papaparse";

async function main() {
  const csvFile = fs.readFileSync(
    "C:\\Users\\USER\\Desktop\\site-rs\\rstratorparts\\produtos_final.csv",
    "utf8",
  );

  const result = Papa.parse(csvFile, { header: true, skipEmptyLines: true });
  const rows = result.data;

  const formattedRows = rows.map((raw) => ({
    sku: raw.sku,
    nome: raw.nome,
    preco_brl: raw.preco_brl ? Number(raw.preco_brl) : null,
    categoria: raw.categoria,
    marca: raw.marca,
    estoque: raw.estoque ? Number(raw.estoque) : 0,
    peso: raw.peso ? Number(raw.peso) : null,
    url: raw.url,
    imagem_principal: raw.imagem,
  }));

  const BATCH = 200;
  for (let i = 0; i < formattedRows.length; i += BATCH) {
    const chunk = formattedRows.slice(i, i + BATCH);
    try {
      const res = await fetch("http://127.0.0.1:8080/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: chunk }),
      });
      console.log(`Batch ${i} - ${i + BATCH}: Status ${res.status}`);
      if (!res.ok) {
        console.error(await res.text());
        break;
      }
    } catch (e) {
      console.error(e);
      break;
    }
  }
}
main();
