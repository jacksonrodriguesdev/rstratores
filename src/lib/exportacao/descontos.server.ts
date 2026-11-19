// Painel de descontos de exportação: faixas por volume + regras por alvo (linha/marca/categoria/item).
// Tabelas criadas por SQL idempotente (produção não roda `prisma db push`).
import {
  type ConfigDescontos,
  type FaixaDesconto,
  type RegraDesconto,
  type TipoRegra,
  CONFIG_DESCONTOS_PADRAO,
} from "./descontos";

const SQL = [
  `CREATE TABLE IF NOT EXISTS \`b2b_desc_faixas\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`min_itens\` INTEGER NOT NULL,
    \`pct\` DOUBLE NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`b2b_desc_regras\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`tipo\` VARCHAR(12) NOT NULL,
    \`alvo\` VARCHAR(191) NOT NULL,
    \`pct\` DOUBLE NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`b2b_desc_regras_tipo_idx\`(\`tipo\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let pronto: Promise<void> | null = null;
export function garantirTabelasDescontos() {
  pronto ??= (async () => {
    const { prisma } = await import("../prisma");
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    pronto = null;
    throw e;
  });
  return pronto;
}
const db = async () => {
  await garantirTabelasDescontos();
  return (await import("../prisma")).prisma;
};

const TIPOS: TipoRegra[] = ["LINHA", "MARCA", "CATEGORIA", "ITEM"];
const pctOk = (v: unknown) => Math.min(90, Math.max(0, Math.round((Number(v) || 0) * 100) / 100));

export async function lerConfigDescontos(): Promise<ConfigDescontos> {
  const prisma = await db();
  const [cfg, faixas, regras] = await Promise.all([
    prisma.configuracoes.findMany({
      where: { chave: { in: ["b2b_desc_ativo", "b2b_desc_base"] } },
    }),
    prisma.$queryRawUnsafe<any[]>(`SELECT * FROM b2b_desc_faixas ORDER BY min_itens ASC`),
    prisma.$queryRawUnsafe<any[]>(`SELECT * FROM b2b_desc_regras ORDER BY tipo, alvo`),
  ]);
  const m = Object.fromEntries(cfg.map((r) => [r.chave, r.valor]));
  return {
    ativo: m.b2b_desc_ativo === "1",
    base: m.b2b_desc_base === "UNIDADES" ? "UNIDADES" : "ITENS",
    faixas: faixas.map((f) => ({ min_itens: Number(f.min_itens), pct: Number(f.pct) })),
    regras: regras.map((r) => ({
      id: Number(r.id),
      tipo: r.tipo as TipoRegra,
      alvo: r.alvo as string,
      pct: Number(r.pct),
    })),
  } satisfies ConfigDescontos;
}

export async function salvarGeralDescontos(d: { ativo?: boolean; base?: string }) {
  const prisma = await db();
  const set = async (chave: string, valor: string) =>
    prisma.configuracoes.upsert({ where: { chave }, update: { valor }, create: { chave, valor } });
  if (d.ativo != null) await set("b2b_desc_ativo", d.ativo ? "1" : "0");
  if (d.base != null) await set("b2b_desc_base", d.base === "UNIDADES" ? "UNIDADES" : "ITENS");
  return { ok: true };
}

// Substitui todas as faixas (o painel edita a tabela inteira de uma vez).
export async function salvarFaixas(faixas: FaixaDesconto[]) {
  const prisma = await db();
  const limpas = (faixas || [])
    .map((f) => ({ min: Math.max(1, Math.round(Number(f.min_itens) || 0)), pct: pctOk(f.pct) }))
    .filter((f) => f.min > 0 && f.pct > 0)
    .sort((a, b) => a.min - b.min);
  await prisma.$executeRawUnsafe(`DELETE FROM b2b_desc_faixas`);
  for (const f of limpas)
    await prisma.$executeRaw`INSERT INTO b2b_desc_faixas (min_itens, pct) VALUES (${f.min}, ${f.pct})`;
  return { ok: true, faixas: limpas.length };
}

export async function adicionarRegra(d: { tipo: string; alvo: string; pct: number }) {
  const prisma = await db();
  const tipo = TIPOS.includes(d.tipo as TipoRegra) ? (d.tipo as TipoRegra) : null;
  const alvo = String(d.alvo ?? "")
    .trim()
    .slice(0, 191);
  const pct = pctOk(d.pct);
  if (!tipo) throw new Error("Tipo de regra inválido.");
  if (!alvo) throw new Error("Escolha o alvo (linha, marca, categoria ou código).");
  if (pct <= 0) throw new Error("Informe um percentual maior que zero.");
  await prisma.$executeRaw`INSERT INTO b2b_desc_regras (tipo, alvo, pct) VALUES (${tipo}, ${alvo}, ${pct})`;
  return { ok: true };
}

export async function apagarRegra(id: number) {
  const prisma = await db();
  await prisma.$executeRaw`DELETE FROM b2b_desc_regras WHERE id = ${Number(id) || 0}`;
  return { ok: true };
}

export { CONFIG_DESCONTOS_PADRAO };
