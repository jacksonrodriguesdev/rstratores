const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

async function run() {
  const facetsData = {};
  try {
    console.log("Generating AGRICOLA facets...");
    const rawCats = await prisma.agricolas.groupBy({
      by: ["categoria"],
      _count: { categoria: true },
    });
    const mrks = await prisma.agricolas.groupBy({ by: ["marca"], _count: { marca: true } });

    const catMap = new Map();
    rawCats.forEach((c) => {
      if (!c.categoria) return;
      catMap.set(c.categoria, (catMap.get(c.categoria) || 0) + c._count.categoria);
    });

    const marcasLimpo = mrks.filter((m) => m.marca).map((m) => ({ name: m.marca, count: m._count.marca }));

    facetsData["AGRICOLA"] = {
      categorias: Array.from(catMap.entries()).map(([name, count]) => ({ name, count })),
      marcas: marcasLimpo, // Mantemos por compatibilidade
      montadoras: marcasLimpo, // Montadoras agora vêm da marca
    };
    console.log("AGRICOLA done.");

    // PELLEGRINO/PRODUCTS table (100k+ rows) takes more time.
    // Let's do it after saving the first part so the site can load AGRICOLA at least.
    fs.writeFileSync(path.resolve(process.cwd(), "facets.json"), JSON.stringify(facetsData, null, 2));

    console.log("Generating AUTOMOTIVA/PRODUCTS facets...");
    const rawCatsP = await prisma.products.groupBy({
      by: ["categoria"],
      _count: { categoria: true },
    });
    const mrksP = await prisma.products.groupBy({ by: ["marca"], _count: { marca: true } });
    
    const catMapP = new Map();
    rawCatsP.forEach((c) => {
      if (!c.categoria) return;
      catMapP.set(c.categoria, (catMapP.get(c.categoria) || 0) + c._count.categoria);
    });

    const marcasLimpoP = mrksP.filter((m) => m.marca).map((m) => ({ name: m.marca, count: m._count.marca }));

    facetsData["AUTOMOTIVA"] = {
      categorias: Array.from(catMapP.entries()).map(([name, count]) => ({ name, count })),
      marcas: marcasLimpoP,
      montadoras: marcasLimpoP,
    };

    fs.writeFileSync(path.resolve(process.cwd(), "facets.json"), JSON.stringify(facetsData, null, 2));
    console.log("All facets generated and saved to facets.json.");
  } catch (e) {
    console.error("Error generating facets:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
