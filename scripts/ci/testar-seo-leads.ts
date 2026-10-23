// Teste da Fase 1 do SEO: títulos das peças (código na frente, até 60 caracteres, "| Uruguay"),
// descrição com preço em $U, lista guardada que entrega o valor antigo enquanto recalcula, e o
// painel de leads do Google (visitas por busca orgânica que pediram preço). Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-seo-leads.ts (só em banco de teste)
import assert from "node:assert/strict";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function main() {
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");

  // ---- Títulos e descrições
  const { tituloPeca, metaDescricaoPeca } = await import("../../src/lib/descricao-peca");
  const peca = {
    sku: "30250100TF",
    nome: "FILTRO HIDRAULICO TRATOR VALTRA 30250100 TECFIL",
    codigo_fabricante: "30250100",
    marca: "Valtra",
    categoria: "Filtros",
    estoque: 3,
  };
  const t = tituloPeca(peca, "es");
  assert.ok(t.startsWith("30250100 · "), `código na frente: ${t}`);
  assert.ok(t.length <= 60, `até 60 caracteres: ${t}`);
  assert.equal(t.match(/30250100/g)?.length, 1, "código uma vez só");
  const repetido = tituloPeca(
    {
      sku: "000026JCT",
      nome: "PICO NEGRO PULVERIZADOR JACTO 000026 JACTO",
      codigo_fabricante: "000026",
      marca: "Jacto",
    },
    "es",
  );
  assert.equal(repetido.match(/jacto/gi)?.length, 1, `marca repetida sai: ${repetido}`);
  const longo = tituloPeca(
    {
      sku: "X1",
      nome: "CONJUNTO COMPLETO DE ENGRANAJES DE LA TRANSMISION DELANTERA CON RODAMIENTOS Y RETENES",
      codigo_fabricante: "ABC123456",
      marca: "Massey Ferguson",
    },
    "es",
  );
  assert.ok(longo.length <= 60 && longo.startsWith("ABC123456 · "), `longo: ${longo}`);
  const d = metaDescricaoPeca(peca, "es", {
    precoUyu: 1420,
    equivalentes: ["P550148", null as any],
  });
  assert.ok(d.includes("$U 1.420") || d.includes("$U 1420"), `preço: ${d}`);
  assert.ok(d.includes("P550148") && d.includes("Uruguay") && d.length <= 160, `descrição: ${d}`);
  // Português continua como antes (marca da loja)
  assert.ok(tituloPeca(peca, "pt").includes("AGRO PARTS") || tituloPeca(peca, "pt").length <= 62);

  // ---- Lista guardada: venceu → entrega o valor antigo e recalcula por trás
  const { emCache } = await import("../../src/lib/cache.server");
  let n = 0;
  const calc = async () => ++n;
  assert.equal(await emCache("teste-seo", 1, calc), 1);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(await emCache("teste-seo", 1, calc), 1, "vencido: valor antigo na hora");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(await emCache("teste-seo", 60_000, calc), 2, "depois: valor novo");

  // ---- Leads do Google
  const P = "teste-leads-";
  const limpar = async () => {
    await prisma.site_visits.deleteMany({ where: { visitor_id: { startsWith: P } } });
    await prisma.site_eventos.deleteMany({ where: { visitor_id: { startsWith: P } } });
  };
  await limpar();
  try {
    const agora = Date.now();
    const visita = (s: string, path: string, meio: string, seg: number) =>
      prisma.site_visits.create({
        data: {
          path,
          visitor_id: P + s,
          session_id: P + s,
          country_code: "UY",
          city: "Montevideo",
          user_agent: CHROME,
          fonte: meio === "orgânico" ? "google" : "facebook",
          meio,
          created_at: new Date(agora - 3600_000 + seg * 1000),
        },
      });
    // Sessão 1: entrou pela peça, viu a loja, pediu no WhatsApp
    await visita("a", "/produto/30250100TF", "orgânico", 0);
    await visita("a", "/loja", "orgânico", 30);
    await prisma.site_eventos.create({
      data: { tipo: "whatsapp", dado: "30250100TF", visitor_id: P + "a", session_id: P + "a" },
    });
    // Sessão 2: entrou pela versão /pt da mesma peça, não pediu
    await visita("b", "/pt/produto/30250100TF?x=1", "orgânico", 0);
    // Sessão 3: veio do Facebook (não conta) e pediu
    await visita("c", "/", "social", 0);
    await prisma.site_eventos.create({
      data: { tipo: "whatsapp", dado: "Z1", visitor_id: P + "c", session_id: P + "c" },
    });

    const { leadsOrganicos } = await import("../../src/lib/leads-organicos.server");
    const r = await leadsOrganicos(7);
    assert.ok(r.sessoes >= 2, `sessões orgânicas: ${r.sessoes}`);
    const pag = r.paginas.find((p) => p.pagina === "/produto/30250100TF");
    assert.ok(
      pag && pag.sessoes >= 2 && pag.leads >= 1,
      `página de entrada: ${JSON.stringify(pag)}`,
    );
    assert.ok(
      r.pecas.some((p) => p.peca === "30250100TF"),
      "peça pedida",
    );
    assert.ok(!r.pecas.some((p) => p.peca === "Z1"), "Facebook não entra");
    assert.ok(r.recentes.some((l) => l.entrada === "/produto/30250100TF" && l.acao === "WhatsApp"));
    assert.equal(r.porDia.length, 7);
    console.log("ok: SEO fase 1 (títulos, descrição, lista guardada, leads do Google)");
  } finally {
    await limpar();
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
