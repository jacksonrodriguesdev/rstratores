import { createServerFn } from "@tanstack/react-start";
import type { FreteModo, ItemLink, Metodo, Pais } from "./pagamentos-comum";

// Links de pagamento: funções do admin (criar, listar, cancelar), da página /pagar/<código> e da
// conta do cliente ("Mis compras"). A lógica fica em pagamentos.server.ts.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const servidor = () => import("./pagamentos.server");

async function origem() {
  const { getRequest } = await import("@tanstack/start-server-core");
  const request = getRequest();
  if (process.env.NODE_ENV === "production")
    return { request, origem: (await import("./site")).SITE_URL };
  const { origemPublica } = await import("./google-oauth.server");
  return { request, origem: origemPublica(request) };
}

// ---------------------------------------------------------------- Admin
export type ResumoLink = {
  id: number;
  codigo: string;
  pais: string;
  moeda: string;
  total: number;
  status: string; // ABERTO, PAGO, CANCELADO, VENCIDO
  descricao: string | null;
  itens: number;
  cliente: { id: number; nome: string; email: string; telefone: string | null } | null;
  email_cliente: string | null;
  carrinho_id: number | null;
  metodo_pago: string | null;
  pendentes: number; // PIX/efectivo gerado e ainda não pago
  duplicado: boolean;
  expira_em: string | null;
  pago_em: string | null;
  created_at: string;
};

export const statusIntegracaoFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const d = await import("./dlocal.server");
  const { garantirTabelasPagamento } = await servidor();
  await garantirTabelasPagamento();
  const { prisma } = await import("./prisma");
  const { SITE_URL } = await import("./site");
  const desde = new Date(Date.now() - 7 * 86400000);
  const [avisos, comErro, presos] = await Promise.all([
    prisma.dlocal_avisos.count({ where: { created_at: { gt: desde } } }),
    prisma.dlocal_avisos.count({ where: { created_at: { gt: desde }, processado: false } }),
    prisma.pagamentos.count({
      where: {
        status: { in: ["PENDENTE", "AUTORIZADO"] },
        updated_at: { lt: new Date(Date.now() - 2 * 86400000) },
      },
    }),
  ]);
  return {
    configurado: d.dlocalConfigurado(),
    ambiente: d.ambienteDlocal(),
    api: d.urlApiDlocal(),
    smartFields: !!d.smartFields().chave,
    urlAviso: `${SITE_URL}/api/public/dlocal/pagamentos`,
    avisos,
    comErro,
    presos,
  };
});

export const listarLinksFn = createServerFn({ method: "GET" })
  .validator((d: { status?: string; busca?: string; dias?: number }) => ({
    status: String(d?.status || ""),
    busca: String(d?.busca || "")
      .trim()
      .slice(0, 80),
    dias: Math.min(Math.max(Number(d?.dias) || 90, 1), 730),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { garantirTabelasPagamento, statusDoLink, lerItens } = await servidor();
    await garantirTabelasPagamento();
    const { prisma } = await import("./prisma");
    const desde = new Date(Date.now() - data.dias * 86400000);
    const where: any = { created_at: { gte: desde } };
    if (data.status === "VENCIDO")
      Object.assign(where, { status: "ABERTO", expira_em: { lt: new Date() } });
    else if (data.status === "ABERTO")
      Object.assign(where, {
        status: "ABERTO",
        OR: [{ expira_em: null }, { expira_em: { gte: new Date() } }],
      });
    else if (data.status) where.status = data.status;
    if (data.busca) {
      const n = Number(data.busca.replace(/^#/, ""));
      where.AND = [
        {
          OR: [
            ...(Number.isInteger(n) && n > 0 ? [{ id: n }] : []),
            { email_cliente: { contains: data.busca } },
            { descricao: { contains: data.busca } },
            { itens: { contains: data.busca } },
            { user: { is: { nome_completo: { contains: data.busca } } } },
          ],
        },
      ];
    }
    const rows = await prisma.links_pagamento.findMany({
      where,
      orderBy: { id: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, nome_completo: true, email: true, telefone: true } },
        pagamentos: { select: { metodo: true, status: true, duplicado: true } },
      },
    });
    const lista: ResumoLink[] = rows.map((l) => ({
      id: l.id,
      codigo: l.codigo,
      pais: l.pais,
      moeda: l.moeda,
      total: l.total,
      status: statusDoLink(l),
      descricao: l.descricao,
      itens: lerItens(l.itens).length,
      cliente: l.user
        ? {
            id: l.user.id,
            nome: l.user.nome_completo,
            email: l.user.email,
            telefone: l.user.telefone,
          }
        : null,
      email_cliente: l.email_cliente,
      carrinho_id: l.carrinho_id,
      metodo_pago: l.pagamentos.find((p) => p.status === "PAGO" && !p.duplicado)?.metodo ?? null,
      pendentes: l.pagamentos.filter((p) => p.status === "PENDENTE").length,
      duplicado: l.pagamentos.some((p) => p.duplicado),
      expira_em: l.expira_em?.toISOString() ?? null,
      pago_em: l.pago_em?.toISOString() ?? null,
      created_at: l.created_at.toISOString(),
    }));

    // Totais do mês (por moeda)
    const mes = new Date();
    mes.setDate(1);
    mes.setHours(0, 0, 0, 0);
    const pagos = await prisma.links_pagamento.groupBy({
      by: ["moeda"],
      where: { status: "PAGO", pago_em: { gte: mes } },
      _sum: { total: true },
      _count: true,
    });
    const abertos = await prisma.links_pagamento.groupBy({
      by: ["moeda"],
      where: { status: "ABERTO", OR: [{ expira_em: null }, { expira_em: { gte: new Date() } }] },
      _sum: { total: true },
      _count: true,
    });
    const porMoeda = (g: typeof pagos) =>
      g.map((x) => ({ moeda: x.moeda, total: x._sum.total ?? 0, qtd: x._count }));
    return { lista, pagosMes: porMoeda(pagos), abertos: porMoeda(abertos) };
  });

export const detalheLinkFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { garantirTabelasPagamento, statusDoLink, lerItens } = await servidor();
    await garantirTabelasPagamento();
    const { prisma } = await import("./prisma");
    const l = await prisma.links_pagamento.findUnique({
      where: { id: data.id },
      include: {
        user: { select: { id: true, nome_completo: true, email: true, telefone: true } },
        pagamentos: { orderBy: { id: "desc" } },
      },
    });
    if (!l) throw new Error("Link não encontrado.");
    const eventos = await prisma.pagamento_eventos.findMany({
      where: { link_id: l.id },
      orderBy: { id: "desc" },
      take: 100,
    });
    return {
      id: l.id,
      codigo: l.codigo,
      pais: l.pais,
      moeda: l.moeda,
      itens: lerItens(l.itens),
      subtotal: l.subtotal,
      frete: l.frete,
      frete_modo: l.frete_modo as FreteModo,
      desconto: l.desconto,
      total: l.total,
      metodos: l.metodos.split(","),
      descricao: l.descricao,
      nota_cliente: l.nota_cliente,
      nota_interna: l.nota_interna,
      status: statusDoLink(l),
      email_cliente: l.email_cliente,
      carrinho_id: l.carrinho_id,
      cliente: l.user
        ? {
            id: l.user.id,
            nome: l.user.nome_completo,
            email: l.user.email,
            telefone: l.user.telefone,
          }
        : null,
      expira_em: l.expira_em?.toISOString() ?? null,
      pago_em: l.pago_em?.toISOString() ?? null,
      created_at: l.created_at.toISOString(),
      pagamentos: l.pagamentos.map((p) => ({
        id: p.id,
        metodo: p.metodo,
        order_id: p.order_id,
        dlocal_id: p.dlocal_id,
        status: p.status,
        status_code: p.status_code,
        status_detalhe: p.status_detalhe,
        valor: p.valor,
        moeda: p.moeda,
        documento: p.documento,
        bandeira: p.bandeira,
        final_cartao: p.final_cartao,
        duplicado: p.duplicado,
        pago_em: p.pago_em?.toISOString() ?? null,
        conferido_em: p.conferido_em?.toISOString() ?? null,
        created_at: p.created_at.toISOString(),
      })),
      eventos: eventos.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        detalhe: e.detalhe,
        pagamento_id: e.pagamento_id,
        quando: e.created_at.toISOString(),
      })),
    };
  });

export type DadosNovoLink = {
  pais: Pais;
  itens: ItemLink[];
  frete: number;
  frete_modo: FreteModo;
  desconto: number;
  metodos: Metodo[];
  descricao?: string;
  nota_cliente?: string;
  nota_interna?: string;
  email_cliente?: string;
  carrinho_id?: number | null;
  dias_validade: number;
};

export const criarLinkFn = createServerFn({ method: "POST" })
  .validator((d: DadosNovoLink) => d)
  .handler(async ({ data }) => {
    const s = await admin();
    const { criarLink } = await servidor();
    const { SITE_URL } = await import("./site");
    const l = await criarLink(data, s.id);
    return {
      id: l.id,
      codigo: l.codigo,
      url: `${SITE_URL}${l.pais === "BR" ? "/pt" : ""}/pagar/${l.codigo}`,
    };
  });

export const cancelarLinkFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const r = await prisma.links_pagamento.updateMany({
      where: { id: data.id, status: "ABERTO" },
      data: { status: "CANCELADO" },
    });
    if (!r.count) throw new Error("Só dá para cancelar um link em aberto.");
    await prisma.pagamento_eventos.create({
      data: { link_id: data.id, tipo: "cancelado", detalhe: "pelo admin" },
    });
    return { ok: true };
  });

export const conferirPagamentoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { conferirPagamento } = await servidor();
    const p = await conferirPagamento(data.id);
    return { status: p?.status ?? null };
  });

// Peças para o link: busca no catálogo com o preço de venda em $U e R$ (centavos)
export type PecaLink = {
  sku: string;
  codigo: string;
  nome: string;
  imagem: string | null;
  uyu: number | null;
  brl: number | null;
};

async function precosDe(skus: string[] | null, busca?: string): Promise<PecaLink[]> {
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda } = await import("./precos");
  const cfg = await configPrecos();
  const rows = await prisma.products.findMany({
    where: skus
      ? { sku: { in: skus } }
      : {
          OR: [
            { sku: { contains: busca } },
            { codigo_fabricante: { contains: busca } },
            { nome: { contains: busca } },
            { nome_es: { contains: busca } },
          ],
        },
    take: skus ? 100 : 12,
  });
  return rows.map((p: any) => {
    const v = precoVenda(p, cfg);
    return {
      sku: p.sku,
      codigo: p.codigo_fabricante || p.sku,
      nome: p.nome_es || p.nome,
      imagem: p.imagem_principal ?? null,
      uyu: v?.uyu ? Math.round(v.uyu * 100) : null,
      brl: v?.brl ? Math.round(v.brl * 100) : null,
    };
  });
}

export const buscarPecasLinkFn = createServerFn({ method: "GET" })
  .validator((d: { q: string }) => ({
    q: String(d?.q || "")
      .trim()
      .slice(0, 60),
  }))
  .handler(async ({ data }) => {
    await admin();
    if (data.q.length < 2) return [];
    return precosDe(null, data.q);
  });

// Começar o link a partir de um carrinho (Admin → Carrinhos → "Cobrar")
export const dadosDoCarrinhoFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const c = await prisma.carrinhos.findUnique({
      where: { id: data.id },
      include: { user: { select: { email: true, telefone: true, nome_completo: true } } },
    });
    if (!c) throw new Error("Carrinho não encontrado.");
    let itens: Array<{
      sku: string;
      codigo?: string;
      name: string;
      nameEs?: string;
      image?: string;
      quantity: number;
    }> = [];
    try {
      itens = JSON.parse(c.itens);
    } catch {
      /* carrinho sem itens legíveis */
    }
    const precos = new Map((await precosDe(itens.map((i) => i.sku))).map((p) => [p.sku, p]));
    return {
      id: c.id,
      cliente: c.user
        ? { email: c.user.email, nome: c.user.nome_completo, telefone: c.user.telefone }
        : null,
      pais: (c.user?.telefone?.startsWith("+55") ? "BR" : "UY") as Pais,
      itens: itens.map((i) => {
        const p = precos.get(i.sku);
        return {
          sku: i.sku,
          codigo: i.codigo || p?.codigo || i.sku,
          nome: i.nameEs || i.name,
          imagem: i.image ?? p?.imagem ?? null,
          quantidade: Number(i.quantity) || 1,
          uyu: p?.uyu ?? null,
          brl: p?.brl ?? null,
        };
      }),
    };
  });

// ---------------------------------------------------------------- Página /pagar/<código>
export type PagamentoCliente = {
  id: number;
  metodo: string;
  status: string;
  motivo: string | null;
  ticket: {
    numero: string | null;
    imagem: string | null;
    qr: string | null;
    vence: string | null;
    empresa: string | null;
  } | null;
  redirect: string | null;
  final_cartao: string | null;
  created_at: string;
};

export const linkPagamentoFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string; retorno?: number; idioma?: "es" | "pt" }) => ({
    codigo: String(d?.codigo || "").slice(0, 40),
    retorno: Number(d?.retorno) || 0,
    idioma: d?.idioma === "pt" ? ("pt" as const) : ("es" as const),
  }))
  .handler(async ({ data }) => {
    const sv = await servidor();
    await sv.garantirTabelasPagamento();
    const { prisma } = await import("./prisma");
    const { getSession } = await import("./auth.server");
    const sessao = await getSession();
    let l = await prisma.links_pagamento.findUnique({ where: { codigo: data.codigo } });
    if (!l) return null;

    let pagamentos: PagamentoCliente[] = [];
    const pode = sessao ? sv.podePagar(l, sessao) : false;
    if (sessao && pode) {
      // Voltou do banco (3D Secure) ou tem pagamento em aberto: confere com a dLocal agora
      const abertos = await prisma.pagamentos.findMany({
        where: {
          link_id: l.id,
          user_id: sessao.id,
          status: { in: ["PENDENTE", "AUTORIZADO"] },
          dlocal_id: { not: null },
          OR: [
            ...(data.retorno ? [{ id: data.retorno }] : []),
            { conferido_em: { lt: new Date(Date.now() - 60_000) } },
          ],
        },
        take: 3,
      });
      for (const a of abertos) await sv.conferirPagamento(a.id).catch(() => null);
      if (abertos.length) l = (await prisma.links_pagamento.findUnique({ where: { id: l.id } }))!;

      const { motivoRecusa } = await import("./dlocal.server");
      const rows = await prisma.pagamentos.findMany({
        where: { link_id: l.id, user_id: sessao.id, status: { not: "CRIANDO" } },
        orderBy: { id: "desc" },
        take: 6,
      });
      pagamentos = rows.map((p) => ({
        id: p.id,
        metodo: p.metodo,
        status: p.status,
        motivo: p.status === "RECUSADO" ? motivoRecusa(p.status_code, data.idioma) : null,
        ticket: p.ticket && p.status === "PENDENTE" ? JSON.parse(p.ticket) : null,
        redirect: p.status === "PENDENTE" ? p.redirect_url : null,
        final_cartao: p.final_cartao,
        created_at: p.created_at.toISOString(),
      }));
    }

    const { smartFields } = await import("./dlocal.server");
    const sf = smartFields();
    const mascarar = (e: string) => e.replace(/^(.).*?(.)?@/, (_m, a, b) => `${a}•••${b ?? ""}@`);
    return {
      id: l.id,
      codigo: l.codigo,
      pais: l.pais as Pais,
      moeda: l.moeda,
      itens: sv.lerItens(l.itens),
      subtotal: l.subtotal,
      frete: l.frete,
      frete_modo: l.frete_modo as FreteModo,
      desconto: l.desconto,
      total: l.total,
      metodos: l.metodos.split(",") as Metodo[],
      descricao: l.descricao,
      nota_cliente: l.nota_cliente,
      status: sv.statusDoLink(l),
      expira_em: l.expira_em?.toISOString() ?? null,
      pago_em: l.pago_em?.toISOString() ?? null,
      paraEmail: l.email_cliente ? mascarar(l.email_cliente) : null,
      sessao: sessao ? { nome: sessao.nome, email: sessao.email, pode } : null,
      // O cartão só aparece para quem pode pagar
      cartao: sessao && pode && sf.chave ? { chave: sf.chave, script: sf.script } : null,
      pagamentos,
    };
  });

export const pagarLinkFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      codigo: string;
      metodo: Metodo;
      documento: string;
      nome: string;
      token?: string;
      idioma?: "es" | "pt";
    }) => ({
      codigo: String(d?.codigo || "").slice(0, 40),
      metodo: String(d?.metodo || "") as Metodo,
      documento: String(d?.documento || "").slice(0, 30),
      nome: String(d?.nome || "").slice(0, 120),
      token: d?.token ? String(d.token).slice(0, 200) : undefined,
      idioma: d?.idioma === "pt" ? ("pt" as const) : ("es" as const),
    }),
  )
  .handler(async ({ data }) => {
    const { getSession } = await import("./auth.server");
    const sessao = await getSession();
    if (!sessao)
      return {
        ok: false as const,
        erro:
          data.idioma === "pt"
            ? "Entre na sua conta para pagar."
            : "Ingresá a tu cuenta para pagar.",
      };
    const { request, origem: o } = await origem();
    const { ipDaRequisicao } = await import("./rastreio.server");
    const { iniciarPagamento } = await servidor();
    return iniciarPagamento(data, sessao, { ip: ipDaRequisicao(request), origem: o });
  });

// ---------------------------------------------------------------- Conta: "Mis compras"
export type CompraCliente = {
  codigo: string;
  id: number;
  pais: string;
  moeda: string;
  total: number;
  status: string;
  itens: Array<{ nome: string; codigo: string; quantidade: number }>;
  metodo: string | null;
  pago_em: string | null;
  created_at: string;
};

export const minhasComprasFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompraCliente[]> => {
    const { getSession } = await import("./auth.server");
    const s = await getSession();
    if (!s) return [];
    const sv = await servidor();
    await sv.garantirTabelasPagamento();
    const { prisma } = await import("./prisma");
    const rows = await prisma.links_pagamento.findMany({
      where: {
        OR: [{ user_id: s.id }, { email_cliente: s.email.toLowerCase() }],
        status: { in: ["ABERTO", "PAGO"] },
      },
      orderBy: { id: "desc" },
      take: 50,
      include: {
        pagamentos: {
          where: { status: "PAGO", duplicado: false },
          select: { metodo: true },
          take: 1,
        },
      },
    });
    return rows
      .filter((l) => l.status === "PAGO" || !sv.vencido(l))
      .map((l) => ({
        codigo: l.codigo,
        id: l.id,
        pais: l.pais,
        moeda: l.moeda,
        total: l.total,
        status: sv.statusDoLink(l),
        itens: sv
          .lerItens(l.itens)
          .map((i) => ({ nome: i.nome, codigo: i.codigo, quantidade: i.quantidade })),
        metodo: l.pagamentos[0]?.metodo ?? null,
        pago_em: l.pago_em?.toISOString() ?? null,
        created_at: l.created_at.toISOString(),
      }));
  },
);
