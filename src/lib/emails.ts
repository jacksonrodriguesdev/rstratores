import { createServerFn } from "@tanstack/react-start";
import { CONTEUDO_PADRAO, PUBLICO_PADRAO, type ConteudoEmail, type Publico } from "./email-template";

// Painel de e-mails (Admin → E-mails): campanhas, público, teste e envio pelo Resend.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const origem = async () => {
  const { getRequest } = await import("@tanstack/start-server-core");
  const { origemPublica } = await import("./google-oauth.server");
  return origemPublica(getRequest());
};

export type CampanhaResumo = {
  id: number; nome: string; assunto: string; status: string; total: number; enviados: number; falhas: number;
  enviado_em: string | null; updated_at: string; cabecalho: string | null;
  abertos: number; clicados: number; rebotes: number;
};
export type Campanha = {
  id: number; nome: string; assunto: string; preheader: string; conteudo: ConteudoEmail; publico: Publico;
  status: string; total: number; enviados: number; falhas: number; erro: string | null; enviado_em: string | null; rodando: boolean;
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

export const listarCampanhasFn = createServerFn({ method: "GET" }).handler(async (): Promise<CampanhaResumo[]> => {
  await admin();
  const { prisma } = await import("./prisma");
  const rows = await prisma.email_campanhas.findMany({ orderBy: { id: "desc" } });
  const stats = await prisma.email_envios.groupBy({ by: ["campanha_id", "status"], _count: true, where: { campanha_id: { in: rows.map((r) => r.id) } } });
  const conta = (id: number, sts: string[]) => stats.filter((s) => s.campanha_id === id && sts.includes(s.status)).reduce((a, s) => a + s._count, 0);
  return rows.map((r) => {
    let cabecalho: string | null = null;
    try {
      cabecalho = (JSON.parse(r.conteudo) as ConteudoEmail).cabecalho || null;
    } catch {}
    return {
      id: r.id, nome: r.nome, assunto: r.assunto, status: r.status, total: r.total, enviados: r.enviados, falhas: r.falhas,
      enviado_em: r.enviado_em?.toISOString() ?? null, updated_at: r.updated_at.toISOString(), cabecalho,
      abertos: conta(r.id, ["ABERTO", "CLICADO"]), clicados: conta(r.id, ["CLICADO"]), rebotes: conta(r.id, ["REBOTADO", "QUEIXA"]),
    };
  });
});

export const obterCampanhaFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }): Promise<Campanha | null> => {
    await admin();
    const { prisma } = await import("./prisma");
    const { campanhaRodando } = await import("./email.server");
    const r = await prisma.email_campanhas.findUnique({ where: { id: data.id } });
    if (!r) return null;
    return {
      id: r.id, nome: r.nome, assunto: r.assunto, preheader: r.preheader ?? "",
      conteudo: { ...CONTEUDO_PADRAO, ...JSON.parse(r.conteudo) }, publico: { ...PUBLICO_PADRAO, ...JSON.parse(r.publico) },
      status: r.status, total: r.total, enviados: r.enviados, falhas: r.falhas, erro: r.erro,
      enviado_em: r.enviado_em?.toISOString() ?? null, rodando: campanhaRodando(r.id),
    };
  });

export const criarCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: { copiarDe?: number }) => ({ copiarDe: Number(d?.copiarDe) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const orig = data.copiarDe ? await prisma.email_campanhas.findUnique({ where: { id: data.copiarDe } }) : null;
    const r = await prisma.email_campanhas.create({
      data: orig
        ? { nome: `${orig.nome} (cópia)`.slice(0, 150), assunto: orig.assunto, preheader: orig.preheader, conteudo: orig.conteudo, publico: orig.publico }
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
  .validator((d: { id: number; nome: string; assunto: string; preheader: string; conteudo: ConteudoEmail; publico: Publico }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const atual = await prisma.email_campanhas.findUnique({ where: { id: Number(data.id) } });
    if (!atual) throw new Error("Campanha não encontrada");
    if (atual.status === "ENVIANDO") throw new Error("A campanha está sendo enviada; espere terminar para editar.");
    const conteudo: ConteudoEmail = { ...data.conteudo, produtos: (data.conteudo.produtos ?? []).slice(0, 12) };
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
    await prisma.email_campanhas.delete({ where: { id: data.id } });
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
  .validator((d: { para: string; assunto: string; preheader: string; conteudo: ConteudoEmail }) => d)
  .handler(async ({ data }) => {
    const sessao = await admin();
    const para = String(data.para || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) throw new Error("E-mail de teste inválido");
    const { enviarUm, montarMensagem } = await import("./email.server");
    const m = montarMensagem(data.conteudo, `[PRUEBA] ${data.assunto}`, data.preheader, await origem(), { email: para, nome: sessao.nome }, "teste");
    const id = await enviarUm(m);
    const { prisma } = await import("./prisma");
    await prisma.email_envios.create({ data: { email: para, tipo: "TESTE", status: "ENVIADO", resend_id: id } });
    return { ok: true };
  });

export const enviarCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { resendConfigurado, processarCampanha, campanhaRodando } = await import("./email.server");
    if (!resendConfigurado()) throw new Error("Configure RESEND_API_KEY e EMAIL_REMETENTE na Hostinger antes de enviar.");
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
    const rows = await prisma.email_envios.findMany({ where: { campanha_id: data.id }, orderBy: { id: "desc" }, take: 300 });
    const porStatus = await prisma.email_envios.groupBy({ by: ["status"], _count: true, where: { campanha_id: data.id } });
    return {
      porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count])) as Record<string, number>,
      envios: rows.map((r) => ({ email: r.email, status: r.status, erro: r.erro, quando: r.created_at.toISOString(), aberto_em: r.aberto_em?.toISOString() ?? null })),
    };
  });

export const buscarProdutosEmailFn = createServerFn({ method: "GET" })
  .validator((d: { q: string }) => ({ q: String(d?.q ?? "").trim().slice(0, 80) }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const q = data.q;
    const rows = await prisma.products.findMany({
      where: q
        ? { OR: [{ sku: { contains: q } }, { nome: { contains: q } }, { nome_es: { contains: q } }, { codigo_fabricante: { contains: q } }] }
        : { imagem_principal: { not: null } },
      select: { sku: true, nome: true, nome_es: true, imagem_principal: true, codigo_fabricante: true, marca: true },
      orderBy: { updated_at: "desc" },
      take: 16,
    });
    const { nomeProduto } = await import("./pecas-es");
    return rows.map((r) => ({
      sku: r.sku,
      nome: nomeProduto(r as any),
      codigo: r.codigo_fabricante || r.sku,
      imagem: r.imagem_principal && !r.imagem_principal.includes("redeparts") ? r.imagem_principal : null,
      marca: r.marca,
    }));
  });

// Página pública /baja: o cliente sai da lista de e-mails
export const baixaEmailFn = createServerFn({ method: "POST" })
  .validator((d: { u: number; t: string; voltar?: boolean }) => ({ u: Number(d.u) || 0, t: String(d.t ?? ""), voltar: !!d.voltar }))
  .handler(async ({ data }) => {
    const { tokenBaixaValido } = await import("./email.server");
    if (!data.u || !tokenBaixaValido(data.u, data.t)) return { ok: false };
    const { prisma } = await import("./prisma");
    await prisma.users.updateMany({ where: { id: data.u }, data: { recebe_emails: data.voltar } });
    return { ok: true };
  });
