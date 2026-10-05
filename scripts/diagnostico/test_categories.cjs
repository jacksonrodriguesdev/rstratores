const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function listCategories(opts = {}) {
  const where = {};
  if (opts?.linha) where.linha = opts.linha;

  console.time("findMany");
  const all = await prisma.categories.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
  console.timeEnd("findMany");

  console.time("buildTree");
  const map = new Map();
  all.forEach((c) => map.set(c.id, { ...c, children: [] }));

  const root = [];

  all.forEach((c) => {
    if (c.parent_id === null) {
      root.push(map.get(c.id));
    } else {
      const parent = map.get(c.parent_id);
      if (parent) {
        parent.children.push(map.get(c.id));
      } else {
        root.push(map.get(c.id));
      }
    }
  });
  console.timeEnd("buildTree");

  console.time("computeTotals");
  const computeTotals = (node) => {
    let total = node._count?.products || 0;
    if (node.children) {
      for (const child of node.children) {
        total += computeTotals(child);
      }
    }
    node.totalProducts = total;
    return total;
  };

  root.forEach(computeTotals);
  console.timeEnd("computeTotals");

  if (opts?.onlyWithProducts) {
    console.time("filterTree");
    const filterTree = (nodes) => {
      return nodes.filter((n) => {
        if (n.children) {
          n.children = filterTree(n.children);
        }
        return n.totalProducts > 0;
      });
    };
    const res = filterTree(root);
    console.timeEnd("filterTree");
    return res;
  }

  return root;
}

async function main() {
  try {
    console.log("Testing AUTOMOTIVA...");
    await listCategories({ linha: "AUTOMOTIVA" });
    console.log("Testing AGRICOLA...");
    await listCategories({ linha: "AGRICOLA" });
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
