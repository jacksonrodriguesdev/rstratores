import { createServerFn } from "@tanstack/react-start";
import {
  CONTEUDO_PADRAO,
  PUBLICO_PADRAO,
  type ConteudoEmail,
  type ProdutoEmail,
  type Publico,
} from "./email-template";
import type { BlocoEmail } from "./email-blocos";

// Painel de e-mails (Admin → E-mails): campanhas, público, teste e envio pelo Resend.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  const sessao = await assertAdmin();
  const { garantirColunasEmail } = await import("./email.server");
  await garantirColunasEmail();
  return sessao;
};

// Miniatura do cartão na lista: imagem do topo, a primeira imagem/foto dos blocos ou as cores
function capa(c: ConteudoEmail) {
  const blocos = c.blocos ?? [];
  const img =
    c.cabecalho ||
    blocos.find((b) => (b.tipo === "IMAGEM" || b.tipo === "HERO") && b.d.imagem)?.d.imagem ||
    null;
  const hero = blocos.find((b) => b.tipo === "HERO" || b.tipo === "TITULO");
  return {
    cabecalho: (img as string | null) ?? null,
    fundo: c.tema?.topo ?? null,
    destaque: c.tema?.destaque ?? null,
    chamada: hero
      ? String(hero.d.titulo ?? hero.d.texto ?? "").replace(/\{\{\s*nombre\s*\}\}[, ]*/gi, "")
      : null,
    blocos: blocos.length,
  };
}

// Uma vez por ano: deixa a campanha da pré-Black Friday montada como rascunho, pronta para enviar
async function semearCampanhaPronta() {
  const { prisma } = await import("./prisma");
  const { modeloEmail, conteudoDoModelo } = await import("./email-modelos");
  const { datasBlackFriday } = await import("./campanha-comum");
  const ano = new Date().getUTCFullYear();
  const chave = `email_semente_preblack_${ano}`;
  if (Date.now() > datasBlackFriday(ano).inicio.getTime()) return;
  if (await prisma.configuracoes.findUnique({ where: { chave } })) return;
  const m = modeloEmail("pre-black")!;
  await prisma.configuracoes.create({ data: { chave, valor: new Date().toISOString() } });
  await prisma.email_campanhas.create({
    data: {
      nome: `🖤 Pre Black Friday ${ano} — pronta para enviar`,
      assunto: m.assunto,
      preheader: m.preheader,
      conteudo: JSON.stringify(conteudoDoModelo(m)),
      publico: JSON.stringify(m.publico),
    },
  });
}
const origem = async () => {
  const { getRequest } = await import("@tanstack/start-server-core");
  const { origemPublica } = await import("./google-oauth.server");
  return origemPublica(getRequest());
};

export type CampanhaResumo = {
  id: number;
  nome: string;
  assunto: string;
  status: string;
  total: number;
  enviados: number;
  falhas: number;
  enviado_em: string | null;
  updated_at: string;
  cabecalho: string | null;
  fundo: string | null;
  destaque: string | null;
  chamada: string | null;
  blocos: number;
  agendado_para: string | null;
  abertos: number;
  clicados: number;
  rebotes: number;
};
export type Campanha = {
  id: number;
  nome: string;
  assunto: string;
  preheader: string;
  conteudo: ConteudoEmail;
  publico: Publico;
  status: string;
  total: number;
  enviados: number;
  falhas: number;
  erro: string | null;
  enviado_em: string | null;
  agendado_para: string | null;
  rodando: boolean;
};

export const statusEmailFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { configEmail } = await import("./email.server");
  const { prisma } = await import("./prisma");
  const [clientes, recebem] = await Promise.all([
    prisma.users.count({ where: { role: { not: "ADMIN" } } }),
    prisma.users.count({ where: { role: { not: "ADMIN" }, recebe_emails: true } }),
  ]);
  return { ...configEmail(), clientes, recebem, origem: await origem() };
});

export const listarCampanhasFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CampanhaResumo[]> => {
    await admin();
    const { prisma } = await import("./prisma");
    await semearCampanhaPronta().catch((e) => console.error("semente e-mail", e));
    const rows = await prisma.email_campanhas.findMany({ orderBy: { id: "desc" } });
    const stats = await prisma.email_envios.groupBy({
      by: ["campanha_id", "status"],
      _count: true,
      where: { campanha_id: { in: rows.map((r) => r.id) } },
    });
    const conta = (id: number, sts: string[]) =>
      stats
        .filter((s) => s.campanha_id === id && sts.includes(s.status))
        .reduce((a, s) => a + s._count, 0);
    return rows.map((r) => {
      let cp: ReturnType<typeof capa> = {
        cabecalho: null,
        fundo: null,
        destaque: null,
        chamada: null,
        blocos: 0,
      };
      try {
        cp = capa(JSON.parse(r.conteudo) as ConteudoEmail);
      } catch {
        /* conteúdo antigo/inválido: sem capa */
      }
      return {
        id: r.id,
        nome: r.nome,
        assunto: r.assunto,
        status: r.status,
        total: r.total,
        enviados: r.enviados,
        falhas: r.falhas,
        enviado_em: r.enviado_em?.toISOString() ?? null,
        updated_at: r.updated_at.toISOString(),
        ...cp,
        agendado_para: r.agendado_para?.toISOString() ?? null,
        abertos: conta(r.id, ["ABERTO", "CLICADO"]),
        clicados: conta(r.id, ["CLICADO"]),
        rebotes: conta(r.id, ["REBOTADO", "QUEIXA"]),
      };
    });
  },
);

export const obterCampanhaFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }): Promise<Campanha | null> => {
    await admin();
    const { prisma } = await import("./prisma");
    const { campanhaRodando } = await import("./email.server");
    const r = await prisma.email_campanhas.findUnique({ where: { id: data.id } });
    if (!r) return null;
    return {
      id: r.id,
      nome: r.nome,
      assunto: r.assunto,
      preheader: r.preheader ?? "",
      conteudo: { ...CONTEUDO_PADRAO, ...JSON.parse(r.conteudo) },
      publico: { ...PUBLICO_PADRAO, ...JSON.parse(r.publico) },
      status: r.status,
      total: r.total,
      enviados: r.enviados,
      falhas: r.falhas,
      erro: r.erro,
      enviado_em: r.enviado_em?.toISOString() ?? null,
      agendado_para: r.agendado_para?.toISOString() ?? null,
      rodando: campanhaRodando(r.id),
    };
  });

export const criarCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: { copiarDe?: number; modelo?: string }) => ({
    copiarDe: Number(d?.copiarDe) || 0,
    modelo: String(d?.modelo ?? "").slice(0, 40),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    if (data.modelo) {
      const { modeloEmail, conteudoDoModelo } = await import("./email-modelos");
      const m = modeloEmail(data.modelo);
      if (!m) throw new Error("Modelo não encontrado");
      const r = await prisma.email_campanhas.create({
        data: {
          nome: `${m.emoji} ${m.nome} · ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Montevideo" })}`,
          assunto: m.assunto,
          preheader: m.preheader || null,
          conteudo: JSON.stringify(conteudoDoModelo(m)),
          publico: JSON.stringify(m.publico),
        },
      });
      return { id: r.id };
    }
    const orig = data.copiarDe
      ? await prisma.email_campanhas.findUnique({ where: { id: data.copiarDe } })
      : null;
    const r = await prisma.email_campanhas.create({
      data: orig
        ? {
            nome: `${orig.nome} (cópia)`.slice(0, 150),
            assunto: orig.assunto,
            preheader: orig.preheader,
            conteudo: orig.conteudo,
            publico: orig.publico,
          }
        : {
            nome: `Campanha ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Montevideo" })}`,
            assunto: "Ofertas del mes en repuestos agrícolas 🚜",
            preheader: "Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
            conteudo: JSON.stringify(CONTEUDO_PADRAO),
            publico: JSON.stringify(PUBLICO_PADRAO),
          },
    });
    return { id: r.id };
  });

export const salvarCampanhaFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      id: number;
      nome: string;
      assunto: string;
      preheader: string;
      conteudo: ConteudoEmail;
      publico: Publico;
    }) => d,
  )
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const atual = await prisma.email_campanhas.findUnique({ where: { id: Number(data.id) } });
    if (!atual) throw new Error("Campanha não encontrada");
    if (atual.status === "ENVIANDO")
      throw new Error("A campanha está sendo enviada; espere terminar para editar.");
    const conteudo: ConteudoEmail = {
      ...data.conteudo,
      produtos: (data.conteudo.produtos ?? []).slice(0, 12),
      ...(data.conteudo.blocos && { blocos: data.conteudo.blocos.slice(0, 60) }),
    };
    await prisma.email_campanhas.update({
      where: { id: atual.id },
      data: {
        nome: String(data.nome || "Sem nome").slice(0, 150),
        assunto: String(data.assunto || "").slice(0, 200),
        preheader: String(data.preheader || "").slice(0, 200) || null,
        conteudo: JSON.stringify(conteudo),
        publico: JSON.stringify(data.publico),
      },
    });
    return { ok: true };
  });

export const excluirCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { campanhaRodando } = await import("./email.server");
    if (campanhaRodando(data.id)) throw new Error("A campanha está sendo enviada.");
    // deleteMany: se já foi excluída (clique duplo, outra aba), não dá erro
    await prisma.email_campanhas.deleteMany({ where: { id: data.id } });
    return { ok: true };
  });

export const contarPublicoFn = createServerFn({ method: "POST" })
  .validator((d: Publico) => d)
  .handler(async ({ data }) => {
    await admin();
    const { destinatarios } = await import("./email.server");
    const lista = await destinatarios(data);
    return { total: lista.length, exemplos: lista.slice(0, 5).map((u) => u.email) };
  });

export const enviarTesteFn = createServerFn({ method: "POST" })
  .validator(
    (d: { para: string; assunto: string; preheader: string; conteudo: ConteudoEmail }) => d,
  )
  .handler(async ({ data }) => {
    const sessao = await admin();
    const para = String(data.para || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) throw new Error("E-mail de teste inválido");
    const { enviarUm, montarMensagem } = await import("./email.server");
    const { resolverProdutosBlocos } = await import("./email-blocos.server");
    const m = montarMensagem(
      data.conteudo,
      `[PRUEBA] ${data.assunto}`,
      data.preheader,
      await origem(),
      { email: para, nome: sessao.nome },
      "teste",
      {
        produtosBloco: data.conteudo.blocos?.length
          ? await resolverProdutosBlocos(data.conteudo.blocos)
          : undefined,
        // No teste, o cupom pessoal aparece com um código de exemplo
        vars: { departamento: "Montevideo", mi_cupon: "EJEMPLO10" },
      },
    );
    const id = await enviarUm(m);
    const { prisma } = await import("./prisma");
    await prisma.email_envios.create({
      data: { email: para, tipo: "TESTE", status: "ENVIADO", resend_id: id },
    });
    return { ok: true };
  });

export const enviarCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { resendConfigurado, processarCampanha, campanhaRodando } =
      await import("./email.server");
    if (!resendConfigurado())
      throw new Error("Configure RESEND_API_KEY e EMAIL_REMETENTE na Hostinger antes de enviar.");
    if (campanhaRodando(data.id)) return { ok: true };
    const o = await origem();
    // Não espera terminar: o painel acompanha o progresso
    void processarCampanha(data.id, o);
    return { ok: true };
  });

export const enviosCampanhaFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const rows = await prisma.email_envios.findMany({
      where: { campanha_id: data.id },
      orderBy: { id: "desc" },
      take: 300,
    });
    const porStatus = await prisma.email_envios.groupBy({
      by: ["status"],
      _count: true,
      where: { campanha_id: data.id },
    });
    return {
      porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count])) as Record<
        string,
        number
      >,
      envios: rows.map((r) => ({
        email: r.email,
        status: r.status,
        erro: r.erro,
        quando: r.created_at.toISOString(),
        aberto_em: r.aberto_em?.toISOString() ?? null,
      })),
    };
  });

export const buscarProdutosEmailFn = createServerFn({ method: "GET" })
  .validator((d: { q: string }) => ({
    q: String(d?.q ?? "")
      .trim()
      .slice(0, 80),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const q = data.q;
    const rows = await prisma.agricolas.findMany({
      where: q
        ? {
            duplicado_de: null,
            OR: [
              { sku: { contains: q } },
              { nome: { contains: q } },
              { nome_es: { contains: q } },
              { codigo_fabricante: { contains: q } },
            ],
          }
        : { duplicado_de: null, imagem_principal: { not: null } },
      select: {
        sku: true,
        nome: true,
        nome_es: true,
        imagem_principal: true,
        codigo_fabricante: true,
        marca: true,
      },
      orderBy: { updated_at: "desc" },
      take: 16,
    });
    const { nomeProduto } = await import("./pecas-es");
    return rows.map((r) => ({
      sku: r.sku.trim(),
      nome: nomeProduto(r as any),
      codigo: r.codigo_fabricante || r.sku,
      imagem:
        r.imagem_principal && !r.imagem_principal.includes("redeparts") ? r.imagem_principal : null,
      marca: r.marca,
    }));
  });

// Página pública /baja: o cliente sai da lista de e-mails
export const baixaEmailFn = createServerFn({ method: "POST" })
  .validator((d: { u: number; t: string; voltar?: boolean }) => ({
    u: Number(d.u) || 0,
    t: String(d.t ?? ""),
    voltar: !!d.voltar,
  }))
  .handler(async ({ data }) => {
    const { tokenBaixaValido } = await import("./email.server");
    if (!data.u || !tokenBaixaValido(data.u, data.t)) return { ok: false };
    const { prisma } = await import("./prisma");
    await prisma.users.updateMany({ where: { id: data.u }, data: { recebe_emails: data.voltar } });
    return { ok: true };
  });

// Prévia do editor: as peças que os blocos "Produtos" vão mostrar hoje
export const previaProdutosFn = createServerFn({ method: "POST" })
  .validator((d: { blocos: BlocoEmail[] }) => ({
    blocos: (Array.isArray(d?.blocos) ? d.blocos : []).slice(0, 60),
  }))
  .handler(async ({ data }): Promise<Record<string, ProdutoEmail[]>> => {
    await admin();
    const { resolverProdutosBlocos } = await import("./email-blocos.server");
    return resolverProdutosBlocos(data.blocos);
  });

// Agendar (ou cancelar o agendamento): o agendador do servidor dispara na hora marcada
export const agendarCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; quando: string | null }) => ({
    id: Number(d.id) || 0,
    quando: d.quando ? String(d.quando) : null,
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { resendConfigurado } = await import("./email.server");
    const c = await prisma.email_campanhas.findUnique({ where: { id: data.id } });
    if (!c) throw new Error("Campanha não encontrada");
    if (!["RASCUNHO", "AGENDADA", "ERRO"].includes(c.status))
      throw new Error("Só dá para agendar campanhas que ainda não foram enviadas.");
    if (!data.quando) {
      await prisma.email_campanhas.update({
        where: { id: c.id },
        data: { status: "RASCUNHO", agendado_para: null },
      });
      return { ok: true };
    }
    if (!resendConfigurado())
      throw new Error("Configure RESEND_API_KEY e EMAIL_REMETENTE na Hostinger antes de agendar.");
    const quando = new Date(data.quando);
    if (!Number.isFinite(quando.getTime()) || quando.getTime() < Date.now() + 60_000)
      throw new Error("Escolha uma data e hora no futuro.");
    if (!c.assunto.trim()) throw new Error("Escreva o assunto antes de agendar.");
    await prisma.email_campanhas.update({
      where: { id: c.id },
      data: { status: "AGENDADA", agendado_para: quando },
    });
    return { ok: true };
  });

// Códigos de cupom que existem (o editor avisa quando o e-mail cita um que não existe)
export const codigosCuponsFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { garantirTabelasCampanha } = await import("./campanha.server");
  await garantirTabelasCampanha();
  const { prisma } = await import("./prisma");
  const rows = await prisma.cupons.findMany({ where: { ativo: true }, select: { codigo: true } });
  return rows.map((r) => r.codigo.toUpperCase());
});
