import { createServerFn } from "@tanstack/react-start";
import type { Midia, TipoPost } from "./instagram.server";

// Admin → Instagram: conexão, publicações (agora ou agendadas) e métricas.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  const s = await assertAdmin();
  const { garantirTabelaInstagram } = await import("./instagram.server");
  await garantirTabelaInstagram();
  return s;
};
const origem = async () => {
  const { getRequest } = await import("@tanstack/start-server-core");
  const { origemPublica } = await import("./google-oauth.server");
  return origemPublica(getRequest());
};

export type PostInstagram = {
  id: number;
  tipo: TipoPost;
  legenda: string;
  comentario: string;
  midias: Midia[];
  status: string;
  agendado_para: string | null;
  publicado_em: string | null;
  permalink: string | null;
  erro: string | null;
  metricas: Record<string, number> | null;
  metricas_em: string | null;
  facebook: boolean;
  fb_post_id: string | null;
};
export type PostForm = {
  id?: number;
  tipo: TipoPost;
  legenda: string;
  comentario: string;
  midias: Midia[];
  facebook?: boolean;
};

const paraPost = (r: any): PostInstagram => ({
  id: r.id,
  tipo: r.tipo,
  legenda: r.legenda ?? "",
  comentario: r.comentario ?? "",
  midias: JSON.parse(r.midias || "[]"),
  status: r.status,
  agendado_para: r.agendado_para?.toISOString() ?? null,
  publicado_em: r.publicado_em?.toISOString() ?? null,
  permalink: r.permalink,
  erro: r.erro,
  metricas: r.metricas ? JSON.parse(r.metricas) : null,
  metricas_em: r.metricas_em?.toISOString() ?? null,
  facebook: !!r.facebook,
  fb_post_id: r.fb_post_id ?? null,
});

export const statusInstagramFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { statusInstagram, callbackInstagram } = await import("./instagram.server");
  return { ...(await statusInstagram()), callback: callbackInstagram(await origem()) };
});

export const listarPostsFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { prisma } = await import("./prisma");
  const rows = await prisma.instagram_posts.findMany({ orderBy: { id: "desc" }, take: 200 });
  return rows.map(paraPost);
});

const limpar = (d: PostForm) => {
  const tipos: TipoPost[] = ["FEED", "CARROSSEL", "STORY", "REELS"];
  return {
    tipo: tipos.includes(d.tipo) ? d.tipo : "FEED",
    legenda: String(d.legenda ?? "").slice(0, 2200),
    comentario: String(d.comentario ?? "").slice(0, 2200),
    midias: (Array.isArray(d.midias) ? d.midias : [])
      .filter((m) => m && typeof m.path === "string" && /^instagram\/[\w.-]+$/.test(m.path))
      .map((m) => ({
        path: m.path,
        tipo: m.tipo === "VIDEO" ? ("VIDEO" as const) : ("IMAGE" as const),
      }))
      .slice(0, 10),
    facebook: !!d.facebook,
  };
};

// Salva (rascunho) e, se pedido, agenda ou publica na hora
export const salvarPostFn = createServerFn({ method: "POST" })
  .validator(
    (d: PostForm & { acao: "rascunho" | "agendar" | "publicar"; quando?: string | null }) => d,
  )
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { validarPost, publicarPost } = await import("./instagram.server");
    const p = limpar(data);
    if (data.acao !== "rascunho") validarPost(p.tipo, p.midias, p.legenda);
    let agendado_para: Date | null = null;
    if (data.acao === "agendar") {
      agendado_para = data.quando ? new Date(data.quando) : null;
      if (
        !agendado_para ||
        !Number.isFinite(agendado_para.getTime()) ||
        agendado_para.getTime() < Date.now() + 60_000
      )
        throw new Error("Escolha uma data e hora no futuro.");
    }
    if (data.id) {
      const atual = await prisma.instagram_posts.findUnique({ where: { id: Number(data.id) } });
      if (!atual) throw new Error("Publicação não encontrada");
      if (atual.status === "PUBLICADO" || atual.status === "PUBLICANDO")
        throw new Error("Essa publicação já saiu: crie outra.");
    }
    const campos = {
      facebook: !!p.facebook,
      tipo: p.tipo,
      legenda: p.legenda || null,
      comentario: p.comentario || null,
      midias: JSON.stringify(p.midias),
      status: data.acao === "agendar" ? "AGENDADO" : "RASCUNHO",
      agendado_para,
      erro: null,
    };
    const r = data.id
      ? await prisma.instagram_posts.update({ where: { id: Number(data.id) }, data: campos })
      : await prisma.instagram_posts.create({ data: campos });
    if (data.acao === "publicar") await publicarPost(r.id, await origem());
    return paraPost(await prisma.instagram_posts.findUnique({ where: { id: r.id } }));
  });

// Tentar de novo uma publicação que deu erro (ou publicar um agendado agora)
export const publicarAgoraFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { publicarPost } = await import("./instagram.server");
    await prisma.instagram_posts.updateMany({
      where: { id: data.id, status: { in: ["ERRO", "AGENDADO", "RASCUNHO"] } },
      data: { status: "RASCUNHO" },
    });
    await publicarPost(data.id, await origem());
    return { ok: true };
  });

export const cancelarAgendamentoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.instagram_posts.updateMany({
      where: { id: data.id, status: "AGENDADO" },
      data: { status: "RASCUNHO", agendado_para: null },
    });
    return { ok: true };
  });

// Apaga do painel (o que já foi publicado continua no Instagram)
export const apagarPostFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.instagram_posts.deleteMany({
      where: { id: data.id, status: { not: "PUBLICANDO" } },
    });
    return { ok: true };
  });

export const atualizarMetricasFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { atualizarMetricas } = await import("./instagram.server");
  return { atualizados: await atualizarMetricas(true) };
});

export const desconectarInstagramFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { desconectar } = await import("./instagram.server");
  await desconectar();
  return { ok: true };
});

// ---------------------------------------------------------------- Facebook e desempenho
export const statusFacebookFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { statusFacebook, callbackFacebook } = await import("./facebook.server");
  return { ...(await statusFacebook()), callback: callbackFacebook(await origem()) };
});

export const escolherFacebookFn = createServerFn({ method: "POST" })
  .validator((d: { pagina?: string | null; conta?: string | null }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { escolherFacebook } = await import("./facebook.server");
    await escolherFacebook(data);
    return { ok: true };
  });

export const desconectarFacebookFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { desconectarFacebook } = await import("./facebook.server");
  await desconectarFacebook();
  return { ok: true };
});

// Números das duas redes (cada uma pode falhar sozinha sem derrubar a outra)
export const desempenhoRedesFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({ dias: Math.min(30, Math.max(7, Number(d?.dias) || 28)) }))
  .handler(async ({ data }) => {
    await admin();
    const ig = await import("./instagram.server");
    const fb = await import("./facebook.server");
    const [instagram, facebook] = await Promise.all([
      ig.desempenhoInstagram(data.dias).then(
        (v) => ({ ok: true as const, ...v }),
        (e) => ({ ok: false as const, erro: String(e?.message ?? e) }),
      ),
      fb.statusFacebook().then((s) =>
        s.pagina
          ? fb.desempenhoPagina(data.dias).then(
              (v) => ({ ok: true as const, ...v }),
              (e) => ({ ok: false as const, erro: String(e?.message ?? e) }),
            )
          : { ok: false as const, erro: "Conecte o Facebook e escolha a página." },
      ),
    ]);
    return { dias: data.dias, instagram, facebook };
  });
