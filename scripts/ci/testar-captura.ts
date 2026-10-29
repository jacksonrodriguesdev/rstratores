// Teste da captação de visitantes:
// 1) «Avisame si baja el precio»: aviso por WhatsApp, por e-mail e pela conta (sem digitar nada);
//    contato inválido e peça sem preço recusados; o mesmo contato na mesma peça não duplica;
//    preço baixou ≥ 1% → WhatsApp vai para a fila do admin, conta recebe o sininho; subir não avisa.
// 2) Visitantes quentes: quem viu 3+ peças sem conta; quem tem conta fica de fora; quem deixou o
//    WhatsApp no pop-up e quem pediu pelo WhatsApp aparecem separados; agrupado por origem.
// Roda com: npx tsx scripts/ci/testar-captura.ts (só em banco de teste; não envia e-mail)
import assert from "node:assert/strict";

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  delete process.env.RESEND_API_KEY;
  const { prisma } = await import("../../src/lib/prisma");
  const av = await import("../../src/lib/aviso-preco.server");
  const { visitantesQuentes } = await import("../../src/lib/visitantes-quentes.server");
  const { garantirTabelaContatos } = await import("../../src/lib/contato-whatsapp.server");
  const s = Date.now();
  const u = await prisma.users.create({
    data: {
      nome_completo: "Aviso Teste",
      email: `aviso-${s}@example.com`,
      senha_hash: "x",
      role: "USER",
    } as any,
  });
  const precoOriginal = (await prisma.agricolas.findUnique({ where: { sku: "CI-003" } }))!
    .preco_brl;
  const vids = ["q-anon", "q-wa", "q-pediu", "q-conta", "q-pouco"].map((v) => `${v}-${s}`);
  try {
    // ---------- 1) Avisos de preço ----------
    const ruim = await av.criarAviso({ sku: "CI-003", contato: "abc", idioma: "es" });
    assert.ok("erro" in ruim && ruim.erro === "contato");
    const semPreco = await av.criarAviso({
      sku: "NAO-EXISTE",
      contato: "099 111 222",
      idioma: "es",
    });
    assert.ok("erro" in semPreco && semPreco.erro === "sem_preco");

    const wa = await av.criarAviso({ sku: "CI-003", contato: "099 111 222", idioma: "es" });
    assert.ok("ok" in wa && wa.canal === "whatsapp" && wa.novo);
    const de2 = await av.criarAviso({ sku: "CI-003", contato: "+598 99 111 222", idioma: "es" });
    assert.ok("ok" in de2 && !de2.novo, "mesmo celular na mesma peça: não duplica");
    const conta = await av.criarAviso({ sku: "CI-003", userId: u.id, idioma: "pt" });
    assert.ok("ok" in conta && conta.canal === "email", "logado: usa o e-mail da conta");
    const outra = await av.criarAviso({
      sku: "CI-004",
      contato: "cliente@example.com",
      idioma: "es",
    });
    assert.ok("ok" in outra && outra.canal === "email");

    // Subiu: ninguém é avisado
    await prisma.agricolas.update({
      where: { sku: "CI-003" },
      data: { preco_brl: precoOriginal * 1.1 },
    });
    let r = await av.processarAvisosPreco();
    assert.equal(r.baixaram, 0, "subir o preço não avisa");

    // Baixou 20%: WhatsApp na fila, conta com sininho (sem Resend o e-mail não sai)
    await prisma.agricolas.update({
      where: { sku: "CI-003" },
      data: { preco_brl: precoOriginal * 0.8 },
    });
    r = await av.processarAvisosPreco();
    assert.equal(r.baixaram, 2);
    const { avisos, resumo } = await av.listarAvisos();
    const doWa = avisos.find((a) => a.telefone === "+59899111222")!;
    assert.equal(doWa.status, "WHATSAPP", "só WhatsApp: fila do admin");
    assert.ok(doWa.avisoBrl! < doWa.refBrl);
    const daConta = avisos.find((a) => a.email === u.email)!;
    assert.equal(daConta.status, "AVISADO", "com conta: sininho");
    const sino = await prisma.notificacoes.findFirst({ where: { user_id: u.id } });
    assert.ok(
      sino?.titulo.startsWith("Baixou o preço"),
      "sininho em português (aviso pedido em /pt)",
    );
    assert.equal(
      avisos.find((a) => a.sku === "CI-004")!.status,
      "ATIVO",
      "outra peça segue esperando",
    );
    assert.ok((resumo.WHATSAPP ?? 0) >= 1);
    // Avisado não dispara de novo
    r = await av.processarAvisosPreco();
    assert.equal(r.baixaram, 0, "um aviso só");
    await av.marcarAvisoWhatsapp(doWa.id);
    assert.equal((await av.listarAvisos()).avisos.find((a) => a.id === doWa.id)!.status, "AVISADO");

    // ---------- 2) Visitantes quentes ----------
    const [anon, comWa, pediu, comConta, pouco] = vids;
    const H = 3600_000;
    const visita = (vid: string, path: string, h: number, extra: Record<string, unknown> = {}) => ({
      visitor_id: vid,
      session_id: `${vid}-s${Math.floor(h / 24)}`,
      path,
      created_at: new Date(Date.now() - h * H),
      country_code: "UY",
      city: "Salto",
      device: "mobile",
      fonte: "facebook",
      utm_campaign: "remarketing_ci",
      ...extra,
    });
    const tres = (vid: string, extra: Record<string, unknown> = {}) =>
      ["CI-005", "CI-006", "CI-007"].map((p, i) => visita(vid, `/produto/${p}`, 50 - i, extra));
    await prisma.site_visits.createMany({
      data: [
        ...tres(anon),
        visita(anon, "/produto/CI-005", 2), // voltou outro dia
        ...tres(comWa),
        ...tres(pediu),
        ...tres(comConta),
        visita(comConta, "/", 1, { user_id: u.id }),
        visita(pouco, "/produto/CI-005", 3),
      ],
    });
    await prisma.site_eventos.create({
      data: { tipo: "whatsapp", dado: "CI-005", visitor_id: pediu, created_at: new Date() },
    });
    await garantirTabelaContatos();
    await prisma.$executeRawUnsafe(
      "INSERT INTO contatos_whatsapp (telefone, visitor_id) VALUES (?, ?)",
      `+5989${String(s).slice(-7)}`,
      comWa,
    );
    const q = await visitantesQuentes(30, 3, "UY");
    // Só os visitantes deste teste (campanha remarketing_ci)
    const doTeste = q.lista.filter((x) => x.origem.includes("remarketing_ci"));
    assert.equal(
      doTeste.length,
      3,
      "anônimo, deixou WhatsApp e pediu (com conta e com 1 peça ficam fora)",
    );
    assert.deepEqual(doTeste.map((x) => x.situacao).sort(), [
      "deixou_whatsapp",
      "pediu_whatsapp",
      "sem_contato",
    ]);
    const a = doTeste.find((x) => x.situacao === "sem_contato")!;
    assert.equal(a.pecas, 3);
    assert.equal(a.vistas, 4);
    assert.ok(a.dias >= 2, "voltou outro dia");
    assert.equal(a.top[0].sku, "CI-005", "a mais vista primeiro");
    assert.equal(a.cidade, "Salto");
    assert.ok(doTeste.find((x) => x.situacao === "deixou_whatsapp")?.telefone);
    const origem = q.porOrigem.find((g) => g.chave === "facebook · remarketing_ci")!;
    assert.equal(origem.quentes, 3);
    assert.equal(origem.semContato, 1);
    assert.equal(origem.contato, 2);
    console.log("Captação (avisos de preço e visitantes quentes): ok");
  } finally {
    await prisma.agricolas.update({ where: { sku: "CI-003" }, data: { preco_brl: precoOriginal } });
    await prisma.$executeRawUnsafe("DELETE FROM avisos_preco WHERE sku IN ('CI-003','CI-004')");
    await prisma.$executeRawUnsafe(
      `DELETE FROM contatos_whatsapp WHERE visitor_id IN (${vids.map(() => "?").join(",")})`,
      ...vids,
    );
    await prisma.site_visits.deleteMany({ where: { visitor_id: { in: vids } } });
    await prisma.site_eventos.deleteMany({ where: { visitor_id: { in: vids } } });
    await prisma.notificacoes.deleteMany({ where: { user_id: u.id } });
    await prisma.users.delete({ where: { id: u.id } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
