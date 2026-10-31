// Admin → Fiscal: o MEI do Brasil num painel só.
// - Limite do MEI (proporcional no ano de abertura), DAS do mês, livro caixa e imposto de renda.
// - Nota fiscal (NF-e) automática pela Focus NFe: venda do Brasil salva com os dados completos →
//   nota emitida, PDF por e-mail ao cliente. Também dá para emitir e cancelar à mão.
// Só as vendas do Brasil (pais = BR) passam pelo CNPJ. Valores em R$.
import crypto from "node:crypto";
import { prisma } from "./prisma";
import * as focus from "./fiscal-focus.server";
import {
  DAS_MEI,
  type AtividadeMei,
  DIA_VENCE_DAS,
  NCM_PADRAO,
  NCM_SUGERIDO,
  PRESUNCAO_COMERCIO,
  TOLERANCIA_MEI,
  cnpjValido,
  limiteMei,
  siglaUf,
  soNumeros,
  tipoDoc,
  type StatusNota,
} from "./fiscal-comum";

const r2 = (v: number) => Math.round(v * 100) / 100;
const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mesBR = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
const hojeBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// ---------- Tabela (produção não roda "prisma db push") ----------
const SQL_NOTAS = `CREATE TABLE IF NOT EXISTS \`notas_fiscais\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`venda_id\` INTEGER NOT NULL,
  \`ref\` VARCHAR(60) NOT NULL,
  \`ambiente\` VARCHAR(12) NOT NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'PROCESSANDO',
  \`numero\` VARCHAR(20) NULL,
  \`serie\` VARCHAR(5) NULL,
  \`chave\` VARCHAR(44) NULL,
  \`valor\` DOUBLE NOT NULL DEFAULT 0,
  \`destinatario\` VARCHAR(160) NULL,
  \`danfe\` VARCHAR(400) NULL,
  \`xml\` VARCHAR(400) NULL,
  \`mensagem\` TEXT NULL,
  \`automatica\` BOOLEAN NOT NULL DEFAULT false,
  \`email_enviado\` BOOLEAN NOT NULL DEFAULT false,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`notas_fiscais_ref_key\`(\`ref\`),
  INDEX \`notas_fiscais_venda_id_idx\`(\`venda_id\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
let tabelas: Promise<void> | null = null;
export function garantirTabelasFiscal() {
  tabelas ??= (async () => {
    const { garantirTabelasAvaliacoes } = await import("./avaliacoes.server");
    await garantirTabelasAvaliacoes(); // vendas (com número e bairro) e despesas
    await prisma.$executeRawUnsafe(SQL_NOTAS);
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

// ---------- Configuração (tabela configuracoes, chaves fisc_*) ----------
export type ConfigFiscal = {
  cnpj: string;
  razao: string;
  abertura: string; // AAAA-MM-DD
  atividade: AtividadeMei; // define o valor do DAS
  ie: string;
  ambiente: focus.Ambiente;
  token: string; // segredo: nunca volta inteiro para o navegador
  auto: boolean; // emitir sozinho ao salvar a venda
  emailCliente: boolean; // mandar o PDF da nota ao e-mail do cliente
  ncmPadrao: string;
  ncmCategorias: Record<string, string>;
};
// MEI da AGRO PARTS (cartão CNPJ, consulta pública de 31/10/2026). Valem enquanto o painel não
// tiver outros salvos em Configurar.
const MEI_PADRAO = {
  cnpj: "68420003000118",
  razao: "68.420.003 JACKSON RODRIGUES SOARES",
  abertura: "2026-08-06",
  // Atividade principal: peças novas (comércio); secundária: manutenção mecânica (serviço)
  atividade: "comercio_servicos" as AtividadeMei,
};
const CHAVES = [
  "fisc_cnpj",
  "fisc_razao",
  "fisc_abertura",
  "fisc_atividade",
  "fisc_ie",
  "fisc_ambiente",
  "fisc_token",
  "fisc_auto",
  "fisc_email_cliente",
  "fisc_ncm_padrao",
  "fisc_ncm_categorias",
];

export async function lerConfig(): Promise<ConfigFiscal> {
  const rows = await prisma.configuracoes.findMany({ where: { chave: { in: CHAVES } } });
  const c = Object.fromEntries(rows.map((r) => [r.chave, r.valor])) as Record<string, string>;
  let cats: Record<string, string> = {};
  try {
    cats = JSON.parse(c.fisc_ncm_categorias || "{}");
  } catch {
    /* fica com as sugestões */
  }
  return {
    cnpj: soNumeros(c.fisc_cnpj ?? MEI_PADRAO.cnpj),
    razao: c.fisc_razao ?? MEI_PADRAO.razao,
    abertura: c.fisc_abertura ?? MEI_PADRAO.abertura,
    atividade:
      (c.fisc_atividade as AtividadeMei) in DAS_MEI
        ? (c.fisc_atividade as AtividadeMei)
        : MEI_PADRAO.atividade,
    ie: soNumeros(c.fisc_ie),
    ambiente: c.fisc_ambiente === "producao" ? "producao" : "homologacao",
    // Variável de ambiente tem prioridade (para quem prefere guardar fora do banco)
    token: (process.env.FOCUS_NFE_TOKEN || c.fisc_token || "").trim(),
    auto: c.fisc_auto !== "0",
    emailCliente: c.fisc_email_cliente !== "0",
    ncmPadrao: soNumeros(c.fisc_ncm_padrao) || NCM_PADRAO,
    ncmCategorias: { ...NCM_SUGERIDO, ...cats },
  };
}

export async function configPublica() {
  const c = await lerConfig();
  return {
    ...c,
    token: "",
    temToken: !!c.token,
    tokenFinal: c.token ? c.token.slice(-4) : "",
    tokenDoAmbiente: !!process.env.FOCUS_NFE_TOKEN,
  };
}

export type DadosConfig = Partial<Omit<ConfigFiscal, "token">> & {
  token?: string;
  apagarToken?: boolean;
};
export async function salvarConfig(d: DadosConfig) {
  const grava: Record<string, string | null> = {};
  if (d.cnpj !== undefined) {
    const n = soNumeros(d.cnpj);
    if (n && !cnpjValido(n)) throw new Error("CNPJ inválido: confira os números.");
    grava.fisc_cnpj = n || null;
  }
  if (d.razao !== undefined) grava.fisc_razao = String(d.razao).trim().slice(0, 120) || null;
  if (d.abertura !== undefined) {
    const a = String(d.abertura).trim();
    if (a && !/^\d{4}-\d{2}-\d{2}$/.test(a)) throw new Error("Data de abertura inválida.");
    grava.fisc_abertura = a || null;
  }
  if (d.atividade !== undefined)
    grava.fisc_atividade = d.atividade in DAS_MEI ? d.atividade : "comercio";
  if (d.ie !== undefined) grava.fisc_ie = soNumeros(d.ie) || null;
  if (d.ambiente !== undefined)
    grava.fisc_ambiente = d.ambiente === "producao" ? "producao" : "homologacao";
  if (d.auto !== undefined) grava.fisc_auto = d.auto ? "1" : "0";
  if (d.emailCliente !== undefined) grava.fisc_email_cliente = d.emailCliente ? "1" : "0";
  if (d.ncmPadrao !== undefined) {
    const n = soNumeros(d.ncmPadrao);
    if (n && n.length !== 8) throw new Error("NCM tem 8 números.");
    grava.fisc_ncm_padrao = n || null;
  }
  if (d.ncmCategorias !== undefined) {
    const limpo: Record<string, string> = {};
    for (const [k, v] of Object.entries(d.ncmCategorias ?? {})) {
      const n = soNumeros(v);
      if (!n) continue;
      if (n.length !== 8) throw new Error(`NCM de «${k}» precisa ter 8 números.`);
      limpo[k.slice(0, 80)] = n;
    }
    grava.fisc_ncm_categorias = JSON.stringify(limpo);
  }
  if (d.apagarToken) grava.fisc_token = null;
  else if (d.token?.trim()) grava.fisc_token = d.token.trim().slice(0, 200);
  for (const [chave, valor] of Object.entries(grava)) {
    if (valor)
      await prisma.configuracoes.upsert({
        where: { chave },
        create: { chave, valor },
        update: { valor },
      });
    else await prisma.configuracoes.deleteMany({ where: { chave } });
  }
  return configPublica();
}

// ---------- DAS (guia mensal do MEI) ----------
// Competência AAAA-MM vence no dia 20 do mês seguinte
export function venceDas(competencia: string) {
  const [a, m] = competencia.split("-").map(Number);
  const d = new Date(Date.UTC(a, m, DIA_VENCE_DAS));
  return d.toISOString().slice(0, 10);
}
export async function marcarDas(competencia: string, pago: boolean) {
  if (!/^\d{4}-\d{2}$/.test(competencia)) throw new Error("Mês inválido.");
  const chave = `fisc_das_${competencia}`;
  if (pago)
    await prisma.configuracoes.upsert({
      where: { chave },
      create: { chave, valor: hojeBR() },
      update: { valor: hojeBR() },
    });
  else await prisma.configuracoes.deleteMany({ where: { chave } });
}

// ---------- Nota fiscal ----------
type Venda = NonNullable<Awaited<ReturnType<typeof prisma.vendas.findUnique>>>;
type ItemVenda = { sku: string; codigo: string; nome: string; qtd: number; valor: number };

// O que falta para a nota sair (vazio = pronta)
export function faltaParaNota(v: Venda, cfg?: ConfigFiscal) {
  const f: string[] = [];
  if (cfg) {
    if (!cfg.cnpj) f.push("CNPJ do MEI (Configurar)");
    if (!cfg.token) f.push("conexão com o emissor (Configurar)");
  }
  if (v.pais !== "BR") f.push("venda do Uruguai não leva nota brasileira");
  if (v.status === "CANCELADA") f.push("venda cancelada");
  if (v.moeda !== "BRL") f.push("valor em reais (a venda está em pesos)");
  if (!tipoDoc(v.cliente_doc)) f.push("CPF ou CNPJ do cliente");
  if (!v.endereco?.trim()) f.push("rua do cliente");
  if (!v.end_numero?.trim()) f.push("número (ou S/N)");
  if (!v.end_bairro?.trim()) f.push("bairro");
  if (!v.cidade?.trim()) f.push("cidade");
  if (!siglaUf(v.departamento)) f.push("estado (UF)");
  if (soNumeros(v.cep).length !== 8) f.push("CEP");
  const itens = JSON.parse(v.itens || "[]") as ItemVenda[];
  if (!itens.length || itens.some((i) => !(i.valor > 0))) f.push("valor de todas as peças");
  return f;
}

// Data e hora no fuso de Brasília, como a SEFAZ espera (2026-10-31T14:05:00-03:00)
const agoraBR = () => {
  const d = new Date(Date.now() - 3 * 3600_000);
  return d.toISOString().slice(0, 19) + "-03:00";
};
const PAGAMENTO: Record<string, string> = {
  DINHEIRO: "01",
  CARTAO: "03",
  STRIPE: "03",
  PIX: "17",
  TRANSFERENCIA: "18",
};
// Como a compra foi feita: 1 presencial, 2 internet, 3 telefone/WhatsApp, 9 outro
const PRESENCA: Record<string, number> = {
  BALCAO: 1,
  SITE: 2,
  LINK: 2,
  MERCADOLIVRE: 2,
  WHATSAPP: 3,
  TELEFONE: 3,
};

// Dados da NF-e no formato da Focus (MEI: CRT 4, CSOSN 102, CFOP 5102 no RS e 6102 fora)
export async function montarNota(v: Venda, cfg: ConfigFiscal) {
  const itens = JSON.parse(v.itens || "[]") as ItemVenda[];
  const pecas = await prisma.agricolas.findMany({
    where: { sku: { in: itens.map((i) => i.sku) } },
    select: { sku: true, ncm: true, categoria: true },
  });
  const ncmDe = (sku: string) => {
    const p = pecas.find((x) => x.sku === sku);
    const proprio = soNumeros(p?.ncm);
    if (proprio.length === 8) return proprio;
    return (p?.categoria && cfg.ncmCategorias[p.categoria]) || cfg.ncmPadrao;
  };
  const uf = siglaUf(v.departamento)!;
  const dentro = uf === "RS";
  const doc = soNumeros(v.cliente_doc);
  const brutos = itens.map((i) => r2(i.qtd * i.valor));
  const produtos = r2(brutos.reduce((s, x) => s + x, 0));
  // Frete e desconto da venda divididos entre as peças (o resto do arredondamento na última)
  const ratear = (total: number) => {
    const partes = brutos.map((b) => (produtos ? r2((total * b) / produtos) : 0));
    const dif = r2(total - partes.reduce((s, x) => s + x, 0));
    if (partes.length) partes[partes.length - 1] = r2(partes[partes.length - 1] + dif);
    return partes;
  };
  const frete = r2(v.frete_cobrado || 0);
  const desconto = r2(v.desconto || 0);
  const fretes = ratear(frete);
  const descontos = ratear(desconto);
  const total = r2(produtos + frete - desconto);
  const pagamento = PAGAMENTO[v.metodo ?? ""] ?? "99";
  return {
    natureza_operacao: "Venda de mercadoria",
    data_emissao: agoraBR(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    local_destino: dentro ? 1 : 2,
    consumidor_final: 1,
    presenca_comprador: PRESENCA[v.canal ?? ""] ?? 9,
    cnpj_emitente: cfg.cnpj,
    nome_destinatario: v.cliente_nome.slice(0, 60),
    ...(doc.length === 14 ? { cnpj_destinatario: doc } : { cpf_destinatario: doc }),
    indicador_inscricao_estadual_destinatario: 9, // não contribuinte
    ...(v.cliente_telefone && { telefone_destinatario: soNumeros(v.cliente_telefone).slice(-11) }),
    ...(v.cliente_email && { email_destinatario: v.cliente_email }),
    logradouro_destinatario: v.endereco!.trim().slice(0, 60),
    numero_destinatario: v.end_numero!.trim().slice(0, 60),
    bairro_destinatario: v.end_bairro!.trim().slice(0, 60),
    municipio_destinatario: v.cidade!.trim(),
    uf_destinatario: uf,
    cep_destinatario: soNumeros(v.cep),
    pais_destinatario: "Brasil",
    modalidade_frete: frete > 0 ? 0 : v.transportadora ? 1 : 9,
    valor_produtos: produtos,
    valor_frete: frete,
    valor_desconto: desconto,
    valor_total: total,
    items: itens.map((i, n) => ({
      numero_item: n + 1,
      codigo_produto: (i.codigo || i.sku).slice(0, 60),
      descricao: i.nome.slice(0, 120),
      cfop: dentro ? "5102" : "6102",
      codigo_ncm: ncmDe(i.sku),
      unidade_comercial: "UN",
      quantidade_comercial: i.qtd,
      valor_unitario_comercial: i.valor,
      unidade_tributavel: "UN",
      quantidade_tributavel: i.qtd,
      valor_unitario_tributavel: i.valor,
      valor_bruto: brutos[n],
      ...(fretes[n] && { valor_frete: fretes[n] }),
      ...(descontos[n] && { valor_desconto: descontos[n] }),
      inclui_no_total: 1,
      icms_origem: 0,
      icms_situacao_tributaria: "102",
      pis_situacao_tributaria: "07",
      cofins_situacao_tributaria: "07",
    })),
    formas_pagamento: [
      {
        forma_pagamento: pagamento,
        valor_pagamento: total,
        ...(pagamento === "99" && { descricao_pagamento: "Outros" }),
      },
    ],
    informacoes_adicionais_contribuinte:
      `Documento emitido por Microempreendedor Individual (MEI) optante pelo SIMEI. ` +
      `Pedido AGRO PARTS ${v.codigo}.`,
  };
}

const STATUS_FOCUS: Record<string, StatusNota> = {
  processando_autorizacao: "PROCESSANDO",
  autorizado: "AUTORIZADA",
  cancelado: "CANCELADA",
  erro_autorizacao: "ERRO",
  denegado: "ERRO",
};

type Nota = NonNullable<Awaited<ReturnType<typeof prisma.notas_fiscais.findFirst>>>;

// Lê a situação na Focus e guarda; nota autorizada vai por e-mail ao cliente (uma vez)
async function atualizarNota(n: Nota, cfg: ConfigFiscal) {
  const amb = n.ambiente as focus.Ambiente;
  const { http, dados } = await focus.consultarNfe(amb, cfg.token, n.ref);
  const status = STATUS_FOCUS[dados.status ?? ""];
  if (!status) {
    if (http >= 400 && http !== 404)
      await prisma.notas_fiscais.update({
        where: { id: n.id },
        data: { mensagem: focus.textoErro(dados, http) },
      });
    return n;
  }
  const base = focus.baseFocus(amb);
  let atual = await prisma.notas_fiscais.update({
    where: { id: n.id },
    data: {
      status,
      numero: dados.numero ?? n.numero,
      serie: dados.serie ?? n.serie,
      chave: dados.chave_nfe?.replace(/^NFe/, "") ?? n.chave,
      danfe: dados.caminho_danfe ? base + dados.caminho_danfe : n.danfe,
      xml: dados.caminho_xml_nota_fiscal ? base + dados.caminho_xml_nota_fiscal : n.xml,
      mensagem: status === "ERRO" ? focus.textoErro(dados, http) : null,
      updated_at: new Date(),
    },
  });
  if (status === "AUTORIZADA" && cfg.emailCliente && !atual.email_enviado) {
    const v = await prisma.vendas.findUnique({ where: { id: n.venda_id } });
    if (v?.cliente_email) {
      const r = await focus.emailNfe(amb, cfg.token, n.ref, [v.cliente_email]).catch(() => null);
      if (r && r.http < 300)
        atual = await prisma.notas_fiscais.update({
          where: { id: n.id },
          data: { email_enviado: true },
        });
    }
  }
  return atual;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Emite a nota de uma venda. Nota já emitida ou em andamento: devolve a que existe.
export async function emitirNota(vendaId: number, opcoes: { automatica?: boolean } = {}) {
  await garantirTabelasFiscal();
  const cfg = await lerConfig();
  const v = await prisma.vendas.findUnique({ where: { id: vendaId } });
  if (!v) throw new Error("Venda não encontrada.");
  const ativa = await prisma.notas_fiscais.findFirst({
    where: { venda_id: v.id, status: { in: ["PROCESSANDO", "AUTORIZADA"] } },
    orderBy: { id: "desc" },
  });
  if (ativa) return ativa;
  const falta = faltaParaNota(v, cfg);
  if (falta.length) throw new Error(`Falta para a nota: ${falta.join(", ")}.`);

  const nota = await montarNota(v, cfg);
  // Referência única por tentativa (a Focus não aceita repetir a de uma nota recusada)
  const tentativas = await prisma.notas_fiscais.count({ where: { venda_id: v.id } });
  const ref = `agp-${v.codigo}-${tentativas + 1}-${crypto.randomBytes(2).toString("hex")}`;
  let n = await prisma.notas_fiscais.create({
    data: {
      venda_id: v.id,
      ref,
      ambiente: cfg.ambiente,
      status: "PROCESSANDO",
      valor: nota.valor_total,
      destinatario: v.cliente_nome.slice(0, 160),
      automatica: !!opcoes.automatica,
    },
  });
  const { http, dados } = await focus
    .enviarNfe(cfg.ambiente, cfg.token, ref, nota)
    .catch((e) => ({ http: 0, dados: { mensagem: `Emissor fora do ar: ${e.message}` } }) as const);
  if (http < 200 || http >= 300) {
    return prisma.notas_fiscais.update({
      where: { id: n.id },
      data: { status: "ERRO", mensagem: focus.textoErro(dados, http), updated_at: new Date() },
    });
  }
  // A SEFAZ costuma responder em poucos segundos
  for (const ms of [1500, 2500, 4000]) {
    await espera(Number(process.env.FISCAL_ESPERA_MS ?? ms));
    n = await atualizarNota(n, cfg);
    if (n.status !== "PROCESSANDO") break;
  }
  return n;
}

export async function cancelarNota(id: number, justificativa: string) {
  await garantirTabelasFiscal();
  const cfg = await lerConfig();
  const j = justificativa.trim();
  if (j.length < 15) throw new Error("Explique o motivo com pelo menos 15 letras.");
  const n = await prisma.notas_fiscais.findUnique({ where: { id } });
  if (!n || n.status !== "AUTORIZADA") throw new Error("Só dá para cancelar nota emitida.");
  const { http, dados } = await focus.cancelarNfe(
    n.ambiente as focus.Ambiente,
    cfg.token,
    n.ref,
    j.slice(0, 255),
  );
  if (dados.status === "cancelado")
    return prisma.notas_fiscais.update({
      where: { id },
      data: { status: "CANCELADA", mensagem: `Cancelada: ${j}`, updated_at: new Date() },
    });
  throw new Error(focus.textoErro(dados, http));
}

// Notas que ficaram «enviando» (a SEFAZ demorou): consulta de novo
export async function sincronizarPendentes() {
  await garantirTabelasFiscal();
  const cfg = await lerConfig();
  if (!cfg.token) return;
  const pend = await prisma.notas_fiscais.findMany({
    where: { status: "PROCESSANDO" },
    take: 20,
  });
  for (const n of pend) await atualizarNota(n, cfg).catch(() => null);
}

// Chamado depois de salvar uma venda (à mão ou link pago): com a emissão automática ligada e os
// dados completos, emite. Erro aqui nunca impede a venda de salvar.
export async function aoSalvarVenda(vendaId: number) {
  try {
    await garantirTabelasFiscal();
    const cfg = await lerConfig();
    if (!cfg.auto || !cfg.token || !cfg.cnpj) return;
    const v = await prisma.vendas.findUnique({ where: { id: vendaId } });
    if (!v || faltaParaNota(v, cfg).length) return;
    await emitirNota(vendaId, { automatica: true });
  } catch (e) {
    console.error("nota fiscal automática:", e);
  }
}

// ---------- Painel ----------
export async function painel(anoPedido?: number) {
  await garantirTabelasFiscal();
  await sincronizarPendentes().catch(() => null);
  const cfg = await lerConfig();
  const hoje = hojeBR();
  const ano = anoPedido || Number(hoje.slice(0, 4));
  const mesHoje = hoje.slice(0, 7);
  const { cotacoes, valeNoMes } = await import("./financeiro.server");
  const c = await cotacoes();

  const [vendas, despesas, notas, das] = await Promise.all([
    prisma.vendas.findMany({
      where: {
        pais: "BR",
        created_at: {
          gte: new Date(`${ano}-01-01T00:00:00-03:00`),
          lt: new Date(`${ano + 1}-01-01T00:00:00-03:00`),
        },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.despesas.findMany({ where: { moeda: "BRL" } }),
    prisma.notas_fiscais.findMany({ orderBy: { id: "desc" } }),
    prisma.configuracoes.findMany({ where: { chave: { startsWith: "fisc_das_" } } }),
  ]);
  const notaDaVenda = new Map<number, (typeof notas)[number]>();
  for (const n of notas) if (!notaDaVenda.has(n.venda_id)) notaDaVenda.set(n.venda_id, n);

  // Mês a mês: receita bruta (o que conta no limite), custos, despesas e lucro
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const pm = new Map(
    meses.map((m) => [
      m,
      { receita: 0, comNota: 0, semNota: 0, custos: 0, despesas: 0, vendas: 0, notas: 0 },
    ]),
  );
  let semCusto = 0;
  // Vendas de antes da abertura do CNPJ não são do MEI
  const desde = cfg.abertura ? new Date(`${cfg.abertura}T00:00:00-03:00`) : null;
  for (const v of vendas) {
    if (v.status === "CANCELADA") continue;
    if (desde && v.created_at < desde) continue;
    const b = pm.get(mesBR(v.created_at));
    if (!b) continue;
    const cot = v.cotacao_brl ?? c.real;
    const brl = (x: number) => (v.moeda === "BRL" ? x : cot ? x / cot : 0);
    const itens = JSON.parse(v.itens || "[]") as Array<ItemVenda & { custo?: number | null }>;
    const receita = brl(v.total + v.frete_cobrado - v.desconto);
    const custo = brl(
      itens.reduce((s, i) => s + i.qtd * (i.custo ?? 0), 0) +
        (v.taxa_pagamento ?? 0) +
        (v.frete_custo ?? 0),
    );
    if (itens.some((i) => i.custo == null)) semCusto++;
    const n = notaDaVenda.get(v.id);
    b.vendas++;
    b.receita += receita;
    b.custos += custo;
    if (n?.status === "AUTORIZADA") {
      b.comNota += receita;
      b.notas++;
    } else b.semNota += receita;
  }
  for (const m of meses)
    for (const d of despesas) if (valeNoMes(d, m)) pm.get(m)!.despesas += d.valor;

  const serie = meses.map((m) => {
    const b = pm.get(m)!;
    return {
      mes: m,
      receita: r2(b.receita),
      comNota: r2(b.comNota),
      semNota: r2(b.semNota),
      custos: r2(b.custos),
      despesas: m <= mesHoje ? r2(b.despesas) : 0,
      lucro: r2(b.receita - b.custos - (m <= mesHoje ? b.despesas : 0)),
      vendas: b.vendas,
      notas: b.notas,
    };
  });

  // Limite do MEI
  const limite = limiteMei(ano, cfg.abertura || null);
  const usado = r2(serie.reduce((s, x) => s + x.receita, 0));
  const inicio =
    cfg.abertura && cfg.abertura.slice(0, 4) === String(ano)
      ? cfg.abertura.slice(0, 7)
      : `${ano}-01`;
  const mesesAtivos = meses.filter((m) => m >= inicio && m <= mesHoje).length || 1;
  const restantes = meses.filter((m) => m > mesHoje && m >= inicio).length;
  const mediaMes = usado / mesesAtivos;
  const previsao = r2(usado + mediaMes * restantes);
  let estouraEm: string | null = null;
  if (limite && mediaMes > 0) {
    let acum = usado;
    for (const m of meses.filter((x) => x > mesHoje)) {
      acum += mediaMes;
      if (acum > limite) {
        estouraEm = m;
        break;
      }
    }
  }
  const pct = limite ? r2((usado / limite) * 100) : 0;
  const nivel =
    !limite || pct < 70
      ? "ok"
      : pct < 90
        ? "atencao"
        : pct <= 100
          ? "alerta"
          : pct <= 100 + TOLERANCIA_MEI * 100
            ? "passou"
            : "grave";

  // DAS: competências do ano desde a abertura até o mês atual
  const pagos = new Map(das.map((d) => [d.chave.replace("fisc_das_", ""), d.valor]));
  const valorDas = DAS_MEI[cfg.atividade];
  const guias = meses
    .filter((m) => m >= inicio && m <= mesHoje)
    .map((m) => {
      const vence = venceDas(m);
      const pagoEm = pagos.get(m) ?? null;
      return {
        competencia: m,
        vence,
        valor: valorDas,
        pagoEm,
        atrasado: !pagoEm && vence < hoje,
      };
    });
  const proximoDas = guias.find((g) => !g.pagoEm) ?? null;

  // Livro caixa e imposto de renda do dono
  const receitaAno = usado;
  const lucroAno = r2(serie.filter((s) => s.mes <= mesHoje).reduce((s, x) => s + x.lucro, 0));
  const isentoPresumido = r2(receitaAno * PRESUNCAO_COMERCIO);
  const isentoLivroCaixa = r2(Math.max(lucroAno, isentoPresumido));

  // Vendas do Brasil com a situação da nota
  const lista = vendas
    .filter((v) => !desde || v.created_at >= desde)
    .slice(0, 80)
    .map((v) => {
      const n = notaDaVenda.get(v.id);
      return {
        id: v.id,
        codigo: v.codigo,
        data: v.created_at.toISOString(),
        cliente: v.cliente_nome,
        cidade: v.cidade,
        uf: siglaUf(v.departamento),
        doc: tipoDoc(v.cliente_doc),
        total: r2(v.total + v.frete_cobrado - v.desconto),
        moeda: v.moeda,
        status: v.status,
        falta: faltaParaNota(v),
        nota: n
          ? {
              id: n.id,
              status: n.status as StatusNota,
              numero: n.numero,
              serie: n.serie,
              chave: n.chave,
              danfe: n.danfe,
              xml: n.xml,
              mensagem: n.mensagem,
              ambiente: n.ambiente,
              automatica: n.automatica,
              emailEnviado: n.email_enviado,
              data: n.created_at.toISOString(),
            }
          : null,
      };
    });

  // «Seu próximo passo»: o que fazer agora, do mais urgente ao menos
  type Passo = { id: string; titulo: string; texto: string; nivel: "urgente" | "fazer" | "ok" };
  const passos: Passo[] = [];
  if (!cfg.cnpj || !cfg.abertura)
    passos.push({
      id: "cnpj",
      nivel: "urgente",
      titulo: "Cadastre o seu MEI",
      texto:
        "Coloque o CNPJ e a data de abertura (estão no cartão CNPJ). Com isso o painel calcula o seu limite do ano.",
    });
  if (!cfg.token)
    passos.push({
      id: "emissor",
      nivel: "fazer",
      titulo: "Conecte o emissor de notas",
      texto:
        "Uma vez só: certificado digital A1, inscrição estadual no RS e conta na Focus NFe. Depois as notas saem sozinhas.",
    });
  for (const g of guias.filter((x) => x.atrasado))
    passos.push({
      id: `das-${g.competencia}`,
      nivel: "urgente",
      titulo: `DAS de ${nomeMes(g.competencia)} atrasado`,
      texto: `Venceu em ${dataBR(g.vence)}. Pague no app MEI ou no PGMEI (gera a guia com juros) e marque como pago aqui.`,
    });
  if (proximoDas && !proximoDas.atrasado)
    passos.push({
      id: "das",
      nivel: "fazer",
      titulo: `Pague o DAS de ${nomeMes(proximoDas.competencia)}`,
      texto: `R$ ${valorDas.toFixed(2).replace(".", ",")} até ${dataBR(proximoDas.vence)}, no app MEI ou no PGMEI.`,
    });
  if (nivel === "grave" || nivel === "passou")
    passos.push({
      id: "limite",
      nivel: "urgente",
      titulo: "Você passou do limite do MEI",
      texto:
        nivel === "grave"
          ? "Passou mais de 20%: procure um contador agora para migrar para microempresa (o desenquadramento é retroativo)."
          : "Passou até 20%: em janeiro vira microempresa e paga um DAS complementar. Fale com um contador ainda este ano.",
    });
  else if (nivel === "alerta" || nivel === "atencao")
    passos.push({
      id: "limite",
      nivel: nivel === "alerta" ? "urgente" : "fazer",
      titulo: `Você já usou ${pct.toFixed(0)}% do limite do MEI`,
      texto: estouraEm
        ? `No ritmo atual, passa do limite em ${nomeMes(estouraEm)}. Hora de conversar com um contador sobre virar microempresa.`
        : "Fique de olho: perto do limite, segure vendas grandes para janeiro ou planeje virar microempresa.",
    });
  else if (estouraEm)
    passos.push({
      id: "limite",
      nivel: "fazer",
      titulo: `No ritmo atual, você passa do limite em ${nomeMes(estouraEm)}`,
      texto: `Você vende em média ${brl(mediaMes)} por mês e o limite de ${ano} é ${brl(limite)}. Acompanhe aqui: perto do fim do ano, deixe vendas grandes para janeiro (o limite renova) ou planeje virar microempresa.`,
    });
  const semDados = lista.filter((v) => !v.nota && v.status !== "CANCELADA" && v.falta.length);
  if (semDados.length)
    passos.push({
      id: "dados",
      nivel: "fazer",
      titulo: `${semDados.length} venda(s) sem os dados da nota`,
      texto: "Complete CPF/CNPJ e endereço do cliente (em Vendas → editar) para a nota sair.",
    });
  const recusadas = lista.filter((v) => v.nota?.status === "ERRO");
  if (recusadas.length)
    passos.push({
      id: "recusadas",
      nivel: "urgente",
      titulo: `${recusadas.length} nota(s) recusada(s)`,
      texto: "Veja o motivo na lista de vendas abaixo, corrija e emita de novo.",
    });
  if (semCusto)
    passos.push({
      id: "custos",
      nivel: "fazer",
      titulo: "Coloque o custo das peças vendidas",
      texto: `${semCusto} venda(s) sem o valor pago pela peça: o lucro (e a parte isenta do imposto de renda) fica errado. Complete em Financeiro → Custos.`,
    });
  passos.push({
    id: "dasn",
    nivel: "ok",
    titulo: `Declaração anual do MEI (DASN-SIMEI) até 31/05/${ano + 1}`,
    texto: `Você vai informar a receita de ${ano}: hoje R$ ${usado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. O painel guarda o número pronto.`,
  });

  return {
    ano,
    hoje,
    config: {
      cnpj: cfg.cnpj,
      razao: cfg.razao,
      abertura: cfg.abertura,
      ambiente: cfg.ambiente,
      temToken: !!cfg.token,
      auto: cfg.auto,
    },
    limite: {
      valor: limite,
      tolerancia: r2(limite * (1 + TOLERANCIA_MEI)),
      usado,
      pct,
      nivel,
      previsao,
      estouraEm,
      mediaMes: r2(mediaMes),
      inicio, // mês em que o limite começa a contar (abertura do MEI ou janeiro)
    },
    das: { valor: valorDas, guias, proximo: proximoDas },
    ir: {
      receitaAno,
      lucroAno,
      isentoPresumido,
      isentoLivroCaixa,
      prazoDasn: `${ano + 1}-05-31`,
    },
    meses: serie,
    vendas: lista,
    notas: {
      emitidas: notas.filter((n) => n.status === "AUTORIZADA").length,
      recusadas: notas.filter((n) => n.status === "ERRO").length,
    },
    passos,
  };
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const nomeMes = (m: string) => MESES[Number(m.slice(5, 7)) - 1] ?? m;
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

// Relatório Mensal de Receitas Brutas (obrigatório guardar todo mês)
export async function relatorioMensal(mes: string) {
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido.");
  const p = await painel(Number(mes.slice(0, 4)));
  const m = p.meses.find((x) => x.mes === mes)!;
  const cfg = await lerConfig();
  return {
    mes,
    nomeMes: `${nomeMes(mes)} de ${mes.slice(0, 4)}`,
    cnpj: cfg.cnpj,
    razao: cfg.razao,
    comNota: m.comNota,
    semNota: m.semNota,
    total: m.receita,
  };
}
