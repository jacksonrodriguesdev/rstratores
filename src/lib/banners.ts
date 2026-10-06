import { createServerFn } from "@tanstack/react-start";

// Tipos de banner da página inicial:
// - hero:  carrossel principal no topo
// - duplo: banners promocionais lado a lado
// - strip: faixa promocional larga entre as seções
// - dac:   imagem de fundo da seção de envios para o Uruguai pela DAC
export type BannerKind = "hero" | "duplo" | "strip" | "dac";

export type Banner = {
  id: number;
  kind: BannerKind;
  position: number;
  image_path: string;
  image_path_mobile: string | null;
  titulo: string | null;
  link_url: string | null;
  active: boolean;
  linha: string;
  created_at: string;
};

// Descrição de cada tipo para o admin: onde aparece e o tamanho ideal da arte.
export const TIPOS_BANNER: Record<
  BannerKind,
  { nome: string; onde: string; desktop: string; celular: string; aspecto: string; aspectoCelular: string }
> = {
  hero: {
    nome: "Carrossel principal",
    onde: "Topo da página inicial. Vários banners viram um carrossel com troca automática.",
    desktop: "1920 × 500 px. Deixe os ~100 px de baixo sem texto: os cartões de atalho ficam por cima.",
    celular: "800 × 400 px",
    aspecto: "aspect-[1366/400]",
    aspectoCelular: "aspect-[366/170]",
  },
  duplo: {
    nome: "Banners promocionais (lado a lado)",
    onde: "Dois banners lado a lado no meio da página (um embaixo do outro no celular). Use 2 ativos.",
    desktop: "900 × 350 px",
    celular: "800 × 350 px (opcional)",
    aspecto: "aspect-[900/350]",
    aspectoCelular: "aspect-[800/350]",
  },
  dac: {
    nome: "Seção DAC (Uruguai)",
    onde: "Imagem de fundo da seção de envios para o Uruguai pela DAC. Só a primeira ativa é usada. O texto fica por cima, à esquerda, com uma camada azul para continuar legível.",
    desktop: "1600 × 600 px, com o lado esquerdo mais limpo (é onde fica o texto)",
    celular: "800 × 1400 px, vertical (opcional)",
    aspecto: "aspect-[1248/404]",
    aspectoCelular: "aspect-[366/690]",
  },
  strip: {
    nome: "Faixa promocional",
    onde: "Faixa larga entre as seções de produtos. Vários viram carrossel.",
    desktop: "1600 × 250 px",
    celular: "800 × 300 px",
    aspecto: "aspect-[1600/250]",
    aspectoCelular: "aspect-[800/300]",
  },
};

const listBannersFn = createServerFn({ method: "GET" })
  .validator((d: { kind?: BannerKind; linha?: string } = {}) => d)
  .handler(async ({ data }) => {
    const server = await import("./banners.server");
    return server.listBanners(data.kind, data.linha);
  });

export async function listBanners(kind?: BannerKind, linha?: string): Promise<Banner[]> {
  return listBannersFn({ data: { kind, linha } }) as unknown as Banner[];
}

const listActiveBannersFn = createServerFn({ method: "GET" })
  .validator((d: { kind: BannerKind; linha?: string }) => d)
  .handler(async ({ data }) => {
    const server = await import("./banners.server");
    return server.listActiveBanners(data.kind, data.linha);
  });

export async function listActiveBanners(kind: BannerKind, linha?: string): Promise<Banner[]> {
  return listActiveBannersFn({ data: { kind, linha } }) as unknown as Banner[];
}

// Admin API calls (client-side only)

export async function uploadBannerImage(file: File, kind: BannerKind): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  const res = await fetch("/api/admin/banners/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Falha ao enviar a imagem");
  const { path } = await res.json();
  return path;
}

export async function createBanner(input: {
  kind: BannerKind;
  image_path: string;
  image_path_mobile?: string | null;
  titulo?: string | null;
  position?: number;
  link_url?: string | null;
  active?: boolean;
  linha?: string;
}) {
  const res = await fetch("/api/admin/banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Falha ao criar o banner");
}

export async function updateBanner(
  id: number,
  patch: Partial<
    Pick<Banner, "position" | "link_url" | "active" | "image_path" | "image_path_mobile" | "titulo" | "linha">
  >,
) {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Falha ao atualizar o banner");
}

export async function deleteBanner(id: number) {
  const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao remover o banner");
}
