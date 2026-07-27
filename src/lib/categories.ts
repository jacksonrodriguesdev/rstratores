import { createServerFn } from "@tanstack/react-start";
import * as server from "./categories.server";

export type { Category, CategoryWithChildren } from "./categories.server";

const listCategoriesFn = createServerFn({ method: "GET" })
  .validator((opts?: { linha?: string, onlyWithProducts?: boolean }) => opts)
  .handler(async ({ data }) => {
    return server.listCategories(data);
  });

export async function listCategories(opts?: { linha?: string, onlyWithProducts?: boolean }) {
  return listCategoriesFn({ data: opts });
}

const getCategoryFn = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data }) => {
    return server.getCategory(data);
  });

export async function getCategory(id: number) {
  return getCategoryFn({ data: id });
}

// Admin API wrappers (Client side)

export async function createCategory(data: { nome: string; parent_id?: number | null; image_path?: string | null; linha?: string }) {
  const res = await fetch("/api/admin/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
     const text = await res.text();
     throw new Error(text || "Failed to create category");
  }
}

export async function updateCategory(id: number, data: { nome?: string; parent_id?: number | null; image_path?: string | null; linha?: string }) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update category");
}

export async function deleteCategory(id: number) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete category");
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
