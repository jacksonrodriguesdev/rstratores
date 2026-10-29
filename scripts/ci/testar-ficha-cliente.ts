// Teste da ficha do cliente (Admin → Clientes → olho): visitas com login e do mesmo navegador
// antes do login, peças vistas, «viu e não pediu» (WhatsApp e carrinho contam como pedido),
// buscas e linha do tempo. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-ficha-cliente.ts (só em banco de teste)
import assert from "node:assert/strict";

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const { prisma } = await import("../../src/lib/prisma");
  const { fichaCliente } = await import("../../src/lib/ficha-cliente.server");
  const sufixo = Date.now();
  const vid = `vis-ficha-${sufixo}`;
  const u = await prisma.users.create({
    data: {
      nome_completo: "Cliente Ficha Teste",
      email: `ficha${sufixo}@example.com`,
      senha_hash: "x",
      role: "USER",
      telefone: "+59899000000",
    } as any,
  });
  try {
    const agora = Date.now();
    // Antes do login (mesmo navegador): viu CI-001 e CI-003
    await prisma.site_visits.createMany({
      data: [
        {
          path: "/produto/CI-001",
          visitor_id: vid,
          session_id: "s1",
          created_at: new Date(agora - 3 * 86_400_000),
          city: "Rocha",
          device: "mobile",
          fonte: "facebook",
        },
        {
          path: "/produto/CI-003",
          visitor_id: vid,
          session_id: "s1",
          created_at: new Date(agora - 3 * 86_400_000 + 60_000),
        },
        // Com login: viu CI-001 de novo e CI-002
        {
          path: "/produto/CI-001",
          visitor_id: vid,
          session_id: "s2",
          user_id: u.id,
          created_at: new Date(agora - 3600_000),
        },
        {
          path: "/pt/produto/CI-002",
          visitor_id: vid,
          session_id: "s2",
          user_id: u.id,
          created_at: new Date(agora - 1800_000),
        },
        // Robô não conta
        { path: "/produto/CI-004", visitor_id: vid, session_id: "s3", user_agent: "Googlebot/2.1" },
      ] as any,
    });
    await prisma.site_eventos.createMany({
      data: [
        {
          tipo: "whatsapp",
          dado: "CI-002",
          pagina: "/pt/produto/CI-002",
          visitor_id: vid,
          user_id: u.id,
        },
        { tipo: "busca", dado: "bomba hidraulica", visitor_id: vid },
      ],
    });
    await prisma.carrinhos.create({
      data: {
        visitante_id: vid,
        user_id: u.id,
        itens: JSON.stringify([{ sku: "CI-003", codigo: "CI-003", name: "Peça 3", quantity: 1 }]),
        qtd_itens: 1,
      },
    });

    const f = await fichaCliente(u.id);
    assert.equal(f.perfil.email, u.email);
    assert.equal(f.navegacao.visitas, 4, "4 visitas de gente (sem o robô)");
    assert.equal(f.navegacao.dias >= 2, true);
    const vistas = Object.fromEntries(f.pecasVistas.map((p) => [p.sku, p]));
    assert.equal(vistas["CI-001"].vezes, 2, "conta a visita antes do login");
    assert.equal(vistas["CI-001"].pediu, false);
    assert.equal(vistas["CI-002"].pediu, true, "WhatsApp da peça conta como pedido");
    assert.equal(vistas["CI-003"].pediu, true, "carrinho conta como pedido");
    assert.ok(!vistas["CI-004"], "visita de robô fora");
    assert.equal(f.naoPediu, 1);
    assert.equal(f.pecasVistas[0].sku, "CI-001", "quem não pediu vem primeiro");
    assert.deepEqual(
      f.buscas.map((b) => b.termo),
      ["bomba hidraulica"],
    );
    assert.equal(f.navegacao.whatsapp, 1);
    assert.ok(f.navegacao.origens.some((o) => o.nome === "facebook"));
    assert.ok(f.tempo.length >= 6);
    assert.equal(f.carrinhos.length, 1);
    await assert.rejects(fichaCliente(-1), /não encontrado/);
    console.log("Ficha do cliente: ok");
  } finally {
    await prisma.site_visits.deleteMany({ where: { visitor_id: vid } });
    await prisma.site_eventos.deleteMany({ where: { visitor_id: vid } });
    await prisma.carrinhos.deleteMany({ where: { visitante_id: vid } });
    await prisma.users.deleteMany({ where: { id: u.id } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
