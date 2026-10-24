// Teste dos links de pagamento pelo Stripe com um Stripe FALSO (servidor local nesta execução):
// nada vai para o Stripe, o Meta ou o Google de verdade, e nenhum e-mail é enviado.
// Cobre: criar a página de pagamento (Checkout), reaproveitar a sessão aberta, aviso assinado
// (e recusa do falso), pago → link pago, valor divergente não paga, sessão expirada = cancelado.
// Roda com: npx tsx scripts/ci/testar-stripe.ts (só em banco de teste: apaga o que criou)
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

const WHSEC = "whsec_teste123";
Object.assign(process.env, {
  STRIPE_SECRET_KEY: "sk_test_falsa",
  STRIPE_WEBHOOK_SECRET: WHSEC,
});
delete process.env.RESEND_API_KEY;

// ---------- Stripe falso ----------
const sessoes = new Map<string, any>();
const idempotencia = new Map<string, string>();
let n = 0;
const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const json = (s: number, v: unknown) => {
    res.writeHead(s, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  if (req.url!.includes("/events") || req.url!.startsWith("/mp/collect"))
    return json(200, { events_received: 1 });
  if (req.headers.authorization !== "Bearer sk_test_falsa")
    return json(401, { error: { type: "authentication_error", message: "Invalid API Key" } });
  if (req.method === "POST" && req.url === "/v1/checkout/sessions") {
    const f = new URLSearchParams(corpo);
    const chave = String(req.headers["idempotency-key"] || "");
    assert.ok(chave, "chave de idempotência");
    if (idempotencia.has(chave)) return json(200, sessoes.get(idempotencia.get(chave)!));
    assert.equal(f.get("mode"), "payment");
    assert.ok(
      f.get("success_url")?.includes("/pagar/") && f.get("success_url")?.includes("retorno="),
    );
    assert.equal(f.get("payment_method_types[0]"), "card");
    const id = `cs_test_${"a".repeat(58)}${++n}`; // ids reais têm ~66 caracteres
    const s = {
      id,
      object: "checkout.session",
      url: `https://checkout.stripe.test/c/pay/${id}`,
      status: "open",
      payment_status: "unpaid",
      amount_total: Number(f.get("line_items[0][price_data][unit_amount]")),
      currency: f.get("line_items[0][price_data][currency]"),
      client_reference_id: f.get("client_reference_id"),
      expires_at: Number(f.get("expires_at")),
      metadata: { order_id: f.get("metadata[order_id]"), link_id: f.get("metadata[link_id]") },
      payment_intent: null,
    };
    sessoes.set(id, s);
    idempotencia.set(chave, id);
    return json(200, s);
  }
  if (req.method === "GET" && req.url!.startsWith("/v1/checkout/sessions/")) {
    const id = decodeURIComponent(req.url!.split("/")[4].split("?")[0]);
    const s = sessoes.get(id);
    return s ? json(200, s) : json(404, { error: { message: "No such checkout.session" } });
  }
  json(404, { error: { message: "rota falsa desconhecida" } });
});

const assinar = (corpo: string, t = Math.floor(Date.now() / 1000), segredo = WHSEC) =>
  `t=${t},v1=${createHmac("sha256", segredo).update(`${t}.${corpo}`).digest("hex")}`;

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  Object.assign(process.env, { STRIPE_BASE_URL: url, META_GRAPH_URL: url, GA4_MP_URL: url });

  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const sv = await import("../../src/lib/pagamentos.server");
  const st = await import("../../src/lib/stripe.server");
  await sv.garantirTabelasPagamento();

  // Assinatura do aviso
  assert.ok(st.stripeConfigurado() && st.avisoStripeConfigurado());
  assert.ok(st.avisoStripeAutentico("{}", assinar("{}")), "assinatura certa");
  assert.ok(
    !st.avisoStripeAutentico("{}", assinar("{}", undefined, "whsec_outro")),
    "segredo errado",
  );
  assert.ok(!st.avisoStripeAutentico('{"x":1}', assinar("{}")), "corpo alterado");
  assert.ok(
    !st.avisoStripeAutentico("{}", assinar("{}", Math.floor(Date.now() / 1000) - 3600)),
    "aviso velho",
  );
  assert.ok(!st.avisoStripeAutentico("{}", null), "sem cabeçalho");

  const email = `stripe.${Date.now()}@teste.local`;
  const u = await prisma.users.create({
    data: { nome_completo: "Cliente Stripe", email, senha_hash: "codigo:x" },
  });
  const s = { id: u.id, email };
  const ctx = { ip: null, origem: "http://localhost:3999" };
  const links: number[] = [];
  const aviso = async (tipo: string, sessaoId: string, assinado = true) => {
    const corpo = JSON.stringify({
      id: `evt_${Date.now()}`,
      type: tipo,
      data: { object: { id: sessaoId, object: "checkout.session" } },
    });
    return sv.receberAvisoStripe(corpo, assinado && st.avisoStripeAutentico(corpo, assinar(corpo)));
  };
  try {
    const item = { codigo: "ZF-1", nome: "Rodamiento", quantidade: 2, preco: 125000, sku: null };
    const link = await sv.criarLink(
      {
        pais: "UY",
        itens: [item],
        frete: 0,
        desconto: 0,
        metodos: ["STRIPE"],
        email_cliente: email,
        dias_validade: 7,
      },
      1,
    );
    links.push(link.id);

    // 1. Abre a página do Stripe (sem documento: o Stripe pede os dados dele)
    const r1 = await sv.iniciarPagamento(
      { codigo: link.codigo, metodo: "STRIPE", documento: "", nome: "", idioma: "es" },
      s,
      ctx,
    );
    assert.ok(
      r1.ok && r1.redirect?.startsWith("https://checkout.stripe.test/"),
      JSON.stringify(r1),
    );
    const pg = await prisma.pagamentos.findFirstOrThrow({ where: { link_id: link.id } });
    assert.equal(pg.provedor, "stripe");
    assert.equal(pg.status, "PENDENTE");
    assert.ok(pg.dlocal_id && pg.dlocal_id.length > 64, "id da sessão inteiro (mais de 64)");
    assert.equal(sessoes.get(pg.dlocal_id!).amount_total, 250000, "valor em centavos");
    assert.equal(sessoes.get(pg.dlocal_id!).currency, "uyu");

    // 2. Clicou de novo: volta para a mesma sessão (não cria outra)
    const r2 = await sv.iniciarPagamento(
      { codigo: link.codigo, metodo: "STRIPE", documento: "", nome: "", idioma: "es" },
      s,
      ctx,
    );
    assert.ok(r2.ok && r2.redirect === r1.redirect, "mesma sessão");
    assert.equal(await prisma.pagamentos.count({ where: { link_id: link.id } }), 1);

    // 3. Aviso falso (sem assinatura) não paga
    sessoes.get(pg.dlocal_id!).payment_status = "paid";
    sessoes.get(pg.dlocal_id!).status = "complete";
    const falso = await aviso("checkout.session.completed", pg.dlocal_id!, false);
    assert.equal(falso.status, 400);
    assert.equal(
      (await prisma.links_pagamento.findUniqueOrThrow({ where: { id: link.id } })).status,
      "ABERTO",
    );

    // 4. Aviso verdadeiro: pago (com bandeira e final do cartão)
    sessoes.get(pg.dlocal_id!).payment_intent = {
      id: "pi_1",
      status: "succeeded",
      latest_charge: { payment_method_details: { card: { brand: "visa", last4: "4242" } } },
    };
    const ok = await aviso("checkout.session.completed", pg.dlocal_id!);
    assert.equal(ok.status, 200);
    const pago = await prisma.pagamentos.findUniqueOrThrow({ where: { id: pg.id } });
    assert.equal(pago.status, "PAGO");
    assert.equal(pago.final_cartao, "4242");
    assert.equal(
      (await prisma.links_pagamento.findUniqueOrThrow({ where: { id: link.id } })).status,
      "PAGO",
    );
    // Aviso repetido não muda nada
    assert.equal((await aviso("checkout.session.completed", pg.dlocal_id!)).status, 200);
    // Link pago não abre outra cobrança
    const r3 = await sv.iniciarPagamento(
      { codigo: link.codigo, metodo: "STRIPE", documento: "", nome: "", idioma: "es" },
      s,
      ctx,
    );
    assert.ok(!r3.ok, "link já pago");

    // 5. Valor divergente: não marca como pago
    const l2 = await sv.criarLink(
      {
        pais: "UY",
        itens: [item],
        frete: 0,
        desconto: 0,
        metodos: ["STRIPE"],
        email_cliente: email,
        dias_validade: 7,
      },
      1,
    );
    links.push(l2.id);
    await sv.iniciarPagamento(
      { codigo: l2.codigo, metodo: "STRIPE", documento: "", nome: "", idioma: "pt" },
      s,
      ctx,
    );
    const pg2 = await prisma.pagamentos.findFirstOrThrow({ where: { link_id: l2.id } });
    Object.assign(sessoes.get(pg2.dlocal_id!), {
      payment_status: "paid",
      status: "complete",
      amount_total: 100,
    });
    await aviso("checkout.session.completed", pg2.dlocal_id!);
    assert.notEqual(
      (await prisma.pagamentos.findUniqueOrThrow({ where: { id: pg2.id } })).status,
      "PAGO",
      "valor divergente não paga",
    );
    assert.ok(
      await prisma.pagamento_eventos.findFirst({ where: { link_id: l2.id, tipo: "divergencia" } }),
    );

    // 6. Sessão expirada: cancelado (o cliente pode gerar outra)
    Object.assign(sessoes.get(pg2.dlocal_id!), {
      payment_status: "unpaid",
      status: "expired",
      amount_total: 250000,
    });
    await sv.conferirPagamento(pg2.id);
    assert.equal(
      (await prisma.pagamentos.findUniqueOrThrow({ where: { id: pg2.id } })).status,
      "CANCELADO",
    );

    // 7. Pagar em dólares (link em pesos): cotação do dia, sessão em USD, pago normalmente
    await prisma.configuracoes.upsert({
      where: { chave: "cotacao_usd_manual" },
      create: { chave: "cotacao_usd_manual", valor: "40" },
      update: { valor: "40" },
    });
    const l3 = await sv.criarLink(
      {
        pais: "UY",
        itens: [item],
        frete: 0,
        desconto: 0,
        metodos: ["STRIPE"],
        email_cliente: email,
        dias_validade: 7,
      },
      1,
    );
    links.push(l3.id);
    const rUsd = await sv.iniciarPagamento(
      {
        codigo: l3.codigo,
        metodo: "STRIPE",
        documento: "",
        nome: "",
        idioma: "es",
        emDolares: true,
      },
      s,
      ctx,
    );
    assert.ok(rUsd.ok && rUsd.redirect, JSON.stringify(rUsd));
    const pg3 = await prisma.pagamentos.findFirstOrThrow({ where: { link_id: l3.id } });
    assert.equal(pg3.moeda, "USD");
    assert.equal(pg3.valor, 6250, "$U 2.500 ÷ 40 = US$ 62,50");
    const ses3 = sessoes.get(pg3.dlocal_id!);
    assert.equal(ses3.currency, "usd");
    assert.equal(ses3.amount_total, 6250);
    // Em pesos depois: outra sessão (moeda diferente), não reaproveita a de dólares
    const rUyu = await sv.iniciarPagamento(
      { codigo: l3.codigo, metodo: "STRIPE", documento: "", nome: "", idioma: "es" },
      s,
      ctx,
    );
    assert.ok(rUyu.ok && rUyu.redirect !== rUsd.redirect, "pesos: outra sessão");
    Object.assign(ses3, { payment_status: "paid", status: "complete" });
    await aviso("checkout.session.completed", pg3.dlocal_id!);
    assert.equal(
      (await prisma.links_pagamento.findUniqueOrThrow({ where: { id: l3.id } })).status,
      "PAGO",
      "pago em dólares",
    );

    // 8. Evento de outro tipo: só confirma o recebimento
    const outro = JSON.stringify({ type: "charge.succeeded", data: { object: { id: "ch_1" } } });
    assert.equal(
      (await sv.receberAvisoStripe(outro, st.avisoStripeAutentico(outro, assinar(outro)))).status,
      200,
    );
    console.log(
      "✔ Stripe: página de pagamento, aviso assinado, pago, divergência, expirado e pago em dólares",
    );
  } finally {
    await prisma.pagamento_eventos.deleteMany({ where: { link_id: { in: links } } });
    await prisma.links_pagamento.deleteMany({ where: { id: { in: links } } });
    await prisma.dlocal_avisos.deleteMany({ where: { tipo: "stripe" } });
    await prisma.users.deleteMany({ where: { id: u.id } });
    await prisma.configuracoes.deleteMany({ where: { chave: "cotacao_usd_manual" } });
    await prisma.$disconnect();
    servidor.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
