// CRM de prospecção de empresas uruguaias (importadores). Tabela raw `prospectos` (produção não
// roda prisma db push; a tabela é criada no boot por garantirTabelaProspectos). Acesso por SQL cru.
import type { EstadoProspecto, Prospecto, ProspectoNuevo } from "./prospeccion-comum";

const SQL_TABELA = `CREATE TABLE IF NOT EXISTS \`prospectos\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nombre\` VARCHAR(200) NOT NULL,
  \`tipo\` VARCHAR(40) NULL,
  \`ciudad\` VARCHAR(120) NULL,
  \`departamento\` VARCHAR(120) NULL,
  \`telefono\` VARCHAR(60) NULL,
  \`email\` VARCHAR(190) NULL,
  \`web\` VARCHAR(300) NULL,
  \`origen\` VARCHAR(40) NULL,
  \`estado\` VARCHAR(30) NOT NULL DEFAULT 'nuevo',
  \`prioridad\` VARCHAR(10) NULL,
  \`ultimo_contacto\` DATE NULL,
  \`proximo_contacto\` DATE NULL,
  \`notas\` TEXT NULL,
  \`clave\` VARCHAR(255) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX \`prospectos_estado_idx\`(\`estado\`),
  INDEX \`prospectos_ciudad_idx\`(\`ciudad\`),
  UNIQUE INDEX \`prospectos_clave_uk\`(\`clave\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

// Adiciona uma coluna se ela ainda não existir (prod não roda prisma db push).
async function garantirColuna(coluna: string, definicao: string) {
  const { prisma } = await import("../prisma");
  const existe = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    "SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prospectos' AND COLUMN_NAME = ?",
    coluna,
  );
  if (Number(existe[0]?.n ?? 0) === 0)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`prospectos\` ADD COLUMN \`${coluna}\` ${definicao}`,
    );
}

let tabela: Promise<void> | null = null;
export function garantirTabelaProspectos() {
  tabela ??= (async () => {
    const { prisma } = await import("../prisma");
    await prisma.$executeRawUnsafe(SQL_TABELA);
    // Colunas do mapa (adicionadas depois da 1ª versão da tabela)
    await garantirColuna("lat", "DOUBLE NULL");
    await garantirColuna("lng", "DOUBLE NULL");
  })().catch((e) => {
    tabela = null;
    throw e;
  });
  return tabela;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
// Chave de deduplicação: nome + cidade (ou nome + telefone).
const claveDe = (nombre: string, ciudad?: string | null, telefono?: string | null) =>
  `${norm(nombre)}|${norm(ciudad ?? "") || (telefono ?? "").replace(/\D/g, "")}`.slice(0, 255);

export type FiltroProspeccion = {
  estado?: string;
  tipo?: string;
  ciudad?: string;
  busca?: string;
  pagina?: number;
  porPagina?: number;
};

export async function listarProspectos(f: FiltroProspeccion = {}) {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.estado) {
    where.push("estado = ?");
    params.push(f.estado);
  }
  if (f.tipo) {
    where.push("tipo = ?");
    params.push(f.tipo);
  }
  if (f.ciudad) {
    where.push("ciudad = ?");
    params.push(f.ciudad);
  }
  if (f.busca) {
    where.push("(nombre LIKE ? OR ciudad LIKE ? OR telefono LIKE ? OR notas LIKE ?)");
    const q = `%${f.busca}%`;
    params.push(q, q, q, q);
  }
  const cond = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const porPagina = Math.min(Math.max(f.porPagina ?? 50, 1), 200);
  const pagina = Math.max(f.pagina ?? 1, 1);
  const offset = (pagina - 1) * porPagina;

  const [cont] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) n FROM prospectos ${cond}`,
    ...params,
  );
  const rows = await prisma.$queryRawUnsafe<Prospecto[]>(
    `SELECT id, nombre, tipo, ciudad, departamento, telefono, email, web, origen, estado,
            prioridad,
            DATE_FORMAT(ultimo_contacto,'%Y-%m-%d') ultimo_contacto,
            DATE_FORMAT(proximo_contacto,'%Y-%m-%d') proximo_contacto, notas, lat, lng
     FROM prospectos ${cond}
     ORDER BY (proximo_contacto IS NULL), proximo_contacto ASC, FIELD(estado,'respondio','cotizando','contactado','nuevo','cliente','descartado'), updated_at DESC
     LIMIT ${porPagina} OFFSET ${offset}`,
    ...params,
  );
  return { rows, total: Number(cont?.n ?? 0), pagina, porPagina };
}

// Todos os prospectos para o mapa (leve, sem paginação). Cap de segurança.
export type PuntoMapa = {
  id: number;
  nombre: string;
  ciudad: string | null;
  estado: string;
  tipo: string | null;
  telefono: string | null;
  lat: number | null;
  lng: number | null;
};
export async function listarProspectosMapa(): Promise<PuntoMapa[]> {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  return prisma.$queryRawUnsafe<PuntoMapa[]>(
    `SELECT id, nombre, ciudad, estado, tipo, telefono, lat, lng FROM prospectos ORDER BY updated_at DESC LIMIT 5000`,
  );
}

export async function obtenerProspecto(id: number): Promise<Prospecto | null> {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  const rows = await prisma.$queryRawUnsafe<Prospecto[]>(
    `SELECT id, nombre, tipo, ciudad, departamento, telefono, email, web, origen, estado, prioridad,
            DATE_FORMAT(ultimo_contacto,'%Y-%m-%d') ultimo_contacto,
            DATE_FORMAT(proximo_contacto,'%Y-%m-%d') proximo_contacto, notas, lat, lng
     FROM prospectos WHERE id=? LIMIT 1`,
    id,
  );
  return rows[0] ?? null;
}

export async function estatisticasProspeccion() {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  const porEstado = await prisma.$queryRawUnsafe<Array<{ estado: string; n: bigint }>>(
    "SELECT estado, COUNT(*) n FROM prospectos GROUP BY estado",
  );
  const [hoy] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    "SELECT COUNT(*) n FROM prospectos WHERE proximo_contacto IS NOT NULL AND proximo_contacto <= CURDATE() AND estado NOT IN ('cliente','descartado')",
  );
  const [tot] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    "SELECT COUNT(*) n FROM prospectos",
  );
  const mapa: Record<string, number> = {};
  for (const r of porEstado) mapa[r.estado] = Number(r.n);
  return { porEstado: mapa, porContactarHoy: Number(hoy?.n ?? 0), total: Number(tot?.n ?? 0) };
}

export type DatosProspecto = Partial<Omit<Prospecto, "id">> & { id?: number; nombre?: string };

export async function guardarProspecto(d: DatosProspecto) {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  const campos = {
    nombre: (d.nombre ?? "").trim().slice(0, 200),
    tipo: d.tipo || null,
    ciudad: d.ciudad?.slice(0, 120) || null,
    departamento: d.departamento?.slice(0, 120) || null,
    telefono: d.telefono?.slice(0, 60) || null,
    email: d.email?.slice(0, 190) || null,
    web: d.web?.slice(0, 300) || null,
    origen: d.origen || null,
    estado: (d.estado as EstadoProspecto) || "nuevo",
    prioridad: d.prioridad || null,
    ultimo_contacto: d.ultimo_contacto || null,
    proximo_contacto: d.proximo_contacto || null,
    notas: d.notas?.slice(0, 4000) ?? null,
    lat: d.lat != null && Number.isFinite(Number(d.lat)) ? Number(d.lat) : null,
    lng: d.lng != null && Number.isFinite(Number(d.lng)) ? Number(d.lng) : null,
  };
  if (!campos.nombre) throw new Error("El nombre es obligatorio.");
  const clave = claveDe(campos.nombre, campos.ciudad, campos.telefono);
  if (d.id) {
    await prisma.$executeRawUnsafe(
      `UPDATE prospectos SET nombre=?, tipo=?, ciudad=?, departamento=?, telefono=?, email=?, web=?,
         origen=?, estado=?, prioridad=?, ultimo_contacto=?, proximo_contacto=?, notas=?, lat=?, lng=?, clave=? WHERE id=?`,
      campos.nombre,
      campos.tipo,
      campos.ciudad,
      campos.departamento,
      campos.telefono,
      campos.email,
      campos.web,
      campos.origen,
      campos.estado,
      campos.prioridad,
      campos.ultimo_contacto,
      campos.proximo_contacto,
      campos.notas,
      campos.lat,
      campos.lng,
      clave,
      d.id,
    );
    return { id: d.id };
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO prospectos (nombre, tipo, ciudad, departamento, telefono, email, web, origen, estado, prioridad, ultimo_contacto, proximo_contacto, notas, lat, lng, clave)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE telefono=COALESCE(VALUES(telefono),telefono), tipo=COALESCE(VALUES(tipo),tipo),
       lat=COALESCE(VALUES(lat),lat), lng=COALESCE(VALUES(lng),lng), updated_at=CURRENT_TIMESTAMP(3)`,
    campos.nombre,
    campos.tipo,
    campos.ciudad,
    campos.departamento,
    campos.telefono,
    campos.email,
    campos.web,
    campos.origen,
    campos.estado,
    campos.prioridad,
    campos.ultimo_contacto,
    campos.proximo_contacto,
    campos.notas,
    campos.lat,
    campos.lng,
    clave,
  );
  return { ok: true };
}

export async function cambiarEstadoProspecto(id: number, estado: EstadoProspecto) {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  await prisma.$executeRawUnsafe(
    "UPDATE prospectos SET estado=?, ultimo_contacto=IF(?='nuevo', ultimo_contacto, CURDATE()) WHERE id=?",
    estado,
    estado,
    id,
  );
  return { ok: true };
}

export async function fijarProximoContacto(id: number, fecha: string | null) {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  await prisma.$executeRawUnsafe(
    "UPDATE prospectos SET proximo_contacto=? WHERE id=?",
    fecha || null,
    id,
  );
  return { ok: true };
}

export async function eliminarProspecto(id: number) {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  await prisma.$executeRawUnsafe("DELETE FROM prospectos WHERE id=?", id);
  return { ok: true };
}

// Importa uma lista (colada) de prospectos; ignora duplicados pela clave. defaults preenche campos
// comuns (tipo, ciudad, origen, departamento) quando a linha não trouxe.
export async function importarProspectos(
  linhas: ProspectoNuevo[],
  defaults: {
    tipo?: string | null;
    ciudad?: string | null;
    departamento?: string | null;
    origen?: string | null;
  } = {},
) {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  let insertados = 0;
  let duplicados = 0;
  for (const l of linhas) {
    const nombre = (l.nombre ?? "").trim();
    if (!nombre) continue;
    const ciudad = l.ciudad || defaults.ciudad || null;
    const telefono = l.telefono || null;
    const clave = claveDe(nombre, ciudad, telefono);
    const [ex] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      "SELECT COUNT(*) n FROM prospectos WHERE clave=?",
      clave,
    );
    if (Number(ex?.n ?? 0) > 0) {
      duplicados++;
      continue;
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO prospectos (nombre, tipo, ciudad, departamento, telefono, origen, estado, clave)
       VALUES (?,?,?,?,?,?, 'nuevo', ?)
       ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP(3)`,
      nombre,
      l.tipo || defaults.tipo || null,
      ciudad,
      l.departamento || defaults.departamento || null,
      telefono,
      defaults.origen || "maps",
      clave,
    );
    insertados++;
  }
  return { insertados, duplicados, total: linhas.length };
}

// Carrega a base inicial de empresas do Uruguai (semilla-uy.ts). Dedup por nome+cidade.
export async function importarSemillaUy() {
  const { SEMILLA_UY } = await import("./semilla-uy");
  return importarProspectos(SEMILLA_UY, { origen: "maps" });
}

export async function exportarProspectosCsv(): Promise<string> {
  await garantirTabelaProspectos();
  const { prisma } = await import("../prisma");
  const rows = await prisma.$queryRawUnsafe<Prospecto[]>(
    `SELECT nombre, tipo, ciudad, departamento, telefono, email, web, origen, estado, prioridad,
            DATE_FORMAT(ultimo_contacto,'%Y-%m-%d') ultimo_contacto,
            DATE_FORMAT(proximo_contacto,'%Y-%m-%d') proximo_contacto, notas
     FROM prospectos ORDER BY ciudad, nombre`,
  );
  const cab = [
    "nombre",
    "tipo",
    "ciudad",
    "departamento",
    "telefono",
    "email",
    "web",
    "origen",
    "estado",
    "prioridad",
    "ultimo_contacto",
    "proximo_contacto",
    "notas",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = rows.map((r) => cab.map((c) => esc((r as Record<string, unknown>)[c])).join(";"));
  return [cab.join(";"), ...linhas].join("\n");
}
