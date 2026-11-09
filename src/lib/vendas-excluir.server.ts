// Apagar e restaurar vendas (Admin → Vendas e etiquetas). A etiqueta é gerada da venda, então
// apagar a venda apaga a etiqueta. Antes de apagar, a venda inteira (com etapas e os vínculos de
// avaliações e extrato) vai para `vendas_excluidas`, de onde pode ser restaurada igual.
// Venda com nota fiscal autorizada ou em processamento não pode ser apagada: cancele a nota no
// Fiscal antes. Venda de link pago apagada não volta sozinha pela sincronização dos links.
import { garantirTabelasAvaliacoes, paraVenda } from "./avaliacoes.server";

const SQL = `CREATE TABLE IF NOT EXISTS \`vendas_excluidas\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`venda_id\` INTEGER NOT NULL,
  \`codigo\` VARCHAR(24) NOT NULL,
  \`link_id\` INTEGER NULL,
  \`cliente_nome\` VARCHAR(160) NOT NULL,
  \`total\` DOUBLE NOT NULL DEFAULT 0,
  \`moeda\` VARCHAR(3) NOT NULL,
  \`dados\` LONGTEXT NOT NULL,
  \`excluida_por\` VARCHAR(191) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX \`vendas_excluidas_link_id_idx\`(\`link_id\`),
  INDEX \`vendas_excluidas_created_at_idx\`(\`created_at\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

let pronta: Promise<void> | null = null;
export function garantirTabelaExcluidas() {
  pronta ??= (async () => {
    await garantirTabelasAvaliacoes();
    const { prisma } = await import("./prisma");
    await prisma.$executeRawUnsafe(SQL);
  })().catch((e) => {
    pronta = null;
    throw e;
  });
  return pronta;
}

async function existeTabela(nome: string) {
  const { prisma } = await import("./prisma");
  const r = await prisma.$queryRaw<Array<{ n: bigint | number }>>`
    SELECT COUNT(*) AS n FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${nome}`;
  return Number(r[0]?.n ?? 0) > 0;
}

// Links pagos cuja venda foi apagada de propósito: não viram venda de novo
export async function linksDeVendasExcluidas(): Promise<number[]> {
  await garantirTabelaExcluidas();
  const { prisma } = await import("./prisma");
  const r = await prisma.$queryRaw<Array<{ link_id: number }>>`
    SELECT DISTINCT link_id FROM vendas_excluidas WHERE link_id IS NOT NULL`;
  return r.map((x) => Number(x.link_id));
}

const NOTA_ATIVA = ["AUTORIZADA", "PROCESSANDO"];

export type ResultadoExclusao = {
  apagadas: string[];
  bloqueadas: Array<{ codigo: string; motivo: string }>;
};

export async function excluirVendas(ids: number[], quem: string): Promise<ResultadoExclusao> {
  await garantirTabelaExcluidas();
  const { prisma } = await import("./prisma");
  const temExtrato = await existeTabela("extrato_movimentos");
  const res: ResultadoExclusao = { apagadas: [], bloqueadas: [] };
  for (const id of [...new Set(ids)].slice(0, 200)) {
    const v = await prisma.vendas.findUnique({ where: { id } });
    if (!v) continue;
    const notas = await prisma.notas_fiscais.findMany({ where: { venda_id: id } });
    const ativa = notas.find((n) => NOTA_ATIVA.includes(n.status));
    if (ativa) {
      res.bloqueadas.push({
        codigo: v.codigo,
        motivo:
          ativa.status === "AUTORIZADA"
            ? `tem nota fiscal autorizada${ativa.numero ? ` (nº ${ativa.numero})` : ""}: cancele a nota em Admin → Fiscal antes`
            : "a nota fiscal ainda está em processamento: espere terminar",
      });
      continue;
    }
    const etapas = await prisma.venda_etapas.findMany({ where: { venda_id: id } });
    const avaliacoes = (
      await prisma.avaliacoes.findMany({ where: { venda_id: id }, select: { id: true } })
    ).map((a) => a.id);
    const extrato = temExtrato
      ? (
          await prisma.extrato_movimentos.findMany({
            where: { venda_id: id },
            select: { id: true },
          })
        ).map((m) => m.id)
      : [];
    const dados = JSON.stringify({ venda: v, etapas, avaliacoes, extrato, notas });
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO vendas_excluidas (venda_id, codigo, link_id, cliente_nome, total, moeda, dados, excluida_por)
        VALUES (${v.id}, ${v.codigo}, ${v.link_id}, ${v.cliente_nome}, ${v.total}, ${v.moeda}, ${dados}, ${quem.slice(0, 191)})`;
      await tx.venda_etapas.deleteMany({ where: { venda_id: id } });
      // Avaliações continuam publicadas na página da peça; só perdem o vínculo com a venda
      if (avaliacoes.length)
        await tx.avaliacoes.updateMany({ where: { venda_id: id }, data: { venda_id: null } });
      if (extrato.length)
        await tx.extrato_movimentos.updateMany({
          where: { venda_id: id },
          data: { venda_id: null },
        });
      // Tentativas de nota que deram erro ou foram canceladas ficam na cópia
      if (notas.length) await tx.notas_fiscais.deleteMany({ where: { venda_id: id } });
      await tx.vendas.delete({ where: { id } });
    });
    res.apagadas.push(v.codigo);
  }
  return res;
}

export async function listarExcluidas() {
  await garantirTabelaExcluidas();
  const { prisma } = await import("./prisma");
  const r = await prisma.$queryRaw<
    Array<{
      id: number;
      venda_id: number;
      codigo: string;
      link_id: number | null;
      cliente_nome: string;
      total: number;
      moeda: string;
      excluida_por: string | null;
      created_at: Date;
      dados: string;
    }>
  >`SELECT id, venda_id, codigo, link_id, cliente_nome, total, moeda, excluida_por, created_at, dados
    FROM vendas_excluidas ORDER BY id DESC LIMIT 200`;
  return r.map(({ dados, ...x }) => {
    let criada: string | null = null;
    try {
      criada = JSON.parse(dados)?.venda?.created_at ?? null;
    } catch {
      /* cópia antiga ou corrompida */
    }
    return {
      ...x,
      id: Number(x.id),
      venda_id: Number(x.venda_id),
      link_id: x.link_id == null ? null : Number(x.link_id),
      total: Number(x.total),
      criada,
      created_at: new Date(x.created_at).toISOString(),
    };
  });
}

const data = (s: unknown) => (s ? new Date(String(s)) : null);

export async function restaurarVenda(copiaId: number) {
  await garantirTabelaExcluidas();
  const { prisma } = await import("./prisma");
  const [c] = await prisma.$queryRaw<Array<{ id: number; dados: string }>>`
    SELECT id, dados FROM vendas_excluidas WHERE id = ${copiaId}`;
  if (!c) throw new Error("Cópia não encontrada (talvez já restaurada).");
  const d = JSON.parse(c.dados) as {
    venda: Record<string, any>;
    etapas: Array<Record<string, any>>;
    avaliacoes: number[];
    extrato: number[];
    notas?: Array<Record<string, any>>;
  };
  const v = d.venda;
  const conflito = await prisma.vendas.findFirst({
    where: {
      OR: [
        { id: Number(v.id) },
        { codigo: String(v.codigo) },
        ...(v.link_id != null ? [{ link_id: Number(v.link_id) }] : []),
      ],
    },
    select: { codigo: true },
  });
  if (conflito)
    throw new Error(`Já existe uma venda com esse número ou código (${conflito.codigo}).`);
  const temExtrato = d.extrato?.length ? await existeTabela("extrato_movimentos") : false;
  await prisma.$transaction(async (tx) => {
    await tx.vendas.create({
      data: {
        ...(v as any),
        avaliada_em: data(v.avaliada_em),
        created_at: data(v.created_at) ?? new Date(),
        updated_at: new Date(),
      },
    });
    for (const e of d.etapas ?? [])
      await tx.venda_etapas.create({
        data: { ...(e as any), created_at: data(e.created_at) ?? new Date() },
      });
    for (const n of d.notas ?? [])
      await tx.notas_fiscais.create({
        data: {
          ...(n as any),
          created_at: data(n.created_at) ?? new Date(),
          updated_at: data(n.updated_at) ?? new Date(),
        },
      });
    if (d.avaliacoes?.length)
      await tx.avaliacoes.updateMany({
        where: { id: { in: d.avaliacoes }, venda_id: null },
        data: { venda_id: Number(v.id) },
      });
    if (temExtrato)
      await tx.extrato_movimentos.updateMany({
        where: { id: { in: d.extrato }, venda_id: null },
        data: { venda_id: Number(v.id) },
      });
    await tx.$executeRaw`DELETE FROM vendas_excluidas WHERE id = ${copiaId}`;
  });
  const nova = await prisma.vendas.findUnique({ where: { id: Number(v.id) } });
  return paraVenda(nova);
}

// ---------------------------------------------------------------- etiqueta
// Ajuste rápido do que sai na etiqueta (destinatário e transportadora), direto na tela de
// impressão. Grava na venda; as peças e os valores continuam só no formulário da venda.
export type DadosEtiqueta = {
  id: number;
  cliente_nome: string;
  cliente_telefone?: string | null;
  cliente_doc?: string | null;
  endereco?: string | null;
  end_numero?: string | null;
  end_bairro?: string | null;
  cidade?: string | null;
  departamento?: string | null;
  cep?: string | null;
  transportadora?: string | null;
};
const txt = (s: unknown, max: number) => {
  const t = String(s ?? "")
    .trim()
    .slice(0, max);
  return t || null;
};
export async function salvarEtiqueta(d: DadosEtiqueta) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const nome = txt(d.cliente_nome, 160);
  if (!nome) throw new Error("Coloque o nome do destinatário.");
  const v = await prisma.vendas.update({
    where: { id: Number(d.id) },
    data: {
      cliente_nome: nome,
      cliente_telefone: txt(d.cliente_telefone, 40),
      cliente_doc: txt(d.cliente_doc, 40),
      endereco: txt(d.endereco, 1000),
      end_numero: txt(d.end_numero, 20),
      end_bairro: txt(d.end_bairro, 80),
      cidade: txt(d.cidade, 120),
      departamento: txt(d.departamento, 80),
      cep: txt(d.cep, 20),
      transportadora: txt(d.transportadora, 80),
    },
  });
  return paraVenda(v);
}
