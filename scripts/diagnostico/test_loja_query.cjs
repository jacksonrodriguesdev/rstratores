const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function listProducts(params) {
  const {
    search,
    linha,
    categoria,
    marca,
    montadora,
    precoMin,
    precoMax,
    sort = "sku",
    page = 1,
    pageSize = 10,
    hasImage,
    cursor,
  } = params;

  const where = { AND: [] };

  if (search) {
    where.AND.push({
      OR: [
        { nome: { contains: search } },
        { sku: { contains: search } },
        { descricao: { contains: search } },
      ],
    });
  }

  if (categoria) {
    if (Array.isArray(categoria) && categoria.length > 0) {
      where.AND.push({ OR: categoria.map((c) => ({ categoria: { contains: c } })) });
    } else if (typeof categoria === "string") {
      where.AND.push({ categoria: { contains: categoria } });
    }
  }

  if (linha) {
    if (linha === "AGRICOLA") {
      // nothing, we query agricolas table directly
    } else {
      where.AND.push({ linha: linha });
    }
  }

  if (hasImage) {
    where.AND.push({ imagem_principal: { not: null } });
    where.AND.push({ imagem_principal: { not: "" } });
  }

  if (marca) {
    if (Array.isArray(marca) && marca.length > 0) {
      where.AND.push({ marca: { in: marca } });
    } else if (typeof marca === "string") {
      where.AND.push({ marca: marca });
    }
  }

  if (montadora) {
    const montadorasArr = Array.isArray(montadora) ? montadora : [montadora];
    if (montadorasArr.length > 0) {
      where.AND.push({
        OR: montadorasArr.map((m) => ({
          OR: [
            { nome: { contains: m } },
            { descricao: { contains: m } },
            { categoria: { contains: m } },
            { marca: { contains: m } },
            { aplicacoes: { some: { montadora: m } } },
          ],
        })),
      });
    }
  }
  if (typeof precoMin === "number") {
    where.AND.push({ preco_brl: { gte: precoMin } });
  }
  if (typeof precoMax === "number") {
    where.AND.push({ preco_brl: { lte: precoMax } });
  }

  if (where.AND.length === 0) {
    delete where.AND;
  }

  const sortMap = {
    "nome-asc": { sku: "asc" },
    "nome-desc": { sku: "desc" },
    "preco-asc": { preco_brl: "asc" },
    "preco-desc": { preco_brl: "desc" },
    sku: { sku: "asc" },
    "created-desc": { created_at: "desc" },
  };

  const orderBy = sortMap[sort] || { sku: "asc" };
  const take = pageSize + 1;

  const queryOptions = {
    where,
    orderBy,
    take,
    include: {
      images: { orderBy: { sort_order: "asc" }, take: 1 },
    },
  };

  if (cursor) {
    queryOptions.cursor = { sku: cursor };
    queryOptions.skip = 1;
  } else if (page > 1) {
    queryOptions.skip = (page - 1) * pageSize;
  }

  let data;
  try {
    if (linha === "AGRICOLA") {
      data = await prisma.agricolas.findMany(queryOptions);
    } else {
      data = await prisma.products.findMany(queryOptions);
    }
    console.log(`Success! ${linha} retornou ${data.length} resultados`);
  } catch (e) {
    console.error(`Error querying ${linha}:`, e);
  }
}

async function main() {
  await listProducts({
    search: "",
    linha: "AGRICOLA",
    categoria: undefined,
    marca: undefined,
    montadora: undefined,
    sort: "sku",
    pageSize: 30,
  });
  await listProducts({
    search: "",
    linha: "AUTOMOTIVA",
    categoria: undefined,
    marca: undefined,
    montadora: undefined,
    sort: "sku",
    pageSize: 30,
  });
  await prisma.$disconnect();
}
main();
