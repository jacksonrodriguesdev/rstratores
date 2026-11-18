import type { HomepageBlock } from "./homepage";
import { prisma } from "./prisma";

export async function listHomepageBlocks(): Promise<HomepageBlock[]> {
  // Nunca derruba a home: se o banco falhar, a página renderiza (sem blocos) em vez de dar 500.
  try {
    return await prisma.homepage_blocks.findMany({
      orderBy: { position: "asc" },
    });
  } catch (e) {
    console.error("[home] listHomepageBlocks falhou:", (e as Error)?.message);
    return [];
  }
}

export async function createHomepageBlock(data: {
  type: string;
  active: boolean;
  position: number;
  title?: string;
  config?: string;
}) {
  return await prisma.homepage_blocks.create({
    data: {
      type: data.type,
      active: data.active,
      position: data.position,
      title: data.title || null,
      config: data.config || null,
    },
  });
}

export async function updateHomepageBlock(
  id: number,
  data: Partial<{
    active: boolean;
    position: number;
    title: string;
    config: string;
  }>,
) {
  return await prisma.homepage_blocks.update({
    where: { id },
    data,
  });
}

export async function deleteHomepageBlock(id: number) {
  return await prisma.homepage_blocks.delete({
    where: { id },
  });
}
