// Teste dos anúncios prontos do dia (Meta Ads → Criar): geração com os dados da semente,
// regras (só Uruguai, sem promessas proibidas, link com UTM, oferta só com desconto),
// filtros e nomes limpos. Só lê o banco. Roda com: npx tsx scripts/ci/testar-anuncios-prontos.ts
import assert from "node:assert/strict";

(async () => {
  const ap = await import("../../src/lib/anuncios-prontos.server");
  const { DEPTOS } = await import("../../src/lib/locais-anuncio");

  // Nomes limpos para o texto
  assert.equal(
    ap.nomeLimpo({
      nome: "Kit Reparación Motor Tractor Valtra 82636800 AGCO",
      codigo: "82636800",
      sku: "x",
      marca: "Valtra",
    }),
    "Kit Reparación Motor Tractor",
  );
  assert.equal(
    ap.nomeLimpo({
      nome: "Cuerpo del Filtro Succión Pulverizador Jacto 005785 Jacto",
      codigo: "005785",
      sku: "x",
      marca: null,
    }),
    "Cuerpo del Filtro Succión Pulverizador Jacto",
  );
  assert.equal(
    ap.nomeLimpo({ nome: "Filtro", codigo: "F1", sku: "F1", marca: null }),
    "Filtro",
    "nome curto fica",
  );
  console.log("✔ nome da peça sem código e marca repetidos");

  // Época e campanha pelo calendário
  assert.equal(ap._teste.epoca(new Date(2026, 9, 20)).nome, "siembra");
  assert.equal(ap._teste.epoca(new Date(2026, 3, 10)).nome, "cosecha");
  assert.equal(ap._teste.campanhaAtual(new Date(2026, 9, 20)), "Pre Black Friday");
  assert.equal(ap._teste.campanhaAtual(new Date(2026, 10, 28)), "Black Friday");
  assert.equal(ap._teste.campanhaAtual(new Date(2026, 1, 1)), null);
  console.log("✔ época (siembra/cosecha) e campanha (Pre Black / Black Friday)");

  const r = await ap.buscarProntos({}, 30, 5000);
  assert.ok(r.totalDia > 0, "gera anúncios com os dados da semente");
  const todos = r.itens;
  for (const a of todos) {
    assert.ok(
      a.local.regioes.every((x) => DEPTOS.includes(x)),
      `só departamentos do Uruguai: ${a.local.regioes}`,
    );
    assert.ok(
      !/todo o brasil|mejor precio|la mayor tienda|el más barato/i.test(a.texto + a.titulo),
      `texto sem promessa: ${a.id}`,
    );
    assert.match(
      a.link,
      /^https:\/\/.+\/produto\/.+utm_source=facebook&utm_medium=cpc&utm_campaign=prontos-/,
    );
    assert.equal(a.objetivo === "WHATSAPP", a.angulo === "whatsapp");
    if (a.angulo === "oferta") assert.ok(a.peca.desconto > 0, "oferta só com desconto real");
    if (a.angulo === "maquina")
      assert.ok(a.local.regioes.length === 1, "máquina da região só com departamento");
    assert.ok(a.titulo.length <= 40, `título até 40: ${a.titulo}`);
    assert.ok(a.peca.fotos.length > 0, "só peças com foto própria");
    assert.ok(
      /^\P{Ll}/u.test(a.texto.replace(/^\P{L}+/u, "")),
      `começa com maiúscula: ${a.texto.slice(0, 30)}`,
    );
  }
  // Ordenado pela pontuação
  for (let i = 1; i < Math.min(50, todos.length); i++)
    assert.ok(todos[i - 1].score >= todos[i].score);
  console.log(
    `✔ ${r.totalDia} anúncios: só Uruguai, sem promessas, UTM, oferta só com desconto, ordenados`,
  );

  // Filtros
  const local = r.facetas.locais.find((x) => x.nome !== "Todo o Uruguai")?.nome;
  if (local) {
    const f = await ap.buscarProntos({ local }, 30);
    assert.ok(
      f.itens.length &&
        f.itens.every((a) => a.local.nome === local && a.local.regioes[0] === local),
    );
  }
  const w = await ap.buscarProntos({ objetivo: "WHATSAPP" }, 30);
  assert.ok(w.itens.every((a) => a.objetivo === "WHATSAPP"));
  const p2 = await ap.buscarProntos({ pagina: 1 }, 30, 10);
  assert.equal(p2.pagina, 1);
  console.log("✔ filtros por local, objetivo e página");

  const { prisma } = await import("../../src/lib/prisma");
  await prisma.$disconnect();
  console.log("Anúncios prontos OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
