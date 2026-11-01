// Teste do Extrato do banco: leitura do PDF do Nubank (texto inventado no mesmo formato), conferência
// com os totais do banco, importar duas vezes sem duplicar, classificação sozinha, «lembrar» por nome,
// PIX de venda ligado à venda lançada, números do imposto de renda e as tarefas do dono.
// Roda com: npx tsx scripts/ci/testar-extratos.ts (só em banco de teste)
import assert from "node:assert/strict";
import { conferir, lerNubankCsv, lerNubankPdf, separar } from "../../src/lib/extrato-leitor";

// Duas páginas, como o pdfjs entrega: cabeçalho repetido e o fim de um movimento depois da quebra
const EXTRATO = `Fulano De Teste
•••.111.222-•• 0001CPF Agência Conta
12345678-9
a01 DE MARÇO DE 2025 31 DE MARÇO DE 2025 VALORES EM R$
Saldo final do período
R$ 1.220,50
Saldo inicial
Rendimento líquido
Total de entradas
Total de saídas
Saldo final do período
100,00
+0,00
+4.650,50
-3.530,00
1.220,50
Movimentações
03 MAR 2025 Total de entradas + 3.150,50
Transferência recebida pelo Pix Pai Do Teste - •••.333.444-•• - COOP SICREDI
INTERESTADOS Agência: 1 Conta: 2-3
1.000,00
Transferência recebida pelo Pix Cliente Do Trator - •••.555.666-•• - BCO DO
BRASIL S.A. (0001) Agência: 9 Conta: 8-7
2.150,50
Total de saídas - 2.380,00
Compra no débito SUPERMERCADO BOM PRECO 230,00
Transferência enviada pelo Pix FORNECEDOR DE PECAS LTDA - 11.222.333/0001-81 - BCO
Tem alguma dúvida? Mande uma mensagem para nosso time de atendimento pelo chat do app ou ligue 4020 0185 (capitais e regiões
metropolitanas) ou 0800 591 2117 (demais localidades). Atendimento 24h.
Extrato gerado dia 01 de abril de 2025 às 10:00 1 de 2
Fulano De Teste
•••.111.222-•• 0001CPF Agência Conta
12345678-9
a01 DE MARÇO DE 2025 31 DE MARÇO DE 2025 VALORES EM R$
2.100,00
(0001) Agência: 1 Conta: 5-5 Transferência enviada pelo Pix FACEBOOK SERVICOS ONLINE DO BRASIL LTDA - 13.347.016/0001-17 - BCO
50,00
20 MAR 2025 Total de entradas + 1.500,00
Transferência recebida pelo Pix Cliente Do Trator - •••.555.666-•• - BCO DO
BRASIL S.A. (0001) Agência: 9 Conta: 8-7
500,00
Transferência recebida pelo Pix Fulano De Teste - •••.111.222-•• - BCO
SANTANDER (BRASIL) S.A. (0033) Agência: 1 Conta: 4-4
1.000,00
Total de saídas - 1.150,00
Transferência enviada pelo Pix Pai Do Teste - •••.333.444-•• - COOP SICREDI
1.150,00
`;

(async () => {
  // ------------------------------------------------ leitura (sem banco)
  const e = lerNubankPdf(EXTRATO);
  assert.equal(e.titular, "Fulano De Teste");
  assert.equal(e.inicio, "2025-03-01");
  assert.equal(e.fim, "2025-03-31");
  assert.deepEqual(e.totais, {
    saldoInicial: 100,
    entradas: 4650.5,
    saidas: 3530,
    saldoFinal: 1220.5,
  });
  assert.equal(e.movimentos.length, 8);
  assert.equal(conferir(e).ok, true, "bate com os totais do banco");
  const face = e.movimentos.find((m) => m.valor === -50)!;
  assert.equal(face.contraparte, "FACEBOOK SERVICOS ONLINE DO BRASIL LTDA", "quebra de página");
  assert.equal(face.tipo, "Transferência enviada pelo Pix");
  const forn = e.movimentos.find((m) => m.valor === -2100)!;
  assert.equal(forn.documento, "11.222.333/0001-81");
  assert.match(forn.descricao, /Conta: 5-5$/, "o resto da quebra volta para o anterior");
  assert.equal(
    e.movimentos.find((m) => m.valor === 1000 && m.data === "2025-03-03")!.documento,
    "•••.333.444-••",
  );
  assert.equal(separar("Compra no débito 53766930Fulano").contraparte, "Fulano");
  assert.equal(separar("Recarga de celular").contraparte, "Recarga de celular");
  const csv = lerNubankCsv([
    ["Data", "Valor", "Identificador", "Descrição"],
    ["05/03/2025", "-12.50", "x1", "Compra no débito - PADARIA CENTRAL"],
    [
      "06/03/2025",
      "300",
      "x2",
      "Transferência recebida pelo Pix - Cliente Csv - •••.777.888-•• - NU",
    ],
  ]);
  assert.equal(csv.movimentos.length, 2);
  assert.equal(csv.movimentos[1].contraparte, "Cliente Csv");
  assert.equal(csv.movimentos[0].valor, -12.5);

  // ------------------------------------------------ banco de teste
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const { prisma } = await import("../../src/lib/prisma");
  const x = await import("../../src/lib/extratos.server");
  const a = await import("../../src/lib/avaliacoes.server");
  await x.garantirTabelasExtrato();
  const antesTarefas = await prisma.configuracoes.findUnique({ where: { chave: "fisc_tarefas" } });
  const vendas: number[] = [];
  try {
    // Venda lançada antes: o PIX de 500 do dia 20 liga nela
    const v = await a.salvarVenda({
      cliente_nome: "Cliente Do Trator",
      pais: "BR",
      moeda: "BRL",
      canal: "BALCAO",
      data: "2025-03-19",
      itens: [{ sku: "AVULSO-1", codigo: "", nome: "Peça teste", qtd: 1, valor: 500 }],
    });
    vendas.push(v.id);

    const r1 = await x.importar({ nome: "NU_teste.pdf", formato: "pdf", texto: EXTRATO });
    assert.equal(r1.novos, 8);
    assert.equal(r1.conferido, true);
    const r2 = await x.importar({ nome: "NU_teste.pdf", formato: "pdf", texto: EXTRATO });
    assert.equal(r2.novos, 0, "importar de novo não duplica");
    assert.equal(await prisma.extrato_arquivos.count({ where: { inicio: "2025-03-01" } }), 1);

    const p0 = await x.painel(2025);
    const cat = (valor: number, data?: string) =>
      p0.movimentos.find((m) => m.valor === valor && (!data || m.data === data))!;
    assert.equal(cat(-230).categoria, "PESSOAL", "supermercado = pessoal");
    assert.equal(cat(-50).categoria, "ANUNCIOS", "Facebook = anúncios");
    assert.equal(cat(1000, "2025-03-20").categoria, "PROPRIA", "do próprio nome = entre contas");
    assert.equal(cat(1000, "2025-03-03").categoria, "A_CLASSIFICAR");
    assert.equal(p0.totais.aClassificar, 5);
    assert.equal(p0.totais.entradas, 4650.5);
    assert.equal(p0.meses[2].importado, true);

    // Classificar à mão com «lembrar»: o outro do mesmo nome e sentido segue junto
    const pai = cat(1000, "2025-03-03");
    const r = await x.classificarMovimento({ id: pai.id, categoria: "DOACAO", lembrar: true });
    assert.equal(r.outros, 0, "a saída para o pai é outro sentido");
    await x.classificarMovimento({ id: cat(-1150).id, categoria: "DOACAO_FEITA" });
    const cli = cat(2150.5);
    const r3 = await x.classificarMovimento({
      id: cli.id,
      categoria: "SERVICO_PF",
      lembrar: true,
      nota: "conserto do trator",
    });
    assert.equal(r3.outros, 1, "o PIX de 500 do mesmo cliente também vira serviço");
    // …mas o de 500 era venda: à mão vale mais que a regra, e liga na venda lançada
    await x.classificarMovimento({ id: cat(500).id, categoria: "VENDA" });
    await x.classificarMovimento({ id: cat(-2100).id, categoria: "FORNECEDOR", lembrar: true });
    await assert.rejects(
      x.classificarMovimento({ id: cat(-230).id, categoria: "VENDA" }),
      /não serve/,
    );

    const p = await x.painel(2025);
    assert.equal(p.totais.aClassificar, 0);
    assert.equal(p.mei.vendasNoBanco, 500);
    assert.equal(p.mei.vendasSemLancar.length, 0, "PIX ligado à venda lançada");
    assert.equal(p.movimentos.find((m) => m.valor === 500)!.venda_id, v.id);
    assert.equal(p.mei.fornecedores, 2100);
    assert.equal(p.mei.despesasLoja, 50);
    assert.equal(p.ir.totalServicoPF, 2150.5);
    assert.deepEqual(p.ir.servicoPorMes, [{ mes: "2025-03", valor: 2150.5 }]);
    assert.equal(p.ir.doacoesRecebidas[0].documento, "•••.333.444-••");
    assert.equal(p.ir.totalDoacoes, 1000);
    assert.equal(p.ir.totalDoacoesFeitas, 1150);
    assert.equal(p.movimentos.find((m) => m.valor === 2150.5)!.nota, "conserto do trator");
    assert.equal((await x.painel(2025, "2025-03")).movimentos.length, 8);
    assert.equal((await x.painel(2025, "2025-04")).movimentos.length, 0);

    // A regra vale no próximo extrato: mesmo fornecedor já entra classificado
    const abril = EXTRATO.replace(/MARÇO/g, "ABRIL")
      .replace(/ MAR 2025/g, " ABR 2025")
      .replace("31 DE ABRIL", "30 DE ABRIL");
    await x.importar({ nome: "NU_abril.pdf", formato: "pdf", texto: abril });
    const pa = await x.painel(2025, "2025-04");
    assert.equal(pa.movimentos.find((m) => m.valor === -2100)!.categoria, "FORNECEDOR");
    assert.equal(
      pa.movimentos.find((m) => m.valor === 1000 && m.data === "2025-04-03")!.categoria,
      "DOACAO",
    );
    assert.equal(pa.mei.vendasSemLancar.length, 0, "a venda já ligada não serve para outro PIX");

    // ------------------------------------------------ pessoal
    const ps = await x.pessoal(2025, "2025-03");
    assert.equal(ps.total, 230 + 1150, "gasto pessoal + ajuda à família");
    const merc = ps.movimentos.find((m) => m.valor === 230)!;
    assert.equal(merc.sub, "MERCADO", "supermercado = mercado (palpite)");
    assert.equal(merc.origem, "palpite");
    assert.equal(ps.movimentos.find((m) => m.valor === 1150)!.sub, "FAMILIA");
    assert.equal(ps.pessoas[0].nome, "Pai Do Teste");
    assert.equal(ps.subs.find((s) => s.sub === "MERCADO")!.total, 230);
    assert.equal(ps.entrouParaVoce, 1000 + 2150.5, "doação + serviço PF de março");
    await x.classificarSub({ id: merc.id, sub: "LAZER", lembrar: true });
    const ps2 = await x.pessoal(2025);
    const lz = ps2.movimentos.filter((m) => m.contraparte === "SUPERMERCADO BOM PRECO");
    assert.equal(lz.length, 2, "março e abril");
    assert.ok(
      lz.every((m) => m.sub === "LAZER"),
      "a regra «lembrar» vale para o outro mês",
    );
    assert.equal(lz.find((m) => m.data.startsWith("2025-03"))!.origem, "manual");
    assert.equal(lz.find((m) => m.data.startsWith("2025-04"))!.origem, "regra");
    assert.equal(ps2.recorrentes.length, 0, "só 2 meses: ainda não é recorrente");
    await assert.rejects(
      x.classificarSub({ id: cat(-2100).id, sub: "MERCADO" }),
      /Só gasto pessoal/,
    );
    await assert.rejects(x.classificarSub({ id: merc.id, sub: "XYZ" }), /inválido/);

    // ------------------------------------------------ tarefas
    await prisma.configuracoes.deleteMany({ where: { chave: "fisc_tarefas" } });
    const t0 = await x.lerTarefas();
    assert.ok(t0.length >= 4 && t0.some((t) => t.id === "irpf"), "tarefas padrão");
    const t1 = await x.salvarTarefas([
      ...t0.map((t) => (t.id === "conta-pj" ? { ...t, feito: true } : t)),
      { id: "", titulo: "Pedir recibo", detalhe: "do serviço", prazo: "2025-12-01", feito: false },
    ]);
    assert.equal(t1.length, t0.length + 1);
    assert.ok(t1[t1.length - 1].id, "tarefa nova ganha id");
    assert.equal((await x.lerTarefas()).find((t) => t.id === "conta-pj")!.feito, true);
    await assert.rejects(x.salvarTarefas([{ ...t0[0], titulo: " " }]), /título/);

    // Apagar o extrato tira os movimentos dele
    const arq = await prisma.extrato_arquivos.findFirstOrThrow({ where: { inicio: "2025-04-01" } });
    await x.apagarArquivo(arq.id);
    assert.equal((await x.painel(2025, "2025-04")).movimentos.length, 0);

    console.log(
      "✔ extrato: leitura conferida, sem duplicar, classificação, regras, venda ligada, IR e tarefas",
    );
  } finally {
    await prisma.extrato_movimentos.deleteMany({
      where: { banco: "Nubank", data: { startsWith: "2025-0" } },
    });
    await prisma.extrato_arquivos.deleteMany({
      where: { inicio: { in: ["2025-03-01", "2025-04-01"] } },
    });
    await prisma.extrato_regras.deleteMany({});
    if (vendas.length) {
      await prisma.venda_etapas.deleteMany({ where: { venda_id: { in: vendas } } });
      await prisma.vendas.deleteMany({ where: { id: { in: vendas } } });
    }
    await prisma.configuracoes.deleteMany({ where: { chave: "fisc_tarefas" } });
    if (antesTarefas)
      await prisma.configuracoes.create({
        data: { chave: antesTarefas.chave, valor: antesTarefas.valor },
      });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
