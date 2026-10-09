import { createServerFn } from "@tanstack/react-start";

export type Catalogo = {
  id: number;
  titulo: string;
  marca: string | null;
  tipo: string;
  descricao: string | null;
  idioma: string | null;
  tamanho: number;
  ativo: boolean;
  exige_login: boolean;
  downloads: number;
  ordem: number;
  arquivo: string;
};

export const TIPOS_CATALOGO = ["Catálogo de piezas", "Manual de taller", "Manual del operador", "Ficha técnica", "Otro"];

// Página pública: só os publicados (sem o caminho do arquivo)
export const listarCatalogosFn = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("./prisma");
  const { serializar } = await import("./catalogos.server");
  const rows = await prisma.catalogos.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { titulo: "asc" }] });
  return rows.map((r) => ({ ...serializar(r), arquivo: "" }));
});

// Dados do visualizador: o catálogo publicado e quem está vendo (para a marca d'água)
export const verCatalogoFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./prisma");
    const { serializar } = await import("./catalogos.server");
    const { getSession } = await import("./auth.server");
    const sessao = await getSession();
    const r = await prisma.catalogos.findUnique({ where: { id: data.id } });
    if (!r || (!r.ativo && sessao?.role !== "ADMIN")) return { catalogo: null, sessao: null };
    return { catalogo: { ...serializar(r), arquivo: "" } as Catalogo, sessao: sessao ? { nome: sessao.nome, email: sessao.email } : null };
  });

// ---------- Admin ----------
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  await assertAdmin();
};

export const listarCatalogosAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { prisma } = await import("./prisma");
  const { serializar, pastaCatalogos } = await import("./catalogos.server");
  const rows = await prisma.catalogos.findMany({ orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { titulo: "asc" }] });
  const ultimos = await prisma.catalogos_downloads.findMany({
    orderBy: { created_at: "desc" },
    take: 30,
    include: { catalogo: { select: { titulo: true } }, user: { select: { nome_completo: true, email: true, telefone: true, departamento: true } } },
  });
  return {
    pasta: pastaCatalogos(),
    catalogos: rows.map(serializar),
    ultimos: ultimos.map((d) => ({
      quando: d.created_at.toISOString(),
      titulo: d.catalogo.titulo,
      nome: d.user?.nome_completo ?? "Visitante",
      email: d.user?.email ?? null,
      telefone: d.user?.telefone ?? null,
      departamento: d.user?.departamento ?? null,
    })),
  };
});

export const detectarCatalogosFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { detectarCatalogos } = await import("./catalogos.server");
  return detectarCatalogos();
});

export const salvarCatalogoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; titulo: string; marca: string | null; tipo: string; descricao: string | null; idioma: string | null; ativo: boolean; exige_login: boolean; ordem: number }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const t = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    if (!t(data.titulo, 200)) throw new Error("O título é obrigatório.");
    await prisma.catalogos.update({
      where: { id: Number(data.id) },
      data: {
        titulo: t(data.titulo, 200),
        marca: t(data.marca, 60) || null,
        tipo: t(data.tipo, 60) || "Catálogo de piezas",
        descricao: t(data.descricao, 2000) || null,
        idioma: t(data.idioma, 20) || null,
        ativo: !!data.ativo,
        exige_login: !!data.exige_login,
        ordem: Number(data.ordem) || 0,
      },
    });
    return { ok: true };
  });

export const excluirCatalogoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; apagarArquivo: boolean }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { caminhoCatalogo } = await import("./catalogos.server");
    const c = await prisma.catalogos.delete({ where: { id: Number(data.id) } });
    if (data.apagarArquivo) {
      const fs = await import("fs");
      fs.rmSync(caminhoCatalogo(c.arquivo), { force: true });
    }
    return { ok: true };
  });
