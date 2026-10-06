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

import { createServerFn } from "@tanstack/react-start";

const listCategoriesFn = createServerFn({ method: "GET" })
  .validator((opts?: { linha?: string; onlyWithProducts?: boolean }) => opts)
  .handler(async ({ data }) => {
    const server = await import("./categories.server");
    return server.listCategories(data);
  });

export async function listCategories(opts?: { linha?: string; onlyWithProducts?: boolean }) {
  return listCategoriesFn({ data: opts });
}

const getCategoryFn = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data }) => {
    const server = await import("./categories.server");
    return server.getCategory(data);
  });

export async function getCategory(id: number) {
  return getCategoryFn({ data: id });
}

// Admin API wrappers (Client side)

export async function createCategory(data: {
  nome: string;
  parent_id?: number | null;
  image_path?: string | null;
  linha?: string;
}) {
  const res = await fetch("/api/admin/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error((await res.json().catch(() => null))?.error || "Falha ao criar a categoria");
  }
}

export async function updateCategory(
  id: number,
  data: { nome?: string; parent_id?: number | null; image_path?: string | null; linha?: string },
) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Falha ao salvar a categoria");
}

// moverPara: categoria que recebe as peças (obrigatória se a categoria tiver peças)
export async function deleteCategory(id: number, moverPara?: number | null) {
  const qs = moverPara ? `?mover_para=${moverPara}` : "";
  const res = await fetch(`/api/admin/categories/${id}${qs}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Falha ao excluir a categoria");
  return (await res.json()) as { movidas: number };
}

export async function uploadCategoryImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/categories/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload image");
  const { path } = await res.json();
  return path;
}
