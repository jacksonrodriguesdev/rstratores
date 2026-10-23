// Teste da limpeza das estatísticas: visitas de fora da região com uma página só e sem ação saem;
// aparelhos das contas internas (admin e lista da configuração) saem e os eventos deles são apagados;
// clientes de Uruguai/Brasil e quem navegou de verdade ficam. Também a contagem de quem voltou
// e a busca «valmet» achando Valtra. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-limpeza-estatisticas.ts (só em banco de teste)
import assert from "node:assert/strict";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function main() {
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const { eventosProntos } = await import("../../src/lib/eventos-db.server");
  await eventosProntos();
  const { executar } = await import("../../src/lib/limpeza-estatisticas.server");
  const { ehRobo } = await import("../../src/lib/rastreio.server");
  const rd = await import("../../src/lib/resumo-diario.server");
  const { sinonimosBusca } = await import("../../src/lib/pecas-es");

  assert.deepEqual(sinonimosBusca("valmet"), ["VALTRA"]);
  assert.deepEqual(sinonimosBusca("Valtra"), ["VALMET"]);
  assert.deepEqual(sinonimosBusca("filtro"), []);
  assert.ok(ehRobo("fora-regiao " + CHROME) && ehRobo("visita-interna " + CHROME));

  const P = "teste-limpeza-";
  const limpar = async () => {
    await prisma.site_visits.deleteMany({ where: { visitor_id: { startsWith: P } } });
    await prisma.site_eventos.deleteMany({ where: { visitor_id: { startsWith: P } } });
    await prisma.users.deleteMany({ where: { email: { startsWith: P } } });
    await prisma.configuracoes.deleteMany({ where: { chave: "estatisticas_contas_internas" } });
  };
  await limpar();
  try {
    const admin = await prisma.users.create({
      data: { email: `${P}admin@x.com`, nome_completo: "Admin", role: "ADMIN", senha_hash: "x" },
    });
    const testeConta = await prisma.users.create({
      data: { email: `${P}teste@x.com`, nome_completo: "Teste", senha_hash: "x" },
    });
    await prisma.configuracoes.create({
      data: { chave: "estatisticas_contas_internas", valor: `${P}teste@x.com, outro@x.com` },
    });
    const agora = new Date();
    const ontem = new Date(Date.now() - 86400000);
    const visita = (v: string, s: string, pais: string | null, extra: any = {}) =>
      prisma.site_visits.create({
        data: {
          path: "/",
          visitor_id: P + v,
          session_id: P + s,
          country_code: pais,
          user_agent: CHROME,
          created_at: agora,
          ...extra,
        },
      });
    // Robô de Manchester: 1 página, sem ação
    await visita("gb1", "gb1", "GB");
    // Estrangeiro que navegou 2 páginas: fica
    await visita("gb2", "gb2", "GB");
    await visita("gb2", "gb2", "GB", { path: "/loja" });
    // Estrangeiro de 1 página que clicou no WhatsApp: fica
    await visita("us1", "us1", "US");
    await prisma.site_eventos.create({
      data: { tipo: "whatsapp", dado: "x", visitor_id: P + "us1", session_id: P + "us1" },
    });
    // Cliente do Uruguai de 1 página: fica; e voltou em outro dia (recorrente)
    await visita("uy1", "uy1", "UY");
    await visita("uy1", "uy1b", "UY", { created_at: ontem });
    // Aparelho do admin: visitas sem login também saem, e o clique no WhatsApp é apagado
    await visita("adm", "adm1", "BR", { user_id: admin.id });
    await visita("adm", "adm2", "BR");
    await prisma.site_eventos.create({
      data: { tipo: "whatsapp", dado: "x", visitor_id: P + "adm", session_id: P + "adm2" },
    });
    // Conta de teste da lista
    await visita("tst", "tst1", "UY", { user_id: testeConta.id });

    const r = await executar();
    assert.ok(r.internas >= 3, `internas: ${r.internas}`);
    const ua = async (v: string) =>
      (await prisma.site_visits.findMany({ where: { visitor_id: P + v } })).map(
        (x) => x.user_agent ?? "",
      );
    assert.ok(
      (await ua("gb1")).every((u) => u.startsWith("fora-regiao ")),
      "robô de fora marcado",
    );
    assert.ok(
      (await ua("gb2")).every((u) => u === CHROME),
      "estrangeiro que navegou fica",
    );
    assert.ok(
      (await ua("us1")).every((u) => u === CHROME),
      "estrangeiro com ação fica",
    );
    assert.ok(
      (await ua("uy1")).every((u) => u === CHROME),
      "cliente do Uruguai fica",
    );
    assert.ok(
      (await ua("adm")).every((u) => u.startsWith("visita-interna ")),
      "admin marcado",
    );
    assert.ok(
      (await ua("tst")).every((u) => u.startsWith("visita-interna ")),
      "conta de teste marcada",
    );
    assert.equal(await prisma.site_eventos.count({ where: { visitor_id: P + "adm" } }), 0);
    assert.equal(await prisma.site_eventos.count({ where: { visitor_id: P + "us1" } }), 1);

    // Rodar de novo não marca duas vezes
    await executar();
    assert.ok((await ua("gb1")).every((u) => !u.startsWith("fora-regiao fora-regiao")));

    // Quem voltou em outro dia conta como recorrente
    const u = await rd.visitantesDoPeriodo(7);
    assert.ok(u.recorrentes >= 1, `recorrentes: ${u.recorrentes}`);
    console.log("ok: limpeza das estatísticas", r);
  } finally {
    await limpar();
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
