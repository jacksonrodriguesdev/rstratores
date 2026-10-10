import { createServerFn } from "@tanstack/react-start";
import type { ConfigPrecos } from "./precos";

// Central de produtos do admin: listas (com/sem foto, sem preço...), edição completa,
// precificação, medidas e fotos. Tabela `agricolas` (a linha ativa do site).
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  await assertAdmin();
};
const limparCaches = async () => {
  const { limparCacheCatalogo } = await import("./busca-catalogo.server");
  const { limparCacheFacets } = await import("./products.server");
  limparCacheCatalogo();
  limparCacheFacets();
};

// ---------- Público: configuração de preços para o site ----------
export const getPrecosConfigFn = createServerFn({ method: "GET" }).handler(async (): Promise<ConfigPrecos> => {
  const { configPrecos } = await import("./precos.server");
  return configPrecos();
});

// ---------- Filtros ----------
export const FILTROS = [
  ["todos", "Todos (vitrine)"],
  ["com_foto", "Com foto"],
  ["sem_foto", "Sem foto"],
  ["sem_preco", "Sem preço"],
  ["precificados", "Precificados"],
  ["promocao", "Em promoção"],
  ["sem_medidas", "Sem peso/medidas"],
  ["fora", "Fora da vitrine"],
] as const;
export type Filtro = (typeof FILTROS)[number][0];

// Por que uma peça não aparece na loja (vazio = aparece normalmente)
export function avisosVisibilidade(p: { category_id: number | null; imagem_principal: string | null; duplicado_de: string | null }) {
  const avisos: Array<{ tipo: "oculto" | "parcial"; texto: string }> = [];
  if (p.duplicado_de) avisos.push({ tipo: "oculto", texto: `É uma versão da peça ${p.duplicado_de}: aparece dentro da página dela, não sozinha na loja.` });
  if (p.category_id == null) avisos.push({ tipo: "oculto", texto: "Sem categoria: fica fora da vitrine (não aparece na loja nem nas categorias). Escolha uma categoria." });
  if (!p.imagem_principal || /redeparts/i.test(p.imagem_principal)) avisos.push({ tipo: "parcial", texto: "Sem foto: a loja abre mostrando só peças com foto; esta aparece na busca e em “Ver todos”." });
  return avisos;
}

const FOTO_OK = { AND: [{ imagem_principal: { not: null } }, { imagem_principal: { not: "" } }, { NOT: { imagem_principal: { contains: "redeparts" } } }] };
const SEM_FOTO = { OR: [{ imagem_principal: null }, { imagem_principal: "" }, { imagem_principal: { contains: "redeparts" } }] };
const COM_PRECO = { OR: [{ preco_brl: { gt: 0 } }, { AND: [{ preco_modo: "FIXO" }, { preco_uyu: { gt: 0 } }] }] };
// Escrito de forma direta (não como NOT COM_PRECO): no SQL, NOT (NULL > 0) não é verdadeiro e
// as peças com preço vazio sumiriam da lista.
const SEM_PRECO = {
  AND: [
    { OR: [{ preco_brl: null }, { preco_brl: { lte: 0 } }] },
    { OR: [{ NOT: { preco_modo: "FIXO" } }, { preco_uyu: null }, { preco_uyu: { lte: 0 } }] },
  ],
};
const SEM_MEDIDAS = { OR: [{ peso: null }, { altura: null }, { largura: null }, { profundidade: null }] };

function whereFiltro(f: string): any {
  const vitrine = { duplicado_de: null, category_id: { not: null } };
  switch (f) {
    case "com_foto": return { ...vitrine, ...FOTO_OK };
    case "sem_foto": return { ...vitrine, ...SEM_FOTO };
    case "sem_preco": return { ...vitrine, ...SEM_PRECO };
    case "precificados": return { ...vitrine, ...COM_PRECO };
    case "promocao": return { duplicado_de: null, valor_promocional: { gt: 0 } };
    case "sem_medidas": return { ...vitrine, ...SEM_MEDIDAS };
    case "fora": return { duplicado_de: null, category_id: null };
    default: return vitrine;
  }
}

export const resumoProdutosFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { prisma } = await import("./prisma");
  const ent = await Promise.all(FILTROS.map(async ([k]) => [k, await prisma.agricolas.count({ where: whereFiltro(k) })] as const));
  const comFotoSemPreco = await prisma.agricolas.count({ where: { AND: [whereFiltro("com_foto"), SEM_PRECO] } });
  return { ...Object.fromEntries(ent), comFotoSemPreco } as Record<Filtro | "comFotoSemPreco", number>;
});

export type LinhaAdmin = {
  sku: string; nome: string; nome_es: string | null; codigo_fabricante: string | null; fabricante: string | null;
  marca: string | null; categoria: string | null; category_id: number | null; imagem_principal: string | null;
  valor_compra: number | null; margem: number | null; preco_brl: number | null; valor_promocional: number | null; duplicado_de: string | null; preco_modo: string; preco_uyu: number | null;
  peso: number | null; altura: number | null; largura: number | null; profundidade: number | null; estoque: number;
  precificado_em: string | null; fotos: number;
};
const SELECT_LINHA = {
  sku: true, nome: true, nome_es: true, codigo_fabricante: true, fabricante: true, marca: true, categoria: true, category_id: true,
  imagem_principal: true, valor_compra: true, margem: true, preco_brl: true, valor_promocional: true, duplicado_de: true, preco_modo: true, preco_uyu: true,
  peso: true, altura: true, largura: true, profundidade: true, estoque: true, precificado_em: true, _count: { select: { images: true } },
} as const;
const linha = (r: any): LinhaAdmin => ({ ...r, precificado_em: r.precificado_em?.toISOString() ?? null, fotos: r._count?.images ?? 0, _count: undefined });

export type ParamsLista = { filtro: string; busca?: string; categoria?: number | null; marca?: string; pagina?: number; porPagina?: number; ordem?: "nome" | "recentes" | "foto" };
export const listarProdutosAdminFn = createServerFn({ method: "GET" })
  .validator((d: ParamsLista) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const where: any = { AND: [whereFiltro(data.filtro)] };
    const q = (data.busca || "").trim();
    if (q) where.AND.push({ OR: [{ sku: { contains: q } }, { codigo_fabricante: { contains: q } }, { nome: { contains: q } }, { nome_es: { contains: q } }, { fabricante: { contains: q } }] });
    if (data.categoria) where.AND.push({ category_id: Number(data.categoria) });
    if (data.marca) where.AND.push({ marca: data.marca });
    const porPagina = Math.min(Math.max(Number(data.porPagina) || 50, 10), 200);
    const pagina = Math.max(1, Number(data.pagina) || 1);
    const orderBy: any =
      data.ordem === "recentes" ? [{ updated_at: "desc" }] : data.ordem === "foto" ? [{ imagem_principal: "desc" }, { nome: "asc" }] : [{ nome: "asc" }];
    const [total, rows] = await Promise.all([
      prisma.agricolas.count({ where }),
      prisma.agricolas.findMany({ where, orderBy, skip: (pagina - 1) * porPagina, take: porPagina, select: SELECT_LINHA }),
    ]);
    return { total, pagina, porPagina, rows: rows.map(linha) };
  });

export const opcoesFiltroFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { prisma } = await import("./prisma");
  const [categorias, marcas] = await Promise.all([
    prisma.categories.findMany({ where: { linha: "AGRICOLA" }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.agricolas.groupBy({ by: ["marca"], where: { duplicado_de: null, marca: { not: null } }, _count: true, orderBy: { _count: { marca: "desc" } }, take: 30 }),
  ]);
  return { categorias, marcas: marcas.map((m) => m.marca as string).filter(Boolean) };
});

// ---------- Produto completo ----------
export const obterProdutoAdminFn = createServerFn({ method: "GET" })
  .validator((d: { sku: string }) => ({ sku: String(d.sku) }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const p = await prisma.agricolas.findUnique({
      where: { sku: data.sku },
      include: { images: { orderBy: { sort_order: "asc" } }, _count: { select: { images: true } } },
    });
    if (!p) return null;
    return {
      ...linha(p),
      descricao: p.descricao, descricao_es: p.descricao_es, tamanho: p.tamanho, veiculos_compativeis: p.veiculos_compativeis,
      ean: p.ean, ncm: p.ncm,
      images: p.images.map((i) => ({ id: i.id, path: i.image_path, ordem: i.sort_order })),
    };
  });
export type ProdutoAdmin = NonNullable<Awaited<ReturnType<typeof obterProdutoAdminFn>>>;

const TEXTO = ["nome", "nome_es", "descricao", "descricao_es", "codigo_fabricante", "fabricante", "marca", "tamanho", "veiculos_compativeis", "ean", "ncm"] as const;
const NUMERO = ["valor_compra", "margem", "preco_brl", "preco_uyu", "valor_promocional", "peso", "altura", "largura", "profundidade"] as const;

export const salvarProdutoAdminFn = createServerFn({ method: "POST" })
  .validator((d: Record<string, any> & { sku: string }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const atual = await prisma.agricolas.findUnique({ where: { sku: String(data.sku) } });
    if (!atual) throw new Error("Produto não encontrado");
    const upd: Record<string, any> = {};
    for (const k of TEXTO) if (k in data) upd[k] = data[k] == null || String(data[k]).trim() === "" ? (k === "nome" ? atual.nome : null) : String(data[k]).trim();
    for (const k of NUMERO) {
      if (!(k in data)) continue;
      const v = data[k] === "" || data[k] == null ? null : Number(String(data[k]).replace(",", "."));
      if (v != null && (Number.isNaN(v) || v < 0)) throw new Error(`Valor inválido em ${k}`);
      upd[k] = v;
    }
    if ("estoque" in data) upd.estoque = Math.max(0, Math.round(Number(data.estoque) || 0));
    if ("preco_modo" in data) upd.preco_modo = data.preco_modo === "FIXO" ? "FIXO" : "AUTO";
    if ("marca" in upd) upd.marca_confirmada = true;
    if ("category_id" in data) {
      const id = data.category_id ? Number(data.category_id) : null;
      const cat = id ? await prisma.categories.findUnique({ where: { id } }) : null;
      upd.category_id = cat?.id ?? null;
      upd.categoria = cat?.nome ?? null;
    }
    const final = { ...atual, ...upd } as any;
    const temPreco = (final.preco_brl ?? 0) > 0 || (final.preco_modo === "FIXO" && (final.preco_uyu ?? 0) > 0);
    upd.precificado_em = temPreco ? atual.precificado_em ?? new Date() : null;
    await prisma.agricolas.update({ where: { sku: atual.sku }, data: upd });
    await limparCaches();
    return { ok: true };
  });

// Próxima peça para o modo "precificar uma a uma"
export const proximaSemPrecoFn = createServerFn({ method: "GET" })
  .validator((d: { comFoto: boolean; pular: string[]; categoria?: number | null }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const where: any = { AND: [whereFiltro(data.comFoto ? "com_foto" : "todos"), SEM_PRECO, { sku: { notIn: (data.pular || []).slice(-500) } }] };
    if (data.categoria) where.AND.push({ category_id: Number(data.categoria) });
    const [p, restantes] = await Promise.all([
      prisma.agricolas.findFirst({ where, orderBy: [{ nome: "asc" }], select: { sku: true } }),
      prisma.agricolas.count({ where }),
    ]);
    return { sku: p?.sku ?? null, restantes };
  });

// ---------- Fotos ----------
const PLACEHOLDER = /redeparts/i;
export const adicionarFotosFn = createServerFn({ method: "POST" })
  .validator((d: { sku: string; paths: string[]; principal?: boolean }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const p = await prisma.agricolas.findUnique({ where: { sku: data.sku }, include: { images: true } });
    if (!p) throw new Error("Produto não encontrado");
    const max = Math.max(9, ...p.images.map((i) => i.sort_order));
    await prisma.agricolas_img.createMany({
      data: data.paths.map((path, i) => ({ sku: p.sku, image_path: path, image_type: "thumb", sort_order: max + 1 + i })),
      skipDuplicates: true,
    });
    if (data.principal || !p.imagem_principal || PLACEHOLDER.test(p.imagem_principal)) {
      await prisma.agricolas.update({ where: { sku: p.sku }, data: { imagem_principal: data.paths[0] } });
    }
    await limparCaches();
    return { ok: true };
  });

export const removerFotoFn = createServerFn({ method: "POST" })
  .validator((d: { sku: string; path: string }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.agricolas_img.deleteMany({ where: { sku: data.sku, image_path: data.path } });
    const p = await prisma.agricolas.findUnique({ where: { sku: data.sku }, include: { images: { orderBy: { sort_order: "asc" } } } });
    if (p && p.imagem_principal === data.path) {
      await prisma.agricolas.update({ where: { sku: p.sku }, data: { imagem_principal: p.images[0]?.image_path ?? null } });
    }
    // Apaga o arquivo só se foi enviado pelo admin e nenhuma outra peça usa
    if (data.path.startsWith("produtos/")) {
      const usos = await prisma.agricolas_img.count({ where: { image_path: data.path } });
      const principal = await prisma.agricolas.count({ where: { imagem_principal: data.path } });
      if (!usos && !principal) {
        const fs = await import("fs/promises");
        const { caminhoUpload } = await import("./uploads.server");
        await fs.unlink(caminhoUpload(data.path)).catch(() => {});
      }
    }
    await limparCaches();
    return { ok: true };
  });

export const definirFotoPrincipalFn = createServerFn({ method: "POST" })
  .validator((d: { sku: string; path: string }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.agricolas.update({ where: { sku: data.sku }, data: { imagem_principal: data.path } });
    await limparCaches();
    return { ok: true };
  });

export const ordenarFotosFn = createServerFn({ method: "POST" })
  .validator((d: { sku: string; paths: string[] }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.$transaction(data.paths.map((path, i) => prisma.agricolas_img.updateMany({ where: { sku: data.sku, image_path: path }, data: { sort_order: 10 + i } })));
    return { ok: true };
  });

// ---------- Fotos em lote: reconhecer a peça pelo nome do arquivo ----------
const norm = (s: string) => s.toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g, "");
export type Casamento = { arquivo: string; base: string; sku: string | null; nome: string | null; temFoto: boolean; opcoes: Array<{ sku: string; nome: string; temFoto: boolean }> };

export const casarFotosFn = createServerFn({ method: "POST" })
  .validator((d: { nomes: string[] }) => ({ nomes: (d.nomes || []).slice(0, 2000).map(String) }))
  .handler(async ({ data }): Promise<Casamento[]> => {
    await admin();
    const { prisma } = await import("./prisma");
    const { nomeProduto } = await import("./pecas-es");
    const todos = await prisma.agricolas.findMany({
      select: { sku: true, codigo_fabricante: true, nome: true, nome_es: true, imagem_principal: true, duplicado_de: true, category_id: true },
    });
    const porChave = new Map<string, typeof todos>();
    const por = (k: string, p: (typeof todos)[number]) => { if (!k) return; const l = porChave.get(k) ?? []; l.push(p); porChave.set(k, l); };
    for (const p of todos) { por(norm(p.sku), p); if (p.codigo_fabricante) por(norm(p.codigo_fabricante), p); }
    const temFoto = (p: (typeof todos)[number]) => !!p.imagem_principal && !PLACEHOLDER.test(p.imagem_principal);
    return data.nomes.map((arquivo) => {
      const semExt = arquivo.replace(/\.[^.]+$/, "");
      // "3136019-2.jpg", "3136019 (3).jpg", "3136019_b.jpg" -> 3136019
      const candidatos = [semExt, semExt.replace(/(\s*\(\d+\)|[\s_-]+(\d{1,2}|[a-z]))$/i, "")];
      let achados: typeof todos = [];
      let base = semExt;
      for (const c of candidatos) {
        const l = porChave.get(norm(c));
        if (l?.length) { achados = [...new Map(l.map((p) => [p.sku, p])).values()]; base = c; break; }
      }
      // Preferência: peça principal da vitrine
      achados.sort((a, b) => Number(!!a.duplicado_de) - Number(!!b.duplicado_de) || Number(a.category_id == null) - Number(b.category_id == null));
      const opcoes = achados.slice(0, 6).map((p) => ({ sku: p.sku, nome: nomeProduto(p as any), temFoto: temFoto(p) }));
      const p = achados[0];
      return { arquivo, base, sku: p?.sku ?? null, nome: p ? nomeProduto(p as any) : null, temFoto: p ? temFoto(p) : false, opcoes };
    });
  });

// ---------- Cotação e configurações ----------
export const precosAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { configPrecos, lerConfiguracoes } = await import("./precos.server");
  const { prisma } = await import("./prisma");
  const [cfg, valores, historico] = await Promise.all([
    configPrecos(),
    lerConfiguracoes(),
    prisma.cotacoes.findMany({ where: { par: "BRL_UYU" }, orderBy: { created_at: "desc" }, take: 14 }),
  ]);
  return { cfg, valores, historico: historico.map((h) => ({ valor: h.valor, fonte: h.fonte, em: h.created_at.toISOString() })) };
});

export const atualizarCotacaoFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { configPrecos } = await import("./precos.server");
  return configPrecos(true);
});

export const salvarConfigPrecosFn = createServerFn({ method: "POST" })
  .validator((d: Record<string, string>) => d)
  .handler(async ({ data }) => {
    await admin();
    const { salvarConfiguracoes } = await import("./precos.server");
    await salvarConfiguracoes(data);
    return { ok: true };
  });
