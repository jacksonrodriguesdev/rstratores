// Teste da automação «peças vistas sem orçamento» e do painel de controle:
// recebe quem viu peças há mais de N horas e não pediu nada; fica de fora quem chamou no WhatsApp
// e quem ainda está navegando; as peças vão na ordem das mais vistas; no painel, o envio conta
// WhatsApp e compra feitos depois do e-mail; depois de receber, não recebe de novo no intervalo.
// Roda com: npx tsx scripts/ci/testar-interesse-email.ts (só em banco de teste; não envia e-mail)
import assert from "node:assert/strict";

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  delete process.env.RESEND_API_KEY;
  const { prisma } = await import("../../src/lib/prisma");
  const { garantirColunasEmail } = await import("../../src/lib/email.server");
  await garantirColunasEmail();
  const { selecionarInteresse } = await import("../../src/lib/automacoes.server");
  const { painelInteresse } = await import("../../src/lib/interesse-painel.server");
  const { defTipo } = await import("../../src/lib/automacoes-tipos");
  const s = Date.now();
  const H = 3600_000;
  const novo = (n: string) =>
    prisma.users.create({
      data: {
        nome_completo: `${n} Teste`,
        email: `int-${n}-${s}@example.com`,
        senha_hash: "x",
        role: "USER",
        recebe_emails: true,
      } as any,
    });
  const [quieto, falou, navegando] = await Promise.all([
    novo("quieto"),
    novo("falou"),
    novo("navegando"),
  ]);
  const users = [quieto.id, falou.id, navegando.id];
  const auto = await prisma.email_automacoes.create({
    data: {
      tipo: "interesse_sem_pedido",
      nome: "Teste peças vistas",
      assunto: "x",
      conteudo: "{}",
      publico: JSON.stringify({ tipo: "todos", departamentos: [], dias: 30 }),
      config: JSON.stringify(defTipo("interesse_sem_pedido").config),
    },
  });
  const vendas: number[] = [];
  try {
    const antes = new Date(Date.now() - 30 * H);
    await prisma.site_visits.createMany({
      data: [
        { path: "/produto/CI-001", user_id: quieto.id, created_at: antes },
        { path: "/produto/CI-002", user_id: quieto.id, created_at: antes },
        {
          path: "/produto/CI-002",
          user_id: quieto.id,
          created_at: new Date(antes.getTime() + 60_000),
        },
        { path: "/produto/CI-003", user_id: falou.id, created_at: antes },
        { path: "/produto/CI-004", user_id: navegando.id, created_at: new Date(Date.now() - H) },
      ],
    });
    await prisma.site_eventos.create({
      data: {
        tipo: "whatsapp",
        dado: "CI-003",
        user_id: falou.id,
        created_at: new Date(antes.getTime() + 120_000),
      },
    });
    const cfg = defTipo("interesse_sem_pedido").config;
    const publico = { tipo: "todos", departamentos: [], dias: 30 } as any;
    const envios = await selecionarInteresse(auto.id, cfg, publico, Date.now());
    const ids = envios.map((e) => e.user.id);
    assert.ok(ids.includes(quieto.id), "viu e não pediu: recebe");
    assert.ok(!ids.includes(falou.id), "chamou no WhatsApp: fica de fora");
    assert.ok(!ids.includes(navegando.id), "ainda navegando: espera");
    const meu = envios.find((e) => e.user.id === quieto.id)!;
    assert.deepEqual(
      meu.produtos!.map((p) => p.sku),
      ["CI-002", "CI-001"],
      "a mais vista primeiro",
    );
    assert.ok(meu.whatsappTexto?.includes("CI-002"));

    // Envio feito há 2 h, com cupom; depois o cliente chamou no WhatsApp e comprou
    await prisma.email_envios.create({
      data: {
        automacao_id: auto.id,
        user_id: quieto.id,
        email: quieto.email,
        tipo: "AUTOMACAO",
        status: "ABERTO",
        aberto_em: new Date(Date.now() - H),
        chave: meu.chave,
        produtos: JSON.stringify(["CI-002", "CI-001"]),
        cupom: "OFERTATESTE",
        created_at: new Date(Date.now() - 2 * H),
      },
    });
    await prisma.site_eventos.create({
      data: {
        tipo: "whatsapp",
        dado: "CI-002",
        user_id: quieto.id,
        created_at: new Date(Date.now() - 30 * 60_000),
      },
    });
    const v = await prisma.vendas.create({
      data: {
        codigo: `CIINT${s % 100000}`,
        cliente_nome: quieto.nome_completo,
        cliente_email: quieto.email,
        user_id: quieto.id,
        itens: JSON.stringify([
          { sku: "CI-002", codigo: "CI-002", nome: "Peça 2", qtd: 1, valor: 500 },
        ]),
        total: 500,
        moeda: "UYU",
      },
    });
    vendas.push(v.id);
    const p = await painelInteresse(30);
    const linha = p.linhas.find((l) => l.cliente.id === quieto.id)!;
    assert.ok(linha, "envio no painel");
    assert.equal(linha.abriu, true);
    assert.ok(linha.whatsapp, "WhatsApp depois do e-mail");
    assert.equal(linha.compra?.total, 500);
    assert.equal(linha.compra?.pecaEnviada, true);
    assert.equal(linha.produtos.length, 2);
    assert.ok(p.resumo.responderam >= 1 && p.resumo.compras >= 1);
    assert.equal(p.automacao?.id, auto.id);
    // Já recebeu: não recebe de novo no intervalo
    const de2 = await selecionarInteresse(auto.id, cfg, publico, Date.now());
    assert.ok(!de2.some((e) => e.user.id === quieto.id), "respeita o intervalo");
    console.log("E-mail de peças vistas: ok");
  } finally {
    await prisma.email_envios.deleteMany({ where: { automacao_id: auto.id } });
    await prisma.email_automacoes.delete({ where: { id: auto.id } });
    await prisma.vendas.deleteMany({ where: { id: { in: vendas } } });
    await prisma.site_visits.deleteMany({ where: { user_id: { in: users } } });
    await prisma.site_eventos.deleteMany({ where: { user_id: { in: users } } });
    await prisma.users.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
