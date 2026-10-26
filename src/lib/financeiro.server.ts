// Financeiro (Admin → Financeiro): faturamento, custos e lucro com base nas vendas.
// Venda = link de pagamento pago (vira venda sozinho, origem LINK) + vendas lançadas à mão
// (Admin → Vendas). Custos: peças (valor_compra em R$ convertido para a moeda da venda, editável
// por item), taxa do pagamento (% + fixo por método), frete e embalagem (por venda), anúncios
// (gasto do Meta Ads, que só anuncia no Uruguai) e despesas do mês (Admin → Financeiro).
// Cada país na sua moeda (Uruguai $U, Brasil R$) e o total em R$ pela cotação do dia da venda.
import { prisma } from "./prisma";
import {
  garantirTabelasAvaliacoes,
  limparVenda,
  novoCodigo,
  type ItemVenda,
} from "./avaliacoes.server";

const r2 = (v: number) => Math.round(v * 100) / 100;
const mesUY = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: "America/Montevideo" }).slice(0, 7);
export const mesAtual = () => mesUY(new Date());
const inicioMes = (mes: string) => new Date(`${mes}-01T00:00:00-03:00`);
export function somarMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
export const mesValido = (s: unknown) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s ?? ""));

// ---------------------------------------------------------------- taxas dos pagamentos
export const METODOS_FIN = [
  "STRIPE",
  "CARTAO",
  "PIX",
  "ABITAB",
  "REDPAGOS",
  "TRANSFERENCIA",
  "DINHEIRO",
  "OUTRO",
] as const;
export const CANAIS = [
  "LINK",
  "WHATSAPP",
  "SITE",
  "BALCAO",
  "TELEFONE",
  "MERCADOLIVRE",
  "OUTRO",
] as const;
export type Taxa = { pct: number; fixo: number }; // fixo em R$
export type Taxas = Record<string, Taxa>;
// Stripe Brasil (cartão nacional): 3,99% + R$ 0,39. As da dLocal dependem do contrato.
const TAXAS_PADRAO: Taxas = {
  STRIPE: { pct: 3.99, fixo: 0.39 },
  CARTAO: { pct: 0, fixo: 0 },
  PIX: { pct: 0, fixo: 0 },
  ABITAB: { pct: 0, fixo: 0 },
  REDPAGOS: { pct: 0, fixo: 0 },
  TRANSFERENCIA: { pct: 0, fixo: 0 },
  DINHEIRO: { pct: 0, fixo: 0 },
  OUTRO: { pct: 0, fixo: 0 },
};
const CHAVE_TAXAS = "financeiro_taxas";

export async function lerTaxas(): Promise<Taxas> {
  const c = await prisma.configuracoes
    .findUnique({ where: { chave: CHAVE_TAXAS } })
    .catch(() => null);
  let salvas: Taxas = {};
  try {
    salvas = c ? JSON.parse(c.valor) : {};
  } catch {
    /* padrão */
  }
  const out: Taxas = {};
  for (const m of METODOS_FIN) {
    const t = salvas[m] ?? TAXAS_PADRAO[m];
    out[m] = { pct: Number(t.pct) || 0, fixo: Number(t.fixo) || 0 };
  }
  return out;
}

export async function salvarTaxas(t: Taxas) {
  const limpo: Taxas = {};
  for (const m of METODOS_FIN) {
    const x = t?.[m] ?? TAXAS_PADRAO[m];
    limpo[m] = {
      pct: Math.min(30, Math.max(0, r2(Number(x.pct) || 0))),
      fixo: Math.min(1000, Math.max(0, r2(Number(x.fixo) || 0))),
    };
  }
  const valor = JSON.stringify(limpo);
  await prisma.configuracoes.upsert({
    where: { chave: CHAVE_TAXAS },
    create: { chave: CHAVE_TAXAS, valor },
    update: { valor },
  });
  return limpo;
}

// ---------------------------------------------------------------- câmbio
type Cotacoes = { real: number | null; dolar: number | null }; // R$ 1 = $U x · US$ 1 = $U y
export async function cotacoes(): Promise<Cotacoes> {
  const { cotacaoReal, cotacaoDolar } = await import("./cambio.server");
  const [real, dolar] = await Promise.all([
    cotacaoReal().catch(() => null),
    cotacaoDolar()
      .then((c) => c?.valor ?? null)
      .catch(() => null),
  ]);
  return { real, dolar };
}
// valor em `de` → `para` (UYU, BRL ou USD); null quando falta a cotação
export function converter(valor: number, de: string, para: string, c: Cotacoes) {
  if (de === para || !valor) return valor;
  const emUyu =
    de === "UYU"
      ? valor
      : de === "BRL"
        ? c.real
          ? valor * c.real
          : null
        : c.dolar
          ? valor * c.dolar
          : null;
  if (emUyu == null) return null;
  if (para === "UYU") return emUyu;
  const div = para === "BRL" ? c.real : c.dolar;
  return div ? emUyu / div : null;
}

export async function taxaDoPagamento(
  metodo: string | null | undefined,
  valor: number,
  moeda: string,
  c: Cotacoes,
) {
  if (!metodo) return null;
  const t = (await lerTaxas())[metodo];
  if (!t) return null;
  const fixo = converter(t.fixo, "BRL", moeda, c) ?? 0;
  return r2((valor * t.pct) / 100 + fixo);
}

// ---------------------------------------------------------------- completar a venda
// Preenche o que falta: custo de cada peça (valor_compra em R$ → moeda da venda), cotação do dia
// e a taxa do pagamento. O que já foi digitado no Financeiro não muda.
export async function completarFinanceiro(id: number) {
  await garantirTabelasAvaliacoes();
  const v = await prisma.vendas.findUnique({ where: { id } });
  if (!v) throw new Error("Venda não encontrada");
  const c = await cotacoes();
  const itens = JSON.parse(v.itens || "[]") as ItemVenda[];
  const faltam = itens.filter((i) => i.custo == null).map((i) => i.sku);
  let mudouItens = false;
  if (faltam.length) {
    const pecas = await prisma.agricolas.findMany({
      where: { sku: { in: faltam } },
      select: { sku: true, valor_compra: true },
    });
    const custoR = new Map(pecas.map((p) => [p.sku.trim(), p.valor_compra]));
    for (const i of itens) {
      if (i.custo != null) continue;
      const vc = custoR.get(i.sku.trim());
      if (vc == null || !(vc > 0)) continue;
      const conv = converter(vc, "BRL", v.moeda, c);
      if (conv == null) continue;
      i.custo = r2(conv);
      mudouItens = true;
    }
  }
  const dados: Record<string, unknown> = {};
  if (mudouItens) dados.itens = JSON.stringify(itens);
  if (v.cotacao_brl == null && c.real) dados.cotacao_brl = c.real;
  if (v.taxa_pagamento == null && v.metodo) {
    const receita = v.total + v.frete_cobrado - v.desconto;
    const t = await taxaDoPagamento(v.metodo, receita, v.moeda, c);
    if (t != null) dados.taxa_pagamento = t;
  }
  if (!Object.keys(dados).length) return v;
  return prisma.vendas.update({ where: { id }, data: dados });
}

// ---------------------------------------------------------------- link pago → venda
export async function vendaDoLink(linkId: number) {
  await garantirTabelasAvaliacoes();
  const ja = await prisma.vendas.findUnique({ where: { link_id: linkId } });
  if (ja) return ja.id;
  const link = await prisma.links_pagamento.findUnique({
    where: { id: linkId },
    include: {
      user: true,
      pagamentos: { where: { status: "PAGO" }, orderBy: { id: "asc" }, take: 1 },
    },
  });
  if (!link || link.status !== "PAGO") return null;
  const { lerItens } = await import("./pagamentos.server");
  const u = link.user;
  const pg = link.pagamentos[0];
  const pais = link.pais === "BR" ? "BR" : "UY";
  const dados = limparVenda({
    cliente_nome: u?.nome_completo?.trim() || link.email_cliente || `Link de pagamento #${link.id}`,
    cliente_email: u?.email ?? link.email_cliente ?? null,
    cliente_telefone: u?.telefone ?? null,
    endereco: u ? [u.endereco, u.numero_casa].filter(Boolean).join(" ") : null,
    cidade: u?.cidade ?? null,
    departamento: u?.departamento ?? null,
    cep: u?.cep ?? null,
    pais,
    user_id: u?.id ?? null,
    moeda: link.moeda === "BRL" ? "BRL" : "UYU",
    itens: lerItens(link.itens).map((i) => ({
      sku: (i.sku || i.codigo || "").trim(),
      codigo: (i.codigo || i.sku || "").trim(),
      nome: i.nome,
      qtd: i.quantidade,
      valor: i.preco / 100,
    })),
    observacao: `Pago pelo link #${link.id}${link.descricao ? ` · ${link.descricao}` : ""}`,
  });
  const c = await cotacoes();
  // Taxa sobre o valor cobrado (no Stripe sempre em R$), na moeda da venda
  let taxa: number | null = null;
  if (pg) {
    const t = await taxaDoPagamento(pg.metodo, pg.valor / 100, pg.moeda, c);
    taxa = t == null ? null : r2(converter(t, pg.moeda, dados.moeda, c) ?? 0);
  }
  for (let t = 0; t < 5; t++) {
    try {
      const v = await prisma.vendas.create({
        data: {
          ...dados,
          codigo: novoCodigo(),
          origem: "LINK",
          link_id: link.id,
          canal: "LINK",
          metodo: pg?.metodo ?? null,
          frete_cobrado: link.frete_modo === "COBRADO" ? link.frete / 100 : 0,
          desconto: link.desconto / 100,
          taxa_pagamento: taxa,
          cotacao_brl: c.real,
          created_at: link.pago_em ?? pg?.pago_em ?? new Date(),
        },
      });
      await completarFinanceiro(v.id);
      return v.id;
    } catch (e: any) {
      if (!String(e?.code).includes("P2002")) throw e;
      const outra = await prisma.vendas.findUnique({ where: { link_id: linkId } });
      if (outra) return outra.id; // outra chamada criou ao mesmo tempo
    }
  }
  throw new Error("Não foi possível criar a venda do link.");
}

// Links pagos que ainda não viraram venda (pagos antes do Financeiro, ou se o pós-venda falhou)
export async function sincronizarLinksPagos() {
  await garantirTabelasAvaliacoes();
  const feitos = await prisma.vendas.findMany({
    where: { link_id: { not: null } },
    select: { link_id: true },
  });
  const ids = feitos.map((x) => x.link_id!) as number[];
  const pagos = await prisma.links_pagamento.findMany({
    where: { status: "PAGO", ...(ids.length && { id: { notIn: ids } }) },
    select: { id: true },
    take: 200,
  });
  let criadas = 0;
  for (const l of pagos) if (await vendaDoLink(l.id).catch(() => null)) criadas++;
  return criadas;
}

// ---------------------------------------------------------------- custos editados à mão
export type CustosVenda = {
  id: number;
  custos: Array<number | null>; // custo unitário de cada item, na ordem da venda
  taxa_pagamento: number | null;
  frete_custo: number | null;
  metodo: string | null;
  canal: string | null;
  cotacao_brl: number | null;
};
export async function salvarCustosVenda(d: CustosVenda) {
  await garantirTabelasAvaliacoes();
  const v = await prisma.vendas.findUnique({ where: { id: Number(d.id) } });
  if (!v) throw new Error("Venda não encontrada");
  const num = (x: unknown) =>
    x == null || x === "" || !Number.isFinite(Number(x)) ? null : Math.max(0, r2(Number(x)));
  const itens = (JSON.parse(v.itens || "[]") as ItemVenda[]).map((i, n) => {
    const c = num(d.custos?.[n]);
    return c == null ? { ...i, custo: undefined } : { ...i, custo: c };
  });
  const metodo = METODOS_FIN.includes(d.metodo as any) ? d.metodo : null;
  const canal = CANAIS.includes(d.canal as any) ? d.canal : null;
  const cot = num(d.cotacao_brl);
  return prisma.vendas.update({
    where: { id: v.id },
    data: {
      itens: JSON.stringify(itens),
      taxa_pagamento: num(d.taxa_pagamento),
      frete_custo: num(d.frete_custo),
      metodo,
      canal,
      cotacao_brl: cot && cot > 1 ? cot : v.cotacao_brl,
    },
  });
}

// ---------------------------------------------------------------- despesas
export type DadosDespesa = {
  id?: number;
  descricao: string;
  categoria: string;
  valor: number;
  moeda: "UYU" | "BRL";
  mes: string;
  recorrente: boolean;
  mes_fim?: string | null;
};
const CATEGORIAS = ["FIXA", "ANUNCIOS", "PESSOAL", "IMPOSTOS", "OUTRA"];
export async function salvarDespesa(d: DadosDespesa) {
  await garantirTabelasAvaliacoes();
  const descricao = String(d.descricao ?? "")
    .trim()
    .slice(0, 160);
  if (!descricao) throw new Error("Escreva a descrição da despesa.");
  const valor = r2(Number(d.valor));
  if (!(valor > 0)) throw new Error("Valor da despesa inválido.");
  if (!mesValido(d.mes)) throw new Error("Mês inválido.");
  const mesFim = d.recorrente && mesValido(d.mes_fim) ? String(d.mes_fim) : null;
  if (mesFim && mesFim < d.mes) throw new Error("O mês final é antes do início.");
  const dados = {
    descricao,
    categoria: CATEGORIAS.includes(d.categoria) ? d.categoria : "FIXA",
    valor,
    moeda: d.moeda === "BRL" ? "BRL" : "UYU",
    mes: d.mes,
    recorrente: !!d.recorrente,
    mes_fim: mesFim,
  };
  return d.id
    ? prisma.despesas.update({ where: { id: Number(d.id) }, data: dados })
    : prisma.despesas.create({ data: dados });
}
export async function excluirDespesa(id: number) {
  await prisma.despesas.delete({ where: { id } });
}
const valeNoMes = (x: { mes: string; recorrente: boolean; mes_fim: string | null }, mes: string) =>
  x.recorrente ? x.mes <= mes && (!x.mes_fim || x.mes_fim >= mes) : x.mes === mes;

// ---------------------------------------------------------------- Meta Ads por mês
async function gastoMeta(desde: string, ate: string) {
  try {
    const { cfg, todas } = await import("./ads-meta.server");
    const c = await cfg();
    if (!c.conta || !c.token) return { ok: false as const, erro: "Meta Ads não conectado" };
    const { contaCompleta } = await import("./meta-ads.server");
    const conta = await contaCompleta();
    const fim = new Date(inicioMes(somarMes(ate, 1)).getTime() - 3600_000);
    const hoje = new Date();
    const until = (fim < hoje ? fim : hoje).toLocaleDateString("en-CA", {
      timeZone: "America/Montevideo",
    });
    const linhas = await todas(`${c.conta}/insights`, {
      fields: "spend",
      time_range: JSON.stringify({ since: `${desde}-01`, until }),
      time_increment: "monthly",
      limit: "100",
    });
    const porMes = new Map<string, number>();
    for (const l of linhas) {
      const m = String(l.date_start).slice(0, 7);
      porMes.set(m, (porMes.get(m) ?? 0) + Number(l.spend || 0));
    }
    return { ok: true as const, moeda: conta.moeda, porMes };
  } catch (e: any) {
    return { ok: false as const, erro: String(e?.message ?? e).slice(0, 200) };
  }
}

// ---------------------------------------------------------------- relatório
export type VendaLinha = {
  id: number;
  codigo: string;
  data: string;
  cliente: string;
  pais: "UY" | "BR";
  moeda: string;
  origem: string;
  link_id: number | null;
  canal: string | null;
  metodo: string | null;
  status: string;
  receita: number;
  custoPecas: number;
  taxa: number | null;
  frete: number | null;
  lucro: number;
  margem: number | null;
  lucroBrl: number;
  cotacao_brl: number | null;
  semCusto: number;
  itens: Array<{
    sku: string;
    codigo: string;
    nome: string;
    qtd: number;
    valor: number;
    custo: number | null;
  }>;
};
type Numeros = {
  vendas: number;
  receita: number;
  custoPecas: number;
  taxas: number;
  frete: number;
  lucroBruto: number;
  anuncios: number;
  despesas: number;
  resultado: number;
  semCusto: number; // itens sem custo (o lucro desses está alto demais)
};
const zero = (): Numeros => ({
  vendas: 0,
  receita: 0,
  custoPecas: 0,
  taxas: 0,
  frete: 0,
  lucroBruto: 0,
  anuncios: 0,
  despesas: 0,
  resultado: 0,
  semCusto: 0,
});
function fechar(n: Numeros) {
  n.lucroBruto = n.receita - n.custoPecas - n.taxas - n.frete;
  n.resultado = n.lucroBruto - n.anuncios - n.despesas;
  const o: any = {};
  for (const [k, v] of Object.entries(n)) o[k] = k === "vendas" || k === "semCusto" ? v : r2(v);
  return {
    ...(o as Numeros),
    ticket: n.vendas ? r2(n.receita / n.vendas) : 0,
    margemBruta: n.receita ? r2((n.lucroBruto / n.receita) * 100) : null,
    margemLiquida: n.receita ? r2((n.resultado / n.receita) * 100) : null,
  };
}

export async function relatorio(mes: string) {
  await garantirTabelasAvaliacoes();
  await sincronizarLinksPagos().catch((e) => console.error("financeiro (links):", e));
  const c = await cotacoes();
  const primeiro = somarMes(mes, -11);
  const [vendas, despesas, meta, taxas] = await Promise.all([
    prisma.vendas.findMany({
      where: {
        status: { not: "CANCELADA" },
        created_at: { gte: inicioMes(primeiro), lt: inicioMes(somarMes(mes, 1)) },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.despesas.findMany({ orderBy: [{ mes: "desc" }, { id: "desc" }] }),
    gastoMeta(primeiro, mes),
    lerTaxas(),
  ]);

  const meses = Array.from({ length: 12 }, (_, i) => somarMes(primeiro, i));
  const porMes = new Map(meses.map((m) => [m, { UY: zero(), BR: zero(), total: zero() }]));
  const canais = new Map<string, Numeros>();
  const metodos = new Map<string, Numeros>();
  const pecas = new Map<
    string,
    {
      sku: string;
      codigo: string;
      nome: string;
      qtd: number;
      receita: number;
      custo: number;
      semCusto: boolean;
    }
  >();
  const lista: VendaLinha[] = [];
  const avisos: string[] = [];
  let semCotacao = 0;

  for (const v of vendas) {
    const m = mesUY(v.created_at);
    const b = porMes.get(m);
    if (!b) continue;
    const cot = v.cotacao_brl ?? c.real;
    const brl = (x: number) => (v.moeda === "BRL" ? x : cot ? x / cot : 0);
    if (v.moeda !== "BRL" && !cot) semCotacao++;
    const itens = JSON.parse(v.itens || "[]") as ItemVenda[];
    const receita = v.total + v.frete_cobrado - v.desconto;
    const custoPecas = itens.reduce((s, i) => s + i.qtd * (i.custo ?? 0), 0);
    const semCusto = itens.filter((i) => i.custo == null).length;
    const taxa = v.taxa_pagamento ?? 0;
    const frete = v.frete_custo ?? 0;
    const pais = v.pais === "BR" ? "BR" : "UY";
    const somar = (n: Numeros, f: (x: number) => number) => {
      n.vendas++;
      n.receita += f(receita);
      n.custoPecas += f(custoPecas);
      n.taxas += f(taxa);
      n.frete += f(frete);
      n.semCusto += semCusto;
    };
    // O país soma na moeda dele (venda brasileira em $U é rara: converte)
    const moedaPais = pais === "BR" ? "BRL" : "UYU";
    const naMoedaPais = (x: number) =>
      v.moeda === moedaPais ? x : moedaPais === "BRL" ? brl(x) : cot ? brl(x) * cot : 0;
    somar(b[pais], naMoedaPais);
    somar(b.total, brl);
    if (m === mes) {
      const ch = v.canal || (v.origem === "LINK" ? "LINK" : "SEM_CANAL");
      const me = v.metodo || "SEM_METODO";
      if (!canais.has(ch)) canais.set(ch, zero());
      if (!metodos.has(me)) metodos.set(me, zero());
      somar(canais.get(ch)!, brl);
      somar(metodos.get(me)!, brl);
      // Receita da peça sem frete; o desconto do link entra proporcional
      const fator = v.total ? (v.total - v.desconto) / v.total : 1;
      for (const i of itens) {
        const k = i.sku;
        const p = pecas.get(k) ?? {
          sku: i.sku,
          codigo: i.codigo,
          nome: i.nome,
          qtd: 0,
          receita: 0,
          custo: 0,
          semCusto: false,
        };
        p.qtd += i.qtd;
        p.receita += brl(i.qtd * i.valor * fator);
        p.custo += brl(i.qtd * (i.custo ?? 0));
        if (i.custo == null) p.semCusto = true;
        pecas.set(k, p);
      }
      const lucro = receita - custoPecas - taxa - frete;
      lista.push({
        id: v.id,
        codigo: v.codigo,
        data: v.created_at.toISOString(),
        cliente: v.cliente_nome,
        pais,
        moeda: v.moeda,
        origem: v.origem,
        link_id: v.link_id,
        canal: v.canal,
        metodo: v.metodo,
        status: v.status,
        receita: r2(receita),
        custoPecas: r2(custoPecas),
        taxa: v.taxa_pagamento,
        frete: v.frete_custo,
        lucro: r2(lucro),
        margem: receita ? r2((lucro / receita) * 100) : null,
        lucroBrl: r2(brl(lucro)),
        cotacao_brl: v.cotacao_brl,
        semCusto,
        itens: itens.map((i) => ({
          sku: i.sku,
          codigo: i.codigo,
          nome: i.nome,
          qtd: i.qtd,
          valor: i.valor,
          custo: i.custo ?? null,
        })),
      });
    }
  }

  // Anúncios do Meta: só no Uruguai
  if (meta.ok) {
    for (const [m, gasto] of meta.porMes) {
      const b = porMes.get(m);
      if (!b || !gasto) continue;
      b.UY.anuncios += converter(gasto, meta.moeda, "UYU", c) ?? 0;
      b.total.anuncios += converter(gasto, meta.moeda, "BRL", c) ?? 0;
    }
  }
  // Despesas: cada uma no país da moeda dela
  for (const m of meses) {
    const b = porMes.get(m)!;
    for (const d of despesas) {
      if (!valeNoMes(d, m)) continue;
      const pais = d.moeda === "BRL" ? "BR" : "UY";
      if (d.categoria === "ANUNCIOS") b[pais].anuncios += d.valor;
      else b[pais].despesas += d.valor;
      const emR = converter(d.valor, d.moeda, "BRL", c) ?? 0;
      if (d.categoria === "ANUNCIOS") b.total.anuncios += emR;
      else b.total.despesas += emR;
    }
  }

  if (!c.real) avisos.push("Sem cotação do real: configure em Admin → Preços para somar em R$.");
  if (semCotacao)
    avisos.push(`${semCotacao} venda(s) em $U sem cotação: o total em R$ está incompleto.`);
  if (!meta.ok)
    avisos.push(
      `Anúncios do Meta fora da conta (${meta.erro}). Lance o gasto como despesa «Anúncios».`,
    );
  const sel = porMes.get(mes)!;
  const semCustoMes = sel.total.semCusto;
  if (semCustoMes)
    avisos.push(
      `${semCustoMes} item(ns) sem custo de compra no mês: o lucro deles está alto demais. Complete em «Custos».`,
    );
  const semTaxa = Object.entries(taxas).filter(
    ([k, t]) => ["CARTAO", "PIX", "ABITAB", "REDPAGOS"].includes(k) && !t.pct && !t.fixo,
  );
  if (semTaxa.length && lista.some((v) => semTaxa.some(([k]) => k === v.metodo)))
    avisos.push("Há vendas pela dLocal com taxa 0%: preencha as taxas do contrato em «Taxas».");

  const tabela = (mapa: Map<string, Numeros>) =>
    [...mapa.entries()]
      .map(([nome, n]) => ({ nome, ...fechar(n) }))
      .sort((a, b) => b.receita - a.receita);

  return {
    mes,
    moedaMeta: meta.ok ? meta.moeda : null,
    cotacoes: c,
    resumo: { UY: fechar(sel.UY), BR: fechar(sel.BR), total: fechar(sel.total) },
    meses: meses.map((m) => ({ mes: m, ...fechar(porMes.get(m)!.total) })),
    porCanal: tabela(canais),
    porMetodo: tabela(metodos),
    pecas: [...pecas.values()]
      .map((p) => ({
        ...p,
        receita: r2(p.receita),
        custo: r2(p.custo),
        lucro: r2(p.receita - p.custo),
      }))
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 20),
    vendas: lista,
    despesas: despesas.map((d) => ({
      ...d,
      noMes: valeNoMes(d, mes),
      created_at: d.created_at.toISOString(),
      updated_at: d.updated_at.toISOString(),
    })),
    taxas,
    avisos,
  };
}
