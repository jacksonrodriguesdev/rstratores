// Teste do Estúdio (Admin → Instagram e Facebook): fotos permitidas, ranking pelas visitas,
// WhatsApp e carrinho da semente, ideias de anúncio, horários, busca e legendas.
// Só lê o banco. Roda com: npx tsx scripts/ci/testar-estudio.ts
import assert from "node:assert/strict";

(async () => {
  const e = await import("../../src/lib/estudio.server");

  // Fotos: só agrotrator e uploads próprios
  // Só fotos do nosso servidor: link externo da agrotrator não é usado
  assert.ok(!e.fotoPropria("https://agrotrator2.vteximg.com.br/arquivos/ids/1/peca.jpg"));
  const f = await import("../../src/lib/fotos");
  assert.ok(f.fotoInvalida("https://agrotrator2.vteximg.com.br/arquivos/ids/1/peca.jpg"));
  assert.ok(f.fotoInvalida("//www.agrotrator.com.br/x.jpg"));
  assert.ok(f.fotoInvalida("https://redeparts.com.br/logo.jpg"));
  assert.ok(f.fotoInvalida(null));
  assert.ok(!f.fotoInvalida("agrotrator/5003584-1.jpg"));
  assert.ok(!f.fotoInvalida("produtos/abc.jpg"));
  // Em produção as fotos da agrotrator ficam copiadas no servidor: uploads/agrotrator/<sku>-1.jpg
  assert.ok(e.fotoPropria("agrotrator/5003584-1.jpg"));
  assert.ok(e.fotoPropria("/uploads/agrotrator/5003584-1.jpg"));
  assert.ok(!e.fotoPropria("agrotrator/"));
  assert.ok(!e.fotoPropria("https://exemplo.com/agrotrator/x.jpg"));
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

  // Textos do Estúdio: 6 tons × 2 idiomas, sem frases proibidas, hashtags e verificador
  const tx = await import("../../src/lib/estudio-textos");
  for (const [tom] of tx.TONS)
    for (const idioma of ["es", "pt"] as const) {
      const t = tx.legenda({ ...a, categoria: "Filtros" }, idioma, tom, { tags: true });
      assert.ok(t.includes(a.codigo), `legenda ${tom}/${idioma} tem o código`);
      const ruins = tx
        .verificarLegenda(t)
        .filter((v) => !v.ok && !/caracteres|Primeira linha/.test(v.texto));
      assert.deepEqual(ruins, [], `legenda ${tom}/${idioma} passa no verificador`);
    }
  assert.ok(tx.hashtags({ marca: "Massey Ferguson", categoria: "Filtros" }, "pt").length <= 15);
  assert.ok(tx.hashtags({ marca: "Massey Ferguson" }, "es").includes("#MasseyFerguson"));
  const ruim = tx.verificarLegenda("Envio para todo o Brasil com o melhor preço");
  assert.equal(ruim.filter((v) => !v.ok).length >= 2, true, "verificador pega frases proibidas");
  assert.match(tx.linkWhatsApp("Hola"), /^https:\/\/wa\.me\/5553991831101\?text=Hola$/);
  assert.match(
    tx.linkUtm("/loja", { fonte: "instagram", meio: "bio", campanha: "pre-black" }),
    /utm_source=instagram&utm_medium=bio&utm_campaign=pre-black/,
  );
  for (const d of tx.DICAS) assert.ok(d.es[0] && d.pt[0]);
  console.log(`✔ textos: ${tx.TONS.length} tons × 2 idiomas, hashtags, links e verificador`);

  // Banco de posts: forma da resposta (no CI as peças não têm foto da agrotrator)
  const banco = await e.bancoPosts({ pagina: 0, ordem: "novas" });
  assert.equal(typeof banco.total, "number");
  assert.ok(banco.itens.every((i) => e.fotoPropria(i.foto) && /agrotrator/i.test(i.foto ?? "")));
  const fb = await e.filtrosBanco();
  assert.equal(fb.total, banco.total);
  await e.cuponsParaArte();
  console.log(`✔ banco de posts: ${banco.total} (filtros e cupons ok)`);

  const { prisma } = await import("../../src/lib/prisma");
  await prisma.$disconnect();
  console.log("Estúdio OK");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
