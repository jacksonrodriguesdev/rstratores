// Extrato do banco (pessoa física e CNPJ juntos, como o dono usa hoje): o admin importa o PDF
// ou CSV do mês, cada movimento ganha uma categoria (sozinho, por regra "lembrar" ou à mão) e o
// painel mostra o que vai para o MEI e para o imposto de renda. Também guarda as tarefas do dono.
import crypto from "node:crypto";
import Papa from "papaparse";
import { prisma } from "./prisma";
import { conferir, lerNubankCsv, lerNubankPdf, type ExtratoLido } from "./extrato-leitor";
import {
  CATEGORIAS,
  type Categoria,
  categoriasDo,
  chaveNome,
  ehCategoria,
  ehSub,
  palpiteSub,
  SUBS,
  type Sub,
} from "./extrato-categorias";

const r2 = (v: number) => Math.round(v * 100) / 100;
const hojeBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// ---------- Tabelas (produção não roda "prisma db push") ----------
const SQL = [
  `CREATE TABLE IF NOT EXISTS \`extrato_arquivos\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`banco\` VARCHAR(40) NOT NULL,
  \`nome\` VARCHAR(191) NOT NULL,
  \`titular\` VARCHAR(160) NULL,
  \`inicio\` VARCHAR(10) NOT NULL,
  \`fim\` VARCHAR(10) NOT NULL,
  \`movimentos\` INTEGER NOT NULL DEFAULT 0,
  \`entradas\` DOUBLE NOT NULL DEFAULT 0,
  \`saidas\` DOUBLE NOT NULL DEFAULT 0,
  \`conferido\` BOOLEAN NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`extrato_arquivos_banco_inicio_fim_key\`(\`banco\`, \`inicio\`, \`fim\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`extrato_movimentos\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`arquivo_id\` INTEGER NOT NULL,
  \`banco\` VARCHAR(40) NOT NULL,
  \`data\` VARCHAR(10) NOT NULL,
  \`valor\` DOUBLE NOT NULL,
  \`tipo\` VARCHAR(80) NOT NULL,
  \`contraparte\` VARCHAR(160) NOT NULL,
  \`documento\` VARCHAR(30) NULL,
  \`descricao\` TEXT NOT NULL,
  \`categoria\` VARCHAR(20) NOT NULL DEFAULT 'A_CLASSIFICAR',
  \`manual\` BOOLEAN NOT NULL DEFAULT false,
  \`venda_id\` INTEGER NULL,
  \`nota\` VARCHAR(300) NULL,
  \`hash\` VARCHAR(64) NOT NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`extrato_movimentos_hash_key\`(\`hash\`),
  INDEX \`extrato_movimentos_data_idx\`(\`data\`),
  INDEX \`extrato_movimentos_categoria_idx\`(\`categoria\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`extrato_regras\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`chave\` VARCHAR(160) NOT NULL,
  \`sentido\` VARCHAR(1) NOT NULL,
  \`categoria\` VARCHAR(20) NOT NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`extrato_regras_chave_sentido_key\`(\`chave\`, \`sentido\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let tabelas: Promise<void> | null = null;
export function garantirTabelasExtrato() {
  tabelas ??= (async () => {
    const { garantirTabelasAvaliacoes } = await import("./avaliacoes.server");
    await garantirTabelasAvaliacoes(); // vendas (para ligar o PIX à venda lançada)
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
    // Coluna que chegou depois (Pessoal): a tabela da produção já existia sem ela
    const col: unknown[] = await prisma.$queryRawUnsafe(
      "SHOW COLUMNS FROM `extrato_movimentos` LIKE 'subcategoria'",
    );
    if (!col.length)
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `extrato_movimentos` ADD COLUMN `subcategoria` VARCHAR(20) NULL",
      );
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

// ---------- Classificação automática ----------
type Regra = { chave: string; sentido: string; categoria: string };
const sentidoDe = (valor: number) => (valor >= 0 ? "E" : "S");

// Sem regra do dono: só o que dá para saber pelo próprio extrato
export function palpite(
  m: { valor: number; tipo: string; contraparte: string; descricao: string },
  titular: string | null,
): Categoria {
  const d = chaveNome(`${m.tipo} ${m.contraparte}`);
  const nome = chaveNome(m.contraparte);
  if (/^(REEMBOLSO|ESTORNO)/.test(chaveNome(m.tipo)) || /^ESTORNO/.test(d)) return "ESTORNO";
  if (/APLICACAO RDB|RESGATE RDB/.test(d)) return "PROPRIA";
  if (titular && nome.includes(chaveNome(titular))) return "PROPRIA";
  if (m.valor < 0) {
    if (/FACEBOOK|GOOGLE|META PLATFORMS|DEMERGE|TIKTOK/.test(nome)) return "ANUNCIOS";
    if (/SIMPLES NACIONAL|RECEITA FEDERAL|PGMEI|\bDAS\b/.test(d)) return "IMPOSTOS";
    if (
      /SUPERMERCADO|MERCADO |ATACAD|ABASTECEDORA|POSTO |FARMACIA|PADARIA|RESTAURANTE|LANCHE|BAR /.test(
        `${nome} `,
      )
    )
      return "PESSOAL";
    if (/RECARGA DE CELULAR|NUCEL/.test(d)) return "PESSOAL";
    // Compra no débito quase sempre é do dia a dia; a da loja você troca à mão
    if (/^COMPRA NO DEBITO/.test(chaveNome(m.tipo))) return "PESSOAL";
  }
  return "A_CLASSIFICAR";
}

function classificar(
  m: { valor: number; tipo: string; contraparte: string; descricao: string },
  regras: Map<string, string>,
  titular: string | null,
): Categoria {
  const r = regras.get(`${chaveNome(m.contraparte)}|${sentidoDe(m.valor)}`);
  if (ehCategoria(r)) return r;
  return palpite(m, titular);
}
const mapaRegras = (rs: Regra[]) =>
  new Map(rs.map((r) => [`${r.chave}|${r.sentido}`, r.categoria]));

// PIX de venda ↔ venda do Brasil lançada (mesmo valor, até 2 dias antes e 7 depois)
async function ligarVendas() {
  const soltos = await prisma.extrato_movimentos.findMany({
    where: { categoria: "VENDA", venda_id: null },
  });
  if (!soltos.length) return;
  const usadas = new Set(
    (
      await prisma.extrato_movimentos.findMany({
        where: { venda_id: { not: null } },
        select: { venda_id: true },
      })
    ).map((x) => x.venda_id),
  );
  const vendas = await prisma.vendas.findMany({
    where: { pais: "BR", status: { not: "CANCELADA" } },
    select: { id: true, total: true, frete_cobrado: true, desconto: true, created_at: true },
  });
  const diaBR = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const dias = (a: string, b: string) => (Date.parse(a) - Date.parse(b)) / 86_400_000;
  for (const m of soltos) {
    const v = vendas.find(
      (x) =>
        !usadas.has(x.id) &&
        Math.abs(r2(x.total + (x.frete_cobrado ?? 0) - (x.desconto ?? 0)) - m.valor) < 0.01 &&
        dias(m.data, diaBR(x.created_at)) >= -2 &&
        dias(m.data, diaBR(x.created_at)) <= 7,
    );
    if (!v) continue;
    usadas.add(v.id);
    await prisma.extrato_movimentos.update({ where: { id: m.id }, data: { venda_id: v.id } });
  }
}

// ---------- Importar ----------
export type ArquivoEnviado = { nome: string; formato: "pdf" | "csv"; texto: string };
export async function importar(a: ArquivoEnviado) {
  await garantirTabelasExtrato();
  const nome = String(a.nome ?? "extrato").slice(0, 191);
  let e: ExtratoLido;
  if (a.formato === "csv") {
    const p = Papa.parse<string[]>(String(a.texto ?? ""), { skipEmptyLines: true });
    e = lerNubankCsv(p.data);
  } else e = lerNubankPdf(String(a.texto ?? ""));
  if (!e.movimentos.length || !e.inicio || !e.fim)
    throw new Error(
      `${nome}: não achei movimentos. Use o extrato da conta do Nubank em PDF ou CSV (o da fatura do cartão é outro).`,
    );
  const c = conferir(e);
  const arquivo = await prisma.extrato_arquivos.upsert({
    where: { banco_inicio_fim: { banco: e.banco, inicio: e.inicio, fim: e.fim } },
    create: {
      banco: e.banco,
      nome,
      titular: e.titular,
      inicio: e.inicio,
      fim: e.fim,
      movimentos: e.movimentos.length,
      entradas: c.entradas,
      saidas: c.saidas,
      conferido: c.ok,
    },
    update: {
      nome,
      movimentos: e.movimentos.length,
      entradas: c.entradas,
      saidas: c.saidas,
      conferido: c.ok,
    },
  });
  const regras = mapaRegras(await prisma.extrato_regras.findMany());
  // Mesmo movimento importado de novo (mesmo mês outra vez) não duplica: a chave é o dia, o
  // valor, o nome e a ordem entre iguais
  const vistos = new Map<string, number>();
  const linhas = e.movimentos.map((m) => {
    const base = `${e.banco}|${m.data}|${m.valor.toFixed(2)}|${chaveNome(m.contraparte)}`;
    const k = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, k);
    return {
      arquivo_id: arquivo.id,
      banco: e.banco,
      data: m.data,
      valor: m.valor,
      tipo: m.tipo.slice(0, 80),
      contraparte: m.contraparte.slice(0, 160),
      documento: m.documento?.slice(0, 30) ?? null,
      descricao: m.descricao.slice(0, 2000),
      categoria: classificar(m, regras, e.titular),
      hash: crypto.createHash("sha256").update(`${base}|${k}`).digest("hex"),
    };
  });
  const ja = new Set(
    (
      await prisma.extrato_movimentos.findMany({
        where: { hash: { in: linhas.map((l) => l.hash) } },
        select: { hash: true },
      })
    ).map((x) => x.hash),
  );
  const novas = linhas.filter((l) => !ja.has(l.hash));
  if (novas.length) await prisma.extrato_movimentos.createMany({ data: novas });
  const novos = novas.length;
  await ligarVendas();
  return {
    nome,
    inicio: e.inicio,
    fim: e.fim,
    movimentos: e.movimentos.length,
    novos,
    conferido: c.ok,
    entradas: c.entradas,
    saidas: c.saidas,
    totaisBanco: e.totais,
  };
}

// ---------- Classificar à mão (e "lembrar" para os próximos) ----------
export async function classificarMovimento(d: {
  id: number;
  categoria: string;
  lembrar?: boolean;
  nota?: string | null;
}) {
  await garantirTabelasExtrato();
  const m = await prisma.extrato_movimentos.findUnique({ where: { id: Number(d.id) } });
  if (!m) throw new Error("Movimento não encontrado");
  if (!ehCategoria(d.categoria) || !categoriasDo(m.valor).includes(d.categoria))
    throw new Error("Categoria não serve para esse movimento");
  await prisma.extrato_movimentos.update({
    where: { id: m.id },
    data: {
      categoria: d.categoria,
      manual: true,
      ...(d.categoria !== "VENDA" && { venda_id: null }),
      ...(d.nota !== undefined && { nota: String(d.nota ?? "").slice(0, 300) || null }),
    },
  });
  let outros = 0;
  if (d.lembrar) {
    const chave = chaveNome(m.contraparte);
    const sentido = sentidoDe(m.valor);
    await prisma.extrato_regras.upsert({
      where: { chave_sentido: { chave, sentido } },
      create: { chave, sentido, categoria: d.categoria },
      update: { categoria: d.categoria },
    });
    // Os outros do mesmo nome (que você não mexeu à mão) seguem a regra
    const iguais = await prisma.extrato_movimentos.findMany({
      where: { manual: false, id: { not: m.id } },
      select: { id: true, contraparte: true, valor: true },
    });
    const ids = iguais
      .filter((x) => chaveNome(x.contraparte) === chave && sentidoDe(x.valor) === sentido)
      .map((x) => x.id);
    if (ids.length) {
      const r = await prisma.extrato_movimentos.updateMany({
        where: { id: { in: ids } },
        data: { categoria: d.categoria, ...(d.categoria !== "VENDA" && { venda_id: null }) },
      });
      outros = r.count;
    }
  }
  if (d.categoria === "VENDA") await ligarVendas();
  return { ok: true, outros };
}

export async function apagarArquivo(id: number) {
  await garantirTabelasExtrato();
  await prisma.extrato_movimentos.deleteMany({ where: { arquivo_id: Number(id) } });
  await prisma.extrato_arquivos.delete({ where: { id: Number(id) } });
  return { ok: true };
}

// ---------- Painel ----------
export async function painel(ano: number, mes?: string | null) {
  await garantirTabelasExtrato();
  await ligarVendas();
  const de = `${ano}-01-01`;
  const ate = `${ano}-12-31`;
  const [movs, arquivos, regras] = await Promise.all([
    prisma.extrato_movimentos.findMany({
      where: { data: { gte: de, lte: ate } },
      orderBy: [{ data: "asc" }, { id: "asc" }],
    }),
    prisma.extrato_arquivos.findMany({ orderBy: { inicio: "desc" } }),
    prisma.extrato_regras.count(),
  ]);

  // Meses: entrou, saiu e quanto por categoria
  const meses = Array.from({ length: 12 }, (_, i) => {
    const m = `${ano}-${String(i + 1).padStart(2, "0")}`;
    const cobre = arquivos.some((a) => a.inicio.slice(0, 7) <= m && a.fim.slice(0, 7) >= m);
    return {
      mes: m,
      importado: cobre,
      futuro: m > hojeBR().slice(0, 7),
      entradas: 0,
      saidas: 0,
      porCategoria: {} as Record<string, number>,
    };
  });
  const porCat = new Map<string, { entradas: number; saidas: number; qtd: number }>();
  for (const m of movs) {
    const b = meses[Number(m.data.slice(5, 7)) - 1];
    if (m.valor >= 0) b.entradas += m.valor;
    else b.saidas += -m.valor;
    b.porCategoria[m.categoria] = (b.porCategoria[m.categoria] ?? 0) + Math.abs(m.valor);
    const c = porCat.get(m.categoria) ?? { entradas: 0, saidas: 0, qtd: 0 };
    if (m.valor >= 0) c.entradas += m.valor;
    else c.saidas += -m.valor;
    c.qtd++;
    porCat.set(m.categoria, c);
  }
  // Mês que já passou e não tem extrato (do primeiro extrato importado em diante)
  const primeiro = arquivos.length ? arquivos[arquivos.length - 1].inicio.slice(0, 7) : null;
  const faltando = meses
    .filter((m) => !m.futuro && !m.importado && primeiro && m.mes >= primeiro)
    .filter((m) => m.mes < hojeBR().slice(0, 7))
    .map((m) => m.mes);

  // Para o imposto de renda do ano seguinte: agrupado por pessoa (nome + documento)
  const porPessoa = (cat: Categoria) => {
    const g = new Map<
      string,
      { nome: string; documento: string | null; total: number; meses: Set<string> }
    >();
    for (const m of movs.filter((x) => x.categoria === cat)) {
      const k = chaveNome(m.contraparte);
      const p = g.get(k) ?? {
        nome: m.contraparte,
        documento: m.documento,
        total: 0,
        meses: new Set<string>(),
      };
      p.total += Math.abs(m.valor);
      p.meses.add(m.data.slice(0, 7));
      p.documento ??= m.documento;
      g.set(k, p);
    }
    return [...g.values()]
      .map((p) => ({ ...p, total: r2(p.total), meses: [...p.meses].sort() }))
      .sort((a, b) => b.total - a.total);
  };
  const total = (cat: Categoria) =>
    r2(movs.filter((m) => m.categoria === cat).reduce((s, m) => s + Math.abs(m.valor), 0));

  const vendasSemLancar = movs
    .filter((m) => m.categoria === "VENDA" && !m.venda_id)
    .map((m) => ({ id: m.id, data: m.data, valor: m.valor, contraparte: m.contraparte }));

  const lista = mes ? movs.filter((m) => m.data.startsWith(mes)) : movs;
  return {
    ano,
    regras,
    arquivos: arquivos.map((a) => ({
      id: a.id,
      nome: a.nome,
      banco: a.banco,
      inicio: a.inicio,
      fim: a.fim,
      movimentos: a.movimentos,
      entradas: r2(a.entradas),
      saidas: r2(a.saidas),
      conferido: a.conferido,
    })),
    meses: meses.map((m) => ({
      ...m,
      entradas: r2(m.entradas),
      saidas: r2(m.saidas),
    })),
    faltando,
    totais: {
      entradas: r2(movs.filter((m) => m.valor >= 0).reduce((s, m) => s + m.valor, 0)),
      saidas: r2(-movs.filter((m) => m.valor < 0).reduce((s, m) => s + m.valor, 0)),
      aClassificar: movs.filter((m) => m.categoria === "A_CLASSIFICAR").length,
    },
    categorias: [...porCat.entries()]
      .map(([c, v]) => ({
        categoria: c,
        nome: CATEGORIAS[c as Categoria]?.nome ?? c,
        efeito: CATEGORIAS[c as Categoria]?.efeito ?? "",
        entradas: r2(v.entradas),
        saidas: r2(v.saidas),
        qtd: v.qtd,
      }))
      .sort((a, b) => b.entradas + b.saidas - (a.entradas + a.saidas)),
    mei: {
      vendasNoBanco: total("VENDA"),
      vendasSemLancar,
      fornecedores: total("FORNECEDOR"),
      despesasLoja: r2(total("ANUNCIOS") + total("IMPOSTOS") + total("LOJA")),
    },
    ir: {
      servicoPF: porPessoa("SERVICO_PF"),
      totalServicoPF: total("SERVICO_PF"),
      doacoesRecebidas: porPessoa("DOACAO"),
      totalDoacoes: total("DOACAO"),
      doacoesFeitas: porPessoa("DOACAO_FEITA"),
      totalDoacoesFeitas: total("DOACAO_FEITA"),
      emprestimos: porPessoa("EMPRESTIMO"),
      // Serviço por mês: é como a declaração pede (carnê-leão)
      servicoPorMes: meses
        .map((m) => ({ mes: m.mes, valor: r2(m.porCategoria.SERVICO_PF ?? 0) }))
        .filter((m) => m.valor > 0),
    },
    movimentos: lista.map((m) => ({
      id: m.id,
      data: m.data,
      valor: m.valor,
      tipo: m.tipo,
      contraparte: m.contraparte,
      documento: m.documento,
      categoria: m.categoria,
      manual: m.manual,
      venda_id: m.venda_id,
      nota: m.nota,
    })),
  };
}

// ---------- Pessoal: como o dono gasta o dinheiro dele ----------
// Gasto pessoal + ajuda à família, em subcategorias. A subcategoria vem da escolha à mão, senão
// da regra «lembrar» (extrato_regras com sentido "P"), senão do palpite pelo nome.
const PESSOAIS = ["PESSOAL", "DOACAO_FEITA"];
export async function pessoal(ano: number, mes?: string | null) {
  await garantirTabelasExtrato();
  const [todos, arquivos, regrasP] = await Promise.all([
    prisma.extrato_movimentos.findMany({
      where: { data: { gte: `${ano}-01-01`, lte: `${ano}-12-31` } },
      orderBy: [{ data: "asc" }, { id: "asc" }],
    }),
    prisma.extrato_arquivos.findMany({ select: { inicio: true, fim: true } }),
    prisma.extrato_regras.findMany({ where: { sentido: "P" } }),
  ]);
  const regra = new Map(regrasP.map((r) => [r.chave, r.categoria]));
  const movs = todos
    .filter((m) => PESSOAIS.includes(m.categoria))
    .map((m) => {
      const r = regra.get(chaveNome(m.contraparte));
      const sub: Sub =
        m.categoria === "DOACAO_FEITA"
          ? "FAMILIA"
          : ehSub(m.subcategoria)
            ? m.subcategoria
            : ehSub(r)
              ? r
              : palpiteSub(m);
      return {
        id: m.id,
        data: m.data,
        valor: r2(-m.valor), // gasto positivo
        tipo: m.tipo,
        contraparte: m.contraparte,
        documento: m.documento,
        categoria: m.categoria,
        nota: m.nota,
        sub,
        origem: ehSub(m.subcategoria) ? "manual" : ehSub(r) ? "regra" : "palpite",
      };
    });
  // Meses com extrato (e que já passaram): a média é só sobre eles
  const hojeMes = hojeBR().slice(0, 7);
  const meses = Array.from({ length: 12 }, (_, i) => {
    const m = `${ano}-${String(i + 1).padStart(2, "0")}`;
    return {
      mes: m,
      importado: arquivos.some((a) => a.inicio.slice(0, 7) <= m && a.fim.slice(0, 7) >= m),
      futuro: m > hojeMes,
      total: 0,
      porSub: {} as Record<string, number>,
      entrouParaVoce: 0,
    };
  });
  for (const m of movs) {
    const b = meses[Number(m.data.slice(5, 7)) - 1];
    b.total += m.valor;
    b.porSub[m.sub] = (b.porSub[m.sub] ?? 0) + m.valor;
  }
  // O que entrou para a pessoa (não para a loja): doações e serviços como pessoa física
  for (const m of todos.filter((x) => ["DOACAO", "SERVICO_PF"].includes(x.categoria)))
    meses[Number(m.data.slice(5, 7)) - 1].entrouParaVoce += m.valor;
  const comDados = meses.filter((m) => m.importado && !m.futuro);
  const n = Math.max(1, comDados.length);
  const sel = mes ? movs.filter((m) => m.data.startsWith(mes)) : movs;
  const nMeses = mes ? 1 : n;

  const subs = (Object.keys(SUBS) as Sub[])
    .map((s) => {
      const doPeriodo = sel.filter((m) => m.sub === s);
      const total = doPeriodo.reduce((t, m) => t + m.valor, 0);
      const media = comDados.reduce((t, m) => t + (m.porSub[s] ?? 0), 0) / n;
      return {
        sub: s,
        nome: SUBS[s].nome,
        cor: SUBS[s].cor,
        total: r2(total),
        vezes: doPeriodo.length,
        mediaMes: r2(media),
        // 12 meses para o gráfico pequeno do card
        serie: meses.map((m) => ({ mes: m.mes, valor: r2(m.porSub[s] ?? 0) })),
      };
    })
    .filter((s) => s.total > 0 || s.mediaMes > 0)
    .sort((a, b) => b.total - a.total);
  const totalSel = r2(sel.reduce((t, m) => t + m.valor, 0));

  const agrupar = (lista: typeof sel) => {
    const g = new Map<
      string,
      {
        nome: string;
        documento: string | null;
        sub: Sub;
        vezes: number;
        total: number;
        ultima: string;
      }
    >();
    for (const m of lista) {
      const k = chaveNome(m.contraparte);
      const x = g.get(k) ?? {
        nome: m.contraparte,
        documento: m.documento,
        sub: m.sub,
        vezes: 0,
        total: 0,
        ultima: m.data,
      };
      x.vezes++;
      x.total += m.valor;
      if (m.data > x.ultima) x.ultima = m.data;
      g.set(k, x);
    }
    return [...g.values()]
      .map((x) => ({ ...x, total: r2(x.total) }))
      .sort((a, b) => b.total - a.total);
  };
  // Aparece em 3 meses ou mais: conta fixa, assinatura, mercado de sempre
  const porNomeMeses = new Map<string, Set<string>>();
  for (const m of movs) {
    const k = chaveNome(m.contraparte);
    if (!porNomeMeses.has(k)) porNomeMeses.set(k, new Set());
    porNomeMeses.get(k)!.add(m.data.slice(0, 7));
  }
  const recorrentes = agrupar(movs)
    .filter((x) => (porNomeMeses.get(chaveNome(x.nome))?.size ?? 0) >= 3)
    .map((x) => {
      const nm = porNomeMeses.get(chaveNome(x.nome))!.size;
      return { ...x, meses: nm, porMes: r2(x.total / nm) };
    })
    .sort((a, b) => b.porMes - a.porMes)
    .slice(0, 12);

  return {
    ano,
    mes: mes ?? null,
    total: totalSel,
    mediaMes: r2(comDados.reduce((t, m) => t + m.total, 0) / n),
    porDia: r2(totalSel / (mes ? diasNoMes(mes) : nMeses * 30.4)),
    entrouParaVoce: r2(
      (mes ? meses.filter((m) => m.mes === mes) : meses).reduce((t, m) => t + m.entrouParaVoce, 0),
    ),
    meses: meses.map((m) => ({
      mes: m.mes,
      importado: m.importado,
      futuro: m.futuro,
      total: r2(m.total),
      entrouParaVoce: r2(m.entrouParaVoce),
    })),
    subs,
    pessoas: agrupar(sel.filter((m) => m.sub === "PESSOAS" || m.sub === "FAMILIA")).slice(0, 20),
    lugares: agrupar(sel.filter((m) => m.sub !== "PESSOAS" && m.sub !== "FAMILIA")).slice(0, 20),
    recorrentes,
    maiores: [...sel].sort((a, b) => b.valor - a.valor).slice(0, 8),
    movimentos: sel,
  };
}
// Pessoal → «Buscar pessoa»: tudo o que foi e veio de quem tem o nome buscado (qualquer
// categoria), no ano. `nome` (chave exata) fecha numa pessoa só quando a busca acha várias.
export async function buscarPessoa(ano: number, busca: string, nome?: string | null) {
  await garantirTabelasExtrato();
  const termo = chaveNome(busca);
  if (termo.length < 2) return null;
  const todos = await prisma.extrato_movimentos.findMany({
    where: { data: { gte: `${ano}-01-01`, lte: `${ano}-12-31` } },
    orderBy: [{ data: "asc" }, { id: "asc" }],
    select: {
      id: true,
      data: true,
      valor: true,
      tipo: true,
      contraparte: true,
      documento: true,
      categoria: true,
      nota: true,
    },
  });
  const achados = todos.filter((m) => chaveNome(m.contraparte).includes(termo));
  // Nomes encontrados (a mesma pessoa aparece com o mesmo nome no extrato)
  const g = new Map<
    string,
    {
      chave: string;
      nome: string;
      documento: string | null;
      enviado: number;
      recebido: number;
      vezes: number;
    }
  >();
  for (const m of achados) {
    const k = chaveNome(m.contraparte);
    const x = g.get(k) ?? {
      chave: k,
      nome: m.contraparte,
      documento: m.documento,
      enviado: 0,
      recebido: 0,
      vezes: 0,
    };
    if (m.valor < 0) x.enviado -= m.valor;
    else x.recebido += m.valor;
    x.vezes++;
    g.set(k, x);
  }
  const nomes = [...g.values()]
    .map((x) => ({ ...x, enviado: r2(x.enviado), recebido: r2(x.recebido) }))
    .sort((a, b) => b.enviado + b.recebido - (a.enviado + a.recebido));
  const sel = nome ? achados.filter((m) => chaveNome(m.contraparte) === nome) : achados;
  const meses = Array.from({ length: 12 }, (_, i) => ({
    mes: `${ano}-${String(i + 1).padStart(2, "0")}`,
    enviado: 0,
    recebido: 0,
  }));
  for (const m of sel) {
    const b = meses[Number(m.data.slice(5, 7)) - 1];
    if (m.valor < 0) b.enviado -= m.valor;
    else b.recebido += m.valor;
  }
  const enviado = r2(meses.reduce((t, m) => t + m.enviado, 0));
  const recebido = r2(meses.reduce((t, m) => t + m.recebido, 0));
  return {
    nomes: nomes.slice(0, 30),
    nome: nome ?? null,
    enviado,
    recebido,
    saldo: r2(recebido - enviado),
    vezesEnviado: sel.filter((m) => m.valor < 0).length,
    vezesRecebido: sel.filter((m) => m.valor >= 0).length,
    meses: meses.map((m) => ({ ...m, enviado: r2(m.enviado), recebido: r2(m.recebido) })),
    movimentos: sel
      .slice()
      .reverse()
      .slice(0, 500)
      .map((m) => ({
        ...m,
        categoriaNome: CATEGORIAS[m.categoria as Categoria]?.nome ?? m.categoria,
      })),
    totalMovimentos: sel.length,
  };
}

const diasNoMes = (mes: string) =>
  new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate();

export async function classificarSub(d: { id: number; sub: string; lembrar?: boolean }) {
  await garantirTabelasExtrato();
  const m = await prisma.extrato_movimentos.findUnique({ where: { id: Number(d.id) } });
  if (!m) throw new Error("Movimento não encontrado");
  if (!ehSub(d.sub)) throw new Error("Tipo de gasto inválido");
  if (m.categoria !== "PESSOAL") throw new Error("Só gasto pessoal tem tipo de gasto");
  await prisma.extrato_movimentos.update({
    where: { id: m.id },
    data: { subcategoria: d.sub },
  });
  if (d.lembrar) {
    const chave = chaveNome(m.contraparte);
    await prisma.extrato_regras.upsert({
      where: { chave_sentido: { chave, sentido: "P" } },
      create: { chave, sentido: "P", categoria: d.sub },
      update: { categoria: d.sub },
    });
  }
  return { ok: true };
}

// ---------- Tarefas do dono (configuracoes, chave fisc_tarefas) ----------
export type Tarefa = {
  id: string;
  titulo: string;
  detalhe: string;
  prazo: string | null; // AAAA-MM-DD
  feito: boolean;
};
const CHAVE_TAREFAS = "fisc_tarefas";
function tarefasPadrao(): Tarefa[] {
  const ano = Number(hojeBR().slice(0, 4));
  return [
    {
      id: "conta-pj",
      titulo: "Abrir a conta do CNPJ (conta PJ)",
      detalhe: "As vendas caem nela; a conta pessoal fica para família, aluguel e mercado.",
      prazo: null,
      feito: false,
    },
    {
      id: "sala-empreendedor",
      titulo: "Ir à Sala do Empreendedor (grátis)",
      detalhe:
        "Pedir a inscrição estadual (para emitir nota), confirmar se o CNAE cobre peças e conserto de trator e tirar as dúvidas do imposto de renda.",
      prazo: null,
      feito: false,
    },
    {
      id: "extrato-mensal",
      titulo: "Importar o extrato do banco todo mês",
      detalhe: "Até o dia 10, o PDF do mês anterior. Classifique o que ficar «a classificar».",
      prazo: null,
      feito: false,
    },
    {
      id: "dasn",
      titulo: `Declaração anual do MEI (DASN-SIMEI) de ${ano}`,
      detalhe: "Abre em janeiro. O valor está no card «Limite do MEI» deste painel.",
      prazo: `${ano + 1}-05-31`,
      feito: false,
    },
    {
      id: "irpf",
      titulo: `Imposto de renda pessoa física (ano ${ano})`,
      detalhe:
        "Em abril, com a declaração pré-preenchida do gov.br. Os valores estão em «Para o imposto de renda», mais abaixo.",
      prazo: `${ano + 1}-05-29`,
      feito: false,
    },
  ];
}
export async function lerTarefas(): Promise<Tarefa[]> {
  const r = await prisma.configuracoes.findUnique({ where: { chave: CHAVE_TAREFAS } });
  if (!r?.valor) return tarefasPadrao();
  try {
    const t = JSON.parse(r.valor);
    return Array.isArray(t) ? t : tarefasPadrao();
  } catch {
    return tarefasPadrao();
  }
}
export async function salvarTarefas(lista: Tarefa[]) {
  const limpa = (Array.isArray(lista) ? lista : []).slice(0, 60).map((t, i) => ({
    id: String(t.id || `t${Date.now()}-${i}`).slice(0, 40),
    titulo: String(t.titulo ?? "")
      .trim()
      .slice(0, 160),
    detalhe: String(t.detalhe ?? "")
      .trim()
      .slice(0, 1000),
    prazo: /^\d{4}-\d{2}-\d{2}$/.test(String(t.prazo ?? "")) ? String(t.prazo) : null,
    feito: !!t.feito,
  }));
  if (limpa.some((t) => !t.titulo)) throw new Error("Toda tarefa precisa de um título.");
  const valor = JSON.stringify(limpa);
  await prisma.configuracoes.upsert({
    where: { chave: CHAVE_TAREFAS },
    create: { chave: CHAVE_TAREFAS, valor },
    update: { valor },
  });
  return limpa;
}
