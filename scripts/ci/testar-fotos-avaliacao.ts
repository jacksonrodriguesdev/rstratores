// Teste das fotos na avaliação: só entram fotos da pasta da própria compra (até 4 por peça),
// aparecem na moderação e, depois de aprovadas, na página da peça. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-fotos-avaliacao.ts (só em banco de teste)
import assert from "node:assert/strict";

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const { prisma } = await import("../../src/lib/prisma");
  const a = await import("../../src/lib/avaliacoes.server");
  await a.garantirTabelasAvaliacoes();
  const v = await a.salvarVenda({
    cliente_nome: "Cliente Foto Teste",
    pais: "UY",
    moeda: "UYU",
    itens: [{ sku: "CI-005", codigo: "CI-005", nome: "Peça 5", qtd: 1, valor: 10 }],
  });
  let cupom: string | null = null;
  try {
    const da = (n: string) => `avaliacoes/${v.codigo}/${n}.jpg`;
    const r = await a.enviarAvaliacoes({
      codigo: v.codigo,
      nome: "Cliente Foto",
      idioma: "es",
      avaliacoes: [
        {
          sku: "CI-005",
          nota: 5,
          comentario: "Quedó perfecta",
          fotos: [
            da("1-a"),
            da("2-b"),
            "avaliacoes/OUTRACOMPRA/3.jpg", // de outra compra: fora
            "../../etc/passwd", // caminho estranho: fora
            da("4-c"),
            da("5-d"),
            da("6-e"), // passou de 4: fora
          ],
        },
      ],
    });
    cupom = r.cupom;
    const mod = await a.listarModeracao("PENDENTE");
    const minha = mod.lista.find((x: any) => x.venda_id === v.id);
    assert.ok(minha, "avaliação na moderação");
    assert.deepEqual(minha.fotos, [da("1-a"), da("2-b"), da("4-c"), da("5-d")]);
    assert.equal((await a.avaliacoesProduto("CI-005")).lista.length, 0, "sem aprovar não aparece");
    await a.moderar(minha.id, { status: "APROVADA" });
    const pub = await a.avaliacoesProduto("CI-005");
    assert.equal(pub.lista[0].fotos.length, 4, "fotos na página da peça");
    console.log("Fotos na avaliação: ok");
  } finally {
    await prisma.avaliacoes.deleteMany({ where: { venda_id: v.id } });
    if (cupom) await prisma.cupons.deleteMany({ where: { codigo: cupom } });
    await prisma.venda_etapas.deleteMany({ where: { venda_id: v.id } });
    await prisma.vendas.deleteMany({ where: { id: v.id } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
