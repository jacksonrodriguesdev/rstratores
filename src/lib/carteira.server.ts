// Carteira interna do cliente (crédito de bônus usado como desconto na venda).
// Livro-razão em carteira_movimentos; valores em pesos uruguaios inteiros (UYU).
// Saldo = créditos não expirados − débitos, por FIFO (o débito e a expiração consomem
// o crédito mais antigo primeiro). Config em "configuracoes" (chaves carteira_*).

export type ConfigCarteira = {
  ativo: boolean;
  valorBoasVindas: number; // pesos creditados ao criar a conta
  validadeDias: number; // dias até o crédito expirar
  minCompra: number; // compra mínima (pesos) para usar crédito
  tetoPct: number; // % máximo do pedido que o crédito pode cobrir
  orcamentoMes: number; // máximo de crédito a EMITIR no mês (0 = sem limite)
};

export const CARTEIRA_PADRAO: ConfigCarteira = {
  ativo: false, // começa desligada; liga no Admin → Carteira
  valorBoasVindas: 500,
  validadeDias: 30,
  minCompra: 1500,
  tetoPct: 30,
  orcamentoMes: 0,
};

const n = (v: string | undefined, def: number) => {
  const x = Math.round(Number(v));
  return Number.isFinite(x) ? x : def;
};

export async function configCarteira(): Promise<ConfigCarteira> {
  const { prisma } = await import("./prisma");
  const rows = await prisma.configuracoes.findMany({
    where: { chave: { startsWith: "carteira_" } },
  });
  const v: Record<string, string> = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  return {
    ativo: v.carteira_ativo === "1",
    valorBoasVindas: Math.max(0, n(v.carteira_valor, CARTEIRA_PADRAO.valorBoasVindas)),
    validadeDias: Math.max(1, n(v.carteira_validade_dias, CARTEIRA_PADRAO.validadeDias)),
    minCompra: Math.max(0, n(v.carteira_min_compra, CARTEIRA_PADRAO.minCompra)),
    tetoPct: Math.min(100, Math.max(1, n(v.carteira_teto_pct, CARTEIRA_PADRAO.tetoPct))),
    orcamentoMes: Math.max(0, n(v.carteira_orcamento_mes, CARTEIRA_PADRAO.orcamentoMes)),
  };
}

export async function salvarConfigCarteira(c: ConfigCarteira) {
  const { prisma } = await import("./prisma");
  const valores: Record<string, string> = {
    carteira_ativo: c.ativo ? "1" : "0",
    carteira_valor: String(Math.max(0, Math.round(c.valorBoasVindas) || 0)),
    carteira_validade_dias: String(Math.max(1, Math.round(c.validadeDias) || 30)),
    carteira_min_compra: String(Math.max(0, Math.round(c.minCompra) || 0)),
    carteira_teto_pct: String(Math.min(100, Math.max(1, Math.round(c.tetoPct) || 30))),
    carteira_orcamento_mes: String(Math.max(0, Math.round(c.orcamentoMes) || 0)),
  };
  for (const [chave, valor] of Object.entries(valores)) {
    await prisma.configuracoes.upsert({
      where: { chave },
      create: { chave, valor },
      update: { valor },
    });
  }
}

type Mov = {
  id: number;
  tipo: string;
  valor: number;
  motivo: string;
  expira_em: Date | null;
  created_at: Date;
};

// Saldo disponível por FIFO + lista de créditos vencidos ainda não baixados.
// Débitos/expirações consomem os créditos mais antigos primeiro.
function calcular(movs: Mov[], agora = new Date()) {
  const ordenado = [...movs].sort((a, b) => +a.created_at - +b.created_at || a.id - b.id);
  // lotes de crédito na ordem (mais antigo primeiro)
  const lotes: { restante: number; expira_em: Date | null }[] = [];
  let aConsumir = 0; // total de débitos/expirações já registrados
  for (const m of ordenado) {
    if (m.tipo === "CREDITO" || m.tipo === "ESTORNO") {
      // CREDITO entra com validade; ESTORNO (devolução de venda cancelada) não expira
      lotes.push({ restante: m.valor, expira_em: m.tipo === "ESTORNO" ? null : m.expira_em });
    } else {
      // DEBITO, EXPIRACAO: consome
      aConsumir += m.valor;
    }
  }
  // aplica consumo FIFO
  for (const lote of lotes) {
    if (aConsumir <= 0) break;
    const tira = Math.min(lote.restante, aConsumir);
    lote.restante -= tira;
    aConsumir -= tira;
  }
  // separa o que venceu do que está disponível
  let disponivel = 0;
  let vencido = 0;
  for (const lote of lotes) {
    if (lote.restante <= 0) continue;
    if (lote.expira_em && lote.expira_em <= agora) vencido += lote.restante;
    else disponivel += lote.restante;
  }
  return { disponivel, vencido };
}

async function movimentosDe(userId: number): Promise<Mov[]> {
  const { prisma } = await import("./prisma");
  return prisma.carteira_movimentos.findMany({
    where: { user_id: userId },
    select: { id: true, tipo: true, valor: true, motivo: true, expira_em: true, created_at: true },
    orderBy: { created_at: "asc" },
  });
}

// Saldo disponível. Baixa créditos vencidos (cria EXPIRACAO) e atualiza o cache em users.
export async function saldo(userId: number): Promise<number> {
  const { prisma } = await import("./prisma");
  const movs = await movimentosDe(userId);
  const { disponivel, vencido } = calcular(movs);
  if (vencido > 0) {
    await prisma.carteira_movimentos.create({
      data: {
        user_id: userId,
        tipo: "EXPIRACAO",
        valor: vencido,
        motivo: "EXPIRACAO",
        descricao: "Crédito vencido",
        saldo_depois: disponivel,
      },
    });
  }
  await prisma.users.update({ where: { id: userId }, data: { carteira_saldo: disponivel } });
  return disponivel;
}

// Quanto já foi EMITIDO (créditos) no mês atual — para o teto de orçamento.
async function emitidoNoMes(): Promise<number> {
  const { prisma } = await import("./prisma");
  const inicio = new Date();
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  const r = await prisma.carteira_movimentos.aggregate({
    _sum: { valor: true },
    where: { tipo: "CREDITO", created_at: { gte: inicio } },
  });
  return r._sum.valor ?? 0;
}

// Credita a carteira (genérico). Respeita o teto de orçamento do mês.
export async function creditar(opts: {
  userId: number;
  valor: number;
  motivo: string;
  descricao?: string;
  ref?: string;
  validadeDias?: number;
  criadoPor?: number;
}): Promise<{ ok: boolean; motivo?: string }> {
  const { prisma } = await import("./prisma");
  const valor = Math.round(opts.valor);
  if (valor <= 0) return { ok: false, motivo: "valor" };
  const cfg = await configCarteira();
  if (cfg.orcamentoMes > 0) {
    const jaEmitido = await emitidoNoMes();
    if (jaEmitido + valor > cfg.orcamentoMes) return { ok: false, motivo: "orcamento" };
  }
  const dias = opts.validadeDias ?? cfg.validadeDias;
  const expira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  const atual = await saldo(opts.userId);
  await prisma.carteira_movimentos.create({
    data: {
      user_id: opts.userId,
      tipo: "CREDITO",
      valor,
      motivo: opts.motivo,
      descricao: opts.descricao ?? null,
      ref: opts.ref ?? null,
      expira_em: expira,
      saldo_depois: atual + valor,
      criado_por: opts.criadoPor ?? null,
    },
  });
  await prisma.users.update({
    where: { id: opts.userId },
    data: { carteira_saldo: atual + valor },
  });
  return { ok: true };
}

// Bônus de boas-vindas: creditado UMA vez por conta (idempotente). Seguro chamar em todo login.
export async function garantirBonusCarteira(userId: number): Promise<void> {
  const { prisma } = await import("./prisma");
  const cfg = await configCarteira();
  if (!cfg.ativo || cfg.valorBoasVindas <= 0) return;
  const u = await prisma.users.findUnique({ where: { id: userId }, select: { role: true } });
  if (!u || u.role === "ADMIN") return;
  const jaTem = await prisma.carteira_movimentos.count({
    where: { user_id: userId, motivo: "BOAS_VINDAS" },
  });
  if (jaTem > 0) return;
  await creditar({
    userId,
    valor: cfg.valorBoasVindas,
    motivo: "BOAS_VINDAS",
    descricao: "Bônus de boas-vindas",
  });
}

// Quanto do saldo pode ser usado numa venda de "totalVenda" pesos (aplica mínimo e teto %).
export async function creditoAplicavel(
  userId: number,
  totalVenda: number,
): Promise<{ disponivel: number; aplicavel: number; motivo?: string }> {
  const cfg = await configCarteira();
  const disp = await saldo(userId);
  if (disp <= 0) return { disponivel: 0, aplicavel: 0, motivo: "sem_saldo" };
  if (totalVenda < cfg.minCompra) return { disponivel: disp, aplicavel: 0, motivo: "min_compra" };
  const teto = Math.floor((totalVenda * cfg.tetoPct) / 100);
  const aplicavel = Math.max(0, Math.min(disp, teto));
  return { disponivel: disp, aplicavel };
}

// Debita a carteira ao vincular uma venda a um cliente. "valor" é quanto o admin escolheu usar.
// Retorna o valor realmente debitado (limitado pelo saldo).
export async function debitarVenda(opts: {
  userId: number;
  valor: number;
  vendaId: number;
  criadoPor?: number;
}): Promise<number> {
  const { prisma } = await import("./prisma");
  const disp = await saldo(opts.userId);
  const valor = Math.min(Math.max(0, Math.round(opts.valor)), disp);
  if (valor <= 0) return 0;
  // evita debitar duas vezes a mesma venda
  const jaDeb = await prisma.carteira_movimentos.findFirst({
    where: { user_id: opts.userId, tipo: "DEBITO", ref: `venda:${opts.vendaId}` },
  });
  if (jaDeb) return 0;
  await prisma.carteira_movimentos.create({
    data: {
      user_id: opts.userId,
      tipo: "DEBITO",
      valor,
      motivo: "COMPRA",
      descricao: "Usado na compra",
      ref: `venda:${opts.vendaId}`,
      saldo_depois: disp - valor,
      criado_por: opts.criadoPor ?? null,
    },
  });
  await prisma.users.update({ where: { id: opts.userId }, data: { carteira_saldo: disp - valor } });
  return valor;
}

// Estorna o débito de uma venda cancelada (devolve o crédito).
export async function estornarVenda(userId: number, vendaId: number): Promise<number> {
  const { prisma } = await import("./prisma");
  const deb = await prisma.carteira_movimentos.findFirst({
    where: { user_id: userId, tipo: "DEBITO", ref: `venda:${vendaId}` },
  });
  if (!deb) return 0;
  const jaEstorno = await prisma.carteira_movimentos.findFirst({
    where: { user_id: userId, tipo: "ESTORNO", ref: `venda:${vendaId}` },
  });
  if (jaEstorno) return 0;
  const disp = await saldo(userId);
  await prisma.carteira_movimentos.create({
    data: {
      user_id: userId,
      tipo: "ESTORNO",
      valor: deb.valor,
      motivo: "COMPRA",
      descricao: "Estorno de venda cancelada",
      ref: `venda:${vendaId}`,
      saldo_depois: disp + deb.valor,
    },
  });
  await prisma.users.update({ where: { id: userId }, data: { carteira_saldo: disp + deb.valor } });
  return deb.valor;
}

// Quanto, líquido, ficou debitado numa venda (DEBITO − ESTORNO). O desconto da venda espelha isso.
export async function debitoLiquidoVenda(userId: number, vendaId: number): Promise<number> {
  const { prisma } = await import("./prisma");
  const movs = await prisma.carteira_movimentos.findMany({
    where: { user_id: userId, ref: `venda:${vendaId}` },
    select: { tipo: true, valor: true },
  });
  const deb = movs.filter((m) => m.tipo === "DEBITO").reduce((s, m) => s + m.valor, 0);
  const est = movs.filter((m) => m.tipo === "ESTORNO").reduce((s, m) => s + m.valor, 0);
  return Math.max(0, deb - est);
}

// Extrato do cliente (mais recente primeiro).
export async function extratoCarteira(userId: number) {
  const { prisma } = await import("./prisma");
  const movs = await prisma.carteira_movimentos.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  const disp = await saldo(userId);
  return { saldo: disp, movimentos: movs };
}

// Resumo para o Admin → Carteira.
export async function resumoCarteira() {
  const { prisma } = await import("./prisma");
  const por = await prisma.carteira_movimentos.groupBy({
    by: ["tipo"],
    _sum: { valor: true },
  });
  const soma = (t: string) => por.find((p) => p.tipo === t)?._sum.valor ?? 0;
  const emitido = soma("CREDITO") + soma("ESTORNO");
  const resgatado = soma("DEBITO");
  const expirado = soma("EXPIRACAO");
  const emAberto = Math.max(0, emitido - resgatado - expirado);
  const contas = await prisma.users.count({ where: { carteira_saldo: { gt: 0 } } });
  return {
    emitido,
    resgatado,
    expirado,
    emAberto,
    contasComSaldo: contas,
    emitidoMes: await emitidoNoMes(),
  };
}
