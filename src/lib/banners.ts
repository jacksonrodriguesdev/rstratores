import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";

export type Banner = {
  id: number;
  kind: "hero" | "strip";
  position: number;
  image_path: string;
  link_url: string | null;
  active: boolean;
  created_at: string;
};

export async function listBanners(kind?: "hero" | "strip"): Promise<Banner[]> {
  let q = supabase.from("site_banners").select("*").order("position").order("id");
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Banner[];
}

export async function listActiveBanners(kind: "hero" | "strip"): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("site_banners")
    .select("*")
    .eq("kind", kind)
    .eq("active", true)
    .order("position")
    .order("id");
  if (error) throw error;
  return (data ?? []) as Banner[];
}

export async function uploadBannerImage(file: File, kind: "hero" | "strip"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `site/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function createBanner(input: {
  kind: "hero" | "strip";
  image_path: string;
  position?: number;
  link_url?: string | null;
  active?: boolean;
}) {
  const { error } = await supabase.from("site_banners").insert({
    kind: input.kind,
    image_path: input.image_path,
    position: input.position ?? 0,
    link_url: input.link_url ?? null,
    active: input.active ?? true,
  });
  if (error) throw error;
}

export async function updateBanner(
  id: number,
  patch: Partial<Pick<Banner, "position" | "link_url" | "active" | "image_path">>,
) {
  const { error } = await supabase.from("site_banners").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBanner(id: number, image_path: string) {
  await supabase.storage.from(BUCKET).remove([image_path]);
  const { error } = await supabase.from("site_banners").delete().eq("id", id);
  if (error) throw error;
}
