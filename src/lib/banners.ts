import { createServerFn } from "@tanstack/react-start";
import * as server from "./banners.server";

export type { Banner } from "./banners.server";
import type { Banner } from "./banners.server";

const listBannersFn = createServerFn({ method: "GET" })
  .validator((kind?: "hero" | "strip") => kind)
  .handler(async ({ data }) => {
    return server.listBanners(data);
  });

export async function listBanners(kind?: "hero" | "strip"): Promise<Banner[]> {
  return listBannersFn({ data: kind }) as unknown as Banner[];
}

const listActiveBannersFn = createServerFn({ method: "GET" })
  .validator((kind: "hero" | "strip") => kind)
  .handler(async ({ data }) => {
    return server.listActiveBanners(data);
  });

export async function listActiveBanners(kind: "hero" | "strip"): Promise<Banner[]> {
  return listActiveBannersFn({ data: kind }) as unknown as Banner[];
}

// Admin API calls (client-side only)

export async function uploadBannerImage(file: File, kind: "hero" | "strip"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  const res = await fetch("/api/admin/banners/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload banner image");
  const { path } = await res.json();
  return path;
}

export async function createBanner(input: {
  kind: "hero" | "strip";
  image_path: string;
  position?: number;
  link_url?: string | null;
  active?: boolean;
}) {
  const res = await fetch("/api/admin/banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create banner");
}

export async function updateBanner(
  id: number,
  patch: Partial<Pick<Banner, "position" | "link_url" | "active" | "image_path">>,
) {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update banner");
}

export async function deleteBanner(id: number, image_path: string) {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_path }),
  });
  if (!res.ok) throw new Error("Failed to delete banner");
}
