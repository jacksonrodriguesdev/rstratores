// Teste dos links de pagamento com uma dLocal FALSA (servidor local nesta mesma execução):
// nada vai para a dLocal, o Meta ou o Google de verdade, e nenhum e-mail é enviado.
// Roda com: npx tsx scripts/ci/testar-pagamentos.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_PAGAMENTOS=1: o teste apaga o que criou)
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

const SEGREDO = "segredo-do-teste";
const LOGIN = "login-teste";
Object.assign(process.env, {
  DLOCAL_X_LOGIN: LOGIN,
  DLOCAL_X_TRANS_KEY: "trans-teste",
  DLOCAL_SECRET_KEY: SEGREDO,
  DLOCAL_AMBIENTE: "sandbox",
  DLOCAL_SMARTFIELDS_KEY: "publica-teste",
});
delete process.env.RESEND_API_KEY; // sem e-mails
const assinar = (s: string) => createHmac("sha256", SEGREDO).update(s).digest("hex");

// ---------- dLocal falsa ----------
type Pg = Record<string, any>;
const pagamentos = new Map<string, Pg>();
const conversoes: string[] = [];
let n = 0;
const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const json = (s: number, v: unknown) => {
    res.writeHead(s, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  // Meta / GA4 falsos: só contam
  if (req.url!.includes("/events") || req.url!.startsWith("/mp/collect")) {
    conversoes.push(req.url!.startsWith("/mp") ? "ga4" : "meta");
    return json(200, { events_received: 1 });
  }
  // A assinatura tem que bater
  const esperado = `V2-HMAC-SHA256, Signature: ${assinar(LOGIN + req.headers["x-date"] + corpo)}`;
  if (req.headers.authorization !== esperado || req.headers["x-login"] !== LOGIN)
    return json(403, { code: 3001, message: "Invalid credentials" });
  if (req.method === "GET" && req.url!.startsWith("/payments/")) {
    const p = pagamentos.get(decodeURIComponent(req.url!.split("/")[2]));
    return p ? json(200, p) : json(404, { code: 4000, message: "Payment not found" });
  }
  if (req.method === "POST" && req.url === "/payments") {
    const b = JSON.parse(corpo);
    assert.ok(req.headers["x-idempotency-key"], "chave de idempotência");
    assert.ok(b.notification_url?.endsWith("/api/public/dlocal/pagamentos"), "notification_url");
    assert.ok(b.payer?.document && b.payer?.email && b.payer?.name, "pagador completo");
    assert.ok(!JSON.stringify(b.payer).includes("Volta Redonda"), "sem endereço de exemplo");
    const id = `D-${process.pid}-${++n}`;
    const base = {
      id,
      amount: b.amount,
      currency: b.currency,
      country: b.country,
      order_id: b.order_id,
      payment_method_id: b.payment_method_id,
    };
    let p: Pg;
    if (b.payment_method_id === "PQ")
      p = {
        ...base,
        status: "PENDING",
        status_code: "100",
        ticket: {
          number: "00020101021226PIXTESTE",
          image_url: "https://exemplo.test/qr.png",
          expiration_date: new Date(Date.now() + 86400000).toISOString(),
        },
      };
    else if (b.payment_method_id === "AI" || b.payment_method_id === "RE")
      p = {
        ...base,
        status: "PENDING",
        status_code: "100",
        ticket: {
          number: "4455667788",
          expiration_date: new Date(Date.now() + 3 * 86400000).toISOString(),
        },
      };
    else if (b.card?.token === "CV-teste-recusa")
      p = { ...base, status: "REJECTED", status_code: "302", status_detail: "Insufficient amount" };
    else if (b.card?.token === "CV-teste-analise")
      p = { ...base, status: "PENDING", status_code: "100", status_detail: "In review" };
    else if (b.card?.token === "CV-teste-3ds")
      p = {
        ...base,
        status: "PENDING",
        status_code: "101",
        three_dsecure: { redirect_url: "https://sandbox.test/3ds/abc" },
      };
    else p = { ...base, status: "PAID", status_code: "200", card: { brand: "VI", last4: "1111" } };
    pagamentos.set(id, p);
    return json(200, p);
  }
  json(404, { message: "rota desconhecida" });
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  process.env.DLOCAL_BASE_URL = url;
  process.env.META_GRAPH_URL = url;
  process.env.GA4_MP_URL = url;

  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_PAGAMENTOS === "1",
    "use um banco de teste",
  );
  const sv = await import("../../src/lib/pagamentos.server");
  const { avisoAutentico } = await import("../../src/lib/dlocal.server");
  const { documentoValido } = await import("../../src/lib/pagamentos-comum");
  await sv.garantirTabelasPagamento();

  // Documentos
  assert.ok(documentoValido("UY", "1.234.567-2"), "CI válida");
  assert.ok(!documentoValido("UY", "1.234.567-3"), "CI com dígito errado");
  assert.ok(documentoValido("BR", "529.982.247-25"), "CPF válido");
  assert.ok(!documentoValido("BR", "111.111.111-11"), "CPF repetido");
  assert.ok(documentoValido("BR", "11.222.333/0001-81"), "CNPJ válido");

  const email = `pagamento.${Date.now()}@teste.local`;
  const outro = `outro.${Date.now()}@teste.local`;
  const u = await prisma.users.create({
    data: {
      nome_completo: "Cliente Teste",
      email,
      senha_hash: "codigo:x",
      cidade: "Rocha",
      departamento: "Rocha",
    },
  });
  const u2 = await prisma.users.create({
    data: { nome_completo: "Outro Cliente", email: outro, senha_hash: "codigo:x" },
  });
  const s = { id: u.id, email };
  const ctx = { ip: null, origem: "http://localhost:3999" };
  const links: number[] = [];
  try {
    const item = { codigo: "ZF-123", nome: "Rolamento", quantidade: 2, preco: 150050, sku: null };

    // 1. Link do Brasil: PIX gera código e reaproveita; cartão paga; PIX pago depois = duplicado
    const br = await sv.criarLink(
      {
        pais: "BR",
        itens: [item],
        frete: 5000,
        desconto: 100,
        metodos: ["CARTAO", "PIX"],
        email_cliente: email,
        dias_validade: 7,
      },
      1,
    );
    links.push(br.id);
    assert.equal(br.total, 150050 * 2 + 5000 - 100, "total em centavos");
    assert.equal(br.moeda, "BRL");
    assert.equal(br.user_id, u.id, "link já ligado à conta pelo e-mail");

    const errado = await sv.iniciarPagamento(
      {
        codigo: br.codigo,
        metodo: "PIX",
        documento: "529.982.247-25",
        nome: "Outro Cliente",
        idioma: "pt",
      },
      { id: u2.id, email: outro },
      ctx,
    );
    assert.equal(errado.ok, false, "outra conta não paga link indicado");
    const docRuim = await sv.iniciarPagamento(
      { codigo: br.codigo, metodo: "PIX", documento: "123", nome: "Cliente Teste", idioma: "pt" },
      s,
      ctx,
    );
    assert.equal(docRuim.ok, false, "CPF inválido barrado");
    const metodoRuim = await sv.iniciarPagamento(
      {
        codigo: br.codigo,
        metodo: "ABITAB",
        documento: "529.982.247-25",
        nome: "Cliente Teste",
        idioma: "pt",
      },
      s,
      ctx,
    );
    assert.equal(metodoRuim.ok, false, "Abitab não vale no link do Brasil");

    const pix = await sv.iniciarPagamento(
      {
        codigo: br.codigo,
        metodo: "PIX",
        documento: "529.982.247-25",
        nome: "Cliente Teste",
        idioma: "pt",
      },
      s,
      ctx,
    );
    assert.deepEqual(pix, { ok: true, status: "PENDENTE", redirect: null });
    const pixRow = await prisma.pagamentos.findFirstOrThrow({
      where: { link_id: br.id, metodo: "PIX" },
    });
    assert.match(pixRow.ticket!, /PIXTESTE/, "código PIX guardado");
    assert.ok(!pixRow.documento!.includes("52998224"), "CPF não guardado inteiro");
    assert.ok(!pixRow.payload!.includes("52998224725"), "CPF fora do payload");
    const pix2 = await sv.iniciarPagamento(
      {
        codigo: br.codigo,
        metodo: "PIX",
        documento: "529.982.247-25",
        nome: "Cliente Teste",
        idioma: "pt",
      },
      s,
      ctx,
    );
    assert.equal(pix2.ok, true);
    assert.equal(
      await prisma.pagamentos.count({ where: { link_id: br.id, metodo: "PIX" } }),
      1,
      "PIX reaproveitado",
    );

    const recusa = await sv.iniciarPagamento(
      {
        codigo: br.codigo,
        metodo: "CARTAO",
        token: "CV-teste-recusa",
        documento: "529.982.247-25",
        nome: "Cliente Teste",
        idioma: "pt",
      },
      s,
      ctx,
    );
    assert.equal(recusa.ok, false);
    assert.match((recusa as any).erro, /limite/i, "motivo da recusa em português");

    const cartao = await sv.iniciarPagamento(
      {
        codigo: br.codigo,
        metodo: "CARTAO",
        token: "CV-teste-aprovado",
        documento: "529.982.247-25",
        nome: "Cliente Teste",
        idioma: "pt",
      },
      s,
      ctx,
    );
    assert.equal(cartao.ok && cartao.status, "PAGO", `cartão aprovado: ${JSON.stringify(cartao)}`);
    const lbr = await prisma.links_pagamento.findUniqueOrThrow({ where: { id: br.id } });
    assert.equal(lbr.status, "PAGO");
    assert.equal(lbr.user_id, u.id, "compra na conta do cliente");
    const pagoCartao = await prisma.pagamentos.findFirstOrThrow({
      where: { link_id: br.id, status: "PAGO" },
    });
    assert.equal(pagoCartao.final_cartao, "1111");

    const depois = await sv.iniciarPagamento(
      {
        codigo: br.codigo,
        metodo: "PIX",
        documento: "529.982.247-25",
        nome: "Cliente Teste",
        idioma: "pt",
      },
      s,
      ctx,
    );
    assert.equal(depois.ok, false, "link pago não aceita outro pagamento");

    // Aviso (webhook): assinatura errada é recusada; certa aplica o status confirmado na consulta
    const pixDl = pagamentos.get(pixRow.dlocal_id!)!;
    pixDl.status = "PAID";
    pixDl.status_code = "200";
    const corpo = JSON.stringify({
      id: pixRow.dlocal_id,
      status: "PAID",
      order_id: pixRow.order_id,
    });
    const xDate = new Date().toISOString();
    const h = (assinatura: string) =>
      new Headers({ "x-date": xDate, authorization: `V2-HMAC-SHA256, Signature: ${assinatura}` });
    assert.equal(avisoAutentico(corpo, h("abc")), false, "assinatura falsa");
    const falso = await sv.receberAviso(corpo, avisoAutentico(corpo, h("abc")));
    assert.equal(falso.status, 401);
    assert.equal(
      (await prisma.pagamentos.findUniqueOrThrow({ where: { id: pixRow.id } })).status,
      "PENDENTE",
      "aviso falso não muda nada",
    );
    const ok = await sv.receberAviso(
      corpo,
      avisoAutentico(corpo, h(assinar(LOGIN + xDate + corpo))),
    );
    assert.equal(ok.status, 200);
    const pixPago = await prisma.pagamentos.findUniqueOrThrow({ where: { id: pixRow.id } });
    assert.equal(pixPago.status, "PAGO");
    assert.equal(pixPago.duplicado, true, "segundo pagamento marcado para reembolso");

    // Aviso atrasado não desfaz o pago
    pixDl.status = "PENDING";
    pixDl.status_code = "100";
    await sv.conferirPagamento(pixRow.id);
    assert.equal(
      (await prisma.pagamentos.findUniqueOrThrow({ where: { id: pixRow.id } })).status,
      "PAGO",
      "status não volta atrás",
    );

    // 2. Link do Uruguai a partir de um carrinho: Abitab pago pelo aviso → carrinho "Venda fechada"
    const carrinho = await prisma.carrinhos.create({
      data: { visitante_id: "v-teste-pagamento", user_id: u.id, itens: "[]" },
    });
    const uy = await sv.criarLink(
      {
        pais: "UY",
        itens: [{ ...item, preco: 1250000, quantidade: 1 }],
        frete: 0,
        desconto: 0,
        metodos: ["CARTAO", "ABITAB", "REDPAGOS"],
        carrinho_id: carrinho.id,
        dias_validade: 3,
      },
      1,
    );
    links.push(uy.id);
    assert.equal(uy.moeda, "UYU");
    assert.equal(uy.email_cliente, email, "cliente vem do carrinho");
    const ab = await sv.iniciarPagamento(
      {
        codigo: uy.codigo,
        metodo: "ABITAB",
        documento: "1.234.567-2",
        nome: "Cliente Teste",
        idioma: "es",
      },
      s,
      ctx,
    );
    assert.equal(ab.ok, true);
    const abRow = await prisma.pagamentos.findFirstOrThrow({ where: { link_id: uy.id } });
    assert.match(abRow.ticket!, /4455667788/, "número para pagar no Abitab");

    // Valor divergente no aviso: não aplica
    const abDl = pagamentos.get(abRow.dlocal_id!)!;
    const valorCerto = abDl.amount;
    Object.assign(abDl, { status: "PAID", status_code: "200", amount: 1 });
    await sv.conferirPagamento(abRow.id);
    assert.equal(
      (await prisma.pagamentos.findUniqueOrThrow({ where: { id: abRow.id } })).status,
      "PENDENTE",
      "valor divergente ignorado",
    );
    assert.ok(
      await prisma.pagamento_eventos.findFirst({ where: { link_id: uy.id, tipo: "divergencia" } }),
      "divergência registrada",
    );
    abDl.amount = valorCerto;
    conversoes.length = 0;
    await sv.conferirPagamento(abRow.id);
    assert.equal(
      (await prisma.links_pagamento.findUniqueOrThrow({ where: { id: uy.id } })).status,
      "PAGO",
    );
    const c = await prisma.carrinhos.findUniqueOrThrow({ where: { id: carrinho.id } });
    assert.equal(c.etapa, "GANHO", "carrinho vira venda fechada");
    assert.equal(c.valor_fechado, 12500, "valor fechado em $U");
    assert.ok(c.capi_compra_em, "compra registrada uma vez só");
    await prisma.carrinhos.delete({ where: { id: carrinho.id } });

    // 3. 3D Secure: devolve o endereço do banco
    const tds = await sv.criarLink(
      { pais: "UY", itens: [item], frete: 0, desconto: 0, metodos: ["CARTAO"], dias_validade: 1 },
      1,
    );
    links.push(tds.id);
    const r3 = await sv.iniciarPagamento(
      {
        codigo: tds.codigo,
        metodo: "CARTAO",
        token: "CV-teste-3ds",
        documento: "1.234.567-2",
        nome: "Cliente Teste",
        idioma: "es",
      },
      s,
      ctx,
    );
    assert.deepEqual(r3, {
      ok: true,
      status: "PENDENTE",
      redirect: "https://sandbox.test/3ds/abc",
    });
    assert.equal(
      (await prisma.links_pagamento.findUniqueOrThrow({ where: { id: tds.id } })).user_id,
      null,
      "link sem cliente só ganha dono quando pago",
    );

    // 3b. Frete por conta do comprador: não entra no total, mesmo se vier um valor
    const chegada = await sv.criarLink(
      {
        pais: "UY",
        itens: [{ ...item, quantidade: 1 }],
        frete: 99900,
        frete_modo: "NA_CHEGADA",
        desconto: 0,
        metodos: ["CARTAO"],
        email_cliente: email,
        dias_validade: 2,
      },
      1,
    );
    links.push(chegada.id);
    assert.equal(chegada.frete, 0, "frete na chegada: zero no link");
    assert.equal(chegada.total, item.preco, "frete na chegada: fora do total");
    assert.equal(chegada.frete_modo, "NA_CHEGADA");
    const gratis = await sv.criarLink(
      {
        pais: "BR",
        itens: [item],
        frete: 5000,
        frete_modo: "GRATIS",
        desconto: 0,
        metodos: ["PIX"],
        dias_validade: 1,
      },
      1,
    );
    links.push(gratis.id);
    assert.equal(gratis.frete, 0, "frete grátis: zero");
    await assert.rejects(
      sv.criarLink(
        {
          pais: "UY",
          itens: [item, { codigo: "X", nome: "Sem preço", quantidade: 1, preco: 0 }],
          frete: 0,
          desconto: 0,
          metodos: ["CARTAO"],
          dias_validade: 1,
        },
        1,
      ),
      /Falta o preço de "Sem preço"/,
      "item sem preço é erro (não some calado)",
    );

    // 3c. Cartão em análise na dLocal: não deixa pagar de novo até sair o resultado
    const an = await sv.iniciarPagamento(
      {
        codigo: chegada.codigo,
        metodo: "CARTAO",
        token: "CV-teste-analise",
        documento: "1.234.567-2",
        nome: "Cliente Teste",
        idioma: "es",
      },
      s,
      ctx,
    );
    assert.deepEqual(an, { ok: true, status: "PENDENTE", redirect: null });
    const de_novo = await sv.iniciarPagamento(
      {
        codigo: chegada.codigo,
        metodo: "CARTAO",
        token: "CV-teste-aprovado",
        documento: "1.234.567-2",
        nome: "Cliente Teste",
        idioma: "es",
      },
      s,
      ctx,
    );
    assert.equal(de_novo.ok, false, "cartão em análise bloqueia nova tentativa");
    assert.match((de_novo as any).erro, /análisis/);

    // 4. Link vencido não aceita pagamento
    await prisma.links_pagamento.update({
      where: { id: tds.id },
      data: { expira_em: new Date(Date.now() - 1000) },
    });
    const venc = await sv.iniciarPagamento(
      {
        codigo: tds.codigo,
        metodo: "CARTAO",
        token: "CV-teste-aprovado",
        documento: "1.234.567-2",
        nome: "Cliente Teste",
        idioma: "es",
      },
      s,
      ctx,
    );
    assert.equal(venc.ok, false, "link vencido");

    console.log(
      `✔ pagamentos: tudo certo (${conversoes.length ? "compra enviada ao Meta/GA4 falsos" : "Meta/GA4 sem configuração neste banco"})`,
    );
  } finally {
    await prisma.pagamento_eventos.deleteMany({ where: { link_id: { in: links } } });
    await prisma.links_pagamento.deleteMany({ where: { id: { in: links } } });
    await prisma.marketing_eventos
      .deleteMany({ where: { event_id: { in: links.map((id) => `compra_link_${id}`) } } })
      .catch(() => {});
    await prisma.users.deleteMany({ where: { id: { in: [u.id, u2.id] } } });
    await prisma.$disconnect();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
