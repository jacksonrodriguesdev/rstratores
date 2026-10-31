// Teste do Fiscal do MEI com uma Focus NFe FALSA (servidor local nesta execução): nenhuma nota
// vai para a Receita. Cobre: CPF/CNPJ, limite do MEI no ano de abertura, configuração (token
// escondido), venda incompleta não emite, venda completa emite SOZINHA (CFOP, CSOSN, NCM por
// categoria, frete e desconto rateados, PDF por e-mail), venda para SC (CFOP 6102), nota
// recusada e emitida de novo, cancelamento, painel (limite, DAS, passos) e relatório mensal.
// Roda com: npx tsx scripts/ci/testar-fiscal.ts (só em banco de teste: apaga o que criou)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

const TOKEN = "token-focus-teste";
const CPF_OK = "52998224725";
const CPF_RECUSA = "11144477735"; // a Focus falsa recusa notas para este CPF
const CNPJ_MEI = "11222333000181";
Object.assign(process.env, { FISCAL_ESPERA_MS: "10" });
delete process.env.FOCUS_NFE_TOKEN;
delete process.env.RESEND_API_KEY;

// ---------- Focus NFe falsa ----------
const notas = new Map<string, { corpo: any; status: string }>();
const emails: Array<{ ref: string; emails: string[] }> = [];
const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const json = (s: number, v: unknown) => {
    res.writeHead(s, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  const esperado = "Basic " + Buffer.from(`${TOKEN}:`).toString("base64");
  if (req.headers.authorization !== esperado)
    return json(401, { codigo: "nao_autorizado", mensagem: "Token inválido" });
  const u = new URL(req.url!, "http://x");
  if (req.method === "POST" && u.pathname === "/v2/nfe") {
    const ref = u.searchParams.get("ref")!;
    if (notas.has(ref)) return json(422, { codigo: "already_processed", mensagem: "Ref repetida" });
    const n = JSON.parse(corpo);
    notas.set(ref, {
      corpo: n,
      status: n.cpf_destinatario === CPF_RECUSA ? "erro_autorizacao" : "processando_autorizacao",
    });
    return json(202, { cnpj_emitente: n.cnpj_emitente, ref, status: "processando_autorizacao" });
  }
  const m = /^\/v2\/nfe\/([^/]+)(\/email)?$/.exec(u.pathname);
  const ref = m && decodeURIComponent(m[1]);
  const nota = ref ? notas.get(ref) : null;
  if (!nota) return json(404, { codigo: "nao_encontrado", mensagem: "Nota fiscal não encontrada" });
  if (req.method === "GET") {
    if (nota.status === "processando_autorizacao") nota.status = "autorizado";
    if (nota.status === "erro_autorizacao")
      return json(200, {
        status: "erro_autorizacao",
        status_sefaz: "539",
        mensagem_sefaz: "Rejeição: Duplicidade de NF-e (teste)",
      });
    return json(200, {
      status: nota.status,
      numero: "17",
      serie: "1",
      chave_nfe: "NFe43261011222333000181550010000000171000000171",
      caminho_xml_nota_fiscal: `/arquivos/${ref}.xml`,
      caminho_danfe: `/arquivos/${ref}.pdf`,
    });
  }
  if (req.method === "POST" && m?.[2]) {
    emails.push({ ref: ref!, emails: JSON.parse(corpo).emails });
    return json(200, {});
  }
  if (req.method === "DELETE") {
    assert.ok(JSON.parse(corpo).justificativa.length >= 15);
    nota.status = "cancelado";
    return json(200, { status: "cancelado", status_sefaz: "135" });
  }
  return json(405, {});
});

const esperar = async (cond: () => Promise<boolean>, o = "condição") => {
  for (let i = 0; i < 100; i++) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`esperou demais: ${o}`);
};

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  process.env.FOCUS_NFE_URL = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const comum = await import("../../src/lib/fiscal-comum");
  const fs = await import("../../src/lib/fiscal.server");
  const av = await import("../../src/lib/avaliacoes.server");
  await fs.garantirTabelasFiscal();
  const vendas: number[] = [];

  try {
    // Documentos e limite
    assert.ok(comum.cpfValido("529.982.247-25"));
    assert.ok(!comum.cpfValido("529.982.247-26"));
    assert.ok(comum.cnpjValido("11.222.333/0001-81"));
    assert.ok(!comum.cnpjValido("11.222.333/0001-82"));
    assert.equal(comum.tipoDoc("11222333000181"), "CNPJ");
    assert.equal(comum.limiteMei(2026, "2026-10-11"), 20_250, "out+nov+dez");
    assert.equal(comum.limiteMei(2027, "2026-10-11"), 81_000);
    assert.equal(comum.siglaUf("Rio Grande do Sul"), "RS");

    // Sem nada salvo: vale o MEI do cartão CNPJ (comércio e serviços: DAS de R$ 87,05)
    const padrao = await fs.lerConfig();
    assert.equal(padrao.cnpj, "68420003000118");
    assert.equal(padrao.abertura, "2026-08-06");
    assert.equal(comum.DAS_MEI[padrao.atividade], 87.05);
    assert.equal(comum.limiteMei(2026, padrao.abertura), 33_750, "agosto a dezembro");

    // Configuração: CNPJ inválido recusado, token nunca volta inteiro
    await assert.rejects(fs.salvarConfig({ cnpj: "11222333000182" }), /CNPJ inválido/);
    const ano = Number(
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 4),
    );
    const pub = await fs.salvarConfig({
      cnpj: CNPJ_MEI,
      razao: "MEI TESTE",
      abertura: `${ano}-01-05`,
      ambiente: "homologacao",
      auto: true,
      emailCliente: true,
      token: TOKEN,
    });
    assert.equal(pub.token, "");
    assert.ok(pub.temToken && pub.tokenFinal === TOKEN.slice(-4));
    // Outros testes podem ter deixado vendas no banco: compara pela diferença
    const mesHoje = new Date()
      .toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
      .slice(0, 7);
    const usadoAntes = (await fs.painel(ano)).limite.usado;
    const relAntes = await fs.relatorioMensal(mesHoje);

    const base = {
      cliente_nome: "Produtor Teste da Silva",
      cliente_email: "produtor@teste.ci",
      cliente_telefone: "+55 53 99999-0000",
      endereco: "Estrada do Arroio",
      end_numero: "S/N",
      end_bairro: "Interior",
      cidade: "Santa Vitória do Palmar",
      departamento: "Rio Grande do Sul",
      cep: "96230-000",
      pais: "BR" as const,
      moeda: "BRL" as const,
      canal: "WHATSAPP",
      metodo: "PIX",
    };

    // Incompleta (sem CPF): não emite e diz o que falta
    const inc = await av.salvarVenda({
      ...base,
      cliente_doc: "",
      itens: [{ sku: "CI-002", codigo: "CI-002", nome: "Engrenagem teste 2", qtd: 1, valor: 120 }],
    });
    vendas.push(inc.id);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(await prisma.notas_fiscais.count({ where: { venda_id: inc.id } }), 0);
    const vInc = await prisma.vendas.findUnique({ where: { id: inc.id } });
    assert.deepEqual(fs.faltaParaNota(vInc!), ["CPF ou CNPJ do cliente"]);

    // Completa: a nota sai sozinha (frete e desconto na venda)
    const ok = await av.salvarVenda({
      ...base,
      cliente_doc: "529.982.247-25",
      itens: [
        { sku: "CI-001", codigo: "AL1001", nome: "Rolamento teste 1", qtd: 2, valor: 100 },
        { sku: "CI-002", codigo: "AL1002", nome: "Engrenagem teste 2", qtd: 1, valor: 50.5 },
        { sku: "CI-004", codigo: "AL1004", nome: "Filtro de óleo teste 4", qtd: 1, valor: 30 },
      ],
    });
    vendas.push(ok.id);
    await prisma.vendas.update({ where: { id: ok.id }, data: { frete_cobrado: 25, desconto: 10 } });
    await esperar(
      async () =>
        (await prisma.notas_fiscais.findFirst({ where: { venda_id: ok.id } }))?.status ===
        "AUTORIZADA",
      "nota automática",
    );
    const nOk = (await prisma.notas_fiscais.findFirst({ where: { venda_id: ok.id } }))!;
    assert.ok(nOk.automatica && nOk.numero === "17" && nOk.danfe?.endsWith(".pdf"));
    assert.equal(nOk.chave?.length, 44);
    await esperar(
      async () =>
        !!(await prisma.notas_fiscais.findUnique({ where: { id: nOk.id } }))?.email_enviado,
      "PDF por e-mail",
    );
    assert.deepEqual(emails.find((e) => e.ref === nOk.ref)?.emails, ["produtor@teste.ci"]);

    const enviada = notas.get(nOk.ref)!.corpo;
    assert.equal(enviada.cnpj_emitente, CNPJ_MEI);
    assert.equal(enviada.cpf_destinatario, CPF_OK);
    assert.equal(enviada.uf_destinatario, "RS");
    assert.equal(enviada.local_destino, 1);
    assert.equal(enviada.presenca_comprador, 3, "WhatsApp = teleatendimento");
    assert.equal(enviada.formas_pagamento[0].forma_pagamento, "17", "PIX");
    assert.deepEqual(
      enviada.items.map((i: any) => [i.cfop, i.icms_situacao_tributaria, i.codigo_ncm]),
      [
        ["5102", "102", "84821010"], // rolamento: NCM da categoria
        ["5102", "102", comum.NCM_PADRAO], // engrenagem: padrão
        ["5102", "102", "84212300"], // filtro
      ],
    );
    // A frete e o desconto foram lidos antes da atualização? A nota usa o que estava na venda
    const soma = (k: string) =>
      Math.round(enviada.items.reduce((s: number, i: any) => s + (i[k] || 0), 0) * 100) / 100;
    assert.equal(enviada.valor_produtos, 280.5);
    assert.equal(soma("valor_bruto"), enviada.valor_produtos);
    assert.equal(soma("valor_frete"), enviada.valor_frete);
    assert.equal(soma("valor_desconto"), enviada.valor_desconto);
    assert.equal(
      enviada.valor_total,
      Math.round((enviada.valor_produtos + enviada.valor_frete - enviada.valor_desconto) * 100) /
        100,
    );

    // Emitir de novo a mesma venda: devolve a nota que existe
    assert.equal((await fs.emitirNota(ok.id)).id, nOk.id);

    // Frete e desconto rateados (nota montada agora, com os valores atualizados)
    const vOk = await prisma.vendas.findUnique({ where: { id: ok.id } });
    const montada = await fs.montarNota(vOk!, await fs.lerConfig());
    assert.equal(montada.valor_total, 295.5);
    assert.equal(
      Math.round(montada.items.reduce((s, i: any) => s + (i.valor_frete || 0), 0) * 100) / 100,
      25,
    );

    // Santa Catarina: CFOP de fora do estado
    const sc = await av.salvarVenda({
      ...base,
      cliente_doc: "11.222.333/0001-81",
      cidade: "Chapecó",
      departamento: "SC",
      cep: "89801-000",
      itens: [
        { sku: "CI-003", codigo: "CI-003", nome: "Bomba hidráulica teste 3", qtd: 1, valor: 400 },
      ],
    });
    vendas.push(sc.id);
    await esperar(
      async () =>
        (await prisma.notas_fiscais.count({ where: { venda_id: sc.id, status: "AUTORIZADA" } })) ===
        1,
      "nota SC",
    );
    const nSc = (await prisma.notas_fiscais.findFirst({ where: { venda_id: sc.id } }))!;
    const corpoSc = notas.get(nSc.ref)!.corpo;
    assert.equal(corpoSc.items[0].cfop, "6102");
    assert.equal(corpoSc.local_destino, 2);
    assert.equal(corpoSc.cnpj_destinatario, CNPJ_MEI);

    // Recusada: guarda o motivo; «emitir de novo» usa outra referência
    const rec = await av.salvarVenda({
      ...base,
      cliente_doc: CPF_RECUSA,
      itens: [{ sku: "CI-005", codigo: "CI-005", nome: "Rolamento teste 5", qtd: 1, valor: 90 }],
    });
    vendas.push(rec.id);
    await esperar(
      async () =>
        (await prisma.notas_fiscais.count({ where: { venda_id: rec.id, status: "ERRO" } })) === 1,
      "nota recusada",
    );
    const nRec = (await prisma.notas_fiscais.findFirst({ where: { venda_id: rec.id } }))!;
    assert.match(nRec.mensagem ?? "", /Duplicidade/);
    const nova = await fs.emitirNota(rec.id);
    assert.notEqual(nova.ref, nRec.ref);

    // Cancelamento
    await assert.rejects(fs.cancelarNota(nOk.id, "curto"), /15 letras/);
    const canc = await fs.cancelarNota(nOk.id, "Cliente desistiu da compra da peça");
    assert.equal(canc.status, "CANCELADA");

    // Uruguai fica fora do fiscal
    const uy = await av.salvarVenda({
      cliente_nome: "Cliente Uruguai",
      pais: "UY",
      moeda: "UYU",
      itens: [{ sku: "CI-006", codigo: "CI-006", nome: "Peça", qtd: 1, valor: 5000 }],
    });
    vendas.push(uy.id);

    // Painel: limite, DAS, passos, lista
    await fs.marcarDas(`${ano}-01`, true);
    const p = await fs.painel(ano);
    assert.ok(!p.vendas.some((v) => v.id === uy.id), "venda do Uruguai fora");
    assert.equal(p.limite.valor, 81_000, "abriu em janeiro: limite cheio");
    const totalBr = Math.round((120 + 295.5 + 400 + 90) * 100) / 100;
    assert.ok(Math.abs(p.limite.usado - usadoAntes - totalBr) < 0.01, `usado ${p.limite.usado}`);
    assert.ok(p.das.guias[0].pagoEm, "janeiro pago");
    assert.equal(p.das.guias[0].valor, comum.DAS_MEI.comercio_servicos);
    await fs.salvarConfig({ atividade: "comercio" });
    assert.equal((await fs.painel(ano)).das.valor, comum.DAS_MEI.comercio);
    assert.ok(
      p.passos.some((x) => x.id === "dados"),
      "venda sem CPF aparece nos passos",
    );
    assert.ok(!p.passos.some((x) => x.id === "emissor"), "emissor conectado");
    const linhaOk = p.vendas.find((v) => v.id === ok.id)!;
    assert.equal(linhaOk.nota?.status, "CANCELADA");

    // Vendas de antes da abertura do CNPJ não contam no limite
    const amanha = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    await fs.salvarConfig({ abertura: amanha });
    const depois = await fs.painel(ano);
    assert.equal(depois.limite.usado, 0);
    assert.equal(depois.vendas.length, 0);
    await fs.salvarConfig({ abertura: `${ano}-01-05` });

    const rel = await fs.relatorioMensal(mesHoje);
    assert.ok(Math.abs(rel.total - relAntes.total - totalBr) < 0.01);
    assert.ok(Math.abs(rel.comNota - relAntes.comNota - 400) < 0.01, "só a de SC tem nota válida");

    console.log(
      `✔ fiscal: ${notas.size} notas na Focus falsa (automática, SC, recusada e reemitida, cancelada), painel e relatório`,
    );
  } finally {
    await prisma.notas_fiscais.deleteMany({ where: { venda_id: { in: vendas } } });
    await prisma.venda_etapas.deleteMany({ where: { venda_id: { in: vendas } } });
    await prisma.vendas.deleteMany({ where: { id: { in: vendas } } });
    await prisma.configuracoes.deleteMany({ where: { chave: { startsWith: "fisc_" } } });
    await prisma.$disconnect();
    servidor.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
