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
  image_path_mobile?: string | null;
  titulo?: string | null;
  position?: number;
  link_url?: string | null;
  active?: boolean;
  linha?: string;
}) {
  await prisma.site_banners.create({
    data: {
      kind: input.kind,
      image_path: input.image_path,
      image_path_mobile: input.image_path_mobile ?? null,
      titulo: input.titulo ?? null,
      position: input.position ?? 0,
      link_url: input.link_url ?? null,
      active: input.active ?? true,
      linha: input.linha ?? "AGRICOLA",
    },
  });
}

// Campos que o admin pode alterar (o corpo da requisição não vai direto para o banco).
const EDITAVEIS = [
  "position",
  "link_url",
  "active",
  "image_path",
  "image_path_mobile",
  "titulo",
  "linha",
] as const;

export async function updateBanner(id: number, patch: Record<string, unknown>) {
  const data = Object.fromEntries(
    Object.entries(patch).filter(([k]) => (EDITAVEIS as readonly string[]).includes(k)),
  );
  const antes = await prisma.site_banners.findUnique({ where: { id } });
  await prisma.site_banners.update({ where: { id }, data });

  // Ao trocar uma imagem, apaga o arquivo antigo para não acumular lixo em uploads/.
  if (antes) {
    for (const campo of ["image_path", "image_path_mobile"] as const) {
      if (campo in data && antes[campo] && antes[campo] !== data[campo]) {
        await apagarArquivo(antes[campo]);
      }
    }
  }
}

export async function deleteBanner(id: number) {
  const banner = await prisma.site_banners.findUnique({ where: { id } });
  await prisma.site_banners.delete({ where: { id } });
  await apagarArquivo(banner?.image_path);
  await apagarArquivo(banner?.image_path_mobile);
}

async function apagarArquivo(relativo: string | null | undefined) {
  if (!relativo) return;
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const raiz = path.resolve(process.cwd(), "public", "uploads");
    const arquivo = path.resolve(raiz, relativo);
    if (arquivo.startsWith(raiz + path.sep)) await fs.unlink(arquivo);
  } catch {
    // Arquivo pode já ter sido removido manualmente
  }
}
