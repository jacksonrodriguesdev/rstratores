// Endereços em português na versão /pt (src/lib/caminhos-pt.ts): ida e volta sem perder nada,
// toda categoria/máquina/peça de src/lib/seo-paginas.ts com nome em português, e o que não é
// traduzido (marcas, peças, cidades) passa igual. Não usa banco.
// Roda com: npx tsx scripts/ci/testar-caminhos-pt.ts
import assert from "node:assert/strict";

async function main() {
  const { paraPt, paraEs, caminhoInterno, CATEGORIAS_PT } =
    await import("../../src/lib/caminhos-pt");
  const { comPrefixo, tirarPrefixo, linksIdioma } = await import("../../src/lib/idioma");
  const { CATEGORIAS_SEO, MAQUINAS_SEO, PECAS_SEO, MARCAS_SEO, slugify } =
    await import("../../src/lib/seo-paginas");
  const { LOCAIS_SEO } = await import("../../src/lib/locais-seo");

  // Toda página de categoria/máquina/peça tem endereço em português = nome em português
  for (const c of [...CATEGORIAS_SEO, ...MAQUINAS_SEO, ...PECAS_SEO]) {
    const pt = CATEGORIAS_PT[c.slug] ?? c.slug;
    assert.equal(pt, slugify(c.categoria), `/pecas/${pt} devia ser /pecas/${slugify(c.categoria)}`);
  }
  // Duas páginas não podem cair no mesmo endereço
  const destinos = Object.values(CATEGORIAS_PT);
  assert.equal(new Set(destinos).size, destinos.length, "endereços repetidos");
  for (const m of MARCAS_SEO) assert.ok(!CATEGORIAS_PT[m.slug], `marca ${m.slug} não muda`);

  const casos: Array<[string, string]> = [
    ["/", "/pt"],
    ["/loja", "/pt/loja"],
    ["/produto/ABC-123", "/pt/produto/ABC-123"],
    ["/repuestos", "/pt/pecas"],
    ["/repuestos/massey-ferguson", "/pt/pecas/massey-ferguson"],
    ["/repuestos/sellos-y-juntas", "/pt/pecas/vedacoes"],
    ["/repuestos/cosechadoras", "/pt/pecas/colheitadeiras"],
    ["/repuestos/john-deere/frenos-y-embragues", "/pt/pecas/john-deere/freios-e-embreagens"],
    ["/repuestos-agricolas", "/pt/pecas-agricolas"],
    ["/repuestos-agricolas/pelotas", "/pt/pecas-agricolas/pelotas"],
    ["/cotizar", "/pt/orcamento"],
    ["/ayuda#privacidad", "/pt/ajuda#privacidad"],
    ["/cupones?x=1", "/pt/cupons?x=1"],
    ["/guias/valtra-o-valmet", "/pt/guias/valtra-o-valmet"],
  ];
  for (const [interno, publico] of casos) {
    assert.equal(comPrefixo(interno, "pt"), publico, `ida ${interno}`);
    assert.equal(tirarPrefixo(publico), interno, `volta ${publico}`);
    assert.equal(comPrefixo(interno, "es"), interno, `espanhol não muda ${interno}`);
  }
  // Cidade nunca é traduzida (mesmo que o nome pareça uma categoria)
  for (const l of LOCAIS_SEO)
    assert.equal(paraPt(`/repuestos-agricolas/${l.slug}`), `/pecas-agricolas/${l.slug}`);
  // Links "Também enviamos para": todo vizinho existe e nenhuma cidade aparece duas vezes
  const { localPorSlug } = await import("../../src/lib/locais-seo");
  for (const l of LOCAIS_SEO)
    for (const v of l.vizinhos) assert.ok(localPorSlug(v), `${l.slug}: vizinho ${v} não existe`);
  const slugs = LOCAIS_SEO.map((l) => l.slug);
  assert.equal(new Set(slugs).size, slugs.length, "cidade repetida em locais-seo.ts");
  // Peça com código igual a uma categoria continua a mesma peça
  assert.equal(paraPt("/produto/filtros"), "/produto/filtros");
  // Endereço antigo (espanhol dentro de /pt) chega na mesma rota, e o canônico é o novo
  assert.equal(tirarPrefixo("/pt/repuestos/sellos-y-juntas"), "/repuestos/sellos-y-juntas");
  assert.equal(
    comPrefixo(tirarPrefixo("/pt/repuestos/sellos-y-juntas"), "pt"),
    "/pt/pecas/vedacoes",
  );
  assert.equal(caminhoInterno("/pt/pecas-agricolas/pelotas"), "/repuestos-agricolas/pelotas");
  assert.equal(caminhoInterno("/repuestos/filtros"), "/repuestos/filtros");
  assert.equal(paraEs("/pecas/vedacoes"), "/repuestos/sellos-y-juntas");
  // hreflang aponta para o endereço em português
  const links = linksIdioma("/repuestos/sellos-y-juntas", "pt");
  assert.ok(links[0].href.endsWith("/pt/pecas/vedacoes"), "canônico em português");
  assert.ok(
    links.some((l) => l.hrefLang === "es-UY" && l.href.endsWith("/repuestos/sellos-y-juntas")),
  );

  console.log("✔ endereços em português: ida e volta, categorias, cidades e canônico");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
