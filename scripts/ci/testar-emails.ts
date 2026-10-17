// Teste do e-mail marketing por blocos com um Resend FALSO (servidor local nesta execução):
// modelos prontos, variáveis por cliente, cupom pessoal, contagem regressiva, envio em lote e
// envio agendado. Nenhum e-mail sai de verdade. Apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-emails.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_EMAILS=1)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

// ---------- Resend falso ----------
type Msg = { to: string[]; subject: string; html: string; text: string; headers?: any };
const recebidos: Msg[] = [];
const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  assert.equal(req.headers.authorization, "Bearer re_teste", "chave do Resend");
  const b = JSON.parse(corpo);
  const lista: Msg[] = Array.isArray(b) ? b : [b];
  recebidos.push(...lista);
  res.writeHead(200, { "Content-Type": "application/json" });
  const ids = lista.map((_, i) => ({ id: `re-${recebidos.length}-${i}` }));
  res.end(JSON.stringify(Array.isArray(b) ? { data: ids } : ids[0]));
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const porta = (servidor.address() as AddressInfo).port;
  Object.assign(process.env, {
    RESEND_API_KEY: "re_teste",
    EMAIL_REMETENTE: "AGRO PARTS <teste@agropartsuy.com>",
    RESEND_API_URL: `http://127.0.0.1:${porta}`,
  });
  process.env.JWT_SECRET ||= "segredo-local-do-teste-de-emails-com-32-caracteres";

  const { MODELOS_EMAIL, conteudoDoModelo } = await import("../../src/lib/email-modelos");
  const { renderEmail, textoEmail } = await import("../../src/lib/email-template");
  const { paraBlocos, novoBloco, cuponsDosBlocos } = await import("../../src/lib/email-blocos");

  // ---------- modelos: todos montam, sem variáveis sobrando e com o "darse de baja"
  const base = {
    origem: "https://agropartsuy.com",
    nome: "ANA maría",
    preheader: "teste",
    urlBaixa: "https://agropartsuy.com/baja?u=1&t=x",
    whatsappUrl: "https://api.whatsapp.com/send?phone=1",
    campanha: "teste",
    vars: { departamento: "Rivera", mi_cupon: "AP-ANA1" },
  };
  for (const m of MODELOS_EMAIL) {
    const c = conteudoDoModelo(m);
    const html = renderEmail(c, base);
    assert.ok(!html.includes("{{"), `${m.id}: variáveis trocadas`);
    assert.ok(html.includes("Darme de baja"), `${m.id}: link de descadastro`);
    assert.ok(html.includes("@media (max-width:620px)"), `${m.id}: ajuste para celular`);
    assert.ok(html.length < 90_000, `${m.id}: abaixo do corte do Gmail (${html.length})`);
    assert.ok(textoEmail(c, base).includes("Darme de baja"), `${m.id}: versão texto`);
  }
  const pre = conteudoDoModelo(MODELOS_EMAIL.find((m) => m.id === "pre-black")!);
  assert.ok(renderEmail(pre, base).includes("Ana, se viene"), "{{nombre}} vira o primeiro nome");

  // ---------- contagem regressiva calculada na hora do envio
  const alvo = Date.UTC(2030, 0, 10, 3, 0, 0);
  const cont = {
    ...pre,
    blocos: [novoBloco("CONTAGEM", { titulo: "Faltan", alvo: new Date(alvo).toISOString() })],
  };
  const h1 = renderEmail(cont, {
    ...base,
    agora: alvo - (3 * 86400_000 + 5 * 3600_000 + 7 * 60_000),
  });
  assert.ok(
    />03<\/p>.*DÍAS/s.test(h1) && />05<\/p>.*HORAS/s.test(h1) && />07<\/p>.*MIN/s.test(h1),
    "03 dias 05 h 07 min",
  );
  const h2 = renderEmail(cont, { ...base, agora: alvo + 1000 });
  assert.ok(h2.includes("¡Ya empezó!") && !h2.includes("DÍAS"), "data passada: texto de depois");

  // ---------- cupom pessoal: código do cliente; sem cupom e sem código fixo, o bloco some
  const cup = {
    ...pre,
    blocos: [novoBloco("CUPOM", { pessoal: true, codigo: "", texto: "Tu cupón" })],
  };
  assert.ok(renderEmail(cup, base).includes("AP-ANA1"), "cupom pessoal");
  assert.ok(
    !renderEmail(cup, { ...base, vars: { mi_cupon: "" } }).includes("Tu cupón"),
    "sem cupom: some",
  );
  assert.deepEqual(cuponsDosBlocos([novoBloco("CUPOM", { codigo: " BLACK10 " })]), ["BLACK10"]);

  // ---------- campanha antiga → blocos; português nos textos fixos
  const antigos = paraBlocos({
    titulo: "Hola",
    texto: "Texto",
    produtos: [],
    cor: "#0b7a3b",
    cupom: { codigo: "X1" },
    botaoTexto: "Ver",
    botaoUrl: "/loja",
    whatsapp: true,
  });
  assert.deepEqual(
    antigos.map((b) => b.tipo),
    ["TITULO", "TEXTO", "CUPOM", "BOTAO", "WHATSAPP"],
  );
  const pt = renderEmail({ ...pre, tema: { ...pre.tema, idioma: "pt" } }, base);
  assert.ok(
    pt.includes("Cancelar o recebimento") && pt.includes('lang="pt"'),
    "textos em português",
  );

  // ---------- banco: envio de verdade (para o Resend falso) e envio agendado
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_EMAILS === "1",
    "use um banco de teste",
  );
  const email = await import("../../src/lib/email.server");
  const { resolverProdutosBlocos } = await import("../../src/lib/email-blocos.server");
  await email.garantirColunasEmail();
  const sufixo = `${process.pid}-${Date.now()}`;
  const criados: number[] = [];
  const campanhas: number[] = [];
  try {
    for (const [nome, cupom, dep] of [
      ["Ana Teste", `T${sufixo}`.slice(0, 20), "Rivera"],
      ["bruno", null, null],
    ] as const) {
      const u = await prisma.users.create({
        data: {
          nome_completo: nome,
          email: `${nome.split(" ")[0].toLowerCase()}-${sufixo}@teste.invalid`,
          senha_hash: "x",
          cupom,
          departamento: dep,
        },
      });
      criados.push(u.id);
    }
    const conteudo = conteudoDoModelo(MODELOS_EMAIL.find((m) => m.id === "boas-vindas")!);
    const publico = { tipo: "ids", departamentos: [], dias: 30, ids: criados };
    const c = await prisma.email_campanhas.create({
      data: {
        nome: "Teste blocos",
        assunto: "{{nombre}}, bienvenida",
        conteudo: JSON.stringify(conteudo),
        publico: JSON.stringify(publico),
      },
    });
    campanhas.push(c.id);
    await email.processarCampanha(c.id, "https://agropartsuy.com");
    const fim = await prisma.email_campanhas.findUnique({ where: { id: c.id } });
    assert.equal(fim?.status, "ENVIADA", fim?.erro ?? "");
    assert.equal(fim?.enviados, 2);
    const ana = recebidos.find((m) => m.to[0].startsWith("ana-"))!;
    const bruno = recebidos.find((m) => m.to[0].startsWith("bruno-"))!;
    assert.equal(ana.subject, "Ana, bienvenida");
    assert.equal(bruno.subject, "Bruno, bienvenida");
    assert.ok(ana.html.includes(`T${sufixo}`.slice(0, 20)), "Ana vê o próprio cupom");
    assert.ok(!bruno.html.includes("Tu cupón de bienvenida"), "Bruno sem cupom: bloco some");
    assert.ok(ana.headers?.["List-Unsubscribe"], "cabeçalho de descadastro");
    assert.equal(await prisma.email_envios.count({ where: { campanha_id: c.id } }), 2);

    // Agendada para o passado → o agendador manda
    const antes = recebidos.length;
    const ag = await prisma.email_campanhas.create({
      data: {
        nome: "Teste agendada",
        assunto: "Agendada",
        conteudo: JSON.stringify(conteudo),
        publico: JSON.stringify(publico),
        status: "AGENDADA",
        agendado_para: new Date(Date.now() - 60_000),
      },
    });
    campanhas.push(ag.id);
    await email.dispararAgendadas();
    const ag2 = await prisma.email_campanhas.findUnique({ where: { id: ag.id } });
    assert.equal(ag2?.status, "ENVIADA");
    assert.equal(ag2?.agendado_para, null);
    assert.equal(recebidos.length, antes + 2, "agendada enviada");

    // Produtos automáticos: devolve uma lista por bloco (vazia se o banco não tem peças com preço)
    const pb = await resolverProdutosBlocos([
      novoBloco("PRODUTOS", { fonte: "ofertas", limite: 3 }),
      novoBloco("PRODUTOS", { fonte: "novos", limite: 2 }),
    ]);
    assert.equal(Object.keys(pb).length, 2);
    for (const l of Object.values(pb))
      assert.ok(
        l.every((p) => p.preco),
        "só peças com preço",
      );

    console.log(
      "✔ e-mails por blocos: modelos, variáveis, cupom pessoal, contagem, envio e agendamento",
    );
  } finally {
    if (campanhas.length)
      await prisma.email_campanhas.deleteMany({ where: { id: { in: campanhas } } });
    if (criados.length) await prisma.users.deleteMany({ where: { id: { in: criados } } });
    await prisma.$disconnect();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
