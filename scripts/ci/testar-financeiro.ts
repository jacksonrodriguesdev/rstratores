// Teste do Financeiro: venda manual (custo da peça pelo valor_compra, cotação e taxa do cartão),
// link pago → venda (uma vez só, com frete, desconto e taxa do Stripe), despesas fixas e de um
// mês, demonstrativo por país ($U / R$) e total em R$, custos editados à mão e venda cancelada.
// Compara o relatório antes e depois (o banco pode ter outras vendas). Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-financeiro.ts (só em banco de teste)
import assert from "node:assert/strict";

const perto = (a: number, b: number, msg: string) =>
  assert.ok(Math.abs(a - b) < 0.011, `${msg}: ${a} ≠ ${b}`);

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const { prisma } = await import("../../src/lib/prisma");
  const a = await import("../../src/lib/avaliacoes.server");
  const f = await import("../../src/lib/financeiro.server");
  await a.garantirTabelasAvaliacoes();
  const { garantirTabelasPagamento } = await import("../../src/lib/pagamentos.server");
  await garantirTabelasPagamento();

  const chaves = ["cotacao_manual", "cotacao_usd_manual", "financeiro_taxas"];
  const antes = await prisma.configuracoes.findMany({ where: { chave: { in: chaves } } });
  const peca = await prisma.agricolas.findFirst({ where: { sku: "CI-001" } });
  assert.ok(peca, "semente com CI-001");
  const vendas: number[] = [];
  const despesas: number[] = [];
  let linkId = 0;
  try {
    for (const [chave, valor] of [
      ["cotacao_manual", "8"], // R$ 1 = $U 8
      ["cotacao_usd_manual", "40"],
    ])
      await prisma.configuracoes.upsert({
        where: { chave },
        create: { chave, valor },
        update: { valor },
      });
    await prisma.agricolas.update({ where: { sku: peca.sku }, data: { valor_compra: 50 } });
    await f.salvarTaxas({
      STRIPE: { pct: 4, fixo: 1 },
      CARTAO: { pct: 5, fixo: 0 },
    } as any);
    const t = await f.lerTaxas();
    assert.deepEqual(t.STRIPE, { pct: 4, fixo: 1 });
    assert.deepEqual(t.PIX, { pct: 0, fixo: 0 }, "as outras ficam no padrão");

    const mes = f.mesAtual();
    const r0 = await f.relatorio(mes); // já converte links pagos antigos: a diferença fica limpa

    // ------------------------------------------------ venda manual no Uruguai
    const v1 = await a.salvarVenda({
      cliente_nome: "Cliente Financeiro UY",
      pais: "UY",
      moeda: "UYU",
      metodo: "CARTAO",
      canal: "WHATSAPP",
      itens: [{ sku: "CI-001", codigo: "CI-001", nome: "Filtro teste", qtd: 2, valor: 600 }],
    });
    vendas.push(v1.id);
    assert.equal(v1.itens[0].custo, 400, "custo = R$ 50 × 8");
    assert.equal(v1.cotacao_brl, 8);
    assert.equal(v1.taxa_pagamento, 60, "5% de $U 1200");
    assert.equal(v1.canal, "WHATSAPP");
    // Editar na tela de Vendas não apaga o custo
    const v1b = await a.salvarVenda(
      { ...v1, cliente_nome: "Cliente Financeiro UY 2" } as any,
      v1.id,
    );
    assert.equal(v1b.itens[0].custo, 400);

    // ------------------------------------------------ link pago no Brasil → venda
    const link = await prisma.links_pagamento.create({
      data: {
        codigo: `CIFIN${Date.now()}`,
        pais: "BR",
        moeda: "BRL",
        itens: JSON.stringify([
          { sku: "CI-002", codigo: "CI-002", nome: "Rolamento teste", quantidade: 1, preco: 30000 },
        ]),
        subtotal: 30000,
        frete: 2000,
        frete_modo: "COBRADO",
        desconto: 1000,
        total: 31000,
        metodos: "STRIPE",
        status: "PAGO",
        email_cliente: "fin@example.com",
        pago_em: new Date(),
      },
    });
    linkId = link.id;
    await prisma.pagamentos.create({
      data: {
        link_id: link.id,
        metodo: "STRIPE",
        provedor: "stripe",
        order_id: `cifin-${link.id}`,
        status: "PAGO",
        valor: 31000,
        moeda: "BRL",
        pago_em: new Date(),
      },
    });
    const idLink = await f.vendaDoLink(link.id);
    assert.ok(idLink);
    vendas.push(idLink!);
    assert.equal(await f.vendaDoLink(link.id), idLink, "o mesmo link não vira duas vendas");
    assert.equal(await f.sincronizarLinksPagos(), 0);
    const v2 = await prisma.vendas.findUniqueOrThrow({ where: { id: idLink! } });
    assert.equal(v2.origem, "LINK");
    assert.equal(v2.metodo, "STRIPE");
    assert.equal(v2.frete_cobrado, 20);
    assert.equal(v2.desconto, 10);
    perto(v2.taxa_pagamento!, 13.4, "4% de R$ 310 + R$ 1");
    assert.equal(v2.cliente_nome, "fin@example.com");

    // ------------------------------------------------ despesas
    for (const d of [
      {
        descricao: "Aluguel teste",
        categoria: "FIXA",
        valor: 800,
        moeda: "UYU" as const,
        mes,
        recorrente: true,
      },
      {
        descricao: "Contador teste",
        categoria: "FIXA",
        valor: 100,
        moeda: "BRL" as const,
        mes,
        recorrente: false,
      },
      {
        descricao: "Google Ads teste",
        categoria: "ANUNCIOS",
        valor: 50,
        moeda: "BRL" as const,
        mes,
        recorrente: false,
      },
      // de outro mês: não entra
      {
        descricao: "Antiga teste",
        categoria: "FIXA",
        valor: 999,
        moeda: "BRL" as const,
        mes: f.somarMes(mes, -3),
        recorrente: true,
        mes_fim: f.somarMes(mes, -2),
      },
    ])
      despesas.push((await f.salvarDespesa(d)).id);
    await assert.rejects(
      f.salvarDespesa({
        descricao: "x",
        categoria: "FIXA",
        valor: 0,
        moeda: "UYU",
        mes,
        recorrente: true,
      }),
      /Valor/,
    );

    // ------------------------------------------------ relatório (diferença)
    const r1 = await f.relatorio(mes);
    const d = (k: "UY" | "BR" | "total", c: keyof (typeof r1)["resumo"]["UY"]) =>
      Number(r1.resumo[k][c]) - Number(r0.resumo[k][c]);
    perto(d("UY", "receita"), 1200, "faturamento UY");
    perto(d("UY", "custoPecas"), 800, "peças UY");
    perto(d("UY", "taxas"), 60, "taxas UY");
    perto(d("UY", "despesas"), 800, "despesas UY");
    perto(d("BR", "receita"), 310, "faturamento BR (com frete, sem desconto)");
    perto(d("BR", "taxas"), 13.4, "taxas BR");
    perto(d("BR", "anuncios"), 50, "anúncios BR");
    perto(d("BR", "despesas"), 100, "despesas BR (a antiga não entra)");
    perto(d("total", "receita"), 1200 / 8 + 310, "faturamento total em R$");
    perto(d("total", "despesas"), 800 / 8 + 100, "despesas em R$");
    perto(d("total", "resultado"), 150 - 100 - 7.5 + 310 - 13.4 - 50 - 200, "resultado em R$");
    assert.equal(d("total", "vendas"), 2);
    assert.ok(d("BR", "semCusto") >= 1, "peça sem custo avisada");
    assert.ok(r1.avisos.some((x) => x.includes("sem custo")));
    const linhaLink = r1.vendas.find((v) => v.id === idLink)!;
    assert.equal(linhaLink.canal, "LINK");
    assert.ok(r1.porMetodo.some((m) => m.nome === "STRIPE"));
    assert.ok(r1.pecas.some((p) => p.sku === "CI-001"));
    assert.equal(r1.meses.length, 12);
    assert.equal(r1.meses[11].mes, mes);
    assert.ok(r1.despesas.find((x) => x.descricao === "Antiga teste" && !x.noMes));

    // ------------------------------------------------ custos à mão
    await f.salvarCustosVenda({
      id: idLink!,
      custos: [200],
      taxa_pagamento: 12,
      frete_custo: 25,
      metodo: "STRIPE",
      canal: "SITE",
      cotacao_brl: null,
    });
    const r2 = await f.relatorio(mes);
    const lucroBR = Number(r2.resumo.BR.lucroBruto) - Number(r0.resumo.BR.lucroBruto);
    perto(lucroBR, 310 - 200 - 12 - 25, "lucro BR com custos editados");
    assert.equal(r2.vendas.find((v) => v.id === idLink)!.canal, "SITE");

    // ------------------------------------------------ cancelada sai
    await prisma.vendas.update({ where: { id: v1.id }, data: { status: "CANCELADA" } });
    const r3 = await f.relatorio(mes);
    perto(Number(r3.resumo.UY.receita) - Number(r0.resumo.UY.receita), 0, "cancelada não fatura");

    console.log("Financeiro: ok");
  } finally {
    if (vendas.length) await prisma.vendas.deleteMany({ where: { id: { in: vendas } } });
    if (despesas.length) await prisma.despesas.deleteMany({ where: { id: { in: despesas } } });
    if (linkId) {
      await prisma.pagamentos.deleteMany({ where: { link_id: linkId } });
      await prisma.links_pagamento.delete({ where: { id: linkId } });
    }
    await prisma.agricolas.update({
      where: { sku: peca!.sku },
      data: { valor_compra: peca!.valor_compra },
    });
    await prisma.configuracoes.deleteMany({ where: { chave: { in: chaves } } });
    for (const c of antes)
      await prisma.configuracoes.create({ data: { chave: c.chave, valor: c.valor } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
