// Candidatas para as artes: peças com preço e foto da agrotrator (loja própria), variadas por categoria.
import fs from "fs";
import { prisma } from "../../src/lib/prisma";
import { nomeProduto, categoriaEs } from "../../src/lib/pecas-es";
(async () => {
  const cats: any[] = await prisma.$queryRawUnsafe(
    `SELECT categoria c, COUNT(*) n FROM agricolas WHERE duplicado_de IS NULL AND preco_brl>0 AND imagem_principal LIKE '%agrotrator%' GROUP BY categoria ORDER BY n DESC`,
  );
  const out: any[] = [];
  const codigos = new Set<string>();
  for (const { c } of cats) {
    const rows = await prisma.agricolas.findMany({
      where: { categoria: c, duplicado_de: null, preco_brl: { gt: 0 }, imagem_principal: { contains: "agrotrator" } },
      orderBy: [{ estoque: "desc" }, { preco_brl: "desc" }],
      take: 60,
    });
    let k = 0;
    for (const r of rows) {
      const cod = (r.codigo_fabricante || r.sku).trim().toUpperCase();
      const es = nomeProduto(r as any);
      if (codigos.has(cod) || es.length > 60 || es.length < 8) continue;
      codigos.add(cod);
      out.push({ sku: r.sku.trim(), cod, es, pt: r.nome.trim(), marca: r.marca, cat: c, cat_es: categoriaEs(c), img: r.imagem_principal, preco: r.preco_brl });
      if (++k >= 14) break;
    }
  }
  fs.writeFileSync("marketing/produtos-50/candidatas.json", JSON.stringify(out, null, 1));
  console.log(cats.map((x) => `${x.c}:${x.n}`).join(" | "));
  console.log("candidatas:", out.length);
  await prisma.$disconnect();
})();
