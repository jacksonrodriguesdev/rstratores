// Teste do acompanhamento do pedido e da indicação de amigo:
// venda manual começa em «aguardando»; trocar a etapa grava o histórico, avisa no sininho
// (cliente com conta, pelo e-mail) e muda a situação; rastreio = entregue à transportadora;
// página pública pelo código; venda cancelada não muda; indicação: código + cupom do amigo,
// prêmio só uma vez por link pago e nunca para si mesmo. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-pedidos.ts (só em banco de teste)
import assert from "node:assert/strict";

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  delete process.env.RESEND_API_KEY; // sem e-mail de verdade
  const { prisma } = await import("../../src/lib/prisma");
  const a = await import("../../src/lib/avaliacoes.server");
  const p = await import("../../src/lib/pedidos.server");
  const ind = await import("../../src/lib/indicacoes.server");
  const { garantirTabelasPagamento } = await import("../../src/lib/pagamentos.server");
  await a.garantirTabelasAvaliacoes();
  await garantirTabelasPagamento();
  await ind.garantirTabelasIndicacao();

  const sufixo = Date.now();
  const users: number[] = [];
  const vendas: number[] = [];
  const links: number[] = [];
  const cupons: string[] = [];
  try {
    const cliente = await prisma.users.create({
      data: {
        nome_completo: "Cliente Pedido Teste",
        email: `pedido${sufixo}@example.com`,
        role: "USER",
        senha_hash: "x",
      } as any,
    });
    users.push(cliente.id);

    // ---------------------------------------------- etapas
    const v = await a.salvarVenda({
      cliente_nome: "Cliente Pedido Teste",
      cliente_email: cliente.email,
      pais: "UY",
      moeda: "UYU",
      itens: [{ sku: "CI-001", codigo: "CI-001", nome: "Filtro teste", qtd: 1, valor: 100 }],
    });
    vendas.push(v.id);
    assert.equal(v.etapa, "AGUARDANDO");
    let hist = await p.historicoVenda(v.id);
    assert.equal(hist.length, 1, "venda nova grava a primeira etapa");

    const r1 = await p.mudarEtapa(v.id, "PEDIDO_FEITO", { nota: "Chega na quinta" });
    assert.equal(r1.venda.etapa, "PEDIDO_FEITO");
    assert.equal(r1.email, false, "sem Resend não envia e-mail");
    const nots = await p.minhasNotificacoes(cliente.id);
    assert.equal(nots.naoLidas, 1, "aviso no sininho pelo e-mail da venda");
    assert.ok(nots.lista[0].titulo.includes(v.codigo));
    assert.equal(nots.lista[0].link, `/pedido/${v.codigo}`);
    await p.marcarLidas(cliente.id);
    assert.equal((await p.minhasNotificacoes(cliente.id)).naoLidas, 0);

    await p.mudarEtapa(v.id, "CHEGOU");
    await p.mudarEtapa(v.id, "EMBALANDO");
    // Rastreio salvo = entregue à transportadora
    const comRastreio = await a.salvarRastreio(v.id, "UY998877", "DAC");
    assert.equal(comRastreio.etapa, "DESPACHADO");
    assert.equal(comRastreio.status, "ENVIADA");
    const pub = await p.acompanharPedido(v.codigo.toLowerCase());
    assert.ok(pub, "página pública pelo código");
    assert.equal(pub!.etapa, "DESPACHADO");
    assert.equal(pub!.rastreio, "UY998877");
    assert.equal(pub!.primeiroNome, "Cliente");
    assert.ok(!("cliente_email" in pub!), "sem dados pessoais na página pública");
    const fim = await p.mudarEtapa(v.id, "ENTREGUE");
    assert.equal(fim.venda.status, "ENTREGUE");
    hist = await p.historicoVenda(v.id);
    assert.deepEqual(
      hist.map((h) => h.etapa),
      ["AGUARDANDO", "PEDIDO_FEITO", "CHEGOU", "EMBALANDO", "DESPACHADO", "ENTREGUE"],
    );
    assert.equal(hist[1].nota, "Chega na quinta");
    const meus = await p.meusPedidos(cliente.id);
    assert.ok(
      meus.some((x) => x.codigo === v.codigo),
      "pedido na conta do cliente",
    );
    assert.equal(await p.acompanharPedido("XX"), null);
    await prisma.vendas.update({ where: { id: v.id }, data: { status: "CANCELADA" } });
    await assert.rejects(p.mudarEtapa(v.id, "CHEGOU"), /cancelada/);

    // ---------------------------------------------- indicação
    const amigo = await prisma.users.create({
      data: {
        nome_completo: "Amigo Teste",
        email: `amigo${sufixo}@example.com`,
        role: "USER",
        senha_hash: "x",
      } as any,
    });
    users.push(amigo.id);
    const minha = await ind.minhaIndicacao(cliente.id, "https://agropartsuy.com", "es");
    assert.match(minha.codigo, /^AMIGO[A-Z0-9]{5}$/);
    assert.ok(minha.link.endsWith(`/?amigo=${minha.codigo}`));
    cupons.push(minha.codigo);
    const cAmigo = await prisma.cupons.findUnique({ where: { codigo: minha.codigo } });
    assert.ok(cAmigo?.so_primeira_compra && cAmigo.tipo === "PERCENT", "cupom do amigo");
    assert.equal((await ind.minhaIndicacao(cliente.id, "https://x", "es")).codigo, minha.codigo);
    const aberto = await ind.abrirIndicacao(minha.codigo.toLowerCase());
    assert.equal(aberto?.nome, "Cliente");
    assert.equal(await ind.abrirIndicacao("AMIGOXXXXX"), null);

    const novoLink = (userId: number) =>
      prisma.links_pagamento.create({
        data: {
          codigo: `CIIND${userId}${Date.now()}`,
          pais: "UY",
          moeda: "UYU",
          itens: "[]",
          subtotal: 10000,
          total: 9000,
          desconto: 1000,
          cupom: minha.codigo,
          metodos: "CARTAO",
          status: "PAGO",
          user_id: userId,
          pago_em: new Date(),
        },
      });
    const l1 = await novoLink(amigo.id);
    links.push(l1.id);
    const pr = await ind.premiarIndicacao(l1.id);
    assert.ok(pr?.cupom.startsWith("PREMIO"), "prêmio para quem indicou");
    cupons.push(pr!.cupom);
    assert.equal((await ind.premiarIndicacao(l1.id))?.cupom, pr!.cupom, "uma vez por link");
    const l2 = await novoLink(cliente.id);
    links.push(l2.id);
    assert.equal(await ind.premiarIndicacao(l2.id), null, "indicar a si mesmo não vale");
    const painel = await ind.painelIndicacoes();
    assert.ok(painel.linhas.some((x) => x.codigo === minha.codigo && x.compras === 1));

    console.log("Pedidos e indicação: ok");
  } finally {
    await prisma.venda_etapas.deleteMany({ where: { venda_id: { in: vendas } } });
    await prisma.vendas.deleteMany({ where: { id: { in: vendas } } });
    await prisma.indicacao_premios.deleteMany({ where: { link_id: { in: links } } });
    await prisma.links_pagamento.deleteMany({ where: { id: { in: links } } });
    await prisma.indicacoes.deleteMany({ where: { user_id: { in: users } } });
    await prisma.cupons.deleteMany({ where: { codigo: { in: cupons } } });
    await prisma.notificacoes.deleteMany({ where: { user_id: { in: users } } });
    await prisma.users.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
