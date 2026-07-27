import { prisma } from "./prisma";

export type Category = {
  id: number;
  nome: string;
  parent_id: number | null;
  image_path: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

export async function listCategories(opts?: { linha?: string, onlyWithProducts?: boolean }): Promise<CategoryWithChildren[]> {
  const where: any = {};
  if (opts?.linha) where.linha = opts.linha;

  // Fetch all categories
  const all = await prisma.categories.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      _count: {
        select: { products: true }
      }
    }
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
    let total = (node as any)._count?.products || 0;
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
      return nodes.filter(n => {
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

export async function createCategory(data: { nome: string; parent_id?: number | null; image_path?: string | null; linha?: string }) {
  return prisma.categories.create({
    data: {
      nome: data.nome,
      parent_id: data.parent_id,
      image_path: data.image_path,
      linha: data.linha || "AGRICOLA",
    } as any
  });
}

export async function updateCategory(id: number, data: Partial<Category>) {
  return prisma.categories.update({
    where: { id },
    data: {
      nome: data.nome,
      parent_id: data.parent_id,
      image_path: data.image_path,
      linha: (data as any).linha,
    } as any
  });
}

export async function deleteCategory(id: number) {
  return prisma.categories.delete({ where: { id } });
}
