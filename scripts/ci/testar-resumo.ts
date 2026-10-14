// Teste do resumo diário e da tabela de eventos com os dados de scripts/ci/semente.cjs.
// Roda com: npx tsx scripts/ci/testar-resumo.ts (precisa do DATABASE_URL do banco de teste)
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import { resumosDoPeriodo, VERSAO } from "../../src/lib/resumo-diario.server";
import { resumo, funil, produtos } from "../../src/lib/analises.server";

async function main() {
  const banco = (process.env.DATABASE_URL || "").split("/").pop()!.split("?")[0];
  assert.match(banco, /ci|teste/i, "use um banco de teste");

  const ds = await resumosDoPeriodo(7);
  assert.equal(ds.length, 7, "7 dias no período");
  const ontem = ds[5];
  const hoje = ds[6];
  assert.equal(ontem.visitas, 4, "ontem: 4 páginas vistas");
  assert.equal(ontem.sessoes, 2, "ontem: 2 sessões");
  assert.equal(ontem.whatsapp, 1, "ontem: 1 pedido no WhatsApp");
  assert.equal(ontem.carrinho, 1, "ontem: o evento antigo de carrinho foi migrado e contado");
  assert.equal(ontem.skus["CI-001"]?.w, 1, "CI-001 com 1 WhatsApp");
  assert.equal(ontem.locais["UY:Rocha"]?.v, 3, "3 páginas vistas de Rocha");
  assert.equal(ontem.locais["RS"]?.v, 1, "1 página vista do RS");
  assert.equal(ontem.segmentos.fronteira?.n, 1, "1 sessão no perfil fronteira (Pelotas, /pt)");
  assert.equal(hoje.visitas, 1, "hoje: 1 página vista");

  // Migração: nenhum "/_evento/" sobrou em site_visits
  assert.equal(await prisma.site_visits.count({ where: { path: { startsWith: "/_evento/" } } }), 0, "eventos antigos migrados");
  assert.equal(await prisma.site_eventos.count(), 3, "3 eventos em site_eventos");

  // Dia fechado foi salvo; hoje não
  const salvos = await prisma.analise_dia.findMany({ where: { versao: VERSAO } });
  assert.ok(salvos.some((s) => s.dia === ontem.dia), "resumo de ontem salvo em analise_dia");
  assert.ok(!salvos.some((s) => s.dia === hoje.dia), "o dia de hoje não é salvo (ainda está aberto)");

  // Ferramentas somando os resumos
  const r = await resumo(7);
  assert.equal(r.visitas, 5);
  assert.equal(r.sessoes, 3);
  assert.equal(r.visitantes, 3, "visitantes únicos contados no MySQL");
  assert.equal(r.whatsapp, 1);
  const f = await funil(7);
  assert.deepEqual(f.total, [3, 1, 1, 1, 0], "funil: sessões, viram peça, carrinho, WhatsApp, cadastro");
  const p = await produtos(7);
  assert.equal(p.lista[0]?.sku, "CI-001", "peça mais vista com pedido em primeiro");

  // Segunda leitura usa o que foi salvo e dá o mesmo resultado
  const r2 = await resumo(7);
  assert.deepEqual(r2, r, "mesmo resultado lendo de analise_dia");
  console.log("✔ resumo diário e eventos: tudo certo");
}

main()
  .catch((e) => {
    console.error("✘", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
