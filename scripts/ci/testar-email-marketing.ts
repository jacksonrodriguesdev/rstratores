// Teste do e-mail marketing avançado com um Resend FALSO: anúncios por e-mail (render, rodízio,
// exibições), cliques por link pelo webhook, funil (visita, WhatsApp, compra) e público de
// remarketing. Nenhum e-mail sai de verdade. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-email-marketing.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_EMAIL_MARKETING=1)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

const recebidos: Array<{ to: string[]; html: string; text: string }> = [];
const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const b = JSON.parse(corpo);
  const lista = Array.isArray(b) ? b : [b];
  recebidos.push(...lista);
  res.writeHead(200, { "Content-Type": "application/json" });
  const ids = lista.map((_: unknown, i: number) => ({
    id: `rm-${process.pid}-${recebidos.length}-${i}`,
  }));
  res.end(JSON.stringify(Array.isArray(b) ? { data: ids } : ids[0]));
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  Object.assign(process.env, {
    RESEND_API_KEY: "re_teste",
    EMAIL_REMETENTE: "AGRO PARTS <teste@agropartsuy.com>",
    RESEND_API_URL: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`,
  });
  process.env.JWT_SECRET ||= "segredo-local-do-teste-de-email-marketing-32-caracteres";

  const { renderEmail, textoEmail, CONTEUDO_PADRAO } = await import("../../src/lib/email-template");
  const { novoBloco } = await import("../../src/lib/email-blocos");
  const mk = await import("../../src/lib/email-marketing.server");

  // ---------- anúncio no e-mail (layout fixo e por blocos) e o link com utm_content
  const anuncio = {
    id: 7,
    titulo: "Pre Black -20%",
    texto: "En todo el sitio",
    imagem: null,
    link: "/black-friday",
    botao: "Ver",
  };
  const d = { origem: "https://agropartsuy.com", urlBaixa: "#", campanha: "teste", anuncio };
  const fixo = renderEmail({ ...CONTEUDO_PADRAO }, d);
  assert.ok(
    fixo.includes("Pre Black -20%") && fixo.includes("utm_content=anuncio-7"),
    "anúncio no layout fixo",
  );
  assert.ok(
    textoEmail({ ...CONTEUDO_PADRAO }, d).includes("utm_content=anuncio-7"),
    "anúncio na versão texto",
  );
  assert.ok(
    !renderEmail({ ...CONTEUDO_PADRAO, semAnuncio: true }, d).includes("Pre Black -20%"),
    "semAnuncio desliga",
  );
  const blocos = renderEmail(
    { ...CONTEUDO_PADRAO, blocos: [novoBloco("TITULO", { texto: "Hola" })] },
    d,
  );
  assert.ok(
    blocos.includes("Pre Black -20%") && blocos.includes("utm_content=anuncio-7"),
    "anúncio no layout de blocos",
  );
  assert.equal(mk.anuncioDoLink("https://x.com/a?utm_source=email&utm_content=anuncio-12"), 12);
  assert.equal(mk.anuncioDoLink("https://x.com/a?utm_content=outra"), null);

  // ---------- rodízio por peso: estável por cliente, e os dois aparecem
  const lista = [
    { ...anuncio, id: 1, peso: 1 },
    { ...anuncio, id: 2, peso: 3 },
  ];
  assert.equal(
    mk.escolherAnuncio(lista, 55)?.id,
    mk.escolherAnuncio(lista, 55)?.id,
    "mesmo cliente, mesmo anúncio",
  );
  const vistos = new Set(Array.from({ length: 60 }, (_, i) => mk.escolherAnuncio(lista, i)?.id));
  assert.deepEqual([...vistos].sort(), [1, 2], "os dois anúncios entram no rodízio");
  assert.equal(mk.escolherAnuncio([], 1), null);

  // ---------- banco
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_EMAIL_MARKETING === "1",
    "use um banco de teste",
  );
  const email = await import("../../src/lib/email.server");
  await email.garantirColunasEmail();
  await mk.garantirTabelasMarketing();
  const suf = `${process.pid}-${Date.now()}`;
  const users: number[] = [];
  const campanhas: number[] = [];
  const anuncios: number[] = [];
  let link = 0;
  try {
    // 4 clientes: A não abre · B abre · C clica · D clica, visita, WhatsApp e compra
    for (const n of ["a", "b", "c", "d"]) {
      const u = await prisma.users.create({
        data: {
          nome_completo: `Cliente ${n}`,
          email: `${n}-${suf}@teste.invalid`,
          senha_hash: "x",
        },
      });
      users.push(u.id);
    }
    const [A, B, C, D] = users;
    const camp = await prisma.email_campanhas.create({
      data: {
        nome: "Funil teste",
        assunto: "Teste",
        conteudo: JSON.stringify(CONTEUDO_PADRAO),
        publico: JSON.stringify({ tipo: "ids", departamentos: [], dias: 30, ids: users }),
      },
    });
    campanhas.push(camp.id);
    const ad = await prisma.email_anuncios.create({
      data: {
        nome: "Teste",
        titulo: "Anuncio teste",
        link: "/loja",
        ativo: true,
        onde: "CAMPANHAS",
      },
    });
    anuncios.push(ad.id);
    mk.limparCacheAnuncios();

    // Envio de verdade (Resend falso): o anúncio entra e as exibições são gravadas
    await email.processarCampanha(camp.id, "https://agropartsuy.com");
    assert.equal(recebidos.length, 4);
    assert.ok(
      recebidos.every(
        (m) => m.html.includes("Anuncio teste") && m.html.includes(`utm_content=anuncio-${ad.id}`),
      ),
      "anúncio em todos os e-mails",
    );
    assert.equal(
      await prisma.email_anuncio_exibicoes.count({ where: { anuncio_id: ad.id } }),
      4,
      "4 exibições",
    );

    const envios = await prisma.email_envios.findMany({ where: { campanha_id: camp.id } });
    const de = (u: number) => envios.find((e) => e.user_id === u)!;
    const agora = new Date();
    for (const u of [B, C, D])
      await prisma.email_envios.update({
        where: { id: de(u).id },
        data: { aberto_em: agora, status: "ABERTO" },
      });
    // Clique do C e do D chega pelo webhook (o do D é no link do anúncio)
    for (const [u, url] of [
      [C, "https://agropartsuy.com/loja?utm_source=email"],
      [D, `https://agropartsuy.com/loja?utm_source=email&utm_content=anuncio-${ad.id}`],
    ] as const)
      await email.registrarEventoWebhook({
        type: "email.clicked",
        data: {
          email_id: de(u).resend_id,
          click: { link: url, userAgent: "Mozilla/5.0 (iPhone)" },
        },
      });
    const cliques = await prisma.email_cliques.findMany({ where: { campanha_id: camp.id } });
    assert.equal(cliques.length, 2, "2 cliques gravados");
    assert.equal(
      cliques.find((c) => c.anuncio_id === ad.id)?.dispositivo,
      "celular",
      "clique no anúncio, no celular",
    );
    assert.ok(
      (await prisma.email_envios.findUnique({ where: { id: de(C).id } }))?.clicado_em,
      "envio marcado como clicado",
    );
    const st = await mk.estatisticasAnuncios();
    assert.deepEqual(st[ad.id], { exibicoes: 4, abertos: 3, cliques: 1 }, "números do anúncio");

    // D: visitou pelo e-mail, chamou no WhatsApp e pagou um link
    await prisma.site_visits.create({ data: { path: "/loja", user_id: D, utm_source: "email" } });
    await prisma.site_eventos.create({ data: { tipo: "whatsapp", dado: "teste", user_id: D } });
    const lp = await prisma.links_pagamento.create({
      data: {
        codigo: `T${suf}`.slice(0, 32),
        pais: "UY",
        moeda: "UYU",
        itens: "[]",
        subtotal: 150000,
        total: 150000,
        metodos: "CARTAO",
        status: "PAGO",
        user_id: D,
        pago_em: new Date(),
      },
    });
    link = lp.id;

    const f = await mk.funilEmails({ campanha: camp.id });
    const v = Object.fromEntries(f.etapas.map((e) => [e.k, e.v]));
    assert.deepEqual(
      [v.enviados, v.abertos, v.clicados, v.visitaram, v.whatsapp, v.compraram],
      [4, 3, 2, 1, 1, 1],
      `funil: ${JSON.stringify(v)}`,
    );
    assert.deepEqual(f.receita, { UYU: 1500 }, "receita atribuída");
    assert.deepEqual(f.segmentos, { nao_abriu: 1, abriu_nao_clicou: 1, clicou_nao_comprou: 1 });

    // Público de remarketing
    const alvo = async (etapa: "nao_abriu" | "abriu_nao_clicou" | "clicou_nao_comprou") =>
      (
        await email.destinatarios({
          tipo: "remarketing",
          departamentos: [],
          dias: 30,
          origem: { campanha: camp.id },
          etapa,
        })
      ).map((u) => u.id);
    assert.deepEqual(await alvo("nao_abriu"), [A]);
    assert.deepEqual(await alvo("abriu_nao_clicou"), [B]);
    assert.deepEqual(await alvo("clicou_nao_comprou"), [C]);
    await prisma.users.update({ where: { id: A }, data: { recebe_emails: false } });
    assert.deepEqual(await alvo("nao_abriu"), [], "quem se descadastrou não entra");

    // Resumo do painel
    const r = await mk.resumoEmails(7);
    assert.ok(
      r.total.enviados >= 4 && r.ranking.some((g) => g.id === camp.id && g.compraram === 1),
      "resumo com a campanha",
    );
    assert.ok(
      r.links.some((l) => l.anuncio),
      "link do anúncio no ranking de links",
    );

    console.log("✔ e-mail marketing: anúncios, cliques por link, funil, remarketing e resumo");
  } finally {
    await prisma.email_cliques.deleteMany({ where: { campanha_id: { in: campanhas } } });
    await prisma.email_anuncio_exibicoes.deleteMany({ where: { anuncio_id: { in: anuncios } } });
    await prisma.email_anuncios.deleteMany({ where: { id: { in: anuncios } } });
    if (link) await prisma.links_pagamento.deleteMany({ where: { id: link } });
    await prisma.site_visits.deleteMany({ where: { user_id: { in: users } } });
    await prisma.site_eventos.deleteMany({ where: { user_id: { in: users } } });
    await prisma.email_campanhas.deleteMany({ where: { id: { in: campanhas } } });
    await prisma.users.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
