// Camada aduaneira (servidor): registro de origem de cada peça, dados do exportador, prontidão para
// exportar, embarques (etapas do trâmite) e documentos anexados. Regras em aduana-comum.ts e a base
// documental em docs/ADUANA_EXPORTACAO_URUGUAI.md.
import {
  type EtapaId,
  ETAPAS,
  ncmValida,
  origemValida,
  type PontoFronteira,
  PONTOS_FRONTEIRA,
  type Prova,
  PROVAS,
  type RegistroEtapa,
  soNcm,
  type StatusEtapa,
  type StatusOrigem,
  TAXAS_PADRAO,
  type TaxasUruguai,
} from "./aduana-comum";

const SQL = [
  `CREATE TABLE IF NOT EXISTS \`aduana_origem\` (
  \`sku\` VARCHAR(191) NOT NULL,
  \`ncm\` VARCHAR(8) NULL,
  \`fabricante\` VARCHAR(160) NULL,
  \`pais\` VARCHAR(2) NULL,
  \`status\` VARCHAR(12) NOT NULL DEFAULT 'A_VERIFICAR',
  \`prova\` VARCHAR(20) NULL,
  \`prova_data\` VARCHAR(10) NULL,
  \`prova_ref\` VARCHAR(200) NULL,
  \`aec\` DOUBLE NULL,
  \`nota\` TEXT NULL,
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX \`aduana_origem_status_idx\`(\`status\`),
  PRIMARY KEY (\`sku\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`b2b_embarques\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`cotacao_id\` INTEGER NOT NULL,
  \`etapas\` LONGTEXT NOT NULL,
  \`fronteira\` VARCHAR(12) NULL,
  \`transportadora\` VARCHAR(160) NULL,
  \`volumes\` INTEGER NULL,
  \`peso_bruto\` DOUBLE NULL,
  \`peso_liquido\` DOUBLE NULL,
  \`cfop\` VARCHAR(5) NULL,
  \`prova_modo\` VARCHAR(10) NULL,
  \`fatura\` VARCHAR(30) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`b2b_embarques_cotacao_key\`(\`cotacao_id\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`b2b_arquivos\` (
  \`id\` VARCHAR(32) NOT NULL,
  \`embarque_id\` INTEGER NOT NULL,
  \`etapa\` VARCHAR(16) NOT NULL,
  \`nome\` VARCHAR(200) NOT NULL,
  \`caminho\` VARCHAR(300) NOT NULL,
  \`tipo\` VARCHAR(60) NOT NULL,
  \`cliente\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX \`b2b_arquivos_embarque_idx\`(\`embarque_id\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
// Colunas novas na empresa: despachante de aduana do comprador no Uruguai
const COLUNAS_EMPRESA: Array<[string, string]> = [
  ["despachante_nome", "VARCHAR(160) NULL"],
  ["despachante_contato", "VARCHAR(200) NULL"],
];

let pronto: Promise<void> | null = null;
export function garantirTabelasAduana() {
  pronto ??= (async () => {
    const { garantirTabelasB2b } = await import("../b2b.server");
    await garantirTabelasB2b();
    const { prisma } = await import("../prisma");
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
    const cols = await prisma.$queryRaw<Array<{ c: string }>>`
      SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b2b_empresas'`;
    for (const [c, d] of COLUNAS_EMPRESA)
      if (!cols.some((x) => x.c === c))
        await prisma.$executeRawUnsafe(`ALTER TABLE \`b2b_empresas\` ADD COLUMN \`${c}\` ${d}`);
  })().catch((e) => {
    pronto = null;
    throw e;
  });
  return pronto;
}
const db = async () => {
  await garantirTabelasAduana();
  return (await import("../prisma")).prisma;
};
const txt = (s: unknown, max: number) => {
  const t = String(s ?? "")
    .trim()
    .slice(0, max);
  return t || null;
};

// ---------------------------------------------------------------- dados do exportador
export type Regime = "MEI" | "SIMPLES" | "PRESUMIDO" | "REAL";
export type Radar = "NAO" | "LIMITADA" | "ILIMITADA" | "EXPRESSA";
export type ConfigAduana = {
  razao: string;
  cnpj: string;
  endereco: string;
  regime: Regime;
  radar: Radar;
  certificadoDigital: boolean; // e-CNPJ para o Portal Único
  provaModo: "ENTIDADE" | "AUTOCERT";
  entidade: string; // entidade certificadora (ex.: FIERGS)
  cfop: string;
  fronteira: PontoFronteira;
  transportadora: string; // transportadora habilitada (ANTT) para o transporte internacional
  despachanteBr: string; // despachante aduaneiro no Brasil (opcional)
  taxas: TaxasUruguai;
};
const PADRAO: ConfigAduana = {
  razao: "",
  cnpj: "",
  endereco: "",
  regime: "MEI",
  radar: "NAO",
  certificadoDigital: false,
  provaModo: "ENTIDADE",
  entidade: "FIERGS (Federação das Indústrias do RS)",
  cfop: "7102",
  fronteira: "CHUI",
  transportadora: "",
  despachanteBr: "",
  taxas: TAXAS_PADRAO,
};
export async function configAduana(): Promise<ConfigAduana> {
  const prisma = await db();
  const [r] = await prisma.configuracoes.findMany({ where: { chave: "aduana_config" } });
  try {
    const v = r ? JSON.parse(r.valor) : {};
    return { ...PADRAO, ...v, taxas: { ...TAXAS_PADRAO, ...(v.taxas ?? {}) } };
  } catch {
    return PADRAO;
  }
}
export async function salvarConfigAduana(c: Partial<ConfigAduana>) {
  const prisma = await db();
  const atual = await configAduana();
  const n = (v: unknown, d: number, max = 100) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 ? Math.min(max, x) : d;
  };
  const novo: ConfigAduana = {
    razao: txt(c.razao, 160) ?? "",
    cnpj: String(c.cnpj ?? "")
      .replace(/\D/g, "")
      .slice(0, 14),
    endereco: txt(c.endereco, 300) ?? "",
    regime: (["MEI", "SIMPLES", "PRESUMIDO", "REAL"] as const).includes(c.regime as Regime)
      ? (c.regime as Regime)
      : atual.regime,
    radar: (["NAO", "LIMITADA", "ILIMITADA", "EXPRESSA"] as const).includes(c.radar as Radar)
      ? (c.radar as Radar)
      : atual.radar,
    certificadoDigital: !!c.certificadoDigital,
    provaModo: c.provaModo === "AUTOCERT" ? "AUTOCERT" : "ENTIDADE",
    entidade: txt(c.entidade, 160) ?? PADRAO.entidade,
    cfop: /^7\d{3}$/.test(String(c.cfop)) ? String(c.cfop) : atual.cfop,
    fronteira: c.fronteira && c.fronteira in PONTOS_FRONTEIRA ? c.fronteira : atual.fronteira,
    transportadora: txt(c.transportadora, 160) ?? "",
    despachanteBr: txt(c.despachanteBr, 160) ?? "",
    taxas: {
      tasaConsularMercosul: n(c.taxas?.tasaConsularMercosul, TAXAS_PADRAO.tasaConsularMercosul),
      tasaConsularExtrazona: n(c.taxas?.tasaConsularExtrazona, TAXAS_PADRAO.tasaConsularExtrazona),
      iva: n(c.taxas?.iva, TAXAS_PADRAO.iva),
      aecPadrao: n(c.taxas?.aecPadrao, TAXAS_PADRAO.aecPadrao),
      seguro: n(c.taxas?.seguro, TAXAS_PADRAO.seguro),
      despachante: n(c.taxas?.despachante, TAXAS_PADRAO.despachante, 100000),
    },
  };
  await prisma.configuracoes.upsert({
    where: { chave: "aduana_config" },
    create: { chave: "aduana_config", valor: JSON.stringify(novo) },
    update: { valor: JSON.stringify(novo) },
  });
  return novo;
}

// ---------------------------------------------------------------- prontidão para exportar
// Checklist do que a documentação exige antes do primeiro embarque
export async function prontidao() {
  const prisma = await db();
  const cfg = await configAduana();
  const [semNcm] = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*) AS n FROM agricolas WHERE duplicado_de IS NULL AND (ncm IS NULL OR ncm = '')`;
  const [total] = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*) AS n FROM agricolas WHERE duplicado_de IS NULL`;
  const origens = await prisma.$queryRaw<Array<{ status: string; n: bigint }>>`
    SELECT status, COUNT(*) AS n FROM aduana_origem GROUP BY status`;
  const o = Object.fromEntries(origens.map((x) => [x.status, Number(x.n)]));
  const itens = [
    {
      id: "cnpj",
      ok: cfg.cnpj.length === 14 && !!cfg.razao,
      titulo: "CNPJ e razão social do exportador",
      detalhe: "Saem na fatura comercial, na proforma e na NF-e de exportação.",
    },
    {
      id: "regime",
      ok: cfg.regime !== "MEI",
      alerta: cfg.regime === "MEI",
      titulo: "Regime tributário compatível com o volume",
      detalhe:
        "O MEI pode exportar, mas as vendas contam no teto anual de faturamento do MEI. Para atacado de exportação, avalie com o contador migrar para ME (Simples Nacional).",
    },
    {
      id: "radar",
      ok: cfg.radar !== "NAO",
      titulo: "Habilitação no Siscomex (RADAR)",
      detalhe:
        "Sem habilitação não se registra a DU-E (IN RFB 1.984/2020). A exportação não tem teto de valor; os limites do RADAR valem para importação. Pedido pelo sistema Habilita.",
    },
    {
      id: "certificado",
      ok: cfg.certificadoDigital,
      titulo: "Certificado digital e-CNPJ",
      detalhe: "Acesso ao Portal Único Siscomex e emissão da NF-e de exportação.",
    },
    {
      id: "origem",
      ok: cfg.provaModo === "AUTOCERT" || !!cfg.entidade,
      titulo:
        cfg.provaModo === "AUTOCERT"
          ? "Autocertificação de origem (Portaria SECEX 373/2024)"
          : `Cadastro na entidade certificadora (${cfg.entidade || "—"})`,
      detalhe:
        cfg.provaModo === "AUTOCERT"
          ? "A Declaração de Origem vai na fatura comercial. Documentos que provam a origem: guardar 5 anos. Empresa autocertificada pode ser verificada pela SECEX."
          : "A entidade emite o Certificado de Origem Digital (COD) do Mercosul a partir da declaração do produtor.",
    },
    {
      id: "transporte",
      ok: !!cfg.transportadora,
      titulo: "Transportadora habilitada para transporte internacional (ANTT)",
      detalhe: "Emite o CRT e o MIC/DTA da viagem até o Uruguai.",
    },
    {
      id: "ncm",
      ok: Number(semNcm.n) === 0,
      parcial: Number(total.n) - Number(semNcm.n),
      titulo: "NCM nas peças",
      detalhe: `${Number(semNcm.n).toLocaleString("pt-BR")} de ${Number(total.n).toLocaleString("pt-BR")} peças sem NCM. A NCM decide o acordo (ACE 02 ou ACE 18), a regra de origem e o arancel no Uruguai. Ela também é preenchida na cotação e gravada no catálogo.`,
    },
    {
      id: "prova",
      ok: (o.COMPROVADA ?? 0) > 0,
      titulo: "Peças com origem Mercosul comprovada",
      detalhe: `${o.COMPROVADA ?? 0} comprovadas · ${o.INFORMADA ?? 0} informadas sem documento · ${o.EXTRAZONA ?? 0} extrazona. Só a origem comprovada dá arancel 0% no Uruguai.`,
    },
  ];
  return { itens, prontos: itens.filter((i) => i.ok).length, total: itens.length };
}

// ---------------------------------------------------------------- origem das peças
export type Origem = {
  sku: string;
  ncm: string | null;
  fabricante: string | null;
  pais: string | null;
  status: StatusOrigem;
  prova: Prova | null;
  prova_data: string | null;
  prova_ref: string | null;
  aec: number | null;
  nota: string | null;
};
export async function origensDe(skus: string[]): Promise<Map<string, Origem>> {
  const lista = [...new Set(skus.filter(Boolean))].slice(0, 500);
  const mapa = new Map<string, Origem>();
  if (!lista.length) return mapa;
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM aduana_origem WHERE sku IN (${lista.map(() => "?").join(",")})`,
    ...lista,
  );
  for (const r of rows) mapa.set(r.sku, { ...r, aec: r.aec == null ? null : Number(r.aec) });
  // Produtos do catálogo de exportação ("EXP-<id>"): a origem fica no próprio produto
  const cat = await import("../exportacao/catalogo.server");
  const ids = lista.map(cat.idDoSku).filter((x): x is number => x != null);
  for (const id of ids) {
    const p = await cat.produtoPorId(id);
    if (p)
      mapa.set(cat.skuExp(id), {
        sku: cat.skuExp(id),
        ncm: p.ncm,
        fabricante: p.fabricante,
        pais: p.pais_origem,
        status: p.origem_status,
        prova: (p.prova as Prova | null) ?? null,
        prova_data: p.prova_data,
        prova_ref: p.prova_ref,
        aec: p.aec,
        nota: p.nota,
      });
  }
  return mapa;
}

export async function listarOrigens(q: string, filtro: string) {
  const prisma = await db();
  const t = q.trim();
  const conds: string[] = ["a.duplicado_de IS NULL"];
  const args: unknown[] = [];
  if (t) {
    conds.push(
      "(a.sku LIKE ? OR a.codigo_fabricante LIKE ? OR a.nome LIKE ? OR a.fabricante LIKE ?)",
    );
    args.push(`%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`);
  }
  if (filtro === "SEM_NCM")
    conds.push("(COALESCE(o.ncm, a.ncm) IS NULL OR COALESCE(o.ncm, a.ncm) = '')");
  else if (filtro === "A_VERIFICAR") conds.push("(o.status IS NULL OR o.status = 'A_VERIFICAR')");
  else if (["COMPROVADA", "INFORMADA", "EXTRAZONA"].includes(filtro)) {
    conds.push("o.status = ?");
    args.push(filtro);
  } else if (filtro === "COTADAS") {
    // Peças que já apareceram em cotações de empresas (prioridade)
    conds.push(
      "EXISTS (SELECT 1 FROM b2b_cotacoes c WHERE c.itens LIKE CONCAT('%\"sku\":\"', a.sku, '\"%'))",
    );
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT a.sku, a.nome, a.codigo_fabricante, a.marca, a.fabricante AS fab_catalogo, a.ncm AS ncm_catalogo,
            a.imagem_principal, o.ncm, o.fabricante, o.pais, o.status, o.prova, o.prova_data, o.prova_ref, o.aec, o.nota
     FROM agricolas a LEFT JOIN aduana_origem o ON o.sku = a.sku
     WHERE ${conds.join(" AND ")}
     ORDER BY (o.status IS NULL), a.estoque DESC LIMIT 60`,
    ...args,
  );
  return rows.map((r) => ({
    sku: String(r.sku).trim(),
    nome: String(r.nome ?? "").trim(),
    codigo: (r.codigo_fabricante || r.sku || "").trim(),
    marca: r.marca as string | null,
    foto: r.imagem_principal as string | null,
    ncm: soNcm(r.ncm || r.ncm_catalogo) || null,
    fabricante: (r.fabricante || r.fab_catalogo || null) as string | null,
    pais: (r.pais ?? null) as string | null,
    status: (r.status ?? "A_VERIFICAR") as StatusOrigem,
    prova: (r.prova ?? null) as Prova | null,
    prova_data: (r.prova_data ?? null) as string | null,
    prova_ref: (r.prova_ref ?? null) as string | null,
    aec: r.aec == null ? null : Number(r.aec),
    nota: (r.nota ?? null) as string | null,
  }));
}

export async function salvarOrigem(d: Partial<Origem> & { sku: string }) {
  const prisma = await db();
  const sku = String(d.sku).trim().slice(0, 191);
  const existe = await prisma.agricolas.findUnique({ where: { sku }, select: { sku: true } });
  if (!existe) throw new Error("Peça não encontrada no catálogo.");
  const ncm = soNcm(d.ncm) || null;
  if (ncm && !ncmValida(ncm)) throw new Error("A NCM tem 8 dígitos.");
  const status: StatusOrigem = (
    ["COMPROVADA", "INFORMADA", "EXTRAZONA", "A_VERIFICAR"] as const
  ).includes(d.status as StatusOrigem)
    ? (d.status as StatusOrigem)
    : "A_VERIFICAR";
  const prova = d.prova && d.prova in PROVAS ? d.prova : null;
  const provaData = d.prova_data && /^\d{4}-\d{2}-\d{2}$/.test(d.prova_data) ? d.prova_data : null;
  if (status === "COMPROVADA" && (!prova || !provaData))
    throw new Error("Origem comprovada precisa do tipo de prova e da data do documento.");
  if (status === "COMPROVADA" && !ncm) throw new Error("Origem comprovada precisa da NCM.");
  const aec =
    d.aec == null || String(d.aec) === "" ? null : Math.max(0, Math.min(100, Number(d.aec)));
  const pais = txt(d.pais, 2)?.toUpperCase() ?? null;
  await prisma.$executeRaw`
    INSERT INTO aduana_origem (sku, ncm, fabricante, pais, status, prova, prova_data, prova_ref, aec, nota)
    VALUES (${sku}, ${ncm}, ${txt(d.fabricante, 160)}, ${pais}, ${status}, ${prova}, ${provaData},
      ${txt(d.prova_ref, 200)}, ${aec}, ${txt(d.nota, 2000)})
    ON DUPLICATE KEY UPDATE ncm = VALUES(ncm), fabricante = VALUES(fabricante), pais = VALUES(pais),
      status = VALUES(status), prova = VALUES(prova), prova_data = VALUES(prova_data),
      prova_ref = VALUES(prova_ref), aec = VALUES(aec), nota = VALUES(nota)`;
  // NCM também no catálogo (nota fiscal, feeds)
  if (ncm) await prisma.agricolas.update({ where: { sku }, data: { ncm } });
  return true;
}

// Grava a NCM que o admin digitou na cotação (sem mexer no restante da origem)
export async function gravarNcm(sku: string, ncm: string) {
  const n = soNcm(ncm);
  if (!ncmValida(n)) return;
  const cat = await import("../exportacao/catalogo.server");
  const idExp = cat.idDoSku(sku);
  if (idExp) return cat.gravarNcmProduto(idExp, n);
  const prisma = await db();
  await prisma.agricolas.updateMany({ where: { sku }, data: { ncm: n } });
  await prisma.$executeRaw`
    INSERT INTO aduana_origem (sku, ncm) VALUES (${sku}, ${n})
    ON DUPLICATE KEY UPDATE ncm = VALUES(ncm)`;
}

// Origem sugerida para um item de cotação, a partir do registro
export function origemSugerida(o: Origem | undefined): "MERCOSUL" | "OUTRA" | null {
  if (!o) return null;
  if (o.status === "EXTRAZONA") return "OUTRA";
  if (origemValida(o)) return "MERCOSUL";
  return null;
}

// ---------------------------------------------------------------- embarques
export type Embarque = {
  id: number;
  cotacao_id: number;
  etapas: Partial<Record<EtapaId, RegistroEtapa>>;
  fronteira: PontoFronteira | null;
  transportadora: string | null;
  volumes: number | null;
  peso_bruto: number | null;
  peso_liquido: number | null;
  cfop: string | null;
  prova_modo: "ENTIDADE" | "AUTOCERT" | null;
  fatura: string | null;
  created_at: string;
};
const paraEmbarque = (r: any): Embarque => ({
  ...r,
  id: Number(r.id),
  cotacao_id: Number(r.cotacao_id),
  etapas: JSON.parse(r.etapas || "{}"),
  volumes: r.volumes == null ? null : Number(r.volumes),
  peso_bruto: r.peso_bruto == null ? null : Number(r.peso_bruto),
  peso_liquido: r.peso_liquido == null ? null : Number(r.peso_liquido),
  created_at: new Date(r.created_at).toISOString(),
});

// Criado quando a empresa aceita a proposta
export async function criarEmbarque(cotacaoId: number, codigo: string) {
  const prisma = await db();
  const cfg = await configAduana();
  const hoje = new Date().toISOString().slice(0, 10);
  const etapas: Partial<Record<EtapaId, RegistroEtapa>> = {
    PROFORMA: { status: "FEITO", data: hoje, numero: `PF-${codigo}` },
  };
  await prisma.$executeRaw`
    INSERT IGNORE INTO b2b_embarques (cotacao_id, etapas, fronteira, transportadora, cfop, prova_modo, fatura)
    VALUES (${cotacaoId}, ${JSON.stringify(etapas)}, ${cfg.fronteira}, ${cfg.transportadora || null},
      ${cfg.cfop}, ${cfg.provaModo}, ${`FC-${codigo}`})`;
}

export async function embarqueDaCotacao(cotacaoId: number) {
  const prisma = await db();
  const [r] = await prisma.$queryRaw<
    any[]
  >`SELECT * FROM b2b_embarques WHERE cotacao_id = ${cotacaoId}`;
  if (!r) return null;
  const e = paraEmbarque(r);
  const arquivos = await prisma.$queryRaw<any[]>`
    SELECT id, etapa, nome, cliente FROM b2b_arquivos WHERE embarque_id = ${e.id} ORDER BY created_at`;
  return {
    ...e,
    arquivos: arquivos.map((a) => ({
      id: a.id as string,
      etapa: a.etapa as EtapaId,
      nome: a.nome as string,
      cliente: !!Number(a.cliente),
    })),
  };
}
export type EmbarqueCompleto = NonNullable<Awaited<ReturnType<typeof embarqueDaCotacao>>>;

// Versão para o cliente: só etapas e arquivos que ele pode ver, sem notas internas
export function embarqueCliente(e: EmbarqueCompleto | null) {
  if (!e) return null;
  const visiveis = new Set<EtapaId>(ETAPAS.filter((x) => x.cliente).map((x) => x.id));
  const etapas: Partial<Record<EtapaId, RegistroEtapa>> = {};
  for (const [k, v] of Object.entries(e.etapas))
    if (visiveis.has(k as EtapaId) && v)
      etapas[k as EtapaId] = {
        status: v.status,
        data: v.data ?? null,
        numero: k === "NFE" ? null : (v.numero ?? null),
      };
  return {
    etapas,
    fronteira: e.fronteira,
    transportadora: e.transportadora,
    volumes: e.volumes,
    peso_bruto: e.peso_bruto,
    arquivos: e.arquivos.filter((a) => a.cliente && visiveis.has(a.etapa)),
  };
}

export async function listarEmbarques() {
  const prisma = await db();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT b.*, c.codigo, c.total, c.incoterm, c.destino, e.razao_social
    FROM b2b_embarques b JOIN b2b_cotacoes c ON c.id = b.cotacao_id JOIN b2b_empresas e ON e.id = c.empresa_id
    ORDER BY b.id DESC LIMIT 200`;
  return rows.map((r) => {
    const e = paraEmbarque(r);
    const feitas = ETAPAS.filter((x) =>
      ["FEITO", "NAO_SE_APLICA"].includes(e.etapas[x.id]?.status ?? ""),
    ).length;
    const proxima = ETAPAS.find(
      (x) => !["FEITO", "NAO_SE_APLICA"].includes(e.etapas[x.id]?.status ?? ""),
    );
    return {
      ...e,
      codigo: r.codigo as string,
      total: Number(r.total),
      incoterm: r.incoterm as string,
      destino: r.destino as string | null,
      razao_social: r.razao_social as string,
      feitas,
      proxima: proxima?.pt ?? "Concluído",
    };
  });
}

export async function atualizarEmbarque(d: {
  id: number;
  etapa?: EtapaId;
  registro?: RegistroEtapa;
  geral?: Partial<
    Pick<
      Embarque,
      | "fronteira"
      | "transportadora"
      | "volumes"
      | "peso_bruto"
      | "peso_liquido"
      | "cfop"
      | "prova_modo"
    >
  >;
}) {
  const prisma = await db();
  const [r] = await prisma.$queryRaw<any[]>`SELECT * FROM b2b_embarques WHERE id = ${d.id}`;
  if (!r) throw new Error("Embarque não encontrado.");
  const e = paraEmbarque(r);
  if (d.etapa && d.registro) {
    if (!ETAPAS.some((x) => x.id === d.etapa)) throw new Error("Etapa inválida.");
    const st: StatusEtapa = (
      ["PENDENTE", "EM_ANDAMENTO", "FEITO", "NAO_SE_APLICA"] as const
    ).includes(d.registro.status)
      ? d.registro.status
      : "PENDENTE";
    // Regras do trâmite: a DU-E nasce da NF-e; o MIC/DTA de saída exige a DU-E registrada
    if (st === "FEITO" && d.etapa === "DUE" && e.etapas.NFE?.status !== "FEITO")
      throw new Error("A DU-E é elaborada a partir da NF-e de exportação: conclua a NF-e antes.");
    if (st === "FEITO" && d.etapa === "TRANSPORTE" && e.etapas.DUE?.status !== "FEITO")
      throw new Error("O MIC/DTA de saída exige a DU-E registrada: conclua a DU-E antes.");
    if (st === "FEITO" && d.etapa === "DESEMBARACO" && e.etapas.TRANSPORTE?.status !== "FEITO")
      throw new Error("Sem CRT e MIC/DTA a carga não sai: conclua o transporte antes.");
    e.etapas[d.etapa] = {
      status: st,
      numero: txt(d.registro.numero, 80),
      data: d.registro.data && /^\d{4}-\d{2}-\d{2}$/.test(d.registro.data) ? d.registro.data : null,
      nota: txt(d.registro.nota, 1000),
    };
  }
  const g = d.geral ?? {};
  const num = (v: unknown) => (v == null || String(v) === "" ? null : Math.max(0, Number(v) || 0));
  await prisma.$executeRaw`
    UPDATE b2b_embarques SET etapas = ${JSON.stringify(e.etapas)},
      fronteira = ${g.fronteira && g.fronteira in PONTOS_FRONTEIRA ? g.fronteira : e.fronteira},
      transportadora = ${g.transportadora !== undefined ? txt(g.transportadora, 160) : e.transportadora},
      volumes = ${g.volumes !== undefined ? num(g.volumes) : e.volumes},
      peso_bruto = ${g.peso_bruto !== undefined ? num(g.peso_bruto) : e.peso_bruto},
      peso_liquido = ${g.peso_liquido !== undefined ? num(g.peso_liquido) : e.peso_liquido},
      cfop = ${g.cfop && /^7\d{3}$/.test(g.cfop) ? g.cfop : e.cfop},
      prova_modo = ${g.prova_modo === "AUTOCERT" || g.prova_modo === "ENTIDADE" ? g.prova_modo : e.prova_modo}
    WHERE id = ${e.id}`;
  return embarqueDaCotacao(e.cotacao_id);
}

// ---------------------------------------------------------------- arquivos (pasta privada)
// Ficam em <uploads>/privado/aduana/<embarque>/ — a rota pública /uploads recusa "privado/";
// quem entrega é /api/empresas/arquivo/<id>, só para a empresa dona ou o admin.
export const TIPOS_ARQUIVO: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  xml: "application/xml",
};
export async function guardarArquivo(d: {
  embarqueId: number;
  etapa: string;
  nome: string;
  conteudo: Buffer;
  cliente: boolean;
}) {
  const prisma = await db();
  if (!ETAPAS.some((x) => x.id === d.etapa)) throw new Error("Etapa inválida.");
  const [e] = await prisma.$queryRaw<
    any[]
  >`SELECT id FROM b2b_embarques WHERE id = ${d.embarqueId}`;
  if (!e) throw new Error("Embarque não encontrado.");
  const ext = d.nome.split(".").pop()?.toLowerCase() ?? "";
  if (!TIPOS_ARQUIVO[ext]) throw new Error("Envie PDF, XML, JPG ou PNG.");
  const crypto = await import("crypto");
  const fs = await import("fs");
  const path = await import("path");
  const { caminhoUpload } = await import("../uploads.server");
  const id = crypto.randomBytes(16).toString("hex");
  const relativo = `privado/aduana/${d.embarqueId}/${id}.${ext}`;
  const destino = caminhoUpload(relativo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, d.conteudo);
  await prisma.$executeRaw`
    INSERT INTO b2b_arquivos (id, embarque_id, etapa, nome, caminho, tipo, cliente)
    VALUES (${id}, ${d.embarqueId}, ${d.etapa}, ${d.nome.slice(0, 200)}, ${relativo}, ${TIPOS_ARQUIVO[ext]}, ${d.cliente ? 1 : 0})`;
  return id;
}

export async function apagarArquivo(id: string) {
  const prisma = await db();
  const [a] = await prisma.$queryRaw<any[]>`SELECT * FROM b2b_arquivos WHERE id = ${id}`;
  if (!a) return false;
  const fs = await import("fs");
  const { caminhoUpload } = await import("../uploads.server");
  try {
    fs.unlinkSync(caminhoUpload(a.caminho));
  } catch {
    /* já não existia */
  }
  await prisma.$executeRaw`DELETE FROM b2b_arquivos WHERE id = ${id}`;
  return true;
}

// Para entregar o arquivo: admin vê tudo; a empresa só os marcados para o cliente, da sua cotação
export async function arquivoPermitido(id: string, sessao: { id: number; role: string } | null) {
  if (!sessao || !/^[a-f0-9]{32}$/.test(id)) return null;
  const prisma = await db();
  const [a] = await prisma.$queryRaw<any[]>`
    SELECT a.*, e.user_id FROM b2b_arquivos a
    JOIN b2b_embarques b ON b.id = a.embarque_id
    JOIN b2b_cotacoes c ON c.id = b.cotacao_id
    JOIN b2b_empresas e ON e.id = c.empresa_id
    WHERE a.id = ${id}`;
  if (!a) return null;
  const painel = sessao.role === "ADMIN" || sessao.role === "DESPACHANTE";
  if (!painel && (Number(a.user_id) !== Number(sessao.id) || !Number(a.cliente))) return null;
  return { caminho: a.caminho as string, tipo: a.tipo as string, nome: a.nome as string };
}
