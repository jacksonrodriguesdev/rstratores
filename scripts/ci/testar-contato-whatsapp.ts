// Teste do contato pelo WhatsApp do pop-up (sem conta): celular do Uruguai e do Brasil, celular
// inválido, cupom no formato AGRO-XXXX, o mesmo celular de novo não duplica (soma o interesse e
// mantém o cupom), origem e cidade vindas da visita, e o painel do admin (lista, etapa, cupom usado).
// Roda com: npx tsx scripts/ci/testar-contato-whatsapp.ts (só em banco de teste)
import assert from "node:assert/strict";

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const { prisma } = await import("../../src/lib/prisma");
  const c = await import("../../src/lib/contato-whatsapp.server");
  const vid = `vis-wa-${Date.now()}`;
  const tels: string[] = [];
  try {
    assert.equal(c.normalizarCelular("099 123 456", "es"), "+59899123456");
    assert.equal(c.normalizarCelular("+598 91 234 567", "es"), "+59891234567");
    assert.equal(c.normalizarCelular("(53) 99183-1101", "pt"), "+5553991831101");
    assert.equal(c.normalizarCelular("+55 53 99183-1101", "es"), "+5553991831101");
    assert.equal(c.normalizarCelular("123", "es"), null);

    await prisma.site_visits.create({
      data: {
        path: "/produto/CI-001",
        visitor_id: vid,
        fonte: "instagram",
        utm_campaign: "remarketing",
        city: "Tacuarembó",
      },
    });
    const errado = await c.registrarContato({ telefone: "12", idioma: "es" });
    assert.ok("erro" in errado, "celular inválido");

    const a = await c.registrarContato({
      telefone: "099 555 111",
      idioma: "es",
      motivo: "whatsapp",
      pagina: "/produto/CI-001",
      interesse: "CI-001",
      visitorId: vid,
    });
    assert.ok(!("erro" in a));
    if ("erro" in a) return;
    tels.push(a.telefone);
    assert.equal(a.novo, true);
    assert.match(a.cupom ?? "", /^AGRO-[2-9A-HJ-NP-Z]{4}$/);

    const b = await c.registrarContato({
      telefone: "+598 99 555 111",
      nome: "Juan",
      idioma: "es",
      interesse: "CI-002",
      visitorId: vid,
    });
    if ("erro" in b) throw new Error("b");
    assert.equal(b.novo, false, "mesmo celular: não duplica");
    assert.equal(b.cupom, a.cupom, "mantém o cupom");

    const br = await c.registrarContato({ telefone: "(53) 98888-7777", idioma: "pt" });
    if ("erro" in br) throw new Error("br");
    tels.push(br.telefone);
    assert.notEqual(br.cupom, a.cupom);

    const lista = await c.listarContatos();
    const juan = lista.find((x) => x.telefone === "+59899555111")!;
    assert.equal(juan.nome, "Juan");
    assert.deepEqual(juan.interesse, ["CI-001", "CI-002"]);
    assert.equal(juan.vezes, 2);
    assert.equal(juan.fonte, "instagram");
    assert.equal(juan.cidade, "Tacuarembó");
    assert.equal(juan.pecasVistas, 1);
    assert.equal(lista.find((x) => x.telefone === "+5553988887777")?.idioma, "pt");
    assert.equal((await c.listarContatos("Juan")).length, 1, "busca por nome");

    await c.atualizarContato(juan.id, { status: "GANHO", usado: true, nota: "MF 290" });
    await c.atualizarContato(juan.id, { status: "INVALIDO" });
    const j2 = (await c.listarContatos("Juan"))[0];
    assert.equal(j2.status, "GANHO", "etapa inválida é ignorada");
    assert.ok(j2.usadoEm);
    assert.equal(j2.nota, "MF 290");
    console.log("Contato pelo WhatsApp: ok");
  } finally {
    for (const t of tels)
      await prisma.$executeRawUnsafe("DELETE FROM contatos_whatsapp WHERE telefone = ?", t);
    await prisma.site_visits.deleteMany({ where: { visitor_id: vid } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
