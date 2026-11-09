// AGRO PARTS Mayorista: cadastro de empresas, cotações por volume e propostas (servidor).
// Fluxo: empresa se cadastra (RUT válido) → admin aprova e define desconto e pagamento →
// empresa cola a lista de peças → sistema acha no catálogo e calcula o preço sugerido →
// admin revisa e envia a proposta → empresa aceita ou recusa (proforma para imprimir).
import {
  type Incoterm,
  INCOTERMS,
  type ItemCotacao,
  type LinhaLista,
  normalizarCodigo,
  PAGAMENTOS,
  rutValido,
  soDigitos,
  type StatusEmpresa,
  TIPOS_EMPRESA,
  totaisCotacao,
  VOLUMES,
} from "./b2b-comum";

const SQL = [
  `CREATE TABLE IF NOT EXISTS \`b2b_empresas\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`user_id\` INTEGER NOT NULL,
  \`razao_social\` VARCHAR(160) NOT NULL,
  \`nome_fantasia\` VARCHAR(160) NULL,
  \`rut\` VARCHAR(12) NOT NULL,
  \`tipo\` VARCHAR(20) NOT NULL,
  \`departamento\` VARCHAR(40) NULL,
  \`cidade\` VARCHAR(120) NULL,
  \`endereco\` VARCHAR(300) NULL,
  \`telefone\` VARCHAR(40) NULL,
  \`site\` VARCHAR(200) NULL,
  \`contato_nome\` VARCHAR(120) NOT NULL,
  \`contato_cargo\` VARCHAR(80) NULL,
  \`email\` VARCHAR(191) NOT NULL,
  \`volume\` VARCHAR(12) NULL,
  \`marcas\` VARCHAR(300) NULL,
  \`status\` VARCHAR(12) NOT NULL DEFAULT 'PENDENTE',
  \`desconto_pct\` DOUBLE NOT NULL DEFAULT 0,
  \`pagamento\` VARCHAR(12) NOT NULL DEFAULT 'ANTICIPADO',
  \`nota_admin\` TEXT NULL,
  \`aprovada_em\` DATETIME(3) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`b2b_empresas_user_id_key\`(\`user_id\`),
  UNIQUE INDEX \`b2b_empresas_rut_key\`(\`rut\`),
  INDEX \`b2b_empresas_status_idx\`(\`status\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`b2b_cotacoes\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`codigo\` VARCHAR(16) NOT NULL,
  \`empresa_id\` INTEGER NOT NULL,
  \`user_id\` INTEGER NOT NULL,
  \`status\` VARCHAR(12) NOT NULL DEFAULT 'ENVIADA',
  \`itens\` LONGTEXT NOT NULL,
  \`mensagem\` TEXT NULL,
  \`destino\` VARCHAR(160) NULL,
  \`incoterm\` VARCHAR(4) NOT NULL DEFAULT 'DAP',
  \`moeda\` VARCHAR(3) NOT NULL DEFAULT 'USD',
  \`frete\` DOUBLE NULL,
  \`subtotal\` DOUBLE NOT NULL DEFAULT 0,
  \`total\` DOUBLE NOT NULL DEFAULT 0,
  \`prazo\` VARCHAR(80) NULL,
  \`validade\` VARCHAR(10) NULL,
  \`nota_cliente\` TEXT NULL,
  \`nota_interna\` TEXT NULL,
  \`respondida_em\` DATETIME(3) NULL,
  \`decidida_em\` DATETIME(3) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`b2b_cotacoes_codigo_key\`(\`codigo\`),
  INDEX \`b2b_cotacoes_empresa_idx\`(\`empresa_id\`),
  INDEX \`b2b_cotacoes_status_idx\`(\`status\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];

let pronto: Promise<void> | null = null;
export function garantirTabelasB2b() {
  pronto ??= (async () => {
    const { prisma } = await import("./prisma");
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    pronto = null;
    throw e;
  });
  return pronto;
}
const db = async () => {
  await garantirTabelasB2b();
  return (await import("./prisma")).prisma;
};

// ---------------------------------------------------------------- configuração (Admin → Empresas)
export type ConfigB2b = {
  minimo: number; // unidades mínimas por item
  incoterm: Incoterm;
  validade: number; // dias de validade da proposta
  margem: number; // % sobre o custo da peça (R$) para o preço sugerido
  instantaneo: boolean; // mostrar o preço indicativo na hora para empresas aprovadas
  prazo: string; // prazo de entrega padrão (texto)
  exportador: string; // dados do vendedor na proforma (razão social, CNPJ, endereço)
};
const PADRAO: ConfigB2b = {
  minimo: 20,
  incoterm: "DAP",
  validade: 15,
  margem: 35,
  instantaneo: true,
  prazo: "10 a 20 días hábiles desde la confirmación del pago",
  exportador: "AGRO PARTS\nagropartsuy.com · WhatsApp +55 53 99183-1101",
};
export async function configB2b(): Promise<ConfigB2b> {
  const prisma = await db();
  const rows = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "b2b_" } } });
  const v = Object.fromEntries(rows.map((r) => [r.chave.slice(4), r.valor]));
  const num = (s: string | undefined, d: number, min: number, max: number) => {
    const n = Number(s);
    return Number.isFinite(n) && s !== "" && s != null ? Math.min(max, Math.max(min, n)) : d;
  };
  return {
    minimo: Math.round(num(v.minimo, PADRAO.minimo, 1, 10000)),
    incoterm: v.incoterm && v.incoterm in INCOTERMS ? (v.incoterm as Incoterm) : PADRAO.incoterm,
    validade: Math.round(num(v.validade, PADRAO.validade, 1, 120)),
    margem: num(v.margem, PADRAO.margem, 0, 500),
    instantaneo: v.instantaneo == null ? PADRAO.instantaneo : v.instantaneo === "1",
    prazo: (v.prazo ?? PADRAO.prazo).slice(0, 80),
    exportador: (v.exportador ?? PADRAO.exportador).slice(0, 600),
  };
}
export async function salvarConfigB2b(c: Partial<ConfigB2b>) {
  const prisma = await db();
  const atual = { ...(await configB2b()), ...c };
  const valores: Record<string, string> = {
    minimo: String(atual.minimo),
    incoterm: atual.incoterm,
    validade: String(atual.validade),
    margem: String(atual.margem),
    instantaneo: atual.instantaneo ? "1" : "0",
    prazo: atual.prazo,
    exportador: atual.exportador,
  };
  for (const [k, valor] of Object.entries(valores))
    await prisma.configuracoes.upsert({
      where: { chave: `b2b_${k}` },
      create: { chave: `b2b_${k}`, valor },
      update: { valor },
    });
  return configB2b();
}

// ---------------------------------------------------------------- catálogo
type Peca = {
  sku: string;
  nome: string;
  nome_es: string | null;
  codigo_fabricante: string | null;
  marca: string | null;
  imagem_principal: string | null;
  peso: number | null;
  ncm: string | null;
  estoque: number;
  valor_compra: number | null;
  preco_brl: number | null;
  ns: string;
  nc: string | null;
};
const NORM = (c: string) =>
  `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(${c}),' ',''),'-',''),'.',''),'/',''),'_','')`;

// Acha as peças pelo código do fabricante ou SKU, ignorando espaços, pontos e traços
export async function acharPecas(codigos: string[]): Promise<Map<string, Peca>> {
  const prisma = await db();
  const lista = [...new Set(codigos.map(normalizarCodigo).filter((c) => c.length >= 3))].slice(
    0,
    300,
  );
  const mapa = new Map<string, Peca>();
  if (!lista.length) return mapa;
  const marcas = lista.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe<Peca[]>(
    `SELECT sku, nome, nome_es, codigo_fabricante, marca, imagem_principal, peso, ncm, estoque,
            valor_compra, preco_brl, ${NORM("sku")} AS ns, ${NORM("codigo_fabricante")} AS nc
     FROM agricolas
     WHERE duplicado_de IS NULL AND (${NORM("sku")} IN (${marcas}) OR ${NORM("codigo_fabricante")} IN (${marcas}))
     ORDER BY estoque DESC`,
    ...lista,
    ...lista,
  );
  // Código do fabricante vale mais que o SKU; com várias, fica a de mais estoque (ORDER BY)
  for (const r of rows) if (r.nc && !mapa.has(r.nc)) mapa.set(r.nc, r);
  for (const r of rows) if (!mapa.has(r.ns)) mapa.set(r.ns, r);
  return mapa;
}

// Preço sugerido em USD: custo da peça (R$) + margem, menos o desconto da empresa.
// Sem custo cadastrado: 80% do preço de varejo em reais.
export async function cambioUsd() {
  const { cotacoes } = await import("./financeiro.server");
  const c = await cotacoes();
  // c.real = $U por R$ 1; c.dolar = $U por USD 1 → USD por R$ 1
  return c.real && c.dolar ? c.real / c.dolar : null;
}
function sugerido(p: Peca, margem: number, desconto: number, usdPorReal: number | null) {
  if (!usdPorReal) return null;
  const brl =
    p.valor_compra && p.valor_compra > 0
      ? p.valor_compra * (1 + margem / 100)
      : p.preco_brl && p.preco_brl > 0
        ? p.preco_brl * 0.8
        : null;
  if (brl == null) return null;
  return Math.round(brl * usdPorReal * (1 - desconto / 100) * 100) / 100;
}

const nomeDe = async (p: Peca) => {
  const { nomeProduto } = await import("./pecas-es");
  return nomeProduto(p as any) || p.nome_es || p.nome;
};

// Página pública: quantos códigos da lista temos (sem preço)
export async function conferirListaPublica(linhas: LinhaLista[]) {
  const mapa = await acharPecas(linhas.map((l) => l.codigo));
  const itens = await Promise.all(
    linhas.slice(0, 60).map(async (l) => {
      const p = mapa.get(normalizarCodigo(l.codigo));
      return {
        linha: l.linha,
        codigo: l.codigo,
        qtd: l.qtd,
        achou: !!p,
        nome: p ? await nomeDe(p) : null,
        marca: p?.marca ?? null,
        foto: p?.imagem_principal ?? null,
      };
    }),
  );
  return { itens, achados: itens.filter((i) => i.achou).length };
}

// Monta os itens da cotação a partir da lista (o servidor sempre refaz a busca)
export async function montarItens(
  linhas: Array<{ linha?: number; codigo: string; qtd?: number | null; descricao?: string }>,
  cfg: ConfigB2b,
  desconto: number,
): Promise<ItemCotacao[]> {
  const mapa = await acharPecas(linhas.map((l) => l.codigo));
  const usdPorReal = await cambioUsd();
  // Registro de origem (aduana): NCM conferida, origem comprovada e TEC estimada
  const ad = await import("./aduana/aduana.server");
  const origens = await ad.origensDe([...mapa.values()].map((p) => p.sku.trim()));
  return Promise.all(
    linhas.slice(0, 300).map(async (l, i) => {
      const p = mapa.get(normalizarCodigo(l.codigo));
      const pedida = Number(l.qtd) > 0 ? Math.min(99999, Math.round(Number(l.qtd))) : 0;
      const qtd = Math.max(pedida, cfg.minimo);
      const o = p ? origens.get(p.sku.trim()) : undefined;
      return {
        linha: Number(l.linha) || i + 1,
        codigo: String(l.codigo).trim().slice(0, 64),
        descricao: String(l.descricao ?? "")
          .trim()
          .slice(0, 160),
        qtd,
        ajustadaMinimo: qtd > pedida,
        sku: p?.sku.trim() ?? null,
        nome: p ? await nomeDe(p) : null,
        marca: p?.marca ?? null,
        foto: p?.imagem_principal ?? null,
        ncm: o?.ncm || p?.ncm?.replace(/\D/g, "").slice(0, 8) || null,
        peso: p?.peso && p.peso > 0 ? p.peso : null,
        sugerido: p ? sugerido(p, cfg.margem, desconto, usdPorReal) : null,
        preco: null,
        origem: ad.origemSugerida(o),
        origemStatus: p ? (o?.status ?? "A_VERIFICAR") : null,
        aec: o?.aec ?? null,
        disponivel: true,
        obs: null,
      } satisfies ItemCotacao;
    }),
  );
}

// ---------------------------------------------------------------- empresas
export type DadosEmpresa = {
  razao_social: string;
  nome_fantasia?: string;
  rut: string;
  tipo: string;
  departamento?: string;
  cidade?: string;
  endereco?: string;
  telefone?: string;
  site?: string;
  contato_nome: string;
  contato_cargo?: string;
  email: string;
  volume?: string;
  marcas?: string;
};
const txt = (s: unknown, max: number) => {
  const t = String(s ?? "")
    .trim()
    .slice(0, max);
  return t || null;
};
export function limparEmpresa(d: DadosEmpresa) {
  const razao = txt(d.razao_social, 160);
  if (!razao || razao.length < 3) throw new Error("Indicá la razón social de la empresa.");
  const rut = soDigitos(d.rut);
  if (!rutValido(rut)) throw new Error("El RUT no es válido. Revisá los 12 dígitos.");
  const contato = txt(d.contato_nome, 120);
  if (!contato) throw new Error("Indicá el nombre de la persona de contacto.");
  const email = txt(d.email, 191)?.toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El e-mail no es válido.");
  return {
    razao_social: razao,
    nome_fantasia: txt(d.nome_fantasia, 160),
    rut,
    tipo: TIPOS_EMPRESA.some(([k]) => k === d.tipo) ? d.tipo : "OTRO",
    departamento: txt(d.departamento, 40),
    cidade: txt(d.cidade, 120),
    endereco: txt(d.endereco, 300),
    telefone: txt(d.telefone, 40),
    site: txt(d.site, 200),
    contato_nome: contato,
    contato_cargo: txt(d.contato_cargo, 80),
    email,
    volume: VOLUMES.some(([k]) => k === d.volume) ? d.volume! : null,
    marcas: txt(d.marcas, 300),
  };
}

export type Empresa = ReturnType<typeof limparEmpresa> & {
  id: number;
  user_id: number;
  status: StatusEmpresa;
  desconto_pct: number;
  pagamento: keyof typeof PAGAMENTOS;
  nota_admin: string | null;
  aprovada_em: string | null;
  created_at: string;
  despachante_nome?: string | null;
  despachante_contato?: string | null;
};
const paraEmpresa = (r: any): Empresa => ({
  ...r,
  id: Number(r.id),
  user_id: Number(r.user_id),
  desconto_pct: Number(r.desconto_pct ?? 0),
  aprovada_em: r.aprovada_em ? new Date(r.aprovada_em).toISOString() : null,
  created_at: new Date(r.created_at).toISOString(),
});

export async function empresaDoUsuario(userId: number): Promise<Empresa | null> {
  const prisma = await db();
  const [r] = await prisma.$queryRaw<any[]>`SELECT * FROM b2b_empresas WHERE user_id = ${userId}`;
  return r ? paraEmpresa(r) : null;
}

export async function registrarEmpresa(d: DadosEmpresa, userId: number) {
  const prisma = await db();
  const e = limparEmpresa(d);
  if (await empresaDoUsuario(userId))
    throw new Error("Tu usuario ya tiene una empresa registrada.");
  const [dup] = await prisma.$queryRaw<any[]>`SELECT id FROM b2b_empresas WHERE rut = ${e.rut}`;
  if (dup)
    throw new Error(
      "Ya hay una cuenta para este RUT. Si es tu empresa, escribinos por WhatsApp y te damos acceso.",
    );
  await prisma.$executeRaw`
    INSERT INTO b2b_empresas (user_id, razao_social, nome_fantasia, rut, tipo, departamento, cidade,
      endereco, telefone, site, contato_nome, contato_cargo, email, volume, marcas)
    VALUES (${userId}, ${e.razao_social}, ${e.nome_fantasia}, ${e.rut}, ${e.tipo}, ${e.departamento},
      ${e.cidade}, ${e.endereco}, ${e.telefone}, ${e.site}, ${e.contato_nome}, ${e.contato_cargo},
      ${e.email}, ${e.volume}, ${e.marcas})`;
  const nova = (await empresaDoUsuario(userId))!;
  void avisarAdmin(
    `Nova empresa no atacado: ${nova.razao_social}`,
    `RUT ${nova.rut} · ${nova.cidade ?? ""} ${nova.departamento ?? ""}\nContato: ${nova.contato_nome} (${nova.email}${nova.telefone ? `, ${nova.telefone}` : ""})\nVolume: ${VOLUMES.find(([k]) => k === nova.volume)?.[1] ?? "—"}\n\nAprovar em Admin → Empresas (atacado).`,
    "/admin/empresas",
  );
  return nova;
}

export async function listarEmpresas() {
  const prisma = await db();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT e.*, (SELECT COUNT(*) FROM b2b_cotacoes c WHERE c.empresa_id = e.id) AS cotacoes,
      (SELECT COALESCE(SUM(c.total),0) FROM b2b_cotacoes c WHERE c.empresa_id = e.id AND c.status = 'ACEITA') AS aceito
    FROM b2b_empresas e ORDER BY FIELD(e.status,'PENDENTE','APROVADA','SUSPENSA','RECUSADA'), e.id DESC LIMIT 500`;
  return rows.map((r) => ({
    ...paraEmpresa(r),
    cotacoes: Number(r.cotacoes),
    aceito: Number(r.aceito),
  }));
}

export async function atualizarEmpresa(
  id: number,
  d: { status: StatusEmpresa; desconto_pct: number; pagamento: string; nota_admin?: string | null },
) {
  const prisma = await db();
  const [antes] = await prisma.$queryRaw<any[]>`SELECT * FROM b2b_empresas WHERE id = ${id}`;
  if (!antes) throw new Error("Empresa não encontrada.");
  const status = (["PENDENTE", "APROVADA", "RECUSADA", "SUSPENSA"] as const).includes(d.status)
    ? d.status
    : antes.status;
  const desconto = Math.max(0, Math.min(60, Number(d.desconto_pct) || 0));
  const pagamento = d.pagamento in PAGAMENTOS ? d.pagamento : antes.pagamento;
  const aprovadaAgora = status === "APROVADA" && antes.status !== "APROVADA";
  await prisma.$executeRaw`
    UPDATE b2b_empresas SET status = ${status}, desconto_pct = ${desconto}, pagamento = ${pagamento},
      nota_admin = ${txt(d.nota_admin, 2000)},
      aprovada_em = ${aprovadaAgora ? new Date() : antes.aprovada_em}
    WHERE id = ${id}`;
  if (aprovadaAgora) {
    const e = paraEmpresa({ ...antes, status });
    void emailCliente(
      e.email,
      "Tu cuenta mayorista fue aprobada · AGRO PARTS",
      `¡Hola ${e.contato_nome.split(" ")[0]}!`,
      `La cuenta de <b>${e.razao_social}</b> ya está habilitada en AGRO PARTS Mayorista. Ya podés enviar tu lista de piezas y recibir la propuesta con precios por volumen.`,
      "/empresas/portal",
      "Enviar mi primera lista",
    );
  }
  return true;
}

// Despachante de aduana do comprador no Uruguai (recebe os documentos do embarque)
export async function salvarDespachante(userId: number, nome: string, contato: string) {
  const e = await empresaDoUsuario(userId);
  if (!e) throw new Error("Primero registrá tu empresa.");
  const ad = await import("./aduana/aduana.server");
  await ad.garantirTabelasAduana();
  const prisma = await db();
  await prisma.$executeRaw`
    UPDATE b2b_empresas SET despachante_nome = ${txt(nome, 160)}, despachante_contato = ${txt(contato, 200)}
    WHERE id = ${e.id}`;
  return true;
}

// ---------------------------------------------------------------- cotações
export type Cotacao = {
  id: number;
  codigo: string;
  empresa_id: number;
  user_id: number;
  status: string;
  itens: ItemCotacao[];
  mensagem: string | null;
  destino: string | null;
  incoterm: Incoterm;
  moeda: string;
  frete: number | null;
  subtotal: number;
  total: number;
  prazo: string | null;
  validade: string | null;
  nota_cliente: string | null;
  nota_interna?: string | null;
  respondida_em: string | null;
  decidida_em: string | null;
  created_at: string;
};
const iso = (d: any) => (d ? new Date(d).toISOString() : null);
const paraCotacao = (r: any, interna = false): Cotacao => {
  const c: Cotacao = {
    ...r,
    id: Number(r.id),
    empresa_id: Number(r.empresa_id),
    user_id: Number(r.user_id),
    itens: JSON.parse(r.itens || "[]"),
    frete: r.frete == null ? null : Number(r.frete),
    subtotal: Number(r.subtotal),
    total: Number(r.total),
    respondida_em: iso(r.respondida_em),
    decidida_em: iso(r.decidida_em),
    created_at: iso(r.created_at)!,
  };
  if (!interna) delete c.nota_interna;
  return c;
};
// Para o cliente: o preço sugerido só aparece se a loja liberou o preço indicativo
function versaoCliente(c: Cotacao, instantaneo: boolean): Cotacao {
  const cotada = c.status !== "ENVIADA";
  return {
    ...c,
    itens: c.itens.map((i) => ({
      ...i,
      sugerido: !cotada && instantaneo ? (i.sugerido ?? null) : null,
      preco: cotada ? (i.preco ?? null) : null,
    })),
  };
}

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const novoCodigo = () =>
  "M-" + Array.from({ length: 6 }, () => ALFABETO[Math.floor(Math.random() * 31)]).join("");

export async function empresaAprovada(userId: number) {
  const e = await empresaDoUsuario(userId);
  if (!e) throw new Error("Primero registrá tu empresa.");
  if (e.status !== "APROVADA")
    throw new Error("Tu empresa todavía está en revisión. Te avisamos por e-mail al aprobarla.");
  return e;
}

export async function previaCotacao(
  userId: number,
  linhas: Array<{ linha?: number; codigo: string; qtd?: number | null; descricao?: string }>,
) {
  const e = await empresaAprovada(userId);
  const cfg = await configB2b();
  const itens = await montarItens(linhas, cfg, e.desconto_pct);
  return {
    itens: itens.map((i) => ({ ...i, sugerido: cfg.instantaneo ? i.sugerido : null })),
    minimo: cfg.minimo,
    instantaneo: cfg.instantaneo,
  };
}

export async function criarCotacao(
  userId: number,
  d: {
    linhas: Array<{ linha?: number; codigo: string; qtd?: number | null; descricao?: string }>;
    mensagem?: string;
    destino?: string;
    incoterm?: string;
  },
) {
  const e = await empresaAprovada(userId);
  const prisma = await db();
  const cfg = await configB2b();
  if (!d.linhas?.length) throw new Error("Agregá al menos una pieza.");
  const itens = await montarItens(d.linhas, cfg, e.desconto_pct);
  const incoterm = d.incoterm && d.incoterm in INCOTERMS ? d.incoterm : cfg.incoterm;
  const sub = Math.round(itens.reduce((s, i) => s + i.qtd * (i.sugerido ?? 0), 0) * 100) / 100;
  for (let t = 0; t < 5; t++) {
    const codigo = novoCodigo();
    try {
      await prisma.$executeRaw`
        INSERT INTO b2b_cotacoes (codigo, empresa_id, user_id, itens, mensagem, destino, incoterm, subtotal, total)
        VALUES (${codigo}, ${e.id}, ${userId}, ${JSON.stringify(itens)}, ${txt(d.mensagem, 2000)},
          ${txt(d.destino, 160) ?? [e.cidade, e.departamento].filter(Boolean).join(", ")},
          ${incoterm}, ${sub}, ${sub})`;
      const achadas = itens.filter((i) => i.sku).length;
      void avisarAdmin(
        `Cotação atacado ${codigo}: ${e.razao_social}`,
        `${itens.length} itens (${achadas} no catálogo, ${itens.length - achadas} a cotar à mão)\nSugerido: USD ${sub.toFixed(2)}\nDestino: ${d.destino ?? e.cidade ?? "—"} · ${incoterm}`,
        `/admin/empresas?cotacao=${codigo}`,
      );
      return codigo;
    } catch (err: any) {
      if (!String(err?.message).includes("Duplicate")) throw err;
    }
  }
  throw new Error("No pudimos generar el número de la cotización. Probá de nuevo.");
}

export async function cotacoesDaEmpresa(userId: number) {
  const e = await empresaDoUsuario(userId);
  if (!e) return [];
  const prisma = await db();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM b2b_cotacoes WHERE empresa_id = ${e.id} ORDER BY id DESC LIMIT 200`;
  const cfg = await configB2b();
  return rows.map((r) => versaoCliente(paraCotacao(r), cfg.instantaneo));
}

export async function cotacaoDoCliente(userId: number, codigo: string) {
  const e = await empresaDoUsuario(userId);
  if (!e) throw new Error("Cotización no encontrada.");
  const prisma = await db();
  const [r] = await prisma.$queryRaw<any[]>`
    SELECT * FROM b2b_cotacoes WHERE codigo = ${codigo} AND empresa_id = ${e.id}`;
  if (!r) throw new Error("Cotización no encontrada.");
  const cfg = await configB2b();
  const ad = await import("./aduana/aduana.server");
  const [embarque, aduana] = await Promise.all([
    ad.embarqueDaCotacao(Number(r.id)),
    ad.configAduana(),
  ]);
  return {
    cotacao: versaoCliente(paraCotacao(r), cfg.instantaneo),
    empresa: e,
    cfg,
    embarque: ad.embarqueCliente(embarque),
    taxas: aduana.taxas,
  };
}

export async function decidirCotacao(userId: number, codigo: string, aceita: boolean) {
  const { cotacao: c, empresa } = await cotacaoDoCliente(userId, codigo);
  const { statusVisivel } = await import("./b2b-comum");
  if (statusVisivel(c) === "VENCIDA")
    throw new Error("La propuesta venció. Pedí una actualización desde el portal.");
  if (c.status !== "COTADA") throw new Error("Esta cotización no está esperando respuesta.");
  const prisma = await db();
  await prisma.$executeRaw`
    UPDATE b2b_cotacoes SET status = ${aceita ? "ACEITA" : "RECUSADA"}, decidida_em = ${new Date()}
    WHERE id = ${c.id}`;
  if (aceita) {
    const ad = await import("./aduana/aduana.server");
    await ad.criarEmbarque(c.id, c.codigo);
  }
  void avisarAdmin(
    `${aceita ? "✅ ACEITA" : "Recusada"}: cotação ${c.codigo} (${empresa.razao_social})`,
    `Total USD ${c.total.toFixed(2)} · ${c.incoterm} · pagamento: ${PAGAMENTOS[empresa.pagamento] ?? empresa.pagamento}${aceita ? "\n\nPróximo passo: mandar os dados de pagamento e preparar o despacho." : ""}`,
    `/admin/empresas?cotacao=${c.codigo}`,
  );
  return true;
}

// Nova versão de uma proposta vencida ou recusada: copia os itens para uma cotação nova
export async function repetirCotacao(userId: number, codigo: string) {
  const { cotacao: c } = await cotacaoDoCliente(userId, codigo);
  return criarCotacao(userId, {
    linhas: c.itens.map((i) => ({
      linha: i.linha,
      codigo: i.codigo,
      qtd: i.qtd,
      descricao: i.descricao,
    })),
    mensagem: `Actualización de la cotización ${c.codigo}`,
    destino: c.destino ?? undefined,
    incoterm: c.incoterm,
  });
}

// ---------------------------------------------------------------- admin: cotações
export async function listarCotacoesAdmin() {
  const prisma = await db();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT c.*, e.razao_social, e.rut, e.desconto_pct, e.pagamento
    FROM b2b_cotacoes c JOIN b2b_empresas e ON e.id = c.empresa_id
    ORDER BY FIELD(c.status,'ENVIADA','ACEITA','COTADA','RECUSADA','CANCELADA'), c.id DESC LIMIT 300`;
  return rows.map((r) => ({
    ...paraCotacao(r, true),
    razao_social: r.razao_social as string,
    rut: r.rut as string,
  }));
}

export async function cotacaoAdmin(codigo: string) {
  const prisma = await db();
  const [r] = await prisma.$queryRaw<any[]>`SELECT * FROM b2b_cotacoes WHERE codigo = ${codigo}`;
  if (!r) throw new Error("Cotação não encontrada.");
  const [e] = await prisma.$queryRaw<any[]>`SELECT * FROM b2b_empresas WHERE id = ${r.empresa_id}`;
  const cotacao = paraCotacao(r, true);
  const ad = await import("./aduana/aduana.server");
  const [origens, embarque, aduana] = await Promise.all([
    ad.origensDe(cotacao.itens.map((i) => i.sku ?? "").filter(Boolean)),
    ad.embarqueDaCotacao(cotacao.id),
    ad.configAduana(),
  ]);
  return {
    cotacao,
    empresa: paraEmpresa(e),
    cfg: await configB2b(),
    origens: Object.fromEntries(origens),
    embarque,
    aduana,
  };
}

export type PropostaAdmin = {
  codigo: string;
  itens: Array<
    Pick<
      ItemCotacao,
      "linha" | "qtd" | "preco" | "ncm" | "origem" | "disponivel" | "obs" | "peso" | "aec"
    >
  >;
  frete: number | null;
  incoterm: string;
  validade: string | null;
  prazo: string | null;
  nota_cliente: string | null;
  nota_interna: string | null;
  enviar: boolean;
  cancelar?: boolean;
};
export async function salvarProposta(p: PropostaAdmin) {
  const prisma = await db();
  const { cotacao: c, empresa } = await cotacaoAdmin(p.codigo);
  const porLinha = new Map(p.itens.map((i) => [Number(i.linha), i]));
  const num = (v: unknown) => {
    const n = Number(v);
    return v === "" || v == null || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100) / 100;
  };
  const itens: ItemCotacao[] = c.itens.map((i) => {
    const n = porLinha.get(i.linha);
    if (!n) return i;
    return {
      ...i,
      qtd: Math.max(1, Math.min(99999, Math.round(Number(n.qtd) || i.qtd))),
      preco: num(n.preco),
      peso: num(n.peso) ?? i.peso ?? null,
      ncm:
        String(n.ncm ?? "")
          .replace(/\D/g, "")
          .slice(0, 8) || null,
      origem: n.origem === "MERCOSUL" || n.origem === "OUTRA" ? n.origem : null,
      disponivel: n.disponivel !== false,
      obs: txt(n.obs, 200),
      aec:
        n.aec == null || String(n.aec) === ""
          ? null
          : Math.max(0, Math.min(100, Number(n.aec) || 0)),
    };
  });
  // Regras de origem: preferência Mercosul só com NCM (ela define o requisito de origem e o acordo)
  if (p.enviar) {
    const semNcm = itens.filter(
      (i) => i.disponivel !== false && i.origem === "MERCOSUL" && String(i.ncm ?? "").length !== 8,
    );
    if (semNcm.length)
      throw new Error(
        `Itens com origem Mercosul precisam da NCM (8 dígitos): linha(s) ${semNcm.map((i) => i.linha).join(", ")}.`,
      );
  }
  // NCM digitada vai para o catálogo e o registro de origem
  {
    const ad = await import("./aduana/aduana.server");
    for (const i of itens)
      if (i.sku && i.ncm && i.ncm.length === 8) await ad.gravarNcm(i.sku, i.ncm).catch(() => {});
  }
  const frete = num(p.frete);
  const t = totaisCotacao(itens, frete);
  if (p.enviar && !t.itens) throw new Error("Coloque o preço de pelo menos um item disponível.");
  const validade =
    p.validade && /^\d{4}-\d{2}-\d{2}$/.test(p.validade)
      ? p.validade
      : new Date(Date.now() + (await configB2b()).validade * 86400_000).toISOString().slice(0, 10);
  const status = p.cancelar ? "CANCELADA" : p.enviar ? "COTADA" : c.status;
  await prisma.$executeRaw`
    UPDATE b2b_cotacoes SET itens = ${JSON.stringify(itens)}, frete = ${frete},
      incoterm = ${p.incoterm in INCOTERMS ? p.incoterm : c.incoterm},
      validade = ${validade}, prazo = ${txt(p.prazo, 80)}, nota_cliente = ${txt(p.nota_cliente, 2000)},
      nota_interna = ${txt(p.nota_interna, 2000)}, subtotal = ${t.subtotal}, total = ${t.total},
      status = ${status}, respondida_em = ${p.enviar ? new Date() : c.respondida_em ? new Date(c.respondida_em) : null}
    WHERE id = ${c.id}`;
  if (p.enviar)
    void emailCliente(
      empresa.email,
      `Propuesta ${c.codigo} lista · AGRO PARTS Mayorista`,
      `¡Hola ${empresa.contato_nome.split(" ")[0]}!`,
      `La propuesta para la cotización <b>${c.codigo}</b> está lista: ${t.itens} ítems, total <b>USD ${t.total.toFixed(2)}</b> (${p.incoterm in INCOTERMS ? p.incoterm : c.incoterm}), válida hasta el ${validade.split("-").reverse().join("/")}. Podés revisarla, descargar la proforma y aceptarla desde el portal.`,
      `/empresas/cotizacion/${c.codigo}`,
      "Ver la propuesta",
    );
  return cotacaoAdmin(p.codigo);
}

// ---------------------------------------------------------------- avisos
async function avisarAdmin(titulo: string, texto: string, link: string) {
  const { SITE_URL } = await import("./site");
  const para =
    process.env.PAGAMENTOS_AVISO_EMAIL?.trim() || process.env.EMAIL_RESPONDER_PARA?.trim();
  const { resendConfigurado, enviarUm } = await import("./email.server");
  if (para && resendConfigurado())
    await enviarUm({
      to: para,
      subject: titulo,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;padding:20px"><h2 style="margin:0 0 12px">${esc(titulo)}</h2><p style="white-space:pre-line;font-size:15px">${esc(texto)}</p><p><a href="${SITE_URL}${link}" style="background:#14532d;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir no painel</a></p></div>`,
      text: `${titulo}\n\n${texto}\n\n${SITE_URL}${link}`,
    }).catch((e) => console.error("aviso atacado:", e?.message));
  // Notificação no celular dos administradores (app instalado com avisos ativos)
  try {
    const { prisma } = await import("./prisma");
    const admins = await prisma.users.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const { enviarPush } = await import("./push.server");
    for (const a of admins)
      await enviarPush(
        { tipo: "pessoa", userId: a.id },
        { titulo, texto: texto.split("\n")[0], url: link, tag: "atacado" },
        "atacado",
      ).catch(() => {});
  } catch {
    /* sem push configurado */
  }
}

async function emailCliente(
  para: string,
  assunto: string,
  titulo: string,
  corpoHtml: string,
  link: string,
  botao: string,
) {
  const { SITE_URL } = await import("./site");
  const { resendConfigurado, enviarUm } = await import("./email.server");
  if (!resendConfigurado()) return;
  await enviarUm({
    to: para,
    subject: assunto,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a"><p style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#15803d;margin:0">AGRO PARTS · MAYORISTA</p><h2 style="margin:8px 0 14px">${esc(titulo)}</h2><p style="font-size:16px;line-height:1.5">${corpoHtml}</p><p style="margin:24px 0"><a href="${SITE_URL}${link}" style="background:#14532d;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">${esc(botao)}</a></p><p style="font-size:13px;color:#64748b">¿Dudas? Respondé este e-mail o escribinos por WhatsApp: +55 53 99183-1101.</p></div>`,
    text: `${titulo}\n\n${corpoHtml.replace(/<[^>]+>/g, "")}\n\n${SITE_URL}${link}`,
  }).catch((e) => console.error("e-mail atacado:", e?.message));
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
