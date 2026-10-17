// Teste das campanhas (Black Friday) e cupons: datas, fases, regras de desconto, preço final,
// cupons e a campanha gravada no banco. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-campanha.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_CAMPANHA=1)
import assert from "node:assert/strict";
import {
  aplicarCupom,
  cupomMisterio,
  datasBlackFriday,
  descontoPara,
  faseDe,
} from "../../src/lib/campanha-comum";
import { precoVenda, type ConfigPrecos } from "../../src/lib/precos";

async function main() {
  // ---------- datas da Black Friday
  const d26 = datasBlackFriday(2026);
  assert.equal(
    d26.inicio.toISOString(),
    "2026-11-27T03:00:00.000Z",
    "BF 2026: sexta 27/11 00:00 do Uruguai",
  );
  assert.equal(
    d26.fim.toISOString(),
    "2026-12-01T02:59:59.000Z",
    "fim: Cyber Monday 30/11 23:59:59",
  );
  assert.equal(d26.pre_inicio.toISOString(), "2026-10-28T03:00:00.000Z", "pré: 30 dias antes");
  assert.equal(
    datasBlackFriday(2024).inicio.toISOString(),
    "2024-11-29T03:00:00.000Z",
    "BF 2024: 29/11",
  );
  assert.equal(
    datasBlackFriday(2024).fim.toISOString(),
    "2024-12-03T02:59:59.000Z",
    "Cyber Monday em dezembro",
  );
  assert.equal(
    datasBlackFriday(2029).inicio.toISOString(),
    "2029-11-23T03:00:00.000Z",
    "BF 2029: 23/11",
  );

  // ---------- fases
  const c = {
    pre_inicio: "2026-10-28T03:00:00Z",
    inicio: "2026-11-27T03:00:00Z",
    fim: "2026-12-01T03:00:00Z",
  };
  assert.equal(faseDe(c, new Date("2026-10-20T00:00:00Z")), "AGUARDANDO");
  assert.equal(faseDe(c, new Date("2026-10-28T03:00:00Z")), "PRE");
  assert.equal(faseDe(c, new Date("2026-11-27T02:59:59Z")), "PRE");
  assert.equal(faseDe(c, new Date("2026-11-27T03:00:00Z")), "BLACK");
  assert.equal(faseDe(c, new Date("2026-12-01T03:00:00Z")), "FIM");

  // ---------- regras: peça manda; entre categoria/marca/tudo vale o maior
  const regras = [
    { tipo: "TUDO" as const, alvo: "", pct: 5 },
    { tipo: "CATEGORIA" as const, alvo: "Filtros", pct: 20 },
    { tipo: "MARCA" as const, alvo: "Valtra", pct: 12 },
    { tipo: "ITEM" as const, alvo: "ABC-1", pct: 8 },
  ];
  assert.equal(
    descontoPara({ sku: "X", categoria: "Filtros", marca: "Valtra" }, regras),
    20,
    "maior entre categoria e marca",
  );
  assert.equal(
    descontoPara({ sku: "abc-1", categoria: "Filtros" }, regras),
    8,
    "regra da peça manda (mesmo menor)",
  );
  assert.equal(
    descontoPara({ sku: "Y", categoria: "Vedações", marca: "valtra" }, regras),
    12,
    "marca sem diferenciar maiúsculas",
  );
  assert.equal(
    descontoPara({ sku: "Z", categoria: "Outros" }, regras),
    5,
    "o resto pega o 'site todo'",
  );
  assert.equal(descontoPara({ sku: "Z" }, []), 0);

  // ---------- preço final
  const cfg: ConfigPrecos = {
    cotacao: 10,
    cotacaoEm: null,
    fonte: null,
    manual: true,
    arredondar: 0,
    ajuste: 0,
    margemPadrao: 0,
    mostrar: true,
    campanha: { id: 1, selo: "BLACK", fase: "BLACK", regras },
  };
  const p = precoVenda({ sku: "X", categoria: "Filtros", preco_brl: 100 }, cfg)!;
  assert.deepEqual(
    [p.brl, p.uyu, p.deBrl, p.deUyu, p.desconto, p.selo],
    [80, 800, 100, 1000, 20, "BLACK"],
    "-20% com selo BLACK",
  );
  const naPre = precoVenda(
    { sku: "X", categoria: "Filtros", preco_brl: 100 },
    { ...cfg, campanha: { ...cfg.campanha!, fase: "PRE" } },
  )!;
  assert.equal(naPre.selo, "PRE BLACK", "na pré-Black o selo diz PRE BLACK");
  const promo = precoVenda(
    { sku: "X", categoria: "Filtros", preco_brl: 100, valor_promocional: 70 },
    cfg,
  )!;
  assert.equal(promo.brl, 70, "promoção própria melhor fica");
  assert.ok(!promo.selo, "sem selo da campanha quando vale a promoção");
  const sem = precoVenda(
    { sku: "X", categoria: "Filtros", preco_brl: 100 },
    { ...cfg, campanha: null },
  )!;
  assert.equal(sem.brl, 100, "sem campanha: preço normal");
  assert.equal(
    precoVenda({ sku: "X", categoria: "Filtros" }, cfg),
    null,
    "peça sem preço continua sem preço",
  );

  // ---------- cupons
  const base = {
    codigo: "T",
    tipo: "PERCENT",
    valor: 10,
    moeda: "UYU",
    minimo: 0,
    inicio: null,
    fim: null,
    revelar_em: null,
    max_usos: 0,
    usos: 0,
    ativo: true,
  };
  assert.deepEqual(
    aplicarCupom(base, 100000, "UYU"),
    { ok: true, desconto: 10000, freteGratis: false },
    "10% de $U 1.000",
  );
  assert.deepEqual(
    aplicarCupom({ ...base, tipo: "FIXO", valor: 2000 }, 100000, "UYU"),
    { ok: true, desconto: 100000, freteGratis: false },
    "fixo não passa do subtotal",
  );
  assert.deepEqual(aplicarCupom({ ...base, minimo: 5000 }, 100000, "UYU"), {
    ok: false,
    motivo: "minimo",
  });
  assert.deepEqual(aplicarCupom({ ...base, fim: "2000-01-01" }, 100000, "UYU"), {
    ok: false,
    motivo: "vencido",
  });
  assert.deepEqual(aplicarCupom({ ...base, max_usos: 3, usos: 3 }, 100000, "UYU"), {
    ok: false,
    motivo: "esgotado",
  });
  assert.deepEqual(aplicarCupom({ ...base, tipo: "FIXO", valor: 100 }, 100000, "BRL"), {
    ok: false,
    motivo: "moeda",
  });
  assert.deepEqual(aplicarCupom({ ...base, tipo: "FRETE" }, 100000, "UYU"), {
    ok: true,
    desconto: 0,
    freteGratis: true,
  });
  assert.ok(
    cupomMisterio({ revelar_em: "2999-01-01" }) && !cupomMisterio({ revelar_em: null }),
    "mistério até revelar",
  );

  // ---------- banco: campanha ativa, fases, prévia do admin e preço
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_CAMPANHA === "1",
    "use um banco de teste",
  );
  const s = await import("../../src/lib/campanha.server");
  const precos = await import("../../src/lib/precos.server");
  await s.garantirTabelasCampanha();
  const ativasAntes = await prisma.campanhas.findMany({
    where: { ativa: true },
    select: { id: true },
  });
  await prisma.campanhas.updateMany({ where: { ativa: true }, data: { ativa: false } });
  const agora = Date.now();
  let id = 0;
  try {
    const camp = await prisma.campanhas.create({
      data: {
        nome: "Teste Black",
        ativa: true,
        pre_inicio: new Date(agora - 3600_000),
        inicio: new Date(agora + 86400_000),
        fim: new Date(agora + 2 * 86400_000),
        tema: "black",
        regras: {
          create: [
            { tipo: "TUDO", alvo: "", pct: 5, fase: "PRE" },
            { tipo: "CATEGORIA", alvo: "Filtros", pct: 20, fase: "BLACK", destaque: true },
          ],
        },
      },
    });
    id = camp.id;
    s.limparCacheCampanha();
    precos.limparCacheConfig();
    const pub = (await s.campanhaPublica())!;
    assert.equal(pub.fase, "PRE");
    assert.equal(pub.maxPct, 5, "na pré vale só a regra da pré");
    assert.equal(
      pub.alvo,
      new Date(agora + 86400_000).toISOString(),
      "contagem até o início da Black",
    );
    const previa = (await s.campanhaPublica("BLACK"))!;
    assert.equal(previa.fase, "BLACK");
    assert.equal(previa.maxPct, 20);
    assert.equal(previa.previa, true, "marcada como prévia");
    const cfgReal = await precos.configPrecos();
    assert.equal(cfgReal.campanha?.fase, "PRE");
    assert.deepEqual(
      cfgReal.campanha?.regras,
      [{ tipo: "TUDO", alvo: "", pct: 5 }],
      "preços com o desconto da pré",
    );
    // Cupom
    await prisma.cupons.create({
      data: { codigo: "TESTEBLACK10", campanha_id: id, tipo: "PERCENT", valor: 10, max_usos: 1 },
    });
    const v = await s.validarCupom("testeblack10", { subtotal: 50000, moeda: "UYU" });
    assert.ok(v.ok && v.desconto === 5000, "cupom do banco: 10% de $U 500");
    await s.contarUsoCupom("TESTEBLACK10");
    const v2 = await s.validarCupom("TESTEBLACK10", { subtotal: 50000, moeda: "UYU" });
    assert.ok(!v2.ok && v2.motivo === "esgotado", "1 uso só: esgotou");
    console.log("✔ campanhas e cupons: datas, fases, descontos, preço, cupons e prévia");
  } finally {
    await prisma.cupons.deleteMany({ where: { codigo: "TESTEBLACK10" } });
    if (id) await prisma.campanhas.delete({ where: { id } });
    if (ativasAntes.length)
      await prisma.campanhas.updateMany({
        where: { id: { in: ativasAntes.map((a) => a.id) } },
        data: { ativa: true },
      });
    s.limparCacheCampanha();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
