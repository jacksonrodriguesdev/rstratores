import type { Banner } from "./banners";
import { prisma } from "./prisma";



export async function listBanners(kind?: string, linha?: string): Promise<Banner[]> {
  const where: any = {};
  if (kind) where.kind = kind;
  if (linha) where.linha = linha;
  
  const data = await prisma.site_banners.findMany({
    where,
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  return data as unknown as Banner[];
}

export async function listActiveBanners(kind: string, linha?: string): Promise<Banner[]> {
  const where: any = { kind, active: true };
  if (linha) where.linha = linha;

  const data = await prisma.site_banners.findMany({
    where,
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  return data as unknown as Banner[];
}

export async function createBanner(input: {
  kind: string;
  image_path: string;
  position?: number;
  link_url?: string | null;
  active?: boolean;
  linha?: string;
}) {
  await prisma.site_banners.create({
    data: {
      kind: input.kind,
      image_path: input.image_path,
      position: input.position ?? 0,
      link_url: input.link_url ?? null,
      active: input.active ?? true,
      linha: input.linha ?? "AGRICOLA",
    },
  });
}

export async function updateBanner(
  id: number,
  patch: Partial<Pick<Banner, "position" | "link_url" | "active" | "image_path">>,
) {
  await prisma.site_banners.update({
    where: { id },
    data: patch,
  });
}

export async function deleteBanner(id: number) {
  const banner = await prisma.site_banners.findUnique({ where: { id } });
  await prisma.site_banners.delete({ where: { id } });

  // Tentar remover o arquivo físico
  if (banner?.image_path) {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", "uploads", banner.image_path);
      await fs.unlink(filePath);
    } catch {
      // Arquivo pode já ter sido removido manualmente
    }
  }
}