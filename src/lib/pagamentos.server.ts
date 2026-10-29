// Links de pagamento com a dLocal (Admin → Pagamentos).
// 1. A equipe fecha peças, preço e frete no WhatsApp e gera o link (itens, valores, formas de pagamento).
// 2. O cliente abre /pagar/<código>, entra na conta e paga: Uruguai (tarjeta, Abitab, Redpagos em $U)
//    ou Brasil (cartão e PIX em R$). O cartão é digitado nos campos da própria dLocal (Smart Fields):
//    o número nunca passa por aqui.
// 3. A dLocal avisa (webhook) e, a cada 15 min, conferimos o que está em aberto. Pago → o link fica
//    na conta do cliente, o carrinho vira "Venda fechada", vai a compra para o Meta/GA4 e os e-mails.
// Regras copiadas do que funciona no Repuestos Avenida: idempotência, trava no banco, status que não
// volta atrás, aviso conferido (valor, moeda, pedido) e pagamento em duplicidade marcado para reembolso.
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import {
  ErroDlocal,
  consultarPagamentoDlocal,
  criarPagamentoDlocal,
  dlocalConfigurado,
  motivoRecusa,
  podeMudar,
  statusInterno,
  type PagamentoDlocal,
} from "./dlocal.server";
import {
  ErroStripe,
  consultarSessaoStripe,
  criarSessaoStripe,
  sessaoComoPagamento,
  stripeConfigurado,
} from "./stripe.server";
import {
  provedorDe,
  ID_DLOCAL,
  METODOS,
  documentoValido,
  fmtValor,
  mascararDocumento,
  somenteDigitos,
  FRETE_MODOS,
  type FreteModo,
  type ItemLink,
  type Metodo,
  type Pais,
} from "./pagamentos-comum";

// ---------- Tabelas (produção não roda "prisma db push": mesmo SQL que o Prisma gera) ----------
const SQL = [
  `CREATE TABLE IF NOT EXISTS \`links_pagamento\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`codigo\` VARCHAR(32) NOT NULL,
    \`pais\` VARCHAR(2) NOT NULL,
    \`moeda\` VARCHAR(3) NOT NULL,
    \`itens\` TEXT NOT NULL,
    \`subtotal\` INTEGER NOT NULL,
    \`frete\` INTEGER NOT NULL DEFAULT 0,
    \`frete_modo\` VARCHAR(20) NOT NULL DEFAULT 'COBRADO',
    \`desconto\` INTEGER NOT NULL DEFAULT 0,
    \`cupom\` VARCHAR(40) NULL,
    \`total\` INTEGER NOT NULL,
    \`metodos\` VARCHAR(60) NOT NULL,
    \`descricao\` VARCHAR(200) NULL,
    \`nota_cliente\` TEXT NULL,
    \`nota_interna\` TEXT NULL,
    \`status\` VARCHAR(20) NOT NULL DEFAULT 'ABERTO',
    \`email_cliente\` VARCHAR(191) NULL,
    \`user_id\` INTEGER NULL,
    \`carrinho_id\` INTEGER NULL,
    \`expira_em\` DATETIME(3) NULL,
    \`pago_em\` DATETIME(3) NULL,
    \`criado_por\` INTEGER NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL,
    UNIQUE INDEX \`links_pagamento_codigo_key\`(\`codigo\`),
    INDEX \`links_pagamento_status_created_at_idx\`(\`status\`, \`created_at\`),
    INDEX \`links_pagamento_user_id_idx\`(\`user_id\`),
    INDEX \`links_pagamento_carrinho_id_idx\`(\`carrinho_id\`),
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`links_pagamento_user_id_fkey\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`pagamentos\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`link_id\` INTEGER NOT NULL,
    \`user_id\` INTEGER NULL,
    \`metodo\` VARCHAR(20) NOT NULL,
    \`provedor\` VARCHAR(10) NOT NULL DEFAULT 'dlocal',
    \`order_id\` VARCHAR(64) NOT NULL,
    \`dlocal_id\` VARCHAR(100) NULL,
    \`status\` VARCHAR(20) NOT NULL DEFAULT 'CRIANDO',
    \`status_code\` VARCHAR(8) NULL,
    \`status_detalhe\` VARCHAR(300) NULL,
    \`valor\` INTEGER NOT NULL,
    \`moeda\` VARCHAR(3) NOT NULL,
    \`documento\` VARCHAR(24) NULL,
    \`ticket\` TEXT NULL,
    \`redirect_url\` TEXT NULL,
    \`bandeira\` VARCHAR(30) NULL,
    \`final_cartao\` VARCHAR(4) NULL,
    \`payload\` LONGTEXT NULL,
    \`duplicado\` BOOLEAN NOT NULL DEFAULT false,
    \`pago_em\` DATETIME(3) NULL,
    \`expira_em\` DATETIME(3) NULL,
    \`conferido_em\` DATETIME(3) NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL,
    UNIQUE INDEX \`pagamentos_order_id_key\`(\`order_id\`),
    UNIQUE INDEX \`pagamentos_dlocal_id_key\`(\`dlocal_id\`),
    INDEX \`pagamentos_link_id_idx\`(\`link_id\`),
    INDEX \`pagamentos_status_updated_at_idx\`(\`status\`, \`updated_at\`),
    INDEX \`pagamentos_user_id_idx\`(\`user_id\`),
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`pagamentos_link_id_fkey\` FOREIGN KEY (\`link_id\`) REFERENCES \`links_pagamento\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`pagamento_eventos\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`link_id\` INTEGER NOT NULL,
    \`pagamento_id\` INTEGER NULL,
    \`tipo\` VARCHAR(30) NOT NULL,
    \`detalhe\` TEXT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`pagamento_eventos_link_id_idx\`(\`link_id\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`dlocal_avisos\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`tipo\` VARCHAR(20) NOT NULL,
    \`dlocal_id\` VARCHAR(100) NULL,
    \`status\` VARCHAR(20) NULL,
    \`assinatura_ok\` BOOLEAN NOT NULL DEFAULT false,
    \`processado\` BOOLEAN NOT NULL DEFAULT false,
    \`erro\` TEXT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`dlocal_avisos_created_at_idx\`(\`created_at\`),
    INDEX \`dlocal_avisos_dlocal_id_idx\`(\`dlocal_id\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];

let tabelas: Promise<void> | null = null;
export function garantirTabelasPagamento() {
  tabelas ??= (async () => {
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
    // Colunas novas em tabelas já criadas
    const colunas = await prisma.$queryRaw<Array<{ c: string }>>`
      SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'links_pagamento'`;
    if (!colunas.some((x) => x.c === "frete_modo"))
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `links_pagamento` ADD COLUMN `frete_modo` VARCHAR(20) NOT NULL DEFAULT 'COBRADO' AFTER `frete`",
      );
    if (!colunas.some((x) => x.c === "cupom"))
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `links_pagamento` ADD COLUMN `cupom` VARCHAR(40) NULL AFTER `desconto`",
      );
    // Stripe: provedor do pagamento e id da sessão (cs_..., mais de 64 caracteres)
    const cols = await prisma.$queryRaw<Array<{ t: string; c: string; n: bigint | number | null }>>`
      SELECT TABLE_NAME AS t, COLUMN_NAME AS c, CHARACTER_MAXIMUM_LENGTH AS n
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('pagamentos', 'dlocal_avisos')`;
    const col = (t: string, c: string) => cols.find((x) => x.t === t && x.c === c);
    if (!col("pagamentos", "provedor"))
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `pagamentos` ADD COLUMN `provedor` VARCHAR(10) NOT NULL DEFAULT 'dlocal' AFTER `metodo`",
      );
    if (Number(col("pagamentos", "dlocal_id")?.n ?? 100) < 100)
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `pagamentos` MODIFY `dlocal_id` VARCHAR(100) NULL",
      );
    if (Number(col("dlocal_avisos", "dlocal_id")?.n ?? 100) < 100)
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `dlocal_avisos` MODIFY `dlocal_id` VARCHAR(100) NULL",
      );
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

const evento = (link_id: number, tipo: string, detalhe?: string | null, pagamento_id?: number) =>
  prisma.pagamento_eventos
    .create({ data: { link_id, tipo, detalhe: detalhe?.slice(0, 4000) ?? null, pagamento_id } })
    .catch((e) => console.error("evento do pagamento:", e));

export const lerItens = (s: string): ItemLink[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export const vencido = (l: { status: string; expira_em: Date | null }) =>
  l.status === "ABERTO" && !!l.expira_em && l.expira_em < new Date();
export const statusDoLink = (l: { status: string; expira_em: Date | null }) =>
  vencido(l) ? "VENCIDO" : l.status;

// ---------- Criar link ----------
export type NovoLink = {
  pais: Pais;
  itens: ItemLink[];
  frete: number; // centavos (só quando frete_modo = COBRADO)
  frete_modo?: FreteModo;
  cupom?: string | null; // código do cupom aplicado (o desconto já vem em "desconto")
  desconto: number; // centavos
  metodos: Metodo[];
  descricao?: string | null;
  nota_cliente?: string | null;
  nota_interna?: string | null;
  email_cliente?: string | null;
  carrinho_id?: number | null;
  dias_validade: number;
};

export async function criarLink(d: NovoLink, adminId: number) {
  await garantirTabelasPagamento();
  const pais: Pais = d.pais === "BR" ? "BR" : "UY";
  const itens: ItemLink[] = (d.itens || [])
    .map((i) => ({
      sku: i.sku ? String(i.sku).slice(0, 191) : null,
      codigo: String(i.codigo || i.sku || "")
        .trim()
        .slice(0, 80),
      nome: String(i.nome || "")
        .trim()
        .slice(0, 200),
      imagem: i.imagem ? String(i.imagem).slice(0, 500) : null,
      quantidade: Math.max(1, Math.min(9999, Math.round(Number(i.quantidade) || 1))),
      preco: Math.max(0, Math.round(Number(i.preco) || 0)),
    }))
    .filter((i) => i.nome || i.preco);
  const incompleto = itens.find((i) => !i.nome || i.preco <= 0);
  if (incompleto)
    throw new Error(
      incompleto.nome
        ? `Falta o preço de "${incompleto.nome}".`
        : "Há um item com preço e sem descrição.",
    );
  if (!itens.length) throw new Error("Adicione ao menos um item com nome e preço.");
  if (itens.length > 60) throw new Error("No máximo 60 itens por link.");
  const subtotal = itens.reduce((t, i) => t + i.preco * i.quantidade, 0);
  const freteModo: FreteModo = FRETE_MODOS.includes(d.frete_modo as FreteModo)
    ? (d.frete_modo as FreteModo)
    : "COBRADO";
  // Grátis ou pago na chegada: nada de frete no valor cobrado
  const frete = freteModo === "COBRADO" ? Math.max(0, Math.round(Number(d.frete) || 0)) : 0;
  const desconto = Math.max(0, Math.round(Number(d.desconto) || 0));
  const total = subtotal + frete - desconto;
  if (total < 100) throw new Error("O total precisa ser maior que 1,00.");
  if (total > 100_000_000) throw new Error("Total alto demais para um link.");
  const metodos = (d.metodos || []).filter((m) => METODOS[pais].includes(m));
  if (!metodos.length) throw new Error("Escolha ao menos uma forma de pagamento.");

  // Cliente indicado: pelo e-mail, ou o dono do carrinho
  let email = d.email_cliente?.trim().toLowerCase() || null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new Error("E-mail do cliente inválido.");
  let userId: number | null = null;
  const carrinhoId = d.carrinho_id ? Number(d.carrinho_id) : null;
  if (carrinhoId) {
    const c = await prisma.carrinhos.findUnique({
      where: { id: carrinhoId },
      select: { user: { select: { id: true, email: true } } },
    });
    if (!c) throw new Error("Carrinho não encontrado.");
    if (c.user && !email) email = c.user.email.toLowerCase();
  }
  if (email) {
    const u = await prisma.users.findUnique({ where: { email }, select: { id: true } });
    userId = u?.id ?? null;
  }

  const dias = Math.max(1, Math.min(60, Math.round(Number(d.dias_validade) || 7)));
  const link = await prisma.links_pagamento.create({
    data: {
      codigo: randomBytes(15).toString("base64url"),
      pais,
      moeda: pais === "BR" ? "BRL" : "UYU",
      itens: JSON.stringify(itens),
      subtotal,
      frete,
      frete_modo: freteModo,
      desconto,
      cupom: d.cupom ? String(d.cupom).trim().toUpperCase().slice(0, 40) : null,
      total,
      metodos: metodos.join(","),
      descricao: d.descricao?.trim().slice(0, 200) || null,
      nota_cliente: d.nota_cliente?.trim().slice(0, 2000) || null,
      nota_interna: d.nota_interna?.trim().slice(0, 4000) || null,
      email_cliente: email,
      user_id: userId,
      carrinho_id: carrinhoId,
      expira_em: new Date(Date.now() + dias * 86400000),
      criado_por: adminId,
    },
  });
  await evento(
    link.id,
    "criado",
    `${fmtValor(total, link.moeda)} · ${metodos.join(", ")} · frete ${freteModo}`,
  );
  if (carrinhoId)
    await prisma.carrinhos
      .update({ where: { id: carrinhoId }, data: { etapa: "NEGOCIANDO" } })
      .catch(() => {});
  return link;
}

// Quem pode pagar: se o link indica um cliente, só a conta dele
export function podePagar(
  l: { email_cliente: string | null; user_id: number | null },
  s: { id: number; email: string },
) {
  if (l.user_id && l.user_id === s.id) return true;
  if (l.email_cliente) return l.email_cliente.toLowerCase() === s.email.toLowerCase();
  return !l.user_id;
}

// ---------- Iniciar pagamento ----------
export type PedidoPagamento = {
  codigo: string;
  metodo: Metodo;
  documento: string;
  nome: string;
  token?: string; // cartão (Smart Fields)
  idioma: "es" | "pt";
  // Stripe, link do Uruguai: o cliente escolhe pagar em pesos (padrão) ou em dólares (cotação do dia)
  emDolares?: boolean;
};
export type RespostaPagamento =
  { ok: true; status: string; redirect?: string | null } | { ok: false; erro: string };

export async function iniciarPagamento(
  p: PedidoPagamento,
  sessao: { id: number; email: string },
  contexto: { ip: string | null; origem: string },
): Promise<RespostaPagamento> {
  await garantirTabelasPagamento();
  const pt = p.idioma === "pt";
  const t = (es: string, ptb: string) => (pt ? ptb : es);
  const stripe = provedorDe(p.metodo) === "stripe";
  if (stripe ? !stripeConfigurado() : !dlocalConfigurado())
    return {
      ok: false,
      erro: t(
        "Los pagos en línea todavía no están activos.",
        "Os pagamentos on-line ainda não estão ativos.",
      ),
    };

  const link = await prisma.links_pagamento.findUnique({ where: { codigo: String(p.codigo) } });
  if (!link) return { ok: false, erro: t("Link no encontrado.", "Link não encontrado.") };
  if (!podePagar(link, sessao))
    return { ok: false, erro: t("Este link es para otra cuenta.", "Este link é de outra conta.") };
  if (link.status === "PAGO")
    return { ok: false, erro: t("Este link ya fue pagado.", "Este link já foi pago.") };
  if (link.status !== "ABERTO" || vencido(link))
    return {
      ok: false,
      erro: t("Este link ya no está disponible.", "Este link não está mais disponível."),
    };
  const pais = link.pais as Pais;
  if (!link.metodos.split(",").includes(p.metodo))
    return {
      ok: false,
      erro: t("Medio de pago no disponible.", "Forma de pagamento indisponível."),
    };
  // Stripe: o próprio Stripe pede nome e cartão na página dele (documento não é exigido)
  const doc = somenteDigitos(p.documento);
  if (!stripe && !documentoValido(pais, doc))
    return {
      ok: false,
      erro:
        pais === "BR"
          ? t("CPF o CNPJ inválido.", "CPF ou CNPJ inválido.")
          : t("Cédula o RUT inválido.", "Cédula ou RUT inválido."),
    };
  const nome = String(p.nome || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
  if (!stripe && nome.split(" ").length < 2)
    return { ok: false, erro: t("Escribí tu nombre y apellido.", "Escreva nome e sobrenome.") };
  if (p.metodo === "CARTAO" && !/^[\w-]{8,200}$/.test(String(p.token || "")))
    return { ok: false, erro: t("Revisá los datos de la tarjeta.", "Confira os dados do cartão.") };

  // Stripe: sessão aberta e ainda válida para este cliente → volta para a mesma página de pagamento
  // Moeda e valor cobrados: os do link; no Stripe, a moeda da conta (conta brasileira = só R$:
  // o link em $U é convertido pela cotação do dia) ou, com STRIPE_MOEDA=MULTI, pesos ou dólares
  let moedaCobrada = link.moeda;
  let valorCobrado = link.total;
  let cotacaoUsada: number | null = null;
  const { moedaContaStripe } = await import("./stripe.server");
  if (stripe && moedaContaStripe() === "BRL" && link.moeda === "UYU") {
    const { cotacaoReal, emReais } = await import("./cambio.server");
    const cot = await cotacaoReal();
    if (!cot)
      return {
        ok: false,
        erro: t(
          "No pudimos obtener la cotización del día. Probá de nuevo en unos minutos.",
          "Não conseguimos a cotação do dia. Tente de novo em alguns minutos.",
        ),
      };
    moedaCobrada = "BRL";
    valorCobrado = emReais(link.total, cot);
    cotacaoUsada = cot;
  } else if (stripe && moedaContaStripe() === "MULTI" && p.emDolares && link.moeda === "UYU") {
    const { cotacaoDolar, emDolares } = await import("./cambio.server");
    const cot = await cotacaoDolar();
    if (!cot)
      return {
        ok: false,
        erro: t(
          "No pudimos obtener la cotación del dólar. Probá pagar en pesos.",
          "Não conseguimos a cotação do dólar. Tente pagar em pesos.",
        ),
      };
    moedaCobrada = "USD";
    valorCobrado = emDolares(link.total, cot.valor);
    cotacaoUsada = cot.valor;
  }
  if (stripe) {
    const aberta = await prisma.pagamentos.findFirst({
      where: {
        link_id: link.id,
        metodo: "STRIPE",
        moeda: moedaCobrada,
        valor: valorCobrado,
        status: "PENDENTE",
        user_id: sessao.id,
        redirect_url: { not: null },
        expira_em: { gt: new Date(Date.now() + 5 * 60_000) },
      },
      orderBy: { id: "desc" },
    });
    if (aberta) return { ok: true, status: "PENDENTE", redirect: aberta.redirect_url };
  }
  // Já existe um código PIX / ticket de efectivo válido para este link: reaproveita
  if (p.metodo !== "CARTAO" && !stripe) {
    const aberto = await prisma.pagamentos.findFirst({
      where: {
        link_id: link.id,
        metodo: p.metodo,
        status: "PENDENTE",
        user_id: sessao.id,
        ticket: { not: null },
        OR: [{ expira_em: null }, { expira_em: { gt: new Date(Date.now() + 10 * 60_000) } }],
      },
      orderBy: { id: "desc" },
    });
    if (aberto) return { ok: true, status: "PENDENTE" };
  }
  // Cartão aprovado parcialmente ou em análise na dLocal (sem 3D Secure pendente): espera o resultado
  const emAnalise = await prisma.pagamentos.findFirst({
    where: {
      link_id: link.id,
      metodo: "CARTAO",
      OR: [{ status: "AUTORIZADO" }, { status: "PENDENTE", redirect_url: null }],
    },
  });
  if (emAnalise)
    return {
      ok: false,
      erro: t(
        "Tu pago con tarjeta está en análisis. Te avisamos apenas se confirme.",
        "Seu pagamento com cartão está em análise. Avisamos assim que for confirmado.",
      ),
    };
  // Freio: no máximo 8 tentativas por hora no mesmo link
  const recentes = await prisma.pagamentos.count({
    where: { link_id: link.id, created_at: { gt: new Date(Date.now() - 3600_000) } },
  });
  if (recentes >= 8)
    return {
      ok: false,
      erro: t(
        "Demasiados intentos. Probá en una hora o escribinos por WhatsApp.",
        "Tentativas demais. Tente em uma hora ou fale conosco no WhatsApp.",
      ),
    };

  const u = await prisma.users.findUnique({ where: { id: sessao.id } });
  if (!u) return { ok: false, erro: t("Ingresá de nuevo.", "Entre de novo.") };

  const orderId = `AP${link.id}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const pg = await prisma.pagamentos.create({
    data: {
      link_id: link.id,
      user_id: u.id,
      metodo: p.metodo,
      provedor: provedorDe(p.metodo),
      order_id: orderId,
      valor: valorCobrado,
      moeda: moedaCobrada,
      documento: doc ? mascararDocumento(doc) : null,
    },
  });

  const caminho = `${pt ? "/pt" : ""}/pagar/${link.codigo}`;
  if (stripe)
    return iniciarStripe(
      link,
      { id: pg.id, valor: valorCobrado, moeda: moedaCobrada, cotacao: cotacaoUsada },
      orderId,
      u.email,
      p.idioma,
      contexto.origem + caminho,
    );
  // Endereço do pagador: só o que o cliente cadastrou (nunca endereço de exemplo)
  const endereco = {
    ...(u.departamento && { state: u.departamento }),
    ...(u.cidade && { city: u.cidade }),
    ...(u.cep && { zip_code: u.cep }),
    ...(u.endereco && { street: u.endereco.slice(0, 100) }),
    ...(u.numero_casa && { number: u.numero_casa.slice(0, 10) }),
  };
  const corpo: Record<string, unknown> = {
    amount: link.total / 100,
    currency: link.moeda,
    country: pais,
    payment_method_id: ID_DLOCAL[p.metodo as keyof typeof ID_DLOCAL],
    payment_method_flow: "DIRECT",
    payer: {
      name: nome,
      email: u.email,
      document: doc,
      user_reference: String(u.id),
      ...(u.telefone && { phone: u.telefone }),
      ...(contexto.ip && { ip: contexto.ip }),
      ...(Object.keys(endereco).length && { address: endereco }),
    },
    order_id: orderId,
    description: (link.descricao || `AGRO PARTS - pedido ${link.id}`).slice(0, 100),
    notification_url: `${contexto.origem}/api/public/dlocal/pagamentos`,
    callback_url: `${contexto.origem}${caminho}?retorno=${pg.id}`,
    ...(p.metodo === "CARTAO" && {
      card: { token: p.token },
      ...(process.env.DLOCAL_3DS_SEMPRE === "1" && { three_dsecure: { force: true } }),
    }),
  };

  await evento(link.id, "tentativa", `${p.metodo} · ${u.email}`, pg.id);
  try {
    const r = await criarPagamentoDlocal(corpo, orderId);
    const final = await aplicarResposta(pg.id, r, "criacao");
    if (final.status === "RECUSADO")
      return { ok: false, erro: motivoRecusa(final.status_code, p.idioma) };
    return { ok: true, status: final.status, redirect: final.redirect_url };
  } catch (e) {
    const err = e as ErroDlocal;
    console.error("dLocal (criar pagamento):", err?.http, err?.codigo, err?.message);
    await prisma.pagamentos.update({
      where: { id: pg.id },
      data: {
        status: "ERRO",
        status_detalhe: String(err?.message || e).slice(0, 300),
        payload: JSON.stringify([
          {
            origem: "erro",
            em: new Date(),
            http: err?.http,
            codigo: err?.codigo,
            dados: semDocumento(err?.dados),
          },
        ]),
      },
    });
    await evento(
      link.id,
      "erro",
      `${err?.http ?? ""} ${err?.codigo ?? ""} ${err?.message ?? e}`.trim(),
      pg.id,
    );
    // Erros de validação (4xx) costumam ser dado errado do cliente; o resto é falha nossa/da dLocal
    return {
      ok: false,
      erro:
        err?.http && err.http >= 400 && err.http < 500
          ? t(`No se pudo procesar: ${err.message}`, `Não foi possível processar: ${err.message}`)
          : t(
              "No pudimos conectar con el medio de pago. Probá de nuevo en unos minutos.",
              "Não conseguimos falar com o meio de pagamento. Tente de novo em alguns minutos.",
            ),
    };
  }
}

// ---------- Stripe: cria a página de pagamento (Checkout) e manda o cliente para lá ----------
async function iniciarStripe(
  link: { id: number; total: number; moeda: string; itens: string; descricao: string | null },
  cobranca: { id: number; valor: number; moeda: string; cotacao: number | null },
  orderId: string,
  email: string,
  idioma: "es" | "pt",
  volta: string,
): Promise<RespostaPagamento> {
  const pt = idioma === "pt";
  const itens = lerItens(link.itens);
  const pagamentoId = cobranca.id;
  try {
    const sessaoStripe = await criarSessaoStripe({
      orderId,
      linkId: link.id,
      valor: cobranca.valor,
      moeda: cobranca.moeda === "USD" ? "USD" : cobranca.moeda === "BRL" ? "BRL" : "UYU",
      descricao:
        (link.descricao || `AGRO PARTS - pedido #${link.id}`) +
        (cobranca.cotacao
          ? ` (${fmtValor(link.total, link.moeda)} · ${cobranca.moeda === "BRL" ? "R$" : "US$"} 1 = $U ${cobranca.cotacao.toFixed(2)})`
          : ""),
      itensResumo: itens
        .map((i) => `${i.quantidade}× ${i.nome}${i.codigo ? ` (${i.codigo})` : ""}`)
        .join(" · "),
      email,
      idioma,
      sucesso: `${volta}?retorno=${pagamentoId}`,
      cancelar: volta,
    });
    if (!sessaoStripe.url)
      throw new ErroStripe("Stripe não devolveu a página de pagamento", 502, null);
    if (sessaoStripe.expires_at)
      await prisma.pagamentos.update({
        where: { id: pagamentoId },
        data: { expira_em: new Date(sessaoStripe.expires_at * 1000) },
      });
    await evento(
      link.id,
      "tentativa",
      `STRIPE · ${fmtValor(cobranca.valor, cobranca.moeda)}${cobranca.cotacao ? ` (cotação ${cobranca.cotacao.toFixed(2)})` : ""} · ${email}`,
      pagamentoId,
    );
    const final = await aplicarResposta(pagamentoId, sessaoComoPagamento(sessaoStripe), "criacao");
    return { ok: true, status: final.status, redirect: final.redirect_url ?? sessaoStripe.url };
  } catch (e) {
    const err = e as ErroStripe;
    console.error("Stripe (criar sessão):", err?.http, err?.codigo, err?.message);
    await prisma.pagamentos.update({
      where: { id: pagamentoId },
      data: { status: "ERRO", status_detalhe: String(err?.message || e).slice(0, 300) },
    });
    await evento(
      link.id,
      "erro",
      `Stripe ${err?.http ?? ""} ${err?.codigo ?? ""} ${err?.message ?? e}`.trim(),
      pagamentoId,
    );
    return {
      ok: false,
      erro: pt
        ? "Não conseguimos abrir a página de pagamento. Tente de novo em alguns minutos."
        : "No pudimos abrir la página de pago. Probá de nuevo en unos minutos.",
    };
  }
}

// Respostas guardadas sem documento nem dados do pagador
function semDocumento(v: unknown): unknown {
  if (!v || typeof v !== "object") return v ?? null;
  const c: any = Array.isArray(v) ? [...v] : { ...(v as object) };
  delete c.payer;
  delete c.document;
  if (c.card && typeof c.card === "object") c.card = { brand: c.card.brand, last4: c.card.last4 };
  return c;
}

// ---------- Aplicar o que a dLocal disse (resposta, aviso ou conferência) ----------
export async function aplicarResposta(
  pagamentoId: number,
  r: PagamentoDlocal,
  origem: "criacao" | "aviso" | "conferencia",
) {
  const base = await prisma.pagamentos.findUnique({ where: { id: pagamentoId } });
  if (!base) throw new Error("pagamento não encontrado");
  let vendaNova = false;

  const final = await prisma.$transaction(async (tx) => {
    // Trava o link e o pagamento (sempre nesta ordem) até o fim
    await tx.$queryRaw`SELECT id FROM links_pagamento WHERE id = ${base.link_id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM pagamentos WHERE id = ${pagamentoId} FOR UPDATE`;
    const pg = (await tx.pagamentos.findUnique({ where: { id: pagamentoId } }))!;

    // O aviso tem que bater com o pagamento
    const divergencias: string[] = [];
    if (r.order_id && r.order_id !== pg.order_id) divergencias.push(`pedido ${r.order_id}`);
    if (pg.dlocal_id && r.id && r.id !== pg.dlocal_id) divergencias.push(`id ${r.id}`);
    if (r.currency && r.currency !== pg.moeda) divergencias.push(`moeda ${r.currency}`);
    if (r.amount != null && Math.round(Number(r.amount) * 100) !== pg.valor)
      divergencias.push(`valor ${r.amount}`);
    if (divergencias.length) {
      await tx.pagamento_eventos.create({
        data: {
          link_id: pg.link_id,
          pagamento_id: pg.id,
          tipo: "divergencia",
          detalhe: `${origem}: ${divergencias.join(", ")}`,
        },
      });
      return pg;
    }

    const novo = statusInterno(r);
    const muda = podeMudar(pg.status, novo);
    const historico = (() => {
      try {
        return JSON.parse(pg.payload || "[]") as unknown[];
      } catch {
        return [];
      }
    })();
    historico.push({ origem, em: new Date(), dados: semDocumento(r) });
    const ticket = r.ticket
      ? JSON.stringify({
          numero: r.ticket.number ?? null,
          imagem: r.ticket.image_url ?? null,
          qr:
            r.ticket.barcode &&
            !String(r.ticket.barcode).startsWith("http") &&
            String(r.ticket.barcode).length > 200
              ? r.ticket.barcode
              : null,
          vence: r.ticket.expiration_date ?? null,
          empresa: r.ticket.company_name ?? r.ticket.provider_name ?? null,
        })
      : undefined;
    const vence = r.ticket?.expiration_date ? new Date(r.ticket.expiration_date) : null;
    const redirect = r.three_dsecure?.redirect_url || r.redirect_url || null;

    const atual = await tx.pagamentos.update({
      where: { id: pg.id },
      data: {
        ...(r.id && !pg.dlocal_id && { dlocal_id: String(r.id).slice(0, 100) }),
        ...(muda && {
          status: novo,
          status_code: r.status_code != null ? String(r.status_code).slice(0, 8) : null,
          status_detalhe: r.status_detail ? String(r.status_detail).slice(0, 300) : null,
          ...(novo === "PAGO" && { pago_em: new Date() }),
        }),
        ...(ticket && { ticket }),
        ...(vence && !Number.isNaN(+vence) && { expira_em: vence }),
        ...(redirect && novo === "PENDENTE" && { redirect_url: redirect }),
        ...(r.card?.brand && { bandeira: String(r.card.brand).slice(0, 30) }),
        ...(r.card?.last4 && { final_cartao: String(r.card.last4).slice(-4) }),
        payload: JSON.stringify(historico.slice(-25)),
        conferido_em: new Date(),
      },
    });
    if (muda)
      await tx.pagamento_eventos.create({
        data: {
          link_id: pg.link_id,
          pagamento_id: pg.id,
          tipo: novo.toLowerCase(),
          detalhe:
            `${origem}: ${r.status ?? ""} ${r.status_code ?? ""} ${r.status_detail ?? ""}`.trim(),
        },
      });

    if (muda && novo === "PAGO") {
      const link = (await tx.links_pagamento.findUnique({ where: { id: pg.link_id } }))!;
      if (link.status !== "PAGO") {
        await tx.links_pagamento.update({
          where: { id: link.id },
          data: { status: "PAGO", pago_em: new Date(), user_id: pg.user_id ?? link.user_id },
        });
        vendaNova = true;
      } else {
        // Segundo pagamento do mesmo link (ex.: pagou PIX e cartão): marcar para devolver
        await tx.pagamentos.update({ where: { id: pg.id }, data: { duplicado: true } });
        await tx.pagamento_eventos.create({
          data: {
            link_id: link.id,
            pagamento_id: pg.id,
            tipo: "pago_duplicado",
            detalhe: "Link já estava pago: reembolsar este pagamento.",
          },
        });
      }
    }
    return atual;
  });

  if (vendaNova) await posVenda(final.link_id).catch((e) => console.error("pós-venda:", e));
  return final;
}

// ---------- Depois do pagamento aprovado ----------
async function posVenda(linkId: number) {
  const link = await prisma.links_pagamento.findUnique({
    where: { id: linkId },
    include: { user: true },
  });
  if (!link) return;
  const itens = lerItens(link.itens);
  const valor = link.total / 100;
  const u = link.user;

  // Vira venda (Admin → Vendas e Financeiro), com custo das peças e taxa do pagamento
  const { vendaDoLink } = await import("./financeiro.server");
  await vendaDoLink(link.id).catch((e) => console.error("venda do link:", e));

  // Carrinho de origem → "Venda fechada" (a compra vai para o Meta aqui, uma vez só)
  const carrinho = link.carrinho_id
    ? await prisma.carrinhos.findUnique({ where: { id: link.carrinho_id } })
    : null;
  if (carrinho)
    await prisma.carrinhos.update({
      where: { id: carrinho.id },
      data: {
        etapa: "GANHO",
        ...(link.moeda === "UYU" && { valor_fechado: valor }),
        nota: [carrinho.nota, `Pago pelo link #${link.id}: ${fmtValor(link.total, link.moeda)}`]
          .filter(Boolean)
          .join("\n"),
        capi_compra_em: new Date(),
      },
    });

  const { enviarEventoMeta, enviarEventoGA4 } = await import("./conversoes.server");
  const ids = itens.map((i) => i.sku || i.codigo);
  await enviarEventoMeta({
    evento: "Purchase",
    eventId: `compra_link_${link.id}`,
    origem: "website",
    pessoa: u
      ? {
          email: u.email,
          telefone: u.telefone,
          nome: u.nome_completo,
          userId: u.id,
          cidade: u.cidade,
          pais: link.pais.toLowerCase(),
        }
      : {},
    navegador: { fbp: carrinho?.fbp ?? null, fbc: carrinho?.fbc ?? null },
    dados: {
      currency: link.moeda,
      value: valor,
      content_type: "product",
      content_ids: ids,
      num_items: itens.reduce((t, i) => t + i.quantidade, 0),
      order_id: `link-${link.id}`,
    },
  }).catch((e) => console.error("Meta (compra):", e));
  await enviarEventoGA4({
    evento: "purchase",
    clientId: carrinho?.visitante_id || `cliente.${u?.id ?? link.id}`,
    userId: u?.id,
    params: {
      currency: link.moeda,
      value: valor,
      transaction_id: `link-${link.id}`,
      items: itens.map((i) => ({
        item_id: i.sku || i.codigo,
        item_name: i.nome,
        quantity: i.quantidade,
        price: i.preco / 100,
      })),
    },
  }).catch((e) => console.error("GA4 (compra):", e));

  await emailsDaVenda(link.id).catch((e) => console.error("e-mails da venda:", e));
  // Cupom usado: conta o uso (Admin → Campanhas e cupons)
  if (link.cupom) {
    const { contarUsoCupom } = await import("./campanha.server");
    await contarUsoCupom(link.cupom).catch((e) => console.error("uso do cupom:", e));
    // Código de indicação de um amigo: prêmio para quem indicou
    const { premiarIndicacao } = await import("./indicacoes.server");
    await premiarIndicacao(link.id).catch((e) => console.error("prêmio da indicação:", e));
  }
}

async function emailsDaVenda(linkId: number) {
  const { resendConfigurado, enviarUm, montarMensagem } = await import("./email.server");
  if (!resendConfigurado()) return;
  const { SITE_URL } = await import("./site");
  const link = await prisma.links_pagamento.findUnique({
    where: { id: linkId },
    include: { user: true, pagamentos: { where: { status: "PAGO" }, take: 1 } },
  });
  if (!link) return;
  const pt = link.pais === "BR";
  const t = (es: string, ptb: string) => (pt ? ptb : es);
  const itens = lerItens(link.itens);
  const pg = link.pagamentos[0];
  const produtos = itens.slice(0, 20).map((i) => ({
    sku: i.sku || i.codigo,
    nome: i.nome,
    codigo: i.codigo,
    quantidade: i.quantidade,
  }));
  // Pago em outra moeda (dólares pelo Stripe): mostra o valor cobrado e o do pedido
  const valor =
    pg && pg.moeda !== link.moeda
      ? `${fmtValor(pg.valor, pg.moeda)} (${fmtValor(link.total, link.moeda)})`
      : fmtValor(link.total, link.moeda);
  const contaUrl = `${SITE_URL}${pt ? "/pt" : ""}/cuenta`;

  if (link.user) {
    const m = montarMensagem(
      {
        destaque: t("PAGO CONFIRMADO", "PAGAMENTO CONFIRMADO"),
        titulo: t(
          `¡Gracias, {{nombre}}! Recibimos tu pago`,
          `Obrigado, {{nombre}}! Recebemos seu pagamento`,
        ),
        texto: t(
          `Confirmamos el pago de **${valor}** del pedido #${link.id}. Ya estamos preparando tus repuestos y te avisamos por WhatsApp cuando salgan.\n\n${link.frete_modo === "NA_CHEGADA" ? "\n\n**Envío:** a cargo del comprador, se paga al recibir." : ""}\n\nPodés ver esta compra en tu cuenta.`,
          `Confirmamos o pagamento de **${valor}** do pedido #${link.id}. Já estamos separando suas peças e avisamos pelo WhatsApp quando forem enviadas.\n\n${link.frete_modo === "NA_CHEGADA" ? "\n\n**Frete:** por conta do comprador, pago na chegada." : ""}\n\nVocê pode ver esta compra na sua conta.`,
        ),
        produtosTitulo: t("Tu pedido", "Seu pedido"),
        produtos,
        botaoTexto: t("Ver mis compras", "Ver minhas compras"),
        botaoUrl: contaUrl,
        whatsapp: true,
        cor: "#0b7a3b",
      },
      t(`Pago confirmado — pedido #${link.id}`, `Pagamento confirmado — pedido #${link.id}`),
      t("Tu pago fue aprobado.", "Seu pagamento foi aprovado."),
      SITE_URL,
      { email: link.user.email, nome: link.user.nome_completo },
      "pagamento",
      { idioma: pt ? "pt" : "es" },
    );
    await enviarUm(m);
  }

  // Aviso para a equipe
  const equipe =
    process.env.PAGAMENTOS_AVISO_EMAIL?.trim() || process.env.EMAIL_RESPONDER_PARA?.trim();
  if (equipe) {
    const m = montarMensagem(
      {
        destaque: "VENDA PAGA",
        titulo: `Link #${link.id} pago: ${valor}`,
        texto: `Cliente: **${link.user?.nome_completo ?? "-"}** (${link.user?.email ?? "-"}, ${link.user?.telefone ?? "sem celular"})\n\nForma: ${pg?.metodo ?? "-"}${pg?.final_cartao ? ` final ${pg.final_cartao}` : ""} · ${link.pais === "BR" ? "Brasil" : "Uruguai"}\n\nFrete: ${link.frete_modo === "NA_CHEGADA" ? "POR CONTA DO COMPRADOR (pago na chegada)" : link.frete_modo === "GRATIS" ? "grátis" : fmtValor(link.frete, link.moeda)}\n\nSeparar e enviar as peças.`,
        produtosTitulo: "Itens",
        produtos,
        botaoTexto: "Abrir no painel",
        botaoUrl: `${SITE_URL}/admin/pagamentos?link=${link.id}`,
        whatsapp: false,
        cor: "#0b7a3b",
      },
      `💰 Venda paga — link #${link.id} — ${valor}`,
      null,
      SITE_URL,
      { email: equipe, nome: "Equipe" },
      "pagamento-equipe",
    );
    await enviarUm(m);
  }
}

// ---------- Conferência (o que está em aberto, direto na dLocal) ----------
export async function conferirPagamento(id: number) {
  const pg = await prisma.pagamentos.findUnique({ where: { id } });
  if (pg?.provedor === "stripe") {
    if (!pg.dlocal_id || !stripeConfigurado()) return pg;
    const s = await consultarSessaoStripe(pg.dlocal_id);
    return aplicarResposta(pg.id, sessaoComoPagamento(s), "conferencia");
  }
  if (!pg?.dlocal_id || !dlocalConfigurado()) return pg;
  const r = await consultarPagamentoDlocal(pg.dlocal_id);
  return aplicarResposta(pg.id, r, "conferencia");
}

export async function conferirPendentes() {
  if (!dlocalConfigurado() && !stripeConfigurado()) return 0;
  await garantirTabelasPagamento();
  const abertos = await prisma.pagamentos.findMany({
    where: {
      status: { in: ["PENDENTE", "AUTORIZADO"] },
      dlocal_id: { not: null },
      created_at: { gt: new Date(Date.now() - 15 * 86400000) },
      OR: [{ conferido_em: null }, { conferido_em: { lt: new Date(Date.now() - 10 * 60_000) } }],
    },
    select: { id: true },
    take: 50,
  });
  for (const a of abertos)
    await conferirPagamento(a.id).catch((e) =>
      console.error("conferir pagamento", a.id, e?.message ?? e),
    );
  return abertos.length;
}

// ---------- Aviso (webhook) ----------
export async function receberAviso(corpo: string, autentico: boolean) {
  await garantirTabelasPagamento();
  let r: PagamentoDlocal | null = null;
  try {
    r = JSON.parse(corpo);
  } catch {
    /* corpo inválido: só registra */
  }
  const aviso = await prisma.dlocal_avisos.create({
    data: {
      tipo: "pagamento",
      dlocal_id: r?.id ? String(r.id).slice(0, 64) : null,
      status: r?.status ? String(r.status).slice(0, 20) : null,
      assinatura_ok: autentico,
    },
  });
  if (!autentico || !r?.id) {
    await prisma.dlocal_avisos.update({
      where: { id: aviso.id },
      data: { erro: autentico ? "corpo sem id" : "assinatura inválida" },
    });
    return { ok: false, status: autentico ? 400 : 401 };
  }
  try {
    const pg = await prisma.pagamentos.findFirst({
      where: {
        OR: [
          { dlocal_id: String(r.id) },
          ...(r.order_id ? [{ order_id: String(r.order_id) }] : []),
        ],
      },
    });
    if (!pg) throw new Error("pagamento desconhecido");
    // O aviso só diz "mudou": o status vale o que a própria dLocal responde agora
    const confirmado = await consultarPagamentoDlocal(String(r.id)).catch(() => r!);
    await aplicarResposta(pg.id, confirmado, "aviso");
    await prisma.dlocal_avisos.update({ where: { id: aviso.id }, data: { processado: true } });
    return { ok: true, status: 200 };
  } catch (e: any) {
    await prisma.dlocal_avisos.update({
      where: { id: aviso.id },
      data: { erro: String(e?.message ?? e).slice(0, 1000) },
    });
    // Desconhecido: 200 para a dLocal não insistir; o resto (falha nossa) ela tenta de novo
    return { ok: false, status: e?.message === "pagamento desconhecido" ? 200 : 500 };
  }
}

// Limpeza: avisos com mais de 90 dias (com erro: 365)
export async function limparAvisosAntigos() {
  await garantirTabelasPagamento();
  await prisma.dlocal_avisos.deleteMany({
    where: {
      OR: [
        { erro: null, created_at: { lt: new Date(Date.now() - 90 * 86400000) } },
        { created_at: { lt: new Date(Date.now() - 365 * 86400000) } },
      ],
    },
  });
}

// ---------- Aviso do Stripe (webhook) ----------
// Eventos: checkout.session.completed / async_payment_succeeded / async_payment_failed / expired.
// O aviso só diz "mudou": o status vale o que o próprio Stripe responde na consulta da sessão.
type EventoStripe = {
  type?: string;
  data?: { object?: { id?: string; object?: string; client_reference_id?: string | null } };
};
export async function receberAvisoStripe(corpo: string, autentico: boolean) {
  await garantirTabelasPagamento();
  let ev: EventoStripe | null = null;
  try {
    ev = JSON.parse(corpo);
  } catch {
    /* corpo inválido: só registra */
  }
  const obj = ev?.data?.object;
  const sessaoId = obj?.object === "checkout.session" && obj.id ? String(obj.id) : null;
  const aviso = await prisma.dlocal_avisos.create({
    data: {
      tipo: "stripe",
      dlocal_id: sessaoId ? sessaoId.slice(0, 100) : null,
      status: ev?.type
        ? String(ev.type)
            .replace(/^checkout\.session\./, "")
            .slice(0, 20)
        : null,
      assinatura_ok: autentico,
    },
  });
  if (!autentico) {
    await prisma.dlocal_avisos.update({
      where: { id: aviso.id },
      data: { erro: "assinatura inválida" },
    });
    return { ok: false, status: 400 };
  }
  // Outros eventos (o Stripe pode mandar vários): só confirma o recebimento
  if (!sessaoId) {
    await prisma.dlocal_avisos.update({ where: { id: aviso.id }, data: { processado: true } });
    return { ok: true, status: 200 };
  }
  try {
    const pg = await prisma.pagamentos.findFirst({
      where: {
        provedor: "stripe",
        OR: [
          { dlocal_id: sessaoId },
          ...(obj?.client_reference_id ? [{ order_id: String(obj.client_reference_id) }] : []),
        ],
      },
    });
    if (!pg) throw new Error("pagamento desconhecido");
    const s = await consultarSessaoStripe(sessaoId);
    await aplicarResposta(pg.id, sessaoComoPagamento(s), "aviso");
    await prisma.dlocal_avisos.update({ where: { id: aviso.id }, data: { processado: true } });
    return { ok: true, status: 200 };
  } catch (e: any) {
    await prisma.dlocal_avisos.update({
      where: { id: aviso.id },
      data: { erro: String(e?.message ?? e).slice(0, 1000) },
    });
    // Desconhecido: 200 para o Stripe não insistir; falha nossa: 500 e ele tenta de novo
    return { ok: false, status: e?.message === "pagamento desconhecido" ? 200 : 500 };
  }
}
