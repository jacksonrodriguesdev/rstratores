// Cidades do RS, SC e PR geradas dos dados do IBGE (src/lib/municipios-sul.server.ts): endereço
// único e sem bater com os locais escritos à mão, conteúdo próprio (lavouras do IBGE) em todas,
// vizinhos que existem e os 1.191 municípios nas páginas dos estados. Não usa banco.
// Roda com: npx tsx scripts/ci/testar-municipios-sul.ts
import assert from "node:assert/strict";

async function main() {
  const { LOCAIS_SEO, localPorSlug } = await import("../../src/lib/locais-seo");
  const { locaisGerados, localGerado, extrasDoLocal, totalMunicipios } =
    await import("../../src/lib/municipios-sul.server");

  const geradas = locaisGerados();
  assert.ok(geradas.length >= 150, `cidades geradas: ${geradas.length}`);
  const slugs = [...LOCAIS_SEO.map((l) => l.slug), ...geradas.map((l) => l.slug)];
  assert.equal(
    new Set(slugs).size,
    slugs.length,
    "endereço repetido entre locais e cidades do IBGE",
  );

  for (const l of geradas) {
    // Conteúdo próprio: sem as lavouras do IBGE a página seria só o nome trocado
    assert.ok(l.ibge && l.ibge.ha > 0 && l.ibge.culturas.length, `${l.slug} sem dados do IBGE`);
    assert.equal(localGerado(l.slug)?.nome, l.nome);
    assert.equal(l.pais, "RS", "cidade do Sul do Brasil (versão em português)");
    const ex = extrasDoLocal(l);
    for (const v of ex.vizinhos)
      assert.ok(
        localPorSlug(v.slug) || localGerado(v.slug),
        `${l.slug}: vizinho ${v.slug} não existe`,
      );
  }
  // Nome que existe em dois estados ganha a sigla
  assert.ok(!geradas.some((l) => l.slug === "planalto"), "Planalto existe no RS e no PR");

  // Cidade escrita à mão ganha os números do IBGE
  const pelotas = localPorSlug("pelotas")!;
  assert.ok(extrasDoLocal(pelotas).ibge?.culturas.length, "Pelotas com dados do IBGE");

  // Páginas dos estados listam todos os municípios, com link quando a cidade tem página
  let total = 0;
  for (const nome of ["Rio Grande do Sul", "Santa Catarina", "Paraná"]) {
    const estado = LOCAIS_SEO.find((l) => l.nome === nome)!;
    const grupos = extrasDoLocal(estado).estado!;
    const cidades = grupos.flatMap((g) => g.cidades);
    total += cidades.length;
    for (const c of cidades.filter((c) => c.slug))
      assert.ok(localPorSlug(c.slug!) || localGerado(c.slug!), `${nome}: link quebrado ${c.slug}`);
  }
  assert.equal(total, totalMunicipios(), "todos os municípios nas páginas dos estados");
  assert.equal(totalMunicipios(), 1191);

  console.log(
    `✔ cidades do IBGE: ${geradas.length} páginas, ${total} municípios nas listas dos estados`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
