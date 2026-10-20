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
    });
  });
