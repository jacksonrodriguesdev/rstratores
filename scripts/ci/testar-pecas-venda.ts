// Teste das peças na nova venda: editar compra/venda (R$) e cadastrar uma peça que não existe
// (código repetido recusado, código inválido recusado, preço em $U pela cotação). Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-pecas-venda.ts (só em banco de teste)
import assert from "node:assert/strict";

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const { prisma } = await import("../../src/lib/prisma");
  const p = await import("../../src/lib/pecas-venda.server");
  const codigo = `CINOVA${Date.now() % 100000}`;
  const original = await prisma.agricolas.findUnique({ where: { sku: "CI-002" } });
  assert.ok(original, "semente com CI-002");
  const antes = await prisma.configuracoes.findUnique({ where: { chave: "cotacao_manual" } });
  try {
    await prisma.configuracoes.upsert({
      where: { chave: "cotacao_manual" },
      create: { chave: "cotacao_manual", valor: "8" },
      update: { valor: "8" },
    });
    const { limparCacheConfig } = await import("../../src/lib/precos.server");
    limparCacheConfig();

    // Editar o preço de uma peça existente
    const r = await p.salvarPrecoPeca({ sku: "CI-002", custo: "50,5", venda: "100" });
    assert.equal(r.custo, 50.5);
    assert.equal(r.precoBrl, 100);
    assert.ok((r.uyu ?? 0) >= 800, `preço em $U pela cotação: ${r.uyu}`);
    await assert.rejects(p.salvarPrecoPeca({ sku: "CI-002", venda: "-3" }), /inválido/);

    // Cadastrar uma peça nova
    const n = await p.criarPecaRapida({
      codigo: ` ${codigo.toLowerCase()} `,
      nome: "Peça teste nova",
      custo: 10,
      venda: 25,
      marca: "Massey Ferguson",
    });
    assert.equal(n.sku, codigo, "código em maiúsculas e sem espaços");
    assert.equal(n.codigo, codigo);
    assert.equal(n.precoBrl, 25);
    assert.equal(n.custo, 10);
    await assert.rejects(p.criarPecaRapida({ codigo, nome: "Repetida" }), /Já existe/);
    await assert.rejects(p.criarPecaRapida({ codigo: "CI-001", nome: "Repetida" }), /Já existe/);
    await assert.rejects(p.criarPecaRapida({ codigo: "", nome: "x" }), /código/);
    await assert.rejects(p.criarPecaRapida({ codigo: "AB*C", nome: "x" }), /Código só/);
    await assert.rejects(p.criarPecaRapida({ codigo: "ABC9", nome: " " }), /nome/);
    console.log("Peças na venda: ok");
  } finally {
    await prisma.agricolas.deleteMany({ where: { sku: codigo } });
    await prisma.agricolas.update({
      where: { sku: "CI-002" },
      data: {
        valor_compra: original!.valor_compra,
        preco_brl: original!.preco_brl,
        preco_modo: original!.preco_modo,
        precificado_em: original!.precificado_em,
      },
    });
    if (antes)
      await prisma.configuracoes.update({
        where: { chave: antes.chave },
        data: { valor: antes.valor },
      });
    else await prisma.configuracoes.deleteMany({ where: { chave: "cotacao_manual" } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
