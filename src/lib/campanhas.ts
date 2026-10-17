import { createServerFn } from "@tanstack/react-start";
import {
  MENSAGEM_CUPOM,
  cupomMisterio,
  datasBlackFriday,
  CONFIG_PADRAO,
  type CampanhaPublica,
  type ConfigCampanha,
} from "./campanha-comum";
import type { Product } from "./products";

// Campanhas (Black Friday…) e cupons: funções do site, da página da campanha e do admin.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const srv = () => import("./campanha.server");
// Peça do catálogo agrícola no formato do cartão da loja
const paraCartao = (rows: Array<Record<string, any>>) =>
  rows.map((p) => ({ ...p, linha: "AGRICOLA" })) as unknown as Product[];

// ---------------------------------------------------------------- site
// Layout raiz: campanha no ar. "previa" (PRE/BLACK) só vale para o admin (simular a fase)
export const campanhaPublicaFn = createServerFn({ method: "GET" })
  .validator((d: { previa?: string } | undefined) => ({
    previa: (d?.previa === "PRE" || d?.previa === "BLACK" ? d.previa : null) as
      "PRE" | "BLACK" | null,
  }))
  .handler(async ({ data }): Promise<CampanhaPublica | null> => {
    let previa: "PRE" | "BLACK" | null = null;
    if (data.previa) {
      const { getSession } = await import("./auth.server");
      const s = await getSession().catch(() => null);
      if (s?.role === "ADMIN") previa = data.previa;
    }
    return (await srv()).campanhaPublica(previa);
  });

export type CupomPagina = {
  codigo: string | null; // null = mistério
  tipo: string;
  valor: number | null;
  moeda: string;
  minimo: number;
  descricao: string | null;
  descricao_pt: string | null;
  fim: string | null;
  revelar_em: string | null;
  esgotado: boolean;
};
const paraPagina = (c: any): CupomPagina => {
  const misterio = cupomMisterio(c);
  return {
    codigo: misterio ? null : c.codigo,
    tipo: misterio ? "MISTERIO" : c.tipo,
    valor: misterio ? null : c.valor,
    moeda: c.moeda,
    minimo: misterio ? 0 : c.minimo,
    descricao: c.descricao,
    descricao_pt: c.descricao_pt,
    fim: c.fim?.toISOString() ?? null,
    revelar_em: c.revelar_em?.toISOString() ?? null,
    esgotado: c.max_usos > 0 && c.usos >= c.max_usos,
  };
};

export const cuponsPaginaFn = createServerFn({ method: "GET" }).handler(async () => {
  const s = await srv();
  return (await s.cuponsPublicos()).map(paraPagina);
});

// Página /black-friday: campanha, peças em oferta, cupons e o resumo dos descontos
export const paginaCampanhaFn = createServerFn({ method: "GET" })
  .validator((d: { previa?: string } | undefined) => ({
    previa: (d?.previa === "PRE" || d?.previa === "BLACK" ? d.previa : null) as
      "PRE" | "BLACK" | null,
  }))
  .handler(async ({ data }) => {
    const s = await srv();
    let previa: "PRE" | "BLACK" | null = null;
    if (data.previa) {
      const { getSession } = await import("./auth.server");
      if ((await getSession().catch(() => null))?.role === "ADMIN") previa = data.previa;
    }
    const campanha = await s.campanhaPublica(previa);
    // Na prévia do admin sem campanha ativa: a última editada
    const ativa = (await s.campanhaAtiva()) ?? (previa ? await s.ultimaCampanha() : null);
    const regras =
      campanha && ativa
        ? ativa.regras
            .filter((r) => r.fase === "AMBAS" || r.fase === campanha.fase)
            .filter((r) => r.tipo !== "ITEM")
            .map((r) => ({ tipo: r.tipo, alvo: r.alvo, pct: r.pct }))
            .sort((a, b) => b.pct - a.pct)
        : [];
    // Sem custo nem margem: só o que o cliente pode ver
    const { semCusto } = await import("./precos.server");
    const pecas = campanha
      ? paraCartao((await s.pecasDaCampanha(24, campanha.fase, ativa)).map((p) => semCusto(p)))
      : [];
    // Sem campanha no ar: a próxima (para a contagem "vem aí") ou as datas deste ano
    let proxima: { inicio: string; nome: string } | null = null;
    if (!campanha) {
      const { prisma } = await import("./prisma");
      await s.garantirTabelasCampanha();
      const p = await prisma.campanhas.findFirst({
        where: { ativa: true, inicio: { gt: new Date() } },
        orderBy: { inicio: "asc" },
      });
      if (p) proxima = { inicio: p.inicio.toISOString(), nome: p.nome };
      else {
        const ano = new Date().getFullYear();
        let d = datasBlackFriday(ano);
        if (d.fim < new Date()) d = datasBlackFriday(ano + 1);
        proxima = {
          inicio: d.inicio.toISOString(),
          nome: `Black Friday ${d.inicio.getFullYear()}`,
        };
      }
    }
    return {
      campanha,
      regras,
      pecas,
      cupons: (await s.cuponsPublicos())
        .filter((c) => !ativa || !c.campanha_id || c.campanha_id === ativa.id)
        .map(paraPagina),
      proxima,
    };
  });

// Vitrine de ofertas da home (peças das regras em destaque)
export const ofertasCampanhaFn = createServerFn({ method: "GET" })
  .validator((d: { limite?: number } | undefined) => ({
    limite: Math.min(Math.max(Number(d?.limite) || 12, 4), 24),
  }))
  .handler(async ({ data }) => {
    const s = await srv();
    const { semCusto } = await import("./precos.server");
    return paraCartao((await s.pecasDaCampanha(data.limite)).map((p) => semCusto(p)));
  });

// ---------------------------------------------------------------- admin
export type RegraForm = {
  tipo: string;
  alvo: string;
  pct: number;
  fase: string;
  destaque: boolean;
};
export type CampanhaForm = {
  id?: number;
  nome: string;
  tipo: string;
  ativa: boolean;
  pre_inicio: string;
  inicio: string;
  fim: string;
  tema: string;
  config: ConfigCampanha;
  regras: RegraForm[];
};

export const listarCampanhasFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const s = await srv();
  await s.garantirTabelasCampanha();
  const { prisma } = await import("./prisma");
  const { faseDe } = await import("./campanha-comum");
  const rows = await prisma.campanhas.findMany({
    orderBy: { inicio: "desc" },
    include: { regras: true },
  });
  return rows.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    ativa: c.ativa,
    pre_inicio: c.pre_inicio.toISOString(),
    inicio: c.inicio.toISOString(),
    fim: c.fim.toISOString(),
    tema: c.tema,
    fase: faseDe(c),
    config: s.lerConfigCampanha(c.config),
    regras: c.regras.map((r) => ({
      tipo: r.tipo,
      alvo: r.alvo,
      pct: r.pct,
      fase: r.fase,
      destaque: r.destaque,
    })),
  }));
});

const TIPOS_REGRA = ["TUDO", "CATEGORIA", "MARCA", "ITEM"];
const FASES = ["PRE", "BLACK", "AMBAS"];

export const salvarCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: CampanhaForm) => d)
  .handler(async ({ data }) => {
    await admin();
    const s = await srv();
    await s.garantirTabelasCampanha();
    const { prisma } = await import("./prisma");
    const pre = new Date(data.pre_inicio);
    const ini = new Date(data.inicio);
    const fim = new Date(data.fim);
    if (![pre, ini, fim].every((d) => Number.isFinite(d.getTime())))
      throw new Error("Datas inválidas.");
    if (!(pre <= ini && ini < fim))
      throw new Error("A ordem tem que ser: início da pré ≤ início da campanha < fim.");
    const nome = String(data.nome || "")
      .trim()
      .slice(0, 120);
    if (!nome) throw new Error("Dê um nome à campanha.");
    const regras = (data.regras || [])
      .map((r) => ({
        tipo: TIPOS_REGRA.includes(r.tipo) ? r.tipo : "CATEGORIA",
        alvo:
          r.tipo === "TUDO"
            ? ""
            : String(r.alvo || "")
                .trim()
                .slice(0, 191),
        pct: Math.min(Math.max(Math.round(Number(r.pct) * 10) / 10, 0), 90),
        fase: FASES.includes(r.fase) ? r.fase : "BLACK",
        destaque: !!r.destaque,
      }))
      .filter((r) => r.pct > 0 && (r.tipo === "TUDO" || r.alvo));
    const config = JSON.stringify({ ...CONFIG_PADRAO, ...(data.config || {}) });
    const campos = {
      nome,
      tipo: String(data.tipo || "BLACK_FRIDAY").slice(0, 20),
      ativa: !!data.ativa,
      pre_inicio: pre,
      inicio: ini,
      fim,
      tema: data.tema === "padrao" ? "padrao" : "black",
      config,
    };
    const id = await prisma.$transaction(async (tx) => {
      // Uma campanha ativa por vez
      if (campos.ativa)
        await tx.campanhas.updateMany({
          where: { ativa: true, NOT: { id: data.id ?? 0 } },
          data: { ativa: false },
        });
      const c = data.id
        ? await tx.campanhas.update({ where: { id: data.id }, data: campos })
        : await tx.campanhas.create({ data: campos });
      await tx.campanha_regras.deleteMany({ where: { campanha_id: c.id } });
      if (regras.length)
        await tx.campanha_regras.createMany({
          data: regras.map((r) => ({ ...r, campanha_id: c.id })),
        });
      return c.id;
    });
    await limparCaches();
    return { id };
  });

async function limparCaches() {
  (await srv()).limparCacheCampanha();
  (await import("./precos.server")).limparCacheConfig();
}

export const apagarCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.campanhas.delete({ where: { id: data.id } });
    await limparCaches();
    return { ok: true };
  });

// Modelo pronto da Black Friday do ano (datas calculadas, descontos de exemplo, desligada)
export const modeloBlackFridayFn = createServerFn({ method: "GET" })
  .validator((d: { ano?: number } | undefined) => ({
    ano: Number(d?.ano) || new Date().getFullYear(),
  }))
  .handler(async ({ data }): Promise<CampanhaForm> => {
    await admin();
    let d = datasBlackFriday(data.ano);
    if (d.fim < new Date()) d = datasBlackFriday(data.ano + 1);
    const ano = d.inicio.getFullYear();
    return {
      nome: `Black Friday ${ano}`,
      tipo: "BLACK_FRIDAY",
      ativa: false,
      pre_inicio: d.pre_inicio.toISOString(),
      inicio: d.inicio.toISOString(),
      fim: d.fim.toISOString(),
      tema: "black",
      config: {
        ...CONFIG_PADRAO,
        titulo: `Black Friday AGRO PARTS ${ano}`,
        titulo_pt: `Black Friday AGRO PARTS ${ano}`,
      },
      regras: [
        { tipo: "TUDO", alvo: "", pct: 5, fase: "PRE", destaque: false },
        { tipo: "TUDO", alvo: "", pct: 10, fase: "BLACK", destaque: false },
        { tipo: "CATEGORIA", alvo: "Filtros", pct: 20, fase: "BLACK", destaque: true },
        { tipo: "CATEGORIA", alvo: "Freios e Embreagens", pct: 15, fase: "BLACK", destaque: true },
      ],
    };
  });

// Quantas peças com preço cada regra alcança (para o admin ver o tamanho do desconto)
export const alcanceRegrasFn = createServerFn({ method: "POST" })
  .validator((d: { regras: Array<{ tipo: string; alvo: string }> }) => ({
    regras: (d.regras || []).slice(0, 60),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const base = { duplicado_de: null, preco_brl: { gt: 0 } };
    const out: number[] = [];
    for (const r of data.regras) {
      const where =
        r.tipo === "TUDO"
          ? base
          : r.tipo === "CATEGORIA"
            ? { ...base, categoria: r.alvo }
            : r.tipo === "MARCA"
              ? { ...base, marca: r.alvo }
              : { ...base, sku: r.alvo };
      out.push(r.tipo !== "TUDO" && !r.alvo ? 0 : await prisma.agricolas.count({ where }));
    }
    return out;
  });

// Opções para as regras: categorias e marcas que existem no catálogo
export const opcoesRegrasFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { prisma } = await import("./prisma");
  const [cats, marcas] = await Promise.all([
    prisma.agricolas.groupBy({
      by: ["categoria"],
      where: { duplicado_de: null },
      _count: true,
      orderBy: { _count: { categoria: "desc" } },
    }),
    prisma.agricolas.groupBy({
      by: ["marca"],
      where: { duplicado_de: null },
      _count: true,
      orderBy: { _count: { marca: "desc" } },
      take: 40,
    }),
  ]);
  return {
    categorias: cats.filter((c) => c.categoria).map((c) => c.categoria as string),
    marcas: marcas.filter((m) => m.marca).map((m) => m.marca as string),
  };
});

// ---------- cupons (admin)
export type CupomForm = {
  id?: number;
  codigo: string;
  campanha_id?: number | null;
  tipo: string;
  valor: number;
  moeda: string;
  minimo: number;
  descricao?: string;
  descricao_pt?: string;
  inicio?: string | null;
  fim?: string | null;
  revelar_em?: string | null;
  max_usos: number;
  por_cliente: number;
  so_primeira_compra: boolean;
  publico: boolean;
  ativo: boolean;
};

export const listarCuponsFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const s = await srv();
  await s.garantirTabelasCampanha();
  const { prisma } = await import("./prisma");
  const rows = await prisma.cupons.findMany({ orderBy: { id: "desc" }, take: 200 });
  return rows.map((c) => ({
    ...c,
    inicio: c.inicio?.toISOString() ?? null,
    fim: c.fim?.toISOString() ?? null,
    revelar_em: c.revelar_em?.toISOString() ?? null,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  }));
});

const dataOuNull = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

export const salvarCupomFn = createServerFn({ method: "POST" })
  .validator((d: CupomForm) => d)
  .handler(async ({ data }) => {
    await admin();
    const s = await srv();
    await s.garantirTabelasCampanha();
    const { prisma } = await import("./prisma");
    const codigo = String(data.codigo || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 40);
    if (codigo.length < 3) throw new Error("Código com pelo menos 3 letras ou números.");
    const tipo = ["PERCENT", "FIXO", "FRETE"].includes(data.tipo) ? data.tipo : "PERCENT";
    const valor = Math.max(0, Number(data.valor) || 0);
    if (tipo === "PERCENT" && (valor <= 0 || valor > 90))
      throw new Error("Percentual entre 1 e 90.");
    if (tipo === "FIXO" && valor <= 0) throw new Error("Informe o valor do desconto.");
    const campos = {
      codigo,
      campanha_id: data.campanha_id ? Number(data.campanha_id) : null,
      tipo,
      valor,
      moeda: data.moeda === "BRL" ? "BRL" : "UYU",
      minimo: Math.max(0, Number(data.minimo) || 0),
      descricao: data.descricao?.trim().slice(0, 300) || null,
      descricao_pt: data.descricao_pt?.trim().slice(0, 300) || null,
      inicio: dataOuNull(data.inicio),
      fim: dataOuNull(data.fim),
      revelar_em: dataOuNull(data.revelar_em),
      max_usos: Math.max(0, Math.round(Number(data.max_usos) || 0)),
      por_cliente: Math.max(0, Math.round(Number(data.por_cliente) || 0)),
      so_primeira_compra: !!data.so_primeira_compra,
      publico: !!data.publico,
      ativo: !!data.ativo,
    };
    try {
      const c = data.id
        ? await prisma.cupons.update({ where: { id: data.id }, data: campos })
        : await prisma.cupons.create({ data: campos });
      return { id: c.id };
    } catch (e: any) {
      if (e?.code === "P2002") throw new Error(`Já existe um cupom ${codigo}.`);
      throw e;
    }
  });

export const apagarCupomFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.cupons.delete({ where: { id: data.id } });
    return { ok: true };
  });

// Admin → Pagamentos → novo link: confere o cupom e calcula o desconto
export const validarCupomLinkFn = createServerFn({ method: "POST" })
  .validator((d: { codigo: string; subtotal: number; moeda: string; email?: string }) => ({
    codigo: String(d.codigo || "").slice(0, 40),
    subtotal: Math.max(0, Math.round(Number(d.subtotal) || 0)),
    moeda: d.moeda === "BRL" ? "BRL" : "UYU",
    email: d.email ? String(d.email).slice(0, 191) : null,
  }))
  .handler(async ({ data }) => {
    await admin();
    const r = await (await srv()).validarCupom(data.codigo, data);
    if (!r.ok) return { ok: false as const, erro: MENSAGEM_CUPOM[r.motivo][1] };
    return {
      ok: true as const,
      codigo: r.cupom.codigo,
      desconto: r.desconto,
      freteGratis: r.freteGratis,
      descricao:
        r.cupom.tipo === "PERCENT"
          ? `${r.cupom.valor}%`
          : r.cupom.tipo === "FRETE"
            ? "frete grátis"
            : `${r.cupom.valor} ${r.cupom.moeda}`,
    };
  });
