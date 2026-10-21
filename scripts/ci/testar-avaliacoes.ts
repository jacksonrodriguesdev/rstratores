// Teste de vendas + avaliações: venda (validações), página do QR, avaliação → cupom único de
// 15% (1 por venda), moderação, avaliações na peça (só aprovadas), link em PT para o Brasil,
// venda cancelada, remetente da etiqueta e resumo. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-avaliacoes.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_AVALIACOES=1)
import assert from "node:assert/strict";

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_AVALIACOES === "1",
    "use um banco de teste",
  );
  const a = await import("../../src/lib/avaliacoes.server");
  const { prisma } = await import("../../src/lib/prisma");
  await a.garantirTabelasAvaliacoes();
  const criadas: number[] = [];
  const cupons: string[] = [];
  try {
    // ------------------------------------------------ validações da venda
    const base = {
      cliente_nome: "Maria Fernanda Silva",
      cliente_email: "maria@example.com",
      cliente_telefone: "+598 99 000 000",
      endereco: "Av. Brasil 123",
      cidade: "Chuy",
      departamento: "Rocha",
      pais: "UY" as const,
      moeda: "UYU" as const,
      itens: [
        { sku: "CI-001", codigo: "CI-001", nome: "Filtro de óleo teste 1", qtd: 2, valor: 100.5 },
        { sku: "CI-002", codigo: "CI-002", nome: "Rolamento teste 2", qtd: 1, valor: 50 },
      ],
    };
    await assert.rejects(a.salvarVenda({ ...base, cliente_nome: " " }), /nome do cliente/);
    await assert.rejects(a.salvarVenda({ ...base, itens: [] }), /pelo menos um produto/);
    await assert.rejects(a.salvarVenda({ ...base, cliente_email: "sem-arroba" }), /E-mail/);
    const v = await a.salvarVenda(base);
    criadas.push(v.id);
    assert.match(v.codigo, /^[A-HJ-NP-Z2-9]{10}$/, "código sem letras que confundem");
    assert.equal(v.total, 251, "total = 2×100,50 + 50");
    assert.equal(v.itens.length, 2);
    console.log(`✔ venda ${v.codigo}: validações e total`);

    // Rastreio depois do despacho: venda aberta vira ENVIADA; apagar não volta a situação
    assert.equal(v.status, "ABERTA");
    const vr = await a.salvarRastreio(v.id, " UY123456789 ", "DAC");
    assert.equal(vr.rastreio, "UY123456789");
    assert.equal(vr.status, "ENVIADA");
    assert.equal(vr.transportadora, "DAC");
    const vr2 = await a.salvarRastreio(v.id, "");
    assert.equal(vr2.rastreio, null);
    assert.equal(vr2.status, "ENVIADA");
    await a.salvarRastreio(v.id, "UY123456789");
    console.log("✔ rastreio salvo depois (venda vira ENVIADA)");

    // ------------------------------------------------ links
    assert.equal(
      a.linkAvaliacao("https://agropartsuy.com/", "ABC", "UY"),
      "https://agropartsuy.com/avaliar/ABC",
    );
    assert.equal(
      a.linkAvaliacao("https://agropartsuy.com", "ABC", "BR"),
      "https://agropartsuy.com/pt/avaliar/ABC",
    );
    console.log("✔ link do QR: espanhol (Uruguai) e /pt (Brasil)");

    // ------------------------------------------------ página do QR
    const pg = await a.paginaAvaliacao(v.codigo.toLowerCase());
    assert.ok(pg, "acha pelo código (sem diferenciar maiúsculas)");
    assert.equal(pg!.itens.length, 2);
    assert.equal(pg!.primeiroNome, "Maria");
    assert.equal(pg!.idioma, "es");
    assert.equal(pg!.cupom, null);
    assert.equal(await a.paginaAvaliacao("NAOEXISTE1"), null);
    console.log("✔ página do QR: peças da compra, idioma e código inexistente");

    // ------------------------------------------------ avaliação → cupom
    await assert.rejects(
      a.enviarAvaliacoes({
        codigo: v.codigo,
        nome: "Maria",
        idioma: "es",
        avaliacoes: [{ sku: "CI-001", nota: 0 }],
      }),
      /al menos una/,
    );
    await assert.rejects(
      a.enviarAvaliacoes({
        codigo: v.codigo,
        nome: "Maria",
        idioma: "pt",
        avaliacoes: [{ sku: "OUTRA-PECA", nota: 5 }],
      }),
      /pelo menos uma/,
      "peça que não é da compra não vale",
    );
    const r1 = await a.enviarAvaliacoes({
      codigo: v.codigo,
      nome: "Maria Fernanda Silva",
      cidade: "Chuy",
      idioma: "es",
      avaliacoes: [
        { sku: "CI-001", nota: 5, comentario: "Excelente, llegó rápido." },
        { sku: "CI-002", nota: 2, comentario: "Demoró un poco." },
        { sku: "CI-999", nota: 5 }, // não é da compra: ignorada
      ],
    });
    cupons.push(r1.cupom);
    assert.ok(r1.novo);
    assert.match(r1.cupom, /^AVAL[A-HJ-NP-Z2-9]{6}$/);
    const cp = await prisma.cupons.findUnique({ where: { codigo: r1.cupom } });
    assert.ok(cp);
    assert.equal(cp!.tipo, "PERCENT");
    assert.equal(cp!.valor, a.DESCONTO_AVALIACAO);
    assert.equal(cp!.max_usos, 1);
    assert.equal(cp!.publico, false, "não aparece na página de cupons");
    assert.ok(cp!.fim! > new Date(Date.now() + 59 * 86400_000), "vale 60 dias");
    const avs = await prisma.avaliacoes.findMany({
      where: { venda_id: v.id },
      orderBy: { nota: "desc" },
    });
    assert.equal(avs.length, 2, "só as peças da compra");
    assert.ok(avs.every((x) => x.status === "PENDENTE" && x.verificada && x.com_cupom));
    // Segunda vez: mesmo cupom, nenhuma avaliação nova (nota baixa também ganha cupom: já ganhou)
    const r2 = await a.enviarAvaliacoes({
      codigo: v.codigo,
      nome: "X",
      idioma: "es",
      avaliacoes: [{ sku: "CI-001", nota: 1 }],
    });
    assert.equal(r2.cupom, r1.cupom);
    assert.equal(r2.novo, false);
    assert.equal(await prisma.avaliacoes.count({ where: { venda_id: v.id } }), 2);
    assert.equal((await a.paginaAvaliacao(v.codigo))!.cupom, r1.cupom);
    console.log(`✔ avaliação → cupom ${r1.cupom} (15%, uso único, 60 dias, privado), sem repetir`);

    // ------------------------------------------------ moderação e site
    let peca = await a.avaliacoesProduto("CI-001");
    const antes = peca.total;
    const boa = avs.find((x) => x.nota === 5)!;
    await a.moderar(boa.id, { status: "APROVADA", resposta: "¡Gracias, María!" });
    peca = await a.avaliacoesProduto("CI-001");
    assert.equal(peca.total, antes + 1, "aprovada aparece");
    const minha = peca.lista.find((x) => x.id === boa.id)!;
    assert.equal(minha.nome, "Maria F.", "nome público: nome + inicial");
    assert.equal(minha.resposta, "¡Gracias, María!");
    assert.ok(minha.verificada && minha.comCupom);
    assert.equal(
      (await a.avaliacoesProduto("CI-002")).lista.filter((x) => x.id === avs[1].id).length,
      0,
      "pendente não aparece",
    );
    await a.moderar(avs[1].id, { status: "REJEITADA" });
    const mod = await a.listarModeracao("REJEITADA");
    assert.ok(mod.lista.some((x) => x.id === avs[1].id && x.venda?.codigo === v.codigo));
    console.log("✔ moderação: só aprovadas no site, resposta pública, rejeitada fica fora");

    // ------------------------------------------------ cancelada, remetente, resumo
    const vc = await a.salvarVenda({
      ...base,
      cliente_nome: "Cancelado Teste",
      status: "CANCELADA",
    });
    criadas.push(vc.id);
    assert.equal(await a.paginaAvaliacao(vc.codigo), null, "venda cancelada não avalia");
    const vbr = await a.salvarVenda({
      ...base,
      cliente_nome: "João Brasil",
      pais: "BR",
      moeda: "BRL",
    });
    criadas.push(vbr.id);
    assert.equal((await a.paginaAvaliacao(vbr.codigo))!.idioma, "pt");
    const rem0 = await a.lerRemetente();
    assert.equal(rem0.nome, "AGRO PARTS");
    const rem = await a.salvarRemetente({ ...rem0, endereco: "Rua Teste 1" });
    assert.equal((await a.lerRemetente()).endereco, rem.endereco);
    await prisma.configuracoes.delete({ where: { chave: "etiqueta_remetente" } });
    const res = await a.resumoAvaliacoes();
    assert.ok(res.vendas >= 2 && res.avaliadas >= 1 && res.cuponsGerados >= 1);
    const lista = await a.listarVendas("Maria Fernanda");
    assert.ok(lista.some((x) => x.id === v.id));
    console.log("✔ venda cancelada, cliente do Brasil (PT), remetente, busca e resumo");
  } finally {
    await prisma.avaliacoes.deleteMany({ where: { venda_id: { in: criadas } } });
    await prisma.vendas.deleteMany({ where: { id: { in: criadas } } });
    if (cupons.length) await prisma.cupons.deleteMany({ where: { codigo: { in: cupons } } });
    await prisma.$disconnect();
  }
  console.log("Avaliações OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
