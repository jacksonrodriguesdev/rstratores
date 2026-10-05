import fs from "fs";
import Papa from "papaparse";

const csvFile = fs.readFileSync(
  "C:\\Users\\USER\\Desktop\\site-rs\\rstratorparts\\produtos_final.csv",
  "utf8",
);

Papa.parse(csvFile, {
  header: true,
  skipEmptyLines: true,
  complete: (result) => {
    const rows = result.data;
    console.log(`Parsed ${rows.length} rows.`);

    // Validate rows
    const errors = [];
    rows.forEach((raw, i) => {
      const sku = raw.sku?.trim();
      const nome = raw.nome?.trim();
      if (!sku) errors.push(`Line ${i + 2}: SKU is empty`);
      if (!nome) errors.push(`Line ${i + 2} (SKU ${sku}): Name is empty`);
    });

    if (errors.length > 0) {
      console.log(`Found ${errors.length} validation errors:`, errors.slice(0, 10));
    } else {
      console.log("No validation errors.");
      console.log("First row preview:", rows[0]);
    }
  },
  error: (err) => {
    console.error("Papa parse error:", err);
  },
});
