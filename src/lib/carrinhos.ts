import { createServerFn } from "@tanstack/react-start";

// Painel de vendas (Admin → Carrinhos): listas de cotação montadas no site, quem montou,
// de onde veio e em que etapa está a negociação.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const ETAPAS = ["NOVO", "CONTATADO", "NEGOCIANDO", "GANHO", "PERDIDO"] as const;
export type Etapa = (typeof ETAPAS)[number];
export const ROTULO_ETAPA: Record<string, string> = {
  NOVO: "Novo", CONTATADO: "Contatado", NEGOCIANDO: "Negociando", GANHO: "Venda fechada", PERDIDO: "Perdido",
};
// Montando a lista há mais de 1 h sem pedir preço = abandonado
export const HORAS_ABANDONO = 1;

export type ItemCarrinho = { sku: string; codigo?: string; name: string; nameEs?: string; image?: string; quantity: number };
export type Carrinho = {
  id: number;
  itens: ItemCarrinho[];
  qtd_itens: number;
  status: string;
  abandonado: boolean;
  etapa: string;
  nota: string | null;
  valor_fechado: number | null;
  contatos: number;
  contatado_em: string | null;
  enviado_em: string | null;
  created_at: string;
  updated_at: string;
  cliente: { id: number; nome: string; email: string; telefone: string | null; departamento: string | null; cidade: string | null; recebe_emails: boolean } | null;
  local: { cidade: string | null; regiao: string | null; pais: string | null; fonte: string | null; device: string | null } | null;
};

export type FiltroCarrinhos = { dias: number; etapa: string; situacao: "todos" | "abandonados" | "enviados"; soContato: boolean; busca: string };

export const listarCarrinhosFn = createServerFn({ method: "GET" })
  .validator((d: FiltroCarrinhos) => ({
    dias: Math.min(Math.max(Number(d.dias) || 30, 1), 365),
    etapa: String(d.etapa || ""),
    situacao: (["todos", "abandonados", "enviados"].includes(d.situacao) ? d.situacao : "todos") as FiltroCarrinhos["situacao"],
    soContato: !!d.soContato,
    busca: String(d.busca || "").trim().slice(0, 80),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const desde = new Date(Date.now() - data.dias * 86400000);
    const limiteAbandono = new Date(Date.now() - HORAS_ABANDONO * 3600000);
    const base: any = { updated_at: { gte: desde } };

    // Números do topo (sempre do período inteiro, sem os outros filtros)
    const [total, abandonados, enviados, comContato, porEtapa, ganho] = await Promise.all([
      prisma.carrinhos.count({ where: base }),
      prisma.carrinhos.count({ where: { ...base, status: "ABERTO", updated_at: { gte: desde, lt: limiteAbandono } } }),
      prisma.carrinhos.count({ where: { ...base, status: "ENVIADO" } }),
      prisma.carrinhos.count({ where: { ...base, user: { is: { telefone: { not: null } } } } }),
      prisma.carrinhos.groupBy({ by: ["etapa"], _count: true, where: base }),
      prisma.carrinhos.aggregate({ _sum: { valor_fechado: true }, where: { ...base, etapa: "GANHO" } }),
    ]);

    const where: any = { ...base };
    if (data.etapa) where.etapa = data.etapa;
    if (data.situacao === "abandonados") Object.assign(where, { status: "ABERTO", updated_at: { gte: desde, lt: limiteAbandono } });
    if (data.situacao === "enviados") where.status = "ENVIADO";
    if (data.soContato) where.user = { is: { telefone: { not: null } } };
    if (data.busca) {
      where.OR = [
        { itens: { contains: data.busca } },
        { nota: { contains: data.busca } },
        { user: { is: { OR: [{ nome_completo: { contains: data.busca } }, { email: { contains: data.busca } }, { telefone: { contains: data.busca.replace(/\D/g, "") || data.busca } }] } } },
      ];
    }
    const rows = await prisma.carrinhos.findMany({
      where,
      orderBy: { updated_at: "desc" },
      take: 200,
      include: { user: { select: { id: true, nome_completo: true, email: true, telefone: true, departamento: true, cidade: true, recebe_emails: true } } },
    });

    // Localização e origem: última visita registrada do mesmo visitante
    const vids = [...new Set(rows.map((r) => r.visitante_id))];
    const visitas = vids.length
      ? await prisma.site_visits.findMany({
          where: { visitor_id: { in: vids } },
          orderBy: { id: "desc" },
          select: { visitor_id: true, city: true, region: true, country_code: true, fonte: true, device: true },
          take: 3000,
        })
      : [];
    const local = new Map<string, (typeof visitas)[number]>();
    for (const v of visitas) if (v.visitor_id && !local.has(v.visitor_id)) local.set(v.visitor_id, v);

    const lista: Carrinho[] = rows.map((r) => {
      let itens: ItemCarrinho[] = [];
      try {
        itens = JSON.parse(r.itens);
      } catch {}
      const l = local.get(r.visitante_id);
      return {
        id: r.id, itens, qtd_itens: r.qtd_itens, status: r.status,
        abandonado: r.status === "ABERTO" && r.updated_at < limiteAbandono,
        etapa: r.etapa, nota: r.nota, valor_fechado: r.valor_fechado, contatos: r.contatos,
        contatado_em: r.contatado_em?.toISOString() ?? null, enviado_em: r.enviado_em?.toISOString() ?? null,
        created_at: r.created_at.toISOString(), updated_at: r.updated_at.toISOString(),
        cliente: r.user ? { id: r.user.id, nome: r.user.nome_completo, email: r.user.email, telefone: r.user.telefone, departamento: r.user.departamento, cidade: r.user.cidade, recebe_emails: r.user.recebe_emails } : null,
        local: l ? { cidade: l.city, regiao: l.region, pais: l.country_code, fonte: l.fonte, device: l.device } : null,
      };
    });

    return {
      lista,
      resumo: {
        total, abandonados, enviados, comContato,
        porEtapa: Object.fromEntries(porEtapa.map((e) => [e.etapa, e._count])) as Record<string, number>,
        valorGanho: ganho._sum.valor_fechado ?? 0,
      },
    };
  });

export const atualizarCarrinhoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; etapa?: string; nota?: string | null; valor_fechado?: number | null }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const upd: any = {};
    if (data.etapa !== undefined) {
      if (!(ETAPAS as readonly string[]).includes(data.etapa)) throw new Error("Etapa inválida");
      upd.etapa = data.etapa;
    }
    if (data.nota !== undefined) upd.nota = data.nota ? String(data.nota).slice(0, 5000) : null;
    if (data.valor_fechado !== undefined) upd.valor_fechado = data.valor_fechado === null || Number.isNaN(Number(data.valor_fechado)) ? null : Number(data.valor_fechado);
    await prisma.carrinhos.update({ where: { id: Number(data.id) }, data: upd });
    return { ok: true };
  });

// Chamado quando o admin abre o WhatsApp do cliente: conta o contato e tira da etapa "Novo"
export const registrarContatoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const c = await prisma.carrinhos.findUnique({ where: { id: data.id } });
    if (!c) return { ok: false };
    await prisma.carrinhos.update({
      where: { id: c.id },
      data: { contatos: { increment: 1 }, contatado_em: new Date(), ...(c.etapa === "NOVO" && { etapa: "CONTATADO" }) },
    });
    return { ok: true };
  });

// E-mail de lembrete com os itens do carrinho (Resend)
export const emailCarrinhoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; assunto: string; mensagem: string; destaque?: string }) => d)
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const c = await prisma.carrinhos.findUnique({ where: { id: Number(data.id) }, include: { user: true } });
    if (!c?.user) throw new Error("Este carrinho não tem cliente cadastrado.");
    if (!c.user.recebe_emails) throw new Error("Este cliente se descadastrou dos e-mails.");
    const itens = JSON.parse(c.itens) as ItemCarrinho[];
    const { enviarUm, montarMensagem } = await import("./email.server");
    const { getRequest } = await import("@tanstack/start-server-core");
    const { origemPublica } = await import("./google-oauth.server");
    const m = montarMensagem(
      {
        destaque: data.destaque || "",
        titulo: "{{nombre}}, tus repuestos te esperan",
        texto: String(data.mensagem || "").slice(0, 3000),
        produtosTitulo: "Tu lista",
        produtos: itens.slice(0, 12).map((i) => ({ sku: i.sku, nome: i.nameEs || i.name, codigo: i.codigo || i.sku, imagem: i.image, quantidade: i.quantity })),
        botaoTexto: "",
        botaoUrl: "",
        whatsapp: true,
        cor: "#0b7a3b",
      },
      String(data.assunto || "Tus repuestos te esperan").slice(0, 200),
      "Te ayudamos con precio y envío a todo Uruguay.",
      origemPublica(getRequest()),
      { id: c.user.id, email: c.user.email, nome: c.user.nome_completo },
      "carrinho",
    );
    const rid = await enviarUm(m);
    await prisma.email_envios.create({ data: { user_id: c.user.id, email: c.user.email, tipo: "CARRINHO", status: "ENVIADO", resend_id: rid } });
    await prisma.carrinhos.update({
      where: { id: c.id },
      data: { contatos: { increment: 1 }, contatado_em: new Date(), ...(c.etapa === "NOVO" && { etapa: "CONTATADO" }) },
    });
    return { ok: true };
  });
