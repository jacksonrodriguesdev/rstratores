import type { HomepageBlock } from "./homepage";
import { prisma } from "./prisma";



export async function listHomepageBlocks(): Promise<HomepageBlock[]> {
  // @ts-ignore - prisma type may not be updated until dev server restarts
  return await prisma.homepage_blocks.findMany({
    orderBy: { position: "asc" },
  });
}

export async function createHomepageBlock(data: {
  type: string;
  active: boolean;
  position: number;
  title?: string;
  config?: string;
}) {
  // @ts-ignore
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
  // @ts-ignore
  return await prisma.homepage_blocks.update({
    where: { id },
    data,
  });
}

export async function deleteHomepageBlock(id: number) {
  // @ts-ignore
  return await prisma.homepage_blocks.delete({
    where: { id },
  });
}