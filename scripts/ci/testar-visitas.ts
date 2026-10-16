// Teste da contagem diária de visitas: corte do dia no horário do Uruguai, robôs fora,
// visitantes / sessões / páginas certos. Usa um dia antigo (sem outros dados) e apaga o que criou.
// Roda com: npx tsx scripts/ci/testar-visitas.ts
// (banco de teste do CI; num banco local, só com PERMITIR_TESTE_VISITAS=1)
import assert from "node:assert/strict";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const ROBOS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (Linux; Android 6.0.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0)",
  "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 Chrome-Lighthouse",
];

async function main() {
  const { prisma } = await import("../../src/lib/prisma");
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.ok(
    /ci|teste/i.test(banco) || process.env.PERMITIR_TESTE_VISITAS === "1",
    "use um banco de teste",
  );
  const { ehRobo } = await import("../../src/lib/rastreio.server");
  const rd = await import("../../src/lib/resumo-diario.server");

  // Robôs reconhecidos; navegadores comuns não
  for (const ua of ROBOS) assert.ok(ehRobo(ua), `robô: ${ua.slice(0, 60)}`);
  assert.ok(!ehRobo(CHROME), "Chrome comum é pessoa");
  assert.ok(
    !ehRobo(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    ),
    "iPhone é pessoa",
  );

  // Um dia de 2 anos atrás, sem nada gravado
  const dia = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
  const proximo = new Date(new Date(`${dia}T12:00:00Z`).getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  const em = (horaLocal: string, d = dia) => new Date(`${d}T${horaLocal}-03:00`);
  const marca = `teste-visitas-${Date.now()}`;
  const linha = (vid: string, sid: string, quando: Date, path: string, ua = CHROME) => ({
    path,
    visitor_id: `${marca}-${vid}`,
    session_id: `${marca}-${sid}`,
    created_at: quando,
    user_agent: ua,
  });
  try {
    await prisma.site_visits.createMany({
      data: [
        // Visitante A: 3 páginas numa sessão, a última às 23:30 (UTC já é o dia seguinte)
        linha("A", "A1", em("10:00:00"), "/"),
        linha("A", "A1", em("10:01:00"), "/loja"),
        linha("A", "A1", em("23:30:00"), "/produto/X"),
        // Visitante B: 2 sessões, 1 página cada
        linha("B", "B1", em("00:05:00"), "/pt"),
        linha("B", "B2", em("15:00:00"), "/loja"),
        // Robôs no mesmo dia: não contam
        ...ROBOS.map((ua, i) => linha(`R${i}`, `R${i}`, em("12:00:00"), "/", ua)),
        // 00:10 do dia seguinte (horário do Uruguai): é do dia seguinte
        linha("C", "C1", em("00:10:00", proximo), "/"),
      ],
    });
    const { resumo } = await rd.calcularDiaCompleto(dia);
    assert.equal(resumo.visitas, 5, "5 páginas vistas (sem robôs, 23:30 entra no dia)");
    assert.equal(resumo.visitantes, 2, "2 visitantes");
    assert.equal(resumo.sessoes, 3, "3 sessões");
    const seguinte = (await rd.calcularDiaCompleto(proximo)).resumo;
    assert.equal(seguinte.visitas, 1, "00:10 conta no dia seguinte");
    // Mesmo filtro em SQL puro (visitantes únicos do período)
    const { sqlHumano } = await import("../../src/lib/rastreio.server");
    const [{ n }] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(DISTINCT visitor_id) n FROM site_visits WHERE visitor_id LIKE ? AND ${sqlHumano()}`,
      `${marca}-%`,
    );
    assert.equal(Number(n), 3, "SQL puro: A, B e C (robôs fora)");
    console.log("✔ visitas: dia do Uruguai, robôs fora, visitantes/sessões/páginas certos");
  } finally {
    await prisma.site_visits.deleteMany({ where: { visitor_id: { startsWith: marca } } });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
