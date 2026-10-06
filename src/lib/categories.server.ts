import type { Category, CategoryWithChildren } from "./categories";
import { prisma } from "./prisma";

export async function listCategories(opts?: {
  linha?: string;
  onlyWithProducts?: boolean;
}): Promise<CategoryWithChildren[]> {
  const where: any = {};
  if (opts?.linha) where.linha = opts.linha;

  // Fetch all categories
  const all = await prisma.categories.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      _count: {
        // Versões (duplicado_de) não contam: aparecem só dentro do produto principal.
        select: { products: true, agricolas: { where: { duplicado_de: null } } },
      },
    },
  });

  // Build tree
  const map = new Map<number, CategoryWithChildren>();
  all.forEach((c) => map.set(c.id, { ...c, children: [] }));

  const root: CategoryWithChildren[] = [];

  all.forEach((c) => {
    if (c.parent_id === null) {
      root.push(map.get(c.id)!);
    } else {
      const parent = map.get(c.parent_id);
      if (parent) {
        parent.children!.push(map.get(c.id)!);
      } else {
        // Orphan, just put at root
        root.push(map.get(c.id)!);
      }
    }
  });

  // Compute total products per root (including children)
  const computeTotals = (node: CategoryWithChildren): number => {
    let total = ((node as any)._count?.products || 0) + ((node as any)._count?.agricolas || 0);
    if (node.children) {
      for (const child of node.children) {
        total += computeTotals(child);
      }
    }
    (node as any).totalProducts = total;
    return total;
  };

  root.forEach(computeTotals);

  if (opts?.onlyWithProducts) {
    const filterTree = (nodes: CategoryWithChildren[]): CategoryWithChildren[] => {
      return nodes.filter((n) => {
        if (n.children) {
          n.children = filterTree(n.children);
        }
        return (n as any).totalProducts > 0;
      });
    };
    return filterTree(root);
  }

  return root;
}

export async function getCategory(id: number): Promise<Category | null> {
  return prisma.categories.findUnique({ where: { id } });
}

export async function createCategory(data: {
  nome: string;
  parent_id?: number | null;
  image_path?: string | null;
  linha?: string;
}) {
  const nome = (data.nome ?? "").trim();
  const linha = data.linha || "AGRICOLA";
  if (!nome) throw new Error("Informe o nome da categoria.");
  if (await prisma.categories.findFirst({ where: { nome, linha } })) {
    throw new Error(`Já existe a categoria "${nome}".`);
  }
  const cat = await prisma.categories.create({
    data: { nome, parent_id: data.parent_id ?? null, image_path: data.image_path ?? null, linha },
  });
  const { limparCacheFacets } = await import("./products.server");
  limparCacheFacets();
  return cat;
}

export async function updateCategory(id: number, data: Partial<Category>) {
  const antes = await prisma.categories.findUnique({ where: { id } });
  if (!antes) throw new Error("Categoria não encontrada.");
  if (data.parent_id === id) throw new Error("Uma categoria não pode ser pai dela mesma.");
  const nome = typeof data.nome === "string" ? data.nome.trim() : undefined;
  if (nome === "") throw new Error("Informe o nome da categoria.");
  if (nome && nome !== antes.nome) {
    const igual = await prisma.categories.findFirst({ where: { nome, linha: antes.linha, id: { not: id } } });
    if (igual) throw new Error(`Já existe a categoria "${nome}".`);
  }

  const atualizada = await prisma.$transaction(async (tx) => {
    const cat = await tx.categories.update({
      where: { id },
      data: {
        nome,
        parent_id: data.parent_id,
        image_path: data.image_path,
        linha: (data as any).linha,
      } as any,
    });
    // As peças guardam também o nome da categoria em texto (usado nos filtros da loja):
    // ao renomear, atualiza esse texto para os filtros continuarem encontrando as peças.
    if (nome && nome !== antes.nome) {
      await tx.agricolas.updateMany({ where: { category_id: id }, data: { categoria: nome } });
      await tx.products.updateMany({ where: { category_id: id }, data: { categoria: nome } });
    }
    return cat;
  });
  const { limparCacheFacets } = await import("./products.server");
  limparCacheFacets();
  return atualizada;
}

// Excluir uma categoria com peças deixaria as peças sem categoria (e fora da vitrine da loja).
// Por isso: só exclui vazia, ou movendo antes as peças para `moverPara`.
export async function deleteCategory(id: number, moverPara?: number | null) {
  const pecas =
    (await prisma.agricolas.count({ where: { category_id: id } })) +
    (await prisma.products.count({ where: { category_id: id } }));

  await prisma.$transaction(async (tx) => {
    if (pecas > 0) {
      if (!moverPara || moverPara === id) {
        throw new Error(`A categoria tem ${pecas} peças. Escolha para qual categoria movê-las.`);
      }
      const destino = await tx.categories.findUnique({ where: { id: moverPara } });
      if (!destino) throw new Error("Categoria de destino não encontrada.");
      await tx.agricolas.updateMany({
        where: { category_id: id },
        data: { category_id: destino.id, categoria: destino.nome },
      });
      await tx.products.updateMany({
        where: { category_id: id },
        data: { category_id: destino.id, categoria: destino.nome },
      });
    }
    // Subcategorias viram categorias principais
    await tx.categories.updateMany({ where: { parent_id: id }, data: { parent_id: null } });
    await tx.categories.delete({ where: { id } });
  });

  const { limparCacheFacets } = await import("./products.server");
  limparCacheFacets();
  return { movidas: pecas };
}
