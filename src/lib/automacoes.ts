import { createServerFn } from "@tanstack/react-start";
import type { ConteudoEmail, Publico } from "./email-template";
import type { ConfigAutomacao, TipoAutomacao } from "./automacoes-tipos";

// Painel Admin → E-mail marketing → Automações
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export type AutomacaoResumo = {
  id: number; tipo: TipoAutomacao; nome: string; ativo: boolean; enviados: number; enviados30: number; abertos30: number;
  rodou_em: string | null; ultimo_erro: string | null; cabecalho: string | null; cupom: string | null;
};
export type Automacao = {
  id: number; tipo: TipoAutomacao; nome: string; ativo: boolean; assunto: string; preheader: string;
  conteudo: ConteudoEmail; publico: Publico; config: ConfigAutomacao; enviados: number; rodou_em: string | null; ultimo_erro: string | null;
};

export const listarAutomacoesFn = createServerFn({ method: "GET" }).handler(async (): Promise<AutomacaoResumo[]> => {
  await admin();
  const { prisma } = await import("./prisma");
  const rows = await prisma.email_automacoes.findMany({ orderBy: [{ ativo: "desc" }, { id: "asc" }] });
  const desde = new Date(Date.now() - 30 * 86400_000);
  const stats = await prisma.email_envios.groupBy({
    by: ["automacao_id", "status"],
    where: { automacao_id: { in: rows.map((r) => r.id) }, created_at: { gte: desde } },
    _count: true,
  });
  return rows.map((r) => {
    const s = stats.filter((x) => x.automacao_id === r.id);
    const c = JSON.parse(r.conteudo || "{}") as ConteudoEmail;
    return {
      id: r.id, tipo: r.tipo as TipoAutomacao, nome: r.nome, ativo: r.ativo, enviados: r.enviados,
      enviados30: s.filter((x) => x.status !== "FALHA").reduce((t, x) => t + x._count, 0),
      abertos30: s.filter((x) => x.status === "ABERTO" || x.status === "CLICADO").reduce((t, x) => t + x._count, 0),
      rodou_em: r.rodou_em?.toISOString() ?? null, ultimo_erro: r.ultimo_erro, cabecalho: c.cabecalho ?? null, cupom: c.cupom?.codigo ?? null,
    };
  });
});

export const obterAutomacaoFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }): Promise<Automacao | null> => {
    await admin();
    const { prisma } = await import("./prisma");
    const { conteudoPadrao, defTipo, publicoPadrao } = await import("./automacoes-tipos");
    const r = await prisma.email_automacoes.findUnique({ where: { id: data.id } });
    if (!r) return null;
    const t = r.tipo as TipoAutomacao;
    return {
      id: r.id, tipo: t, nome: r.nome, ativo: r.ativo, assunto: r.assunto, preheader: r.preheader ?? "",
      conteudo: { ...conteudoPadrao(t), ...JSON.parse(r.conteudo) }, publico: { ...publicoPadrao(), ...JSON.parse(r.publico) },
      config: { ...defTipo(t).config, ...JSON.parse(r.config) }, enviados: r.enviados,
      rodou_em: r.rodou_em?.toISOString() ?? null, ultimo_erro: r.ultimo_erro,
    };
  });

export const criarAutomacaoFn = createServerFn({ method: "POST" })
  .validator((d: { tipo: TipoAutomacao; copiarDe?: number }) => ({ tipo: String(d?.tipo ?? "") as TipoAutomacao, copiarDe: Number(d?.copiarDe) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { TIPOS, conteudoPadrao, publicoPadrao } = await import("./automacoes-tipos");
    if (data.copiarDe) {
      const o = await prisma.email_automacoes.findUnique({ where: { id: data.copiarDe } });
      if (!o) throw new Error("Automação não encontrada");
      const r = await prisma.email_automacoes.create({
        data: { tipo: o.tipo, nome: `${o.nome} (cópia)`.slice(0, 150), assunto: o.assunto, preheader: o.preheader, conteudo: o.conteudo, publico: o.publico, config: o.config },
      });
      return { id: r.id };
    }
    const def = TIPOS.find((t) => t.tipo === data.tipo);
    if (!def) throw new Error("Tipo inválido");
    const r = await prisma.email_automacoes.create({
      data: {
        tipo: def.tipo, nome: def.nome, assunto: def.assunto, preheader: def.preheader,
        conteudo: JSON.stringify(conteudoPadrao(def.tipo)), publico: JSON.stringify(publicoPadrao()), config: JSON.stringify(def.config),
      },
    });
    return { id: r.id };
  });

export const salvarAutomacaoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; nome: string; assunto: string; preheader: string; conteudo: ConteudoEmail; publico: Publico; config: ConfigAutomacao }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const conteudo: ConteudoEmail = { ...data.conteudo, produtos: [] }; // os produtos vêm do gatilho
    await prisma.email_automacoes.update({
      where: { id: Number(data.id) },
      data: {
        nome: String(data.nome || "Sem nome").slice(0, 150),
        assunto: String(data.assunto || "").slice(0, 200),
        preheader: String(data.preheader || "").slice(0, 200) || null,
        conteudo: JSON.stringify(conteudo),
        publico: JSON.stringify(data.publico),
        config: JSON.stringify(data.config ?? {}),
      },
    });
    return { ok: true };
  });

// Ligar/desligar. Ao ligar, só vale daqui para frente (cadastros, carrinhos e mudanças de preço novos).
export const ativarAutomacaoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; ativo: boolean }) => ({ id: Number(d?.id) || 0, ativo: !!d?.ativo }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { resendConfigurado } = await import("./email.server");
    if (data.ativo && !resendConfigurado()) throw new Error("Configure RESEND_API_KEY e EMAIL_REMETENTE na Hostinger antes de ativar.");
    const atual = await prisma.email_automacoes.findUnique({ where: { id: data.id } });
    if (!atual) throw new Error("Automação não encontrada");
    let cursor = atual.cursor;
    if (data.ativo && !atual.ativo) {
      // Começa a contar as mudanças de preço a partir de agora
      const { detectarMudancasPreco } = await import("./automacoes.server");
      await detectarMudancasPreco();
      cursor = (await prisma.produto_eventos.aggregate({ _max: { id: true } }))._max.id ?? 0;
    }
    await prisma.email_automacoes.update({
      where: { id: data.id },
      data: { ativo: data.ativo, ...(data.ativo && !atual.ativo && { ativado_em: new Date(), cursor }) },
    });
    return { ok: true };
  });

export const excluirAutomacaoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    // deleteMany: se já foi excluída (clique duplo, outra aba), não dá erro
    await prisma.email_automacoes.deleteMany({ where: { id: data.id } });
    return { ok: true };
  });

export const testarAutomacaoFn = createServerFn({ method: "POST" })
  .validator((d: { para: string; tipo: string; assunto: string; preheader: string; conteudo: ConteudoEmail }) => d)
  .handler(async ({ data }) => {
    const sessao = await admin();
    const para = String(data.para || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) throw new Error("E-mail de teste inválido");
    const { enviarUm } = await import("./email.server");
    const { mensagemTeste } = await import("./automacoes.server");
    const m = await mensagemTeste({ tipo: data.tipo, assunto: data.assunto, preheader: data.preheader, conteudo: JSON.stringify(data.conteudo) }, para, sessao.nome);
    const id = await enviarUm(m);
    const { prisma } = await import("./prisma");
    await prisma.email_envios.create({ data: { email: para, tipo: "TESTE", status: "ENVIADO", resend_id: id } });
    return { ok: true };
  });

// Envia já para o público da automação (ou para os clientes escolhidos na página Clientes)
export const enviarAutomacaoAgoraFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; ids?: number[] }) => ({ id: Number(d?.id) || 0, ids: (d?.ids ?? []).map(Number).filter(Boolean) }))
  .handler(async ({ data }) => {
    await admin();
    const { resendConfigurado } = await import("./email.server");
    if (!resendConfigurado()) throw new Error("Configure RESEND_API_KEY e EMAIL_REMETENTE na Hostinger antes de enviar.");
    const { enviarAgora } = await import("./automacoes.server");
    return enviarAgora(data.id, data.ids);
  });

export const contarEnvioAgoraFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; ids?: number[] }) => ({ id: Number(d?.id) || 0, ids: (d?.ids ?? []).map(Number).filter(Boolean) }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { destinatarios } = await import("./email.server");
    const a = await prisma.email_automacoes.findUnique({ where: { id: data.id } });
    if (!a) return { total: 0, jaReceberam: 0 };
    const publico: Publico = data.ids.length ? { tipo: "ids", departamentos: [], dias: 30, ids: data.ids } : JSON.parse(a.publico);
    const lista = await destinatarios(publico);
    const c = JSON.parse(a.conteudo) as ConteudoEmail;
    const { chaveEnvioAgora } = await import("./automacoes.server");
    const chave = a.tipo === "reengajamento" ? null : chaveEnvioAgora(a.tipo, c, JSON.parse(a.config || "{}"));
    const ja = chave
      ? await prisma.email_envios.count({ where: { automacao_id: a.id, chave, status: { not: "FALHA" }, user_id: { in: lista.map((u) => u.id) } } })
      : 0;
    return { total: lista.length - ja, jaReceberam: ja };
  });

export const executarAutomacoesFn = createServerFn({ method: "POST" })
  .validator((d: { id?: number }) => ({ id: Number(d?.id) || undefined }))
  .handler(async ({ data }) => {
    await admin();
    const { resendConfigurado } = await import("./email.server");
    if (!resendConfigurado()) throw new Error("Configure RESEND_API_KEY e EMAIL_REMETENTE na Hostinger antes de enviar.");
    const { rodarAutomacoes } = await import("./automacoes.server");
    return rodarAutomacoes(data.id);
  });

export const enviosAutomacaoFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const rows = await prisma.email_envios.findMany({ where: { automacao_id: data.id }, orderBy: { id: "desc" }, take: 200 });
    const porStatus = await prisma.email_envios.groupBy({ by: ["status"], _count: true, where: { automacao_id: data.id } });
    return {
      porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count])) as Record<string, number>,
      envios: rows.map((r) => ({ email: r.email, status: r.status, erro: r.erro, quando: r.created_at.toISOString() })),
    };
  });
