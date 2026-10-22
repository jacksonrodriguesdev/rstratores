import { createServerFn } from "@tanstack/react-start";
import type { NovoAnuncio } from "./meta-ads.server";

// Admin → Meta Ads: tudo dos anúncios do Facebook/Instagram num lugar só.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const dias = (d: unknown) => Math.min(90, Math.max(1, Number(d) || 30));
// Cada parte pode falhar sozinha (ex.: permissão faltando) sem derrubar a tela
const tentar = async <T>(fn: () => Promise<T>) => {
  try {
    return { ok: true as const, v: await fn() };
  } catch (e: any) {
    return { ok: false as const, erro: String(e?.message ?? e) };
  }
};

export const visaoMetaFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({ dias: dias(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    const m = await import("./meta-ads.server");
    const { metaConfigurado } = await import("./ads-meta.server");
    if (!(await metaConfigurado())) return { configurado: false as const };
    const [conta, geral, retorno] = await Promise.all([
      tentar(() => m.contaCompleta()),
      tentar(() => m.visaoGeral(data.dias)),
      tentar(() => m.retornoSite(data.dias)),
    ]);
    return { configurado: true as const, conta, geral, retorno };
  });

export const estruturaMetaFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({ dias: dias(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    const { estrutura } = await import("./meta-ads.server");
    return estrutura(data.dias);
  });

export const anunciosMetaFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({ dias: dias(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    const { anuncios } = await import("./meta-ads.server");
    return anuncios(data.dias);
  });

const FORMATOS = [
  "MOBILE_FEED_STANDARD",
  "INSTAGRAM_STANDARD",
  "INSTAGRAM_STORY",
  "DESKTOP_FEED_STANDARD",
];
export const previaAnuncioFn = createServerFn({ method: "GET" })
  .validator((d: { id: string; formato?: string }) => ({
    id: String(d?.id ?? "").replace(/\D/g, ""),
    formato: FORMATOS.includes(String(d?.formato)) ? String(d.formato) : FORMATOS[0],
  }))
  .handler(async ({ data }) => {
    await admin();
    const { previaAnuncio } = await import("./meta-ads.server");
    return { src: await previaAnuncio(data.id, data.formato) };
  });

// Pausar/ativar e orçamento (campanha, conjunto ou anúncio); fica no histórico da Central
export const alterarMetaFn = createServerFn({ method: "POST" })
  .validator(
    (d: { id: string; nome: string; tipo: string; ativo?: boolean; orcamento?: number }) => d,
  )
  .handler(async ({ data }) => {
    const s = await admin();
    const { alterarObjeto } = await import("./meta-ads.server");
    const id = String(data.id).replace(/\D/g, "");
    await alterarObjeto(id, { ativo: data.ativo, orcamento: data.orcamento });
    const { prisma } = await import("./prisma");
    await prisma.ads_acao
      .create({
        data: {
          plataforma: "META",
          id_externo: id.slice(0, 40),
          nome: `${data.tipo}: ${data.nome}`.slice(0, 300),
          acao: data.ativo !== undefined ? (data.ativo ? "ATIVAR" : "PAUSAR") : "ORCAMENTO",
          para:
            data.orcamento !== undefined
              ? String(data.orcamento)
              : data.ativo
                ? "ATIVA"
                : "PAUSADA",
          admin_id: s.id ?? null,
          ok: true,
        },
      })
      .catch(() => {});
    return { ok: true };
  });

export const publicoMetaFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({ dias: dias(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    const m = await import("./meta-ads.server");
    const [publico, site] = await Promise.all([
      tentar(() => m.publico(data.dias)),
      tentar(() => m.cidadesERotas(data.dias)),
    ]);
    return { publico, site };
  });

// ---------------------------------------------------------------- leads
export type Lead = {
  id: number;
  origem: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  detalhe: string | null;
  campanha: string | null;
  anuncio: string | null;
  status: string;
  nota: string | null;
  valor: number | null;
  quando: string;
};
export const listarLeadsFn = createServerFn({ method: "GET" })
  .validator((d: { sincronizar?: boolean }) => ({ sincronizar: !!d?.sincronizar }))
  .handler(async ({ data }) => {
    await admin();
    const m = await import("./meta-ads.server");
    await m.garantirTabelaLeads();
    const sinc = data.sincronizar ? await m.sincronizarLeads() : null;
    const { prisma } = await import("./prisma");
    const rows = await prisma.leads.findMany({ orderBy: { quando: "desc" }, take: 1000 });
    return {
      sinc,
      leads: rows.map((r): Lead => ({
        id: r.id,
        origem: r.origem,
        nome: r.nome,
        email: r.email,
        telefone: r.telefone,
        cidade: r.cidade,
        detalhe: r.detalhe,
        campanha: r.campanha,
        anuncio: r.anuncio,
        status: r.status,
        nota: r.nota,
        valor: r.valor,
        quando: r.quando.toISOString(),
      })),
    };
  });

const ETAPAS = ["NOVO", "CONTATADO", "NEGOCIANDO", "GANHO", "PERDIDO"];
export const salvarLeadFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; status?: string; nota?: string; valor?: number | null }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.leads.update({
      where: { id: Number(data.id) },
      data: {
        ...(data.status && ETAPAS.includes(data.status) && { status: data.status }),
        ...(data.nota !== undefined && { nota: String(data.nota).slice(0, 5000) || null }),
        ...(data.valor !== undefined && {
          valor: data.valor == null || isNaN(Number(data.valor)) ? null : Number(data.valor),
        }),
      },
    });
    return { ok: true };
  });

// ---------------------------------------------------------------- criar
export const criarAnuncioMetaFn = createServerFn({ method: "POST" })
  .validator((d: NovoAnuncio) => d)
  .handler(async ({ data }) => {
    await admin();
    const { criarAnuncio } = await import("./meta-ads.server");
    return criarAnuncio({
      ...data,
      nome: String(data.nome ?? "").slice(0, 200),
      texto: String(data.texto ?? "").slice(0, 2000),
      titulo: String(data.titulo ?? "").slice(0, 255),
      descricao: String(data.descricao ?? "").slice(0, 255),
      orcamentoDiario: Number(data.orcamentoDiario),
      idadeMin: Number(data.idadeMin) || 18,
      idadeMax: Number(data.idadeMax) || 65,
      imagemBase64: String(data.imagemBase64 ?? "").replace(/^data:[^,]+,/, ""),
      regioes: (Array.isArray(data.regioes) ? data.regioes : [])
        .map((r) => String(r).slice(0, 60))
        .slice(0, 19),
    });
  });

// ---------------------------------------------------------------- campanhas prontas
// As campanhas Meta do Criador de anúncios (Admin → Criador de anúncios), prontas para o
// formulário: textos, títulos, link com UTM, objetivo e as peças com foto própria (agrotrator
// ou enviada pelo admin; fotos de outras lojas e do /catalogo ficam de fora).
// Anúncio pago só para o Uruguai: a campanha em português (RS) aparece bloqueada.
export const campanhasProntasMetaFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({
    dias: Math.min(365, Math.max(7, Number(d?.dias) || 90)),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { criadorAnuncios } = await import("./anuncios.server");
    const { fotoPropria, sugestaoOrcamento } = await import("./estudio.server");
    const { prisma } = await import("./prisma");
    const [c, orc] = await Promise.all([criadorAnuncios(data.dias), sugestaoOrcamento()]);
    const metas = c.campanhas.filter((x) => x.plataforma === "Meta");
    const skus = [
      ...new Set([
        ...metas.flatMap((m) => m.produtos.map((p) => p.sku)),
        ...c.produtos.map((p) => p.sku),
      ]),
    ];
    const rows = skus.length
      ? await prisma.agricolas.findMany({
          where: { sku: { in: skus } },
          select: {
            sku: true,
            codigo_fabricante: true,
            imagem_principal: true,
            images: { select: { image_path: true }, orderBy: { sort_order: "asc" }, take: 4 },
          } as any,
        })
      : [];
    const fotos = new Map<string, string[]>();
    const codigos = new Map<string, string>();
    for (const r of rows as any[])
      codigos.set(String(r.sku).trim(), String(r.codigo_fabricante || r.sku).trim());
    for (const r of rows as any[])
      fotos.set(String(r.sku).trim(), [
        ...new Set(
          [r.imagem_principal, ...(r.images ?? []).map((i: any) => i.image_path)].filter(
            fotoPropria,
          ),
        ),
      ] as string[]);
    const info = new Map(c.produtos.map((p) => [p.sku.trim(), p]));
    const peca = (sku: string, nome: string) => {
      const p = info.get(sku.trim());
      return {
        sku,
        codigo: codigos.get(sku.trim()) ?? sku,
        nome,
        marca: p?.marca ?? null,
        fotos: fotos.get(sku.trim()) ?? [],
        uyu: p?.uyu ?? null,
        desconto: p?.desconto ?? 0,
      };
    };
    // Peças de reserva (as de mais interesse, com foto própria) para campanha sem peças
    const reserva = c.produtos
      .map((p) => peca(p.sku, p.nome))
      .filter((p) => p.fotos.length)
      .slice(0, 8);
    const corta = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
    return {
      orcamento: orc.diario,
      base: orc.base,
      campanhas: metas.map((m) => {
        const whats = /whats|conversa|mensag/i.test(`${m.objetivo} ${m.tipo}`);
        let produtos = m.produtos.map((p) => peca(p.sku, p.nome)).filter((p) => p.fotos.length);
        if (!produtos.length) produtos = reserva;
        const avisos = [m.aviso].filter(Boolean) as string[];
        if (/remarketing/i.test(m.id))
          avisos.push(
            "Daqui o anúncio sai para todo o Uruguai (sem a lista de quem visitou o site). Remarketing de verdade: público personalizado no Gerenciador de Anúncios.",
          );
        return {
          id: m.id,
          nome: m.nome,
          prioridade: m.prioridade,
          tipo: m.tipo,
          porque: m.porque,
          avisos,
          bloqueada:
            m.idioma === "pt"
              ? "Anúncio pago só para o Uruguai: para o RS, use publicação orgânica (Estúdio do Instagram)."
              : null,
          objetivo: (whats ? "WHATSAPP" : "TRAFEGO") as "WHATSAPP" | "TRAFEGO",
          botao: /catalogo/i.test(m.id)
            ? "LEARN_MORE"
            : /b2b|cotiz/i.test(`${m.id} ${m.link}`)
              ? "GET_QUOTE"
              : "SHOP_NOW",
          textos: m.textos.length ? m.textos : m.descricoes,
          titulos: [...new Set(m.titulos.map((t) => corta(t, 40)))],
          descricoes: m.descricoes.map((t) => corta(t, 90)),
          link: m.link,
          publico: m.publico,
          locais: m.locais,
          produtos,
        };
      }),
    };
  });

// ---------------------------------------------------------------- anúncios prontos do dia
let memoOrc: { em: number; diario: number | null } | null = null;
// Milhares de combinações departamento × peça × ângulo (src/lib/anuncios-prontos.server.ts)
export const anunciosProntosFn = createServerFn({ method: "GET" })
  .validator((d: import("./anuncios-prontos.server").FiltroProntos) => ({
    pagina: Math.max(0, Number(d?.pagina) || 0),
    local: d?.local ? String(d.local).slice(0, 60) : undefined,
    marca: d?.marca ? String(d.marca).slice(0, 60) : undefined,
    categoria: d?.categoria ? String(d.categoria).slice(0, 80) : undefined,
    angulo: d?.angulo ? String(d.angulo).slice(0, 20) : undefined,
    objetivo: d?.objetivo === "WHATSAPP" || d?.objetivo === "TRAFEGO" ? d.objetivo : undefined,
    q: d?.q ? String(d.q).slice(0, 80) : undefined,
  }))
  .handler(async ({ data }) => {
    await admin();
    const { buscarProntos } = await import("./anuncios-prontos.server");
    const { sugestaoOrcamento } = await import("./estudio.server");
    // Valor sugerido (custo por clique real × 25 cliques/dia), guardado por 30 min
    if (!memoOrc || Date.now() - memoOrc.em > 30 * 60_000)
      memoOrc = {
        em: Date.now(),
        diario: (await sugestaoOrcamento().catch(() => null))?.diario ?? null,
      };
    return { ...(await buscarProntos(data, 30)), orcamento: memoOrc.diario };
  });
