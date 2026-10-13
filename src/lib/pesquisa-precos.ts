import { createServerFn } from "@tanstack/react-start";
import type { ChavePP } from "./pesquisa-precos.server";

// Admin → Produtos → Pesquisa de preços
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const redirectML = async () => {
  const { getRequest } = await import("@tanstack/start-server-core");
  const { origemPublica } = await import("./google-oauth.server");
  return `${origemPublica(getRequest())}/api/admin/mercadolivre/callback`;
};

export const obterConfigPPFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { configPP, quotaSerp } = await import("./pesquisa-precos.server");
  const c = await configPP();
  const masc = (v: string) => (v ? `••••${v.slice(-4)}` : "");
  return {
    serpapiKey: masc(c.pp_serpapi_key),
    paises: c.pp_paises,
    mlClientId: c.pp_ml_client_id,
    mlClientSecret: masc(c.pp_ml_client_secret),
    mlConectado: !!c.pp_ml_token,
    mlUsuario: c.pp_ml_usuario || null,
    redirectML: await redirectML(),
    quota: await quotaSerp(),
  };
});

export const salvarConfigPPFn = createServerFn({ method: "POST" })
  .validator((d: Partial<Record<ChavePP, string>>) => d)
  .handler(async ({ data }) => {
    await admin();
    const { salvarPP } = await import("./pesquisa-precos.server");
    // Só os campos editáveis pela tela (os tokens do ML vêm do login)
    const { pp_serpapi_key, pp_paises, pp_ml_client_id, pp_ml_client_secret } = data;
    await salvarPP({ pp_serpapi_key, pp_paises, pp_ml_client_id, pp_ml_client_secret });
    return { ok: true };
  });

export const loginMLFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { configPP, urlLoginML } = await import("./pesquisa-precos.server");
  const c = await configPP();
  if (!c.pp_ml_client_id || !c.pp_ml_client_secret) throw new Error("Preencha o App ID e a chave secreta do app do Mercado Livre e salve.");
  return { url: urlLoginML(c.pp_ml_client_id, await redirectML()) };
});

export const desconectarMLFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { salvarPP } = await import("./pesquisa-precos.server");
  await salvarPP({ pp_ml_token: "", pp_ml_refresh: "", pp_ml_token_expira: "", pp_ml_usuario: "" });
  return { ok: true };
});

export type FiltroLote = "com_foto_sem_preco" | "sem_preco" | "com_foto" | "codigos";

export const iniciarPesquisaFn = createServerFn({ method: "POST" })
  .validator((d: { filtro: FiltroLote; codigos?: string; limite: number; refazer?: boolean }) => ({
    filtro: d.filtro,
    codigos: String(d.codigos ?? "").slice(0, 20000),
    limite: Math.min(Math.max(Number(d.limite) || 20, 1), 2000),
    refazer: !!d.refazer,
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { configPP, iniciarLote } = await import("./pesquisa-precos.server");
    const c = await configPP();
    if (!c.pp_serpapi_key && !c.pp_ml_token) throw new Error("Configure a chave do SerpAPI ou conecte o Mercado Livre antes de pesquisar.");
    let skus: string[];
    if (data.filtro === "codigos") {
      const cods = [...new Set(data.codigos.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))].slice(0, data.limite);
      const rows = await prisma.agricolas.findMany({
        where: { duplicado_de: null, OR: [{ sku: { in: cods } }, { codigo_fabricante: { in: cods } }] },
        select: { sku: true },
      });
      skus = rows.map((r) => r.sku);
    } else {
      const semPreco = { OR: [{ preco_brl: null }, { preco_brl: { lte: 0 } }] };
      const comFoto = { imagem_principal: { not: null }, NOT: { imagem_principal: { contains: "redeparts" } } };
      const where: any = { duplicado_de: null, category_id: { not: null } };
      if (data.filtro === "com_foto_sem_preco") Object.assign(where, semPreco, comFoto);
      if (data.filtro === "sem_preco") Object.assign(where, semPreco);
      if (data.filtro === "com_foto") Object.assign(where, comFoto);
      // Não repete peças pesquisadas nos últimos 30 dias (a não ser que peça para refazer)
      if (!data.refazer) {
        const recentes = await prisma.precos_resumo.findMany({ where: { pesquisado_em: { gte: new Date(Date.now() - 30 * 86400_000) } }, select: { sku: true } });
        if (recentes.length) where.sku = { notIn: recentes.map((r) => r.sku) };
      }
      const rows = await prisma.agricolas.findMany({ where, select: { sku: true }, orderBy: [{ precificado_em: "desc" }, { nome: "asc" }], take: data.limite });
      skus = rows.map((r) => r.sku);
    }
    if (!skus.length) throw new Error("Nenhuma peça encontrada para pesquisar com esse filtro.");
    iniciarLote(skus);
    return { total: skus.length };
  });

export const statusPesquisaFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { statusLote } = await import("./pesquisa-precos.server");
  return statusLote();
});

export const pararPesquisaFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { pararLote } = await import("./pesquisa-precos.server");
  pararLote();
  return { ok: true };
});

export type OfertaPP = { id: number; fonte: string; pais: string; loja: string | null; titulo: string; preco: number; moeda: string; preco_brl: number | null; relevante: boolean; ignorar: boolean; link: string | null };
export type ResultadoPP = {
  sku: string; nome: string; codigo: string; marca: string | null; imagem: string | null; precoAtual: number | null;
  achados: number; menor: number | null; mediana: number | null; maior: number | null; erro: string | null;
  pesquisadoEm: string; aplicadoEm: string | null; ofertas: OfertaPP[];
};

export const listarResultadosFn = createServerFn({ method: "GET" })
  .validator((d: { aba: "pendentes" | "aplicados" | "sem_resultado"; busca?: string; pagina?: number }) => ({
    aba: d.aba,
    busca: String(d.busca ?? "").trim().slice(0, 80),
    pagina: Math.max(1, Number(d.pagina) || 1),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { nomeProduto } = await import("./pecas-es");
    const where: any =
      data.aba === "aplicados" ? { aplicado_em: { not: null } } : data.aba === "sem_resultado" ? { achados: 0 } : { aplicado_em: null, achados: { gt: 0 } };
    if (data.busca) {
      const achados = await prisma.agricolas.findMany({
        where: { OR: [{ sku: { contains: data.busca } }, { codigo_fabricante: { contains: data.busca } }, { nome: { contains: data.busca } }] },
        select: { sku: true },
        take: 500,
      });
      where.sku = { in: achados.map((a) => a.sku) };
    }
    const POR = 25;
    const [total, resumos, contagem] = await Promise.all([
      prisma.precos_resumo.count({ where }),
      prisma.precos_resumo.findMany({ where, orderBy: { pesquisado_em: "desc" }, skip: (data.pagina - 1) * POR, take: POR }),
      Promise.all([
        prisma.precos_resumo.count({ where: { aplicado_em: null, achados: { gt: 0 } } }),
        prisma.precos_resumo.count({ where: { aplicado_em: { not: null } } }),
        prisma.precos_resumo.count({ where: { achados: 0 } }),
      ]),
    ]);
    const skus = resumos.map((r) => r.sku);
    const [pecas, ofertas] = await Promise.all([
      prisma.agricolas.findMany({ where: { sku: { in: skus } } }),
      prisma.precos_ofertas.findMany({ where: { sku: { in: skus } }, orderBy: [{ relevante: "desc" }, { preco_brl: "desc" }] }),
    ]);
    const porSku = new Map(pecas.map((p) => [p.sku, p]));
    const lista: ResultadoPP[] = resumos.map((r) => {
      const p = porSku.get(r.sku);
      return {
        sku: r.sku,
        nome: p ? nomeProduto(p as any) : r.sku,
        codigo: (p?.codigo_fabricante || r.sku).trim(),
        marca: p?.marca ?? null,
        imagem: p?.imagem_principal && !p.imagem_principal.includes("redeparts") ? p.imagem_principal : null,
        precoAtual: p?.preco_brl ?? null,
        achados: r.achados, menor: r.menor_brl, mediana: r.mediana_brl, maior: r.maior_brl, erro: r.erro,
        pesquisadoEm: r.pesquisado_em.toISOString(), aplicadoEm: r.aplicado_em?.toISOString() ?? null,
        ofertas: ofertas.filter((o) => o.sku === r.sku).slice(0, 40).map((o) => ({ id: o.id, fonte: o.fonte, pais: o.pais, loja: o.loja, titulo: o.titulo, preco: o.preco, moeda: o.moeda, preco_brl: o.preco_brl, relevante: o.relevante, ignorar: o.ignorar, link: o.link })),
      };
    });
    return { lista, total, paginas: Math.max(1, Math.ceil(total / POR)), contagem: { pendentes: contagem[0], aplicados: contagem[1], semResultado: contagem[2] } };
  });

// Tira (ou devolve) uma oferta da conta e recalcula menor/mediana/maior
export const marcarOfertaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; ignorar?: boolean; relevante?: boolean }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { recalcularResumo } = await import("./pesquisa-precos.server");
    const o = await prisma.precos_ofertas.update({
      where: { id: Number(data.id) },
      data: { ...(data.ignorar !== undefined && { ignorar: !!data.ignorar }), ...(data.relevante !== undefined && { relevante: !!data.relevante }) },
    });
    await recalcularResumo(o.sku);
    return { ok: true };
  });

// Grava o preço de venda (R$) nas peças escolhidas
export const aplicarPrecosFn = createServerFn({ method: "POST" })
  .validator((d: { itens: Array<{ sku: string; preco_brl: number }> }) => ({
    itens: (d.itens ?? []).slice(0, 500).map((i) => ({ sku: String(i.sku), preco_brl: Math.round(Number(i.preco_brl) * 100) / 100 })).filter((i) => i.preco_brl > 0),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const agora = new Date();
    for (const i of data.itens) {
      await prisma.agricolas.updateMany({ where: { sku: i.sku }, data: { preco_brl: i.preco_brl, preco_modo: "AUTO", precificado_em: agora } });
      await prisma.precos_resumo.updateMany({ where: { sku: i.sku }, data: { aplicado_em: agora } });
    }
    // O site passa a mostrar os preços na hora
    const { limparCacheCatalogo } = await import("./busca-catalogo.server");
    const { limparCacheFacets } = await import("./products.server");
    limparCacheCatalogo();
    limparCacheFacets();
    return { aplicados: data.itens.length };
  });
