import { prisma } from "./prisma";

export type Banner = {
  id: number;
  kind: "hero" | "strip";
  position: number;
  image_path: string;
  link_url: string | null;
  active: boolean;
  created_at: string;
};

export async function listBanners(kind?: string): Promise<Banner[]> {
  const where = kind ? { kind } : {};
  const data = await prisma.site_banners.findMany({
    where,
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  return data as unknown as Banner[];
}

export async function listActiveBanners(kind: string): Promise<Banner[]> {
  const data = await prisma.site_banners.findMany({
    where: { kind, active: true },
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
}) {
  await prisma.site_banners.create({
    data: {
      kind: input.kind,
      image_path: input.image_path,
      position: input.position ?? 0,
      link_url: input.link_url ?? null,
      active: input.active ?? true,
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
  await prisma.site_banners.delete({ where: { id } });
}
