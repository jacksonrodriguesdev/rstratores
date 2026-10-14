// Tabela própria de eventos (site_eventos) e do resumo diário das análises (analise_dia).
// Produção não roda "prisma db push": as tabelas são criadas aqui na primeira vez (mesmo SQL que o
// Prisma gera) e os eventos antigos, gravados em site_visits como "/_evento/<tipo>/<dado>", são
// movidos para cá em lotes. Nada para rodar à mão no phpMyAdmin.
import { prisma } from "./prisma";

export const PREFIXO_ANTIGO = "/_evento/";

const SQL_EVENTOS = `CREATE TABLE IF NOT EXISTS \`site_eventos\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`tipo\` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`dado\` varchar(400) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`pagina\` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`visitor_id\` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`session_id\` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`ip_hash\` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`user_id\` int DEFAULT NULL,
  \`city\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`region\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`country\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`country_code\` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`latitude\` double DEFAULT NULL,
  \`longitude\` double DEFAULT NULL,
  \`fonte\` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`meio\` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`utm_source\` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`utm_medium\` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`utm_campaign\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`referrer_host\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`device\` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`browser\` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`os\` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`language\` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`site_eventos_created_at_idx\` (\`created_at\`),
  KEY \`site_eventos_tipo_created_at_idx\` (\`tipo\`,\`created_at\`),
  KEY \`site_eventos_visitor_id_idx\` (\`visitor_id\`),
  KEY \`site_eventos_session_id_idx\` (\`session_id\`),
  KEY \`site_eventos_user_id_idx\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const SQL_RESUMO = `CREATE TABLE IF NOT EXISTS \`analise_dia\` (
  \`dia\` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`versao\` int NOT NULL,
  \`dados\` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  \`gerado_em\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`dia\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

// Cria as tabelas (uma vez por processo; rápido quando já existem)
let tabelas: Promise<void> | null = null;
export function garantirTabelas() {
  tabelas ??= (async () => {
    await prisma.$executeRawUnsafe(SQL_EVENTOS);
    await prisma.$executeRawUnsafe(SQL_RESUMO);
  })().catch((e) => {
    tabelas = null; // tenta de novo na próxima chamada
    throw e;
  });
  return tabelas;
}

// "/_evento/busca/3%7Cfiltro" → { tipo: "busca", dado: "3|filtro" }
export function lerCaminhoEvento(path: string) {
  if (!path.startsWith(PREFIXO_ANTIGO)) return null;
  const resto = path.slice(PREFIXO_ANTIGO.length);
  const i = resto.indexOf("/");
  if (i <= 0) return null;
  let dado = resto.slice(i + 1);
  try {
    dado = decodeURIComponent(dado);
  } catch {
    /* "%" solto: guarda como veio */
  }
  return { tipo: resto.slice(0, i).slice(0, 20), dado: dado.slice(0, 400) };
}

// Move os eventos antigos de site_visits para site_eventos (uma vez por processo, em lotes)
let migracao: Promise<number> | null = null;
export function migrarEventosAntigos() {
  migracao ??= (async () => {
    await garantirTabelas();
    let movidos = 0;
    for (let lote = 0; lote < 500; lote++) {
      const rows = await prisma.site_visits.findMany({ where: { path: { startsWith: PREFIXO_ANTIGO } }, orderBy: { id: "asc" }, take: 2000 });
      if (!rows.length) break;
      const dados = rows.flatMap((r) => {
        const ev = lerCaminhoEvento(r.path);
        if (!ev) return [];
        return [{
          created_at: r.created_at, tipo: ev.tipo, dado: ev.dado, pagina: r.referrer?.slice(0, 512) ?? null,
          visitor_id: r.visitor_id, session_id: r.session_id, ip_hash: r.ip_hash, user_id: r.user_id,
          city: r.city?.slice(0, 191) ?? null, region: r.region?.slice(0, 191) ?? null, country: r.country?.slice(0, 191) ?? null, country_code: r.country_code?.slice(0, 8) ?? null,
          latitude: r.latitude, longitude: r.longitude, fonte: r.fonte, meio: r.meio, utm_source: r.utm_source, utm_medium: r.utm_medium,
          utm_campaign: r.utm_campaign, referrer_host: r.referrer_host, device: r.device, browser: r.browser, os: r.os, language: r.language,
        }];
      });
      await prisma.$transaction([
        prisma.site_eventos.createMany({ data: dados }),
        prisma.site_visits.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } }),
      ]);
      movidos += rows.length;
    }
    if (movidos) console.log(`[eventos] ${movidos} eventos antigos movidos de site_visits para site_eventos`);
    return movidos;
  })().catch((e) => {
    migracao = null;
    console.error("[eventos] migração falhou", e);
    return 0;
  });
  return migracao;
}

// Quem lê eventos chama isto antes: tabela criada e eventos antigos já movidos
export async function eventosProntos() {
  await garantirTabelas();
  await migrarEventosAntigos();
}

// Evento no formato antigo (path "/_evento/<tipo>/<dado>"), para as telas que montam a linha do
// tempo juntando páginas e eventos (Jornada, Visitantes)
export const caminhoDoEvento = (e: { tipo: string; dado: string }) => `${PREFIXO_ANTIGO}${e.tipo}/${encodeURIComponent(e.dado)}`;
