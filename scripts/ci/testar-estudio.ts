// Teste do Estúdio (Admin → Instagram e Facebook): fotos permitidas, ranking pelas visitas,
// WhatsApp e carrinho da semente, ideias de anúncio, horários, busca e legendas.
// Só lê o banco. Roda com: npx tsx scripts/ci/testar-estudio.ts
import assert from "node:assert/strict";

(async () => {
  const e = await import("../../src/lib/estudio.server");

  // Fotos: só agrotrator e uploads próprios
  assert.ok(e.fotoPropria("https://agrotrator2.vteximg.com.br/arquivos/ids/1/peca.jpg"));
  assert.ok(e.fotoPropria("produtos/abc.jpg"));
  assert.ok(e.fotoPropria("/uploads/produtos/abc.jpg"));
  assert.ok(!e.fotoPropria("https://www.redeparts.com.br/foto.jpg"));
  assert.ok(!e.fotoPropria("catalogo/foto.jpg"));
  assert.ok(!e.fotoPropria(null));
  console.log("✔ fotos: só próprias");

  const { produtos } = await e.recomendacoes(30, 24);
  const a = produtos.find((p) => p.sku === "CI-001");
  const b = produtos.find((p) => p.sku === "CI-002");
  assert.ok(a, "CI-001 (visita + WhatsApp) deveria estar nas recomendações");
  assert.ok(a.sinais.whatsapp >= 1 && a.sinais.views >= 1);
  assert.equal(a.cidades[0]?.nome, "Rocha");
  assert.ok(a.fotos.includes("produtos/ci-1.jpg"));
  if (b) assert.ok(a.pontos > b.pontos, "WhatsApp pesa mais que carrinho");
  assert.ok(a.ideias.length >= 1);
  for (const p of produtos)
    for (const i of p.ideias) assert.ok(["TRAFEGO", "WHATSAPP", "ORGANICO"].includes(i.objetivo));
  console.log(`✔ recomendações: ${produtos.length} peças, CI-001 com ${a.pontos} pontos`);

  const h = await e.melhoresHorarios(30);
  assert.equal(h.horas.length, 24);
  assert.equal(h.semana.length, 7);
  console.log(`✔ horários: ${h.topHoras.join(", ")}h`);

  const o = await e.sugestaoOrcamento();
  assert.ok("diario" in o);
  console.log(`✔ orçamento: ${o.diario ?? "sem histórico"} (${o.base})`);

  const achadas = await e.buscarPecas("CI-00");
  assert.ok(achadas.length >= 2);
  assert.ok(achadas.every((p) => p.foto === null || e.fotoPropria(p.foto)));
  console.log(`✔ busca: ${achadas.length} peças`);

  const l = e.legendas({ ...a, preco: a.preco });
  assert.equal(l.es.length, 3);
  assert.equal(l.pt.length, 2);
  const tudo = [...l.es, ...l.pt].join("\n");
  assert.ok(
    !/todo o brasil|todo brasil|o melhor preço|a maior loja/i.test(tudo),
    "sem promessas proibidas",
  );
  assert.ok(l.pt.every((x) => /todo o RS|link na bio/i.test(x)));
  console.log("✔ legendas ES/PT sem promessas sem prova");

  const { prisma } = await import("../../src/lib/prisma");
  await prisma.$disconnect();
  console.log("Estúdio OK");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
