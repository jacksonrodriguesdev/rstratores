import { createServerFn } from "@tanstack/react-start";
import type { Etapa } from "./email-marketing.server";

// Painel de e-mail marketing avançado: análise, funil de remarketing e anúncios por e-mail.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  const s = await assertAdmin();
  const { garantirTabelasMarketing } = await import("./email-marketing.server");
  const { garantirColunasEmail } = await import("./email.server");
  await Promise.all([garantirTabelasMarketing(), garantirColunasEmail()]);
  return s;
};
const dias = (d: unknown) => Math.min(365, Math.max(1, Number(d) || 30));

export const resumoEmailsFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({ dias: dias(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    const { resumoEmails } = await import("./email-marketing.server");
    return resumoEmails(data.dias);
  });

export const funilEmailsFn = createServerFn({ method: "GET" })
  .validator((d: { campanha?: number | null; automacao?: number | null; dias?: number }) => ({
    campanha: Number(d?.campanha) || null,
    automacao: Number(d?.automacao) || null,
    dias: d?.dias ? dias(d.dias) : undefined,
  }))
  .handler(async ({ data }) => {
    await admin();
    const { funilEmails } = await import("./email-marketing.server");
    return funilEmails(data);
  });

// Campanhas e automações que já enviaram (para escolher no funil)
export const origensFunilFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { prisma } = await import("./prisma");
  const [c, a] = await Promise.all([
    prisma.email_campanhas.findMany({
      where: { enviados: { gt: 0 } },
      select: { id: true, nome: true, enviado_em: true },
      orderBy: { id: "desc" },
    }),
    prisma.email_automacoes.findMany({
      where: { enviados: { gt: 0 } },
      select: { id: true, nome: true },
      orderBy: { id: "asc" },
    }),
  ]);
  return {
    campanhas: c.map((x) => ({
      id: x.id,
      nome: x.nome,
      enviado_em: x.enviado_em?.toISOString() ?? null,
    })),
    automacoes: a,
  };
});

const ROTULO_ETAPA: Record<Etapa, string> = {
  nao_abriu: "não abriram",
  abriu_nao_clicou: "abriram e não clicaram",
  clicou_nao_comprou: "clicaram e não compraram",
};
// Assunto sugerido para o reenvio (o admin pode trocar antes de enviar)
const ASSUNTO: Record<Etapa, (a: string) => string> = {
  nao_abriu: (a) => `¿Lo viste? ${a}`.slice(0, 200),
  abriu_nao_clicou: (a) => `{{nombre}}, todavía estás a tiempo: ${a}`.slice(0, 200),
  clicou_nao_comprou: () => "{{nombre}}, ¿te ayudamos con la pieza que miraste? 💬",
};

// Cria um rascunho de campanha só para um segmento do funil, com o conteúdo do e-mail original
export const criarRemarketingFn = createServerFn({ method: "POST" })
  .validator((d: { campanha?: number | null; automacao?: number | null; etapa: Etapa }) => ({
    campanha: Number(d?.campanha) || null,
    automacao: Number(d?.automacao) || null,
    etapa: (["nao_abriu", "abriu_nao_clicou", "clicou_nao_comprou"] as const).includes(d?.etapa)
      ? d.etapa
      : ("nao_abriu" as Etapa),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const orig = data.campanha
      ? await prisma.email_campanhas.findUnique({ where: { id: data.campanha } })
      : data.automacao
        ? await prisma.email_automacoes.findUnique({ where: { id: data.automacao } })
        : null;
    if (!orig) throw new Error("Escolha uma campanha ou automação que já enviou e-mails.");
    const publico = {
      tipo: "remarketing",
      departamentos: [],
      dias: 30,
      origem: { campanha: data.campanha, automacao: data.automacao },
      etapa: data.etapa,
    };
    const r = await prisma.email_campanhas.create({
      data: {
        nome: `🔁 Remarketing · ${orig.nome} · ${ROTULO_ETAPA[data.etapa]}`.slice(0, 150),
        assunto: ASSUNTO[data.etapa](orig.assunto),
        preheader: orig.preheader,
        conteudo: orig.conteudo,
        publico: JSON.stringify(publico),
      },
    });
    return { id: r.id };
  });

// ---------------------------------------------------------------- anúncios por e-mail
export type AnuncioForm = {
  id?: number;
  nome: string;
  titulo: string;
  texto: string;
  imagem: string;
  link: string;
  botao: string;
  onde: "TODOS" | "CAMPANHAS" | "AUTOMACOES";
  peso: number;
  ativo: boolean;
  inicio: string | null;
  fim: string | null;
};
export type AnuncioLista = AnuncioForm & {
  id: number;
  noAr: boolean;
  exibicoes: number;
  abertos: number;
  cliques: number;
};

export const listarAnunciosFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnuncioLista[]> => {
    await admin();
    const { prisma } = await import("./prisma");
    const { estatisticasAnuncios } = await import("./email-marketing.server");
    const [rows, st] = await Promise.all([
      prisma.email_anuncios.findMany({ orderBy: { id: "desc" } }),
      estatisticasAnuncios(),
    ]);
    const agora = Date.now();
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      titulo: r.titulo,
      texto: r.texto ?? "",
      imagem: r.imagem ?? "",
      link: r.link,
      botao: r.botao ?? "",
      onde: r.onde as AnuncioForm["onde"],
      peso: r.peso,
      ativo: r.ativo,
      inicio: r.inicio?.toISOString() ?? null,
      fim: r.fim?.toISOString() ?? null,
      noAr:
        r.ativo &&
        (!r.inicio || r.inicio.getTime() <= agora) &&
        (!r.fim || r.fim.getTime() > agora),
      exibicoes: st[r.id]?.exibicoes ?? 0,
      abertos: st[r.id]?.abertos ?? 0,
      cliques: st[r.id]?.cliques ?? 0,
    }));
  },
);

export const salvarAnuncioFn = createServerFn({ method: "POST" })
  .validator((d: AnuncioForm) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { limparCacheAnuncios } = await import("./email-marketing.server");
    const titulo = String(data.titulo ?? "").trim();
    const link = String(data.link ?? "").trim();
    if (!titulo) throw new Error("Escreva o título do anúncio.");
    if (!link) throw new Error("Coloque o link (ex.: /loja ou /black-friday).");
    const quando = (v: string | null) => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d : null;
    };
    const inicio = quando(data.inicio),
      fim = quando(data.fim);
    if (inicio && fim && fim <= inicio) throw new Error("O fim precisa ser depois do início.");
    const campos = {
      nome: String(data.nome || titulo).slice(0, 150),
      titulo: titulo.slice(0, 200),
      texto: String(data.texto ?? "").trim() || null,
      imagem: String(data.imagem ?? "").trim() || null,
      link: link.slice(0, 500),
      botao:
        String(data.botao ?? "")
          .trim()
          .slice(0, 80) || null,
      onde: ["TODOS", "CAMPANHAS", "AUTOMACOES"].includes(data.onde) ? data.onde : "TODOS",
      peso: Math.min(10, Math.max(1, Math.round(Number(data.peso) || 1))),
      ativo: !!data.ativo,
      inicio,
      fim,
    };
    const r = data.id
      ? await prisma.email_anuncios.update({ where: { id: Number(data.id) }, data: campos })
      : await prisma.email_anuncios.create({ data: campos });
    limparCacheAnuncios();
    return { id: r.id };
  });

export const apagarAnuncioFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { limparCacheAnuncios } = await import("./email-marketing.server");
    await prisma.email_anuncios.deleteMany({ where: { id: data.id } });
    limparCacheAnuncios();
    return { ok: true };
  });

// Anúncio que entraria hoje (prévia do editor de campanha/automação)
export const anuncioPreviaFn = createServerFn({ method: "GET" })
  .validator((d: { origem: "CAMPANHA" | "AUTOMACAO" }) => ({
    origem: d?.origem === "AUTOMACAO" ? ("AUTOMACAO" as const) : ("CAMPANHA" as const),
  }))
  .handler(async ({ data }) => {
    const s = await admin();
    const { anunciosAtivos, escolherAnuncio } = await import("./email-marketing.server");
    const a = escolherAnuncio(await anunciosAtivos(data.origem), s.id ?? 0);
    return a
      ? {
          id: a.id,
          titulo: a.titulo,
          texto: a.texto,
          imagem: a.imagem,
          link: a.link,
          botao: a.botao,
        }
      : null;
  });
