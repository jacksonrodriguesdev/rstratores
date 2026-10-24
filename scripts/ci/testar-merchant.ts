// Teste do Google Shopping no painel com um Google FALSO (servidor local nesta execução): token,
// situação das peças (aggregateProductStatuses) e desempenho (reports:search). Também: o link do
// feed leva a marcação do Shopping e a visita vira o canal "google_shopping".
// Roda com: npx tsx scripts/ci/testar-merchant.ts (só em banco de teste: devolve o que havia)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

const pedidos: string[] = [];
const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const json = (s: number, v: unknown) => {
    res.writeHead(s, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  pedidos.push(req.url!);
  if (req.url === "/token") return json(200, { access_token: "tk", expires_in: 3600 });
  if (req.headers.authorization !== "Bearer tk")
    return json(401, { error: { message: "sem token" } });
  // Só a versão beta existe para a situação (testa a troca automática de versão)
  if (req.url!.startsWith("/issueresolution/v1/")) return json(404, { error: { message: "nf" } });
  if (req.url!.startsWith("/issueresolution/v1beta/accounts/123/aggregateProductStatuses"))
    return json(200, {
      aggregateProductStatuses: [
        {
          reportingContext: "FREE_LISTINGS",
          country: "BR",
          stats: { activeCount: "900", pendingCount: "50", disapprovedCount: "12" },
          itemLevelIssues: [
            { description: "Imagem genérica", productCount: "8", severity: "DISAPPROVED" },
          ],
        },
      ],
    });
  if (req.url === "/reports/v1/accounts/123/reports:search") {
    const q = JSON.parse(corpo).query as string;
    if (q.includes("offer_id"))
      return json(200, {
        results: [
          {
            productPerformanceView: {
              offerId: "Z38012",
              title: "Haste",
              impressions: "300",
              clicks: "9",
            },
          },
        ],
      });
    return json(200, {
      results: [
        {
          productPerformanceView: {
            date: { year: 2026, month: 10, day: 20 },
            impressions: "100",
            clicks: "3",
          },
        },
        {
          productPerformanceView: {
            date: { year: 2026, month: 10, day: 21 },
            impressions: "200",
            clicks: "6",
          },
        },
      ],
    });
  }
  json(404, { error: { message: "rota falsa" } });
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  Object.assign(process.env, {
    GSC_TOKEN_URL: `${url}/token`,
    MERCHANT_API_URL: url,
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "segredo",
  });
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const chaves = ["gsc_refresh", "mkt_merchant_id"];
  const antes = await prisma.configuracoes.findMany({ where: { chave: { in: chaves } } });
  try {
    for (const [chave, valor] of [
      ["gsc_refresh", "refresh"],
      ["mkt_merchant_id", "123"],
    ])
      await prisma.configuracoes.upsert({
        where: { chave },
        create: { chave, valor },
        update: { valor },
      });

    const { merchantResumo } = await import("../../src/lib/merchant.server");
    const r = await merchantResumo(28);
    assert.equal(r.conta, "123");
    assert.deepEqual(
      r.situacoes.map((x) => [x.pais, x.ativas, x.pendentes, x.reprovadas]),
      [["BR", 900, 50, 12]],
    );
    assert.equal(r.problemas[0].descricao, "Imagem genérica");
    assert.equal(r.vistas, 300);
    assert.equal(r.cliques, 9);
    assert.equal(r.serie[0].dia, "2026-10-20");
    assert.equal(r.pecas[0].sku, "Z38012");
    assert.ok(
      pedidos.some((p) => p.includes("/v1beta/")),
      "trocou para a versão beta",
    );

    // Link do feed e canal do Shopping
    const { classificarOrigem } = await import("../../src/lib/rastreio.server");
    const o = classificarOrigem(
      { utm_source: "google_shopping", utm_medium: "shopping" },
      "agropartsuy.com",
    );
    assert.equal(o.fonte, "google_shopping");
    assert.equal(o.meio, "shopping");
    const { feedGoogle } = await import("../../src/lib/feed-google.server");
    const f = await feedGoogle("BR");
    if (f.itens) assert.ok(f.xml.includes("utm_source=google_shopping&amp;utm_medium=shopping"));
    console.log("ok: Google Shopping no painel (situação, desempenho, canal do Shopping)");
  } finally {
    await prisma.configuracoes.deleteMany({ where: { chave: { in: chaves } } });
    for (const a of antes)
      await prisma.configuracoes.create({ data: { chave: a.chave, valor: a.valor } });
    await prisma.$disconnect();
    servidor.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
