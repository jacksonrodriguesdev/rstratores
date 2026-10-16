// Teste da importação do Search Console com um Google FALSO (servidor local nesta execução).
// Roda com: npx tsx scripts/ci/testar-search-console.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_GSC=1: guarda e devolve o que havia)
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

const hoje = new Date();
const dia = (n: number) => new Date(hoje.getTime() - n * 86400000).toISOString().slice(0, 10);
// 20 dias de dados: a busca "repuestos john deere" sobe da posição 30 para 10
const BUSCAS = ["repuestos john deere", "reten valtra", "rolamento mf 275"];
function linhas(dims: string[], ini: string, fim: string) {
  const out: any[] = [];
  for (let i = 19; i >= 0; i--) {
    const d = dia(i);
    if (d < ini || d > fim) continue;
    for (const pais of ["ury", "bra"]) {
      for (const [k, q] of BUSCAS.entries()) {
        const posicao = k === 0 ? 10 + i : 20; // a primeira melhora com o tempo
        const linha = {
          d,
          pais,
          q,
          pagina: `https://agropartsuy.com/p${k}`,
          clicks: 1,
          impressions: 10,
          position: posicao,
        };
        out.push(linha);
      }
    }
  }
  const agrupa = (chave: (l: any) => string[]) => {
    const m = new Map<string, { keys: string[]; clicks: number; impressions: number; p: number }>();
    for (const l of out) {
      const keys = chave(l);
      const g = m.get(keys.join("|")) ?? { keys, clicks: 0, impressions: 0, p: 0 };
      g.clicks += l.clicks;
      g.impressions += l.impressions;
      g.p += l.position * l.impressions;
      m.set(keys.join("|"), g);
    }
    return [...m.values()].map((g) => ({
      keys: g.keys,
      clicks: g.clicks,
      impressions: g.impressions,
      position: g.p / g.impressions,
    }));
  };
  const k = dims.join(",");
  if (k === "date") return agrupa((l) => [l.d]);
  if (k === "date,country") return agrupa((l) => [l.d, l.pais]);
  if (k === "date,country,query") return agrupa((l) => [l.d, l.pais, l.q]);
  if (k === "date,country,page") return agrupa((l) => [l.d, l.pais, l.pagina]);
  throw new Error("dimensões inesperadas " + k);
}

const servidor = http.createServer(async (req, res) => {
  let corpo = "";
  for await (const c of req) corpo += c;
  const json = (s: number, v: unknown) => {
    res.writeHead(s, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  if (req.url === "/token") {
    assert.match(corpo, /grant_type=refresh_token/);
    return json(200, { access_token: "acesso-teste", expires_in: 3600 });
  }
  assert.equal(req.headers.authorization, "Bearer acesso-teste", "usa o token de acesso");
  if (req.url === "/webmasters/v3/sites")
    return json(200, {
      siteEntry: [{ siteUrl: "sc-domain:agropartsuy.com", permissionLevel: "siteOwner" }],
    });
  if (req.url!.endsWith("/sitemaps"))
    return json(200, {
      sitemap: [
        {
          path: "https://agropartsuy.com/sitemap.xml",
          errors: "0",
          warnings: "0",
          contents: [{ submitted: "99548" }],
        },
      ],
    });
  if (req.url!.endsWith("/searchAnalytics/query")) {
    const b = JSON.parse(corpo);
    return json(200, { rows: b.startRow ? [] : linhas(b.dimensions, b.startDate, b.endDate) });
  }
  json(404, { error: { message: "rota desconhecida " + req.url } });
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  process.env.GSC_API_URL = url;
  process.env.GSC_TOKEN_URL = `${url}/token`;
  process.env.GOOGLE_CLIENT_ID ||= "cliente-teste";
  process.env.GOOGLE_CLIENT_SECRET ||= "segredo-teste";

  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_GSC === "1",
    "use um banco de teste",
  );
  const sc = await import("../../src/lib/search-console.server");
  await sc.garantirTabelasGsc();

  // Guarda o que havia (banco local) para devolver no fim
  const guardado = {
    config: await prisma.configuracoes.findMany({ where: { chave: { startsWith: "gsc_" } } }),
    dia: await prisma.gsc_dia.findMany(),
    consulta: await prisma.gsc_consulta.findMany(),
    pagina: await prisma.gsc_pagina.findMany(),
  };
  try {
    await prisma.configuracoes.deleteMany({ where: { chave: { startsWith: "gsc_" } } });
    await prisma.gsc_dia.deleteMany({});
    await prisma.gsc_consulta.deleteMany({});
    await prisma.gsc_pagina.deleteMany({});
    assert.equal(await sc.relatorio({ dias: 7, pais: "*" }), null, "sem dados: relatório vazio");
    await assert.rejects(sc.sincronizar(), /não conectado/);

    await prisma.configuracoes.createMany({
      data: [
        { chave: "gsc_refresh", valor: "refresh-teste" },
        { chave: "gsc_site", valor: "sc-domain:agropartsuy.com" },
      ],
    });
    const r = await sc.sincronizar();
    assert.equal(r.dias, 20, "20 dias importados");
    assert.equal(await prisma.gsc_dia.count({ where: { pais: "*" } }), 20);
    // Importar de novo não duplica
    await sc.sincronizar(30);
    assert.equal(
      await prisma.gsc_dia.count({ where: { pais: "*" } }),
      20,
      "reimportação troca os dias",
    );

    const rel = (await sc.relatorio({ dias: 7, pais: "*" }))!;
    assert.equal(rel.atual.impressoes, 7 * 2 * 3 * 10, "impressões dos 7 dias");
    assert.equal(rel.atual.cliques, 7 * 2 * 3);
    const jd = rel.consultas.find((c) => c.chave === "repuestos john deere")!;
    assert.ok(jd.atual.posicao! < jd.anterior.posicao!, "a busca subiu de posição");
    assert.equal(Math.round(jd.atual.posicao!), 13, "posição média dos últimos 7 dias (10..16)");
    const uy = (await sc.relatorio({ dias: 7, pais: "ury" }))!;
    assert.equal(uy.atual.impressoes, rel.atual.impressoes / 2, "filtro por país");
    const est = await sc.estadoGsc();
    assert.equal(est.sitemaps[0]?.enviados, 99548, "sitemap lido");
    assert.ok(est.ultimaSync, "data da importação");
    console.log("✔ search console: tudo certo");
  } finally {
    await prisma.configuracoes.deleteMany({ where: { chave: { startsWith: "gsc_" } } });
    await prisma.gsc_dia.deleteMany({});
    await prisma.gsc_consulta.deleteMany({});
    await prisma.gsc_pagina.deleteMany({});
    if (guardado.config.length)
      await prisma.configuracoes.createMany({
        data: guardado.config.map(({ updated_at, ...c }) => c),
      });
    if (guardado.dia.length) await prisma.gsc_dia.createMany({ data: guardado.dia });
    if (guardado.consulta.length) await prisma.gsc_consulta.createMany({ data: guardado.consulta });
    if (guardado.pagina.length) await prisma.gsc_pagina.createMany({ data: guardado.pagina });
    await prisma.$disconnect();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
