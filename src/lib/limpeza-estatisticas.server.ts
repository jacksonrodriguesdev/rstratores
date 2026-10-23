// Limpa as estatísticas do site de visitas que não são clientes, marcando as linhas de site_visits
// com uma etiqueta no user_agent que está na lista ROBOS (rastreio.server.ts). Assim todas as telas
// (Análises, Visitantes, Interesse, Criador de anúncios) já deixam de contá-las, sem mudar consultas.
// - "fora-regiao": de fora de Uruguai/Brasil/Argentina, abriu uma página só e não fez nada
//   (robôs com navegador comum, servidores do Google/Meta lendo links, varreduras).
// - "visita-interna": aparelhos em que entrou uma conta da loja (admin ou contas de teste, lista
//   na configuração "estatisticas_contas_internas", e-mails separados por vírgula). Os eventos
//   desses aparelhos (WhatsApp, busca, carrinho) são apagados: são testes nossos.
// Os dias já resumidos que mudaram são recalculados na próxima consulta. Roda no máximo a cada 30 min.
import { prisma } from "./prisma";
import { sqlHumano } from "./rastreio.server";

const H = 3600_000;
const FUSO = -3 * H;
const INTERVALO = 30 * 60_000;
const REGIAO = ["UY", "BR", "AR"];
const ACOES = ["whatsapp", "carrinho", "busca", "cotacao", "clique"];
const diaLocal = (d: Date) => new Date(d.getTime() + FUSO).toISOString().slice(0, 10);

const g = globalThis as unknown as { __limpezaEst?: { em: number; p: Promise<unknown> | null } };
const estado = () => (g.__limpezaEst ??= { em: 0, p: null });

export function limparEstatisticas(forcar = false) {
  const e = estado();
  if (e.p) return e.p;
  if (!forcar && Date.now() - e.em < INTERVALO) return Promise.resolve(null);
  e.em = Date.now();
  e.p = executar()
    .catch((err) => console.error("[limpeza-estatisticas]", err?.message ?? err))
    .finally(() => (e.p = null));
  return e.p;
}

async function marcar(ids: number[], etiqueta: string) {
  for (let i = 0; i < ids.length; i += 500) {
    const lote = ids.slice(i, i + 500);
    await prisma.$executeRawUnsafe(
      `UPDATE site_visits SET user_agent = CONCAT(?, ' ', IFNULL(user_agent, '')) WHERE id IN (${lote.map(() => "?").join(",")})`,
      etiqueta,
      ...lote,
    );
  }
}

export async function executar() {
  const dias = new Set<string>();
  const { eventosProntos } = await import("./eventos-db.server");
  await eventosProntos();

  // 1. Contas internas: admin + e-mails da configuração
  const cfg = await prisma.configuracoes.findUnique({
    where: { chave: "estatisticas_contas_internas" },
  });
  const emails = (cfg?.valor ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const contas = await prisma.users.findMany({
    where: { OR: [{ role: "ADMIN" }, ...(emails.length ? [{ email: { in: emails } }] : [])] },
    select: { id: true },
  });
  const idsContas = contas.map((c) => c.id);
  let internas = 0;
  if (idsContas.length) {
    const lista = idsContas.join(",");
    const vis = await prisma.$queryRawUnsafe<Array<{ visitor_id: string }>>(
      `SELECT DISTINCT visitor_id FROM site_visits WHERE user_id IN (${lista}) AND visitor_id IS NOT NULL
       UNION SELECT DISTINCT visitor_id FROM site_eventos WHERE user_id IN (${lista}) AND visitor_id IS NOT NULL`,
    );
    const vids = vis.map((v) => v.visitor_id);
    for (let i = 0; i < vids.length; i += 200) {
      const lote = vids.slice(i, i + 200);
      const marcas = lote.map(() => "?").join(",");
      const linhas = await prisma.$queryRawUnsafe<Array<{ id: number; created_at: Date }>>(
        `SELECT id, created_at FROM site_visits WHERE visitor_id IN (${marcas}) AND ${sqlHumano()}`,
        ...lote,
      );
      linhas.forEach((l) => dias.add(diaLocal(new Date(l.created_at))));
      await marcar(
        linhas.map((l) => Number(l.id)),
        "visita-interna",
      );
      internas += linhas.length;
      const ev = await prisma.$queryRawUnsafe<Array<{ created_at: Date }>>(
        `SELECT created_at FROM site_eventos WHERE visitor_id IN (${marcas})`,
        ...lote,
      );
      ev.forEach((x) => dias.add(diaLocal(new Date(x.created_at))));
      await prisma.$executeRawUnsafe(
        `DELETE FROM site_eventos WHERE visitor_id IN (${marcas})`,
        ...lote,
      );
    }
  }

  // 2. Fora da região, uma página só e nenhuma ação na sessão
  const fora = await prisma.$queryRawUnsafe<Array<{ id: number; created_at: Date }>>(
    `SELECT MIN(v.id) AS id, MIN(v.created_at) AS created_at FROM site_visits v
     WHERE v.session_id IS NOT NULL AND v.country_code IS NOT NULL
       AND v.country_code NOT IN (${REGIAO.map((c) => `'${c}'`).join(",")}) AND ${sqlHumano("v.")}
     GROUP BY v.session_id HAVING COUNT(*) = 1
       AND NOT EXISTS (SELECT 1 FROM site_eventos e WHERE e.session_id = v.session_id
         AND e.tipo IN (${ACOES.map((t) => `'${t}'`).join(",")}))`,
  );
  fora.forEach((l) => dias.add(diaLocal(new Date(l.created_at))));
  await marcar(
    fora.map((l) => Number(l.id)),
    "fora-regiao",
  );

  // 3. Dias já resumidos que mudaram: recalculados na próxima consulta
  if (dias.size) await prisma.analise_dia.deleteMany({ where: { dia: { in: [...dias] } } });
  return { internas, fora: fora.length, dias: dias.size };
}
