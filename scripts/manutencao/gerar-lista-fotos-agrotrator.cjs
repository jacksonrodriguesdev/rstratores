// Gera src/lib/dados/fotos-agrotrator.tsv: para cada foto copiada do agrotrator, o arquivo no
// servidor (agrotrator/<sku>-<n>.jpg) e o endereço original na VTEX. Usado pelo admin para
// baixar de novo as fotos que sumiram da pasta de uploads (ex.: troca de pasta no Hostinger).
// Roda no banco local, que ainda guarda os endereços originais:
//   node --env-file=.env scripts/manutencao/gerar-lista-fotos-agrotrator.cjs
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const PREFIXO = "https://agrotrator2.vteximg.com.br/arquivos/ids/";
(async () => {
  const p = new PrismaClient();
  const rows = await p.agricolas_img.findMany({
    where: { image_path: { startsWith: PREFIXO } },
    select: { sku: true, image_path: true, sort_order: true },
    orderBy: [{ sku: "asc" }, { sort_order: "asc" }],
  });
  const vistos = new Set();
  const linhas = [];
  for (const r of rows) {
    const arq = `${r.sku.trim().replace(/[^A-Za-z0-9._-]/g, "_")}-${r.sort_order + 1}.jpg`;
    if (vistos.has(arq)) continue;
    vistos.add(arq);
    linhas.push(`${arq}\t${r.image_path.slice(PREFIXO.length)}`);
  }
  const destino = path.join(__dirname, "../../src/lib/dados/fotos-agrotrator.tsv");
  fs.writeFileSync(destino, linhas.join("\n") + "\n");
  console.log(`${linhas.length} fotos → ${destino}`);
  await p.$disconnect();
})();
