// Mais candidatas (além das 50 de produtos-50): peças com preço e foto da agrotrator (loja própria)
import fs from "fs";
import { prisma } from "../../src/lib/prisma";
import { nomeProduto, categoriaEs } from "../../src/lib/pecas-es";
(async () => {
  const ja = new Set(JSON.parse(fs.readFileSync("marketing/pre-black-amarelo/selecao50.json", "utf8")).map((p: any) => p.cod));
  const cats: any[] = await prisma.$queryRawUnsafe(
    `SELECT categoria c FROM agricolas WHERE duplicado_de IS NULL AND preco_brl>0 AND imagem_principal LIKE '%agrotrator2.vteximg%' GROUP BY categoria`,
  );
  const out: any[] = [];
  for (const { c } of cats) {
    const rows = await prisma.agricolas.findMany({
      where: { categoria: c, duplicado_de: null, preco_brl: { gte: 60 }, imagem_principal: { contains: "agrotrator2.vteximg" }, marca: { in: ["Massey Ferguson", "Valtra", "John Deere", "New Holland", "Case", "Ford"] } },
      orderBy: [{ estoque: "desc" }, { preco_brl: "desc" }],
      skip: 20,
      take: 120,
    });
    let k = 0;
    for (const r of rows) {
      const cod = (r.codigo_fabricante || r.sku).trim().toUpperCase();
      const es = nomeProduto(r as any);
      if (ja.has(cod) || out.some((o) => o.cod === cod) || es.length > 55 || es.length < 8) continue;
      out.push({ sku: r.sku.trim(), cod, es, pt: r.nome.trim(), marca: r.marca, cat: c, cat_es: categoriaEs(c), img: r.imagem_principal });
      if (++k >= 16) break;
    }
  }
  fs.writeFileSync("marketing/pre-black-amarelo/candidatas.json", JSON.stringify(out, null, 1));
  console.log("candidatas:", out.length);
  await prisma.$disconnect();
})();
