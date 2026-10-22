// Campanhas e cupons no servidor: tabelas (criadas sozinhas em produção), campanha no ar (com
// memória de 30 s), descontos da fase para o cálculo de preço, peças em oferta e cupons.
import { prisma } from "./prisma";
import {
  CONFIG_PADRAO,
  aplicarCupom,
  faseDe,
  regraValeNa,
  type CampanhaPublica,
  type ConfigCampanha,
  type Fase,
  type Regra,
} from "./campanha-comum";
import { fotoInvalida } from "./fotos";

const SQL = [
  `CREATE TABLE IF NOT EXISTS \`campanhas\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`nome\` VARCHAR(120) NOT NULL,
    \`tipo\` VARCHAR(20) NOT NULL DEFAULT 'BLACK_FRIDAY',
    \`ativa\` BOOLEAN NOT NULL DEFAULT false,
    \`pre_inicio\` DATETIME(3) NOT NULL,
    \`inicio\` DATETIME(3) NOT NULL,
    \`fim\` DATETIME(3) NOT NULL,
    \`tema\` VARCHAR(20) NOT NULL DEFAULT 'black',
    \`config\` TEXT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`campanha_regras\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`campanha_id\` INTEGER NOT NULL,
    \`tipo\` VARCHAR(12) NOT NULL,
    \`alvo\` VARCHAR(191) NOT NULL DEFAULT '',
    \`pct\` DOUBLE NOT NULL,
    \`fase\` VARCHAR(10) NOT NULL DEFAULT 'BLACK',
    \`destaque\` BOOLEAN NOT NULL DEFAULT false,
    INDEX \`campanha_regras_campanha_id_idx\`(\`campanha_id\`),
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`campanha_regras_campanha_id_fkey\` FOREIGN KEY (\`campanha_id\`) REFERENCES \`campanhas\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`cupons\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`codigo\` VARCHAR(40) NOT NULL,
    \`campanha_id\` INTEGER NULL,
    \`tipo\` VARCHAR(12) NOT NULL,
    \`valor\` DOUBLE NOT NULL DEFAULT 0,
    \`moeda\` VARCHAR(3) NOT NULL DEFAULT 'UYU',
    \`minimo\` DOUBLE NOT NULL DEFAULT 0,
    \`descricao\` VARCHAR(300) NULL,
    \`descricao_pt\` VARCHAR(300) NULL,
    \`inicio\` DATETIME(3) NULL,
    \`fim\` DATETIME(3) NULL,
    \`revelar_em\` DATETIME(3) NULL,
    \`max_usos\` INTEGER NOT NULL DEFAULT 0,
    \`usos\` INTEGER NOT NULL DEFAULT 0,
    \`por_cliente\` INTEGER NOT NULL DEFAULT 1,
    \`so_primeira_compra\` BOOLEAN NOT NULL DEFAULT false,
    \`publico\` BOOLEAN NOT NULL DEFAULT true,
    \`ativo\` BOOLEAN NOT NULL DEFAULT true,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL,
    UNIQUE INDEX \`cupons_codigo_key\`(\`codigo\`),
    INDEX \`cupons_campanha_id_idx\`(\`campanha_id\`),
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`cupons_campanha_id_fkey\` FOREIGN KEY (\`campanha_id\`) REFERENCES \`campanhas\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let tabelas: Promise<void> | null = null;
export function garantirTabelasCampanha() {
  tabelas ??= (async () => {
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

export const lerConfigCampanha = (s: string | null | undefined): ConfigCampanha => {
  try {
    return { ...CONFIG_PADRAO, ...(s ? JSON.parse(s) : {}) };
  } catch {
    return { ...CONFIG_PADRAO };
  }
};

// ---------------------------------------------------------------- campanha no ar
type CampanhaNoAr = {
  id: number;
  nome: string;
  tema: string;
  pre_inicio: Date;
  inicio: Date;
  fim: Date;
  config: ConfigCampanha;
  regras: Array<Regra & { fase: string; destaque: boolean }>;
};
let memo: { c: CampanhaNoAr | null; em: number } | null = null;
export const limparCacheCampanha = () => {
  memo = null;
};

function montar(row: any): CampanhaNoAr {
  return {
    id: row.id,
    nome: row.nome,
    tema: row.tema,
    pre_inicio: row.pre_inicio,
    inicio: row.inicio,
    fim: row.fim,
    config: lerConfigCampanha(row.config),
    regras: row.regras.map((r: any) => ({
      tipo: r.tipo as Regra["tipo"],
      alvo: r.alvo,
      pct: r.pct,
      fase: r.fase,
      destaque: r.destaque,
    })),
  };
}

// Prévia do admin com nenhuma campanha ativa: a última editada (para conferir antes de ligar)
export async function ultimaCampanha(): Promise<CampanhaNoAr | null> {
  await garantirTabelasCampanha();
  const row = await prisma.campanhas.findFirst({
    orderBy: { updated_at: "desc" },
    include: { regras: true },
  });
  return row ? montar(row) : null;
}

export async function campanhaAtiva(): Promise<CampanhaNoAr | null> {
  if (memo && Date.now() - memo.em < 30_000) return memo.c;
  let c: CampanhaNoAr | null = null;
  try {
    await garantirTabelasCampanha();
    const row = await prisma.campanhas.findFirst({
      where: { ativa: true, fim: { gt: new Date() } },
      orderBy: { inicio: "asc" },
      include: { regras: true },
    });
    if (row) c = montar(row);
  } catch (e) {
    console.error("campanha:", e);
  }
  memo = { c, em: Date.now() };
  return c;
}

// Descontos para o cálculo de preço (precos.server → configPrecos)
export async function campanhaParaPrecos(agora = new Date()) {
  const c = await campanhaAtiva();
  if (!c) return { campanha: null, proximaMudanca: null as Date | null };
  const fase = faseDe(c, agora);
  const proxima =
    fase === "AGUARDANDO"
      ? c.pre_inicio
      : fase === "PRE"
        ? c.inicio
        : fase === "BLACK"
          ? c.fim
          : null;
  if (fase !== "PRE" && fase !== "BLACK") return { campanha: null, proximaMudanca: proxima };
  const regras = c.regras
    .filter((r) => regraValeNa(r.fase, fase))
    .map(({ tipo, alvo, pct }) => ({ tipo, alvo, pct }));
  return {
    campanha: regras.length ? { id: c.id, selo: c.config.selo || "BLACK", fase, regras } : null,
    proximaMudanca: proxima,
  };
}

// O que o navegador recebe (layout raiz): fase, alvo da contagem e textos. previa = admin simulando.
export async function campanhaPublica(
  previa?: "PRE" | "BLACK" | null,
): Promise<CampanhaPublica | null> {
  const c = (await campanhaAtiva()) ?? (previa ? await ultimaCampanha() : null);
  if (!c) return null;
  const real = faseDe(c);
  const fase: Fase = previa ?? real;
  if (fase !== "PRE" && fase !== "BLACK") return null;
  const regras = c.regras.filter((r) => regraValeNa(r.fase, fase));
  return {
    id: c.id,
    nome: c.nome,
    fase,
    tema: c.tema,
    alvo: (fase === "PRE" ? c.inicio : c.fim).toISOString(),
    maxPct: Math.round(regras.reduce((m, r) => Math.max(m, r.pct), 0)),
    config: c.config,
    ...(previa && previa !== real && { previa: true }),
  };
}

// Peças em oferta na campanha (vitrine da home e da página da campanha): as das regras em destaque
// (ou todas as regras, se nenhuma estiver em destaque), com preço e de preferência com foto
export async function pecasDaCampanha(
  limite = 24,
  fase?: "PRE" | "BLACK",
  campanha?: CampanhaNoAr | null,
) {
  const c = campanha ?? (await campanhaAtiva());
  if (!c) return [];
  const f = fase ?? faseDe(c);
  if (f !== "PRE" && f !== "BLACK") return [];
  const regras = c.regras.filter((r) => regraValeNa(r.fase, f));
  const base = regras.some((r) => r.destaque) ? regras.filter((r) => r.destaque) : regras;
  if (!base.length) return [];
  const ou: any[] = [];
  for (const r of base) {
    if (r.tipo === "ITEM") ou.push({ sku: r.alvo });
    else if (r.tipo === "CATEGORIA") ou.push({ categoria: r.alvo });
    else if (r.tipo === "MARCA") ou.push({ marca: r.alvo });
    else if (r.tipo === "TUDO") ou.push({});
  }
  const rows = await prisma.agricolas.findMany({
    where: { duplicado_de: null, preco_brl: { gt: 0 }, OR: ou },
    orderBy: [{ imagem_principal: "desc" }, { estoque: "desc" }],
    take: limite * 3,
  });
  // Com foto primeiro (sem as fotos provisórias do fornecedor)
  const comFoto = (p: (typeof rows)[number]) =>
    !!p.imagem_principal && !fotoInvalida(p.imagem_principal);
  return [...rows.filter(comFoto), ...rows.filter((p) => !comFoto(p))].slice(0, limite);
}

// ---------------------------------------------------------------- cupons
export async function cuponsPublicos() {
  await garantirTabelasCampanha();
  const agora = new Date();
  return prisma.cupons.findMany({
    where: { ativo: true, publico: true, OR: [{ fim: null }, { fim: { gt: agora } }] },
    orderBy: [{ revelar_em: "asc" }, { id: "desc" }],
    take: 40,
  });
}

// Cupom num link de pagamento (admin): valida e devolve o desconto em centavos
export async function validarCupom(
  codigo: string,
  o: { subtotal: number; moeda: string; email?: string | null },
) {
  await garantirTabelasCampanha();
  const c = await prisma.cupons.findUnique({ where: { codigo: codigo.trim().toUpperCase() } });
  if (!c) return { ok: false as const, motivo: "inativo" as const };
  const r = aplicarCupom(c, o.subtotal, o.moeda);
  if (!r.ok) return r;
  // Por cliente e primeira compra: pelos links pagos da conta com esse e-mail
  if (o.email && (c.por_cliente > 0 || c.so_primeira_compra)) {
    const u = await prisma.users.findUnique({
      where: { email: o.email.toLowerCase() },
      select: { id: true },
    });
    if (u) {
      if (c.so_primeira_compra) {
        const pagos = await prisma.links_pagamento.count({
          where: { user_id: u.id, status: "PAGO" },
        });
        if (pagos > 0) return { ok: false as const, motivo: "primeira_compra" as const };
      }
      if (c.por_cliente > 0) {
        const usados = await prisma.links_pagamento.count({
          where: { user_id: u.id, cupom: c.codigo, status: { in: ["PAGO", "ABERTO"] } },
        });
        if (usados >= c.por_cliente)
          return { ok: false as const, motivo: "limite_cliente" as const };
      }
    }
  }
  return { ...r, cupom: c };
}

// Link pago com cupom: conta o uso
export async function contarUsoCupom(codigo: string | null | undefined) {
  if (!codigo) return;
  await garantirTabelasCampanha();
  await prisma.cupons.updateMany({ where: { codigo }, data: { usos: { increment: 1 } } });
}
