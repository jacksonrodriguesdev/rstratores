// Linha de peças para CAMINHÕES (fornecedor Roni Chaves, ronichaves.com.br).
// Catálogo só em espanhol (nomes ficam em PT no banco e o site traduz na exibição com pecas-es.ts),
// SEM preço — mostra "Consultar". A linha inteira liga/desliga pela chave `caminhoes_ativa`
// em `configuracoes` (botão no admin de Produtos). A navegação /repuestos-camiones é montada por
// consulta DISTINCT de montadora → grupo, sem usar a tabela `categories`.
import { buscaParaPortugues } from "./pecas-es";

const SQL_TABELA = `CREATE TABLE IF NOT EXISTS \`caminhoes\` (
  \`codigo\` VARCHAR(40) NOT NULL,
  \`referencia\` TEXT NULL,
  \`nome\` TEXT NOT NULL,
  \`montadora\` VARCHAR(80) NOT NULL,
  \`montadora_slug\` VARCHAR(80) NOT NULL,
  \`grupo\` VARCHAR(90) NULL,
  \`grupo_slug\` VARCHAR(90) NULL,
  \`aplicacao\` TEXT NULL,
  \`fabricante\` TEXT NULL,
  \`imagem\` TEXT NULL,
  \`imagem_local\` TEXT NULL,
  \`slug\` VARCHAR(191) NOT NULL,
  \`ativo\` TINYINT(1) NOT NULL DEFAULT 1,
  \`origem_url\` TEXT NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`codigo\`),
  INDEX \`caminhoes_nav_idx\`(\`montadora_slug\`, \`grupo_slug\`),
  INDEX \`caminhoes_slug_idx\`(\`slug\`),
  INDEX \`caminhoes_ativo_idx\`(\`ativo\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

let pronto: Promise<void> | null = null;
export function garantirTabelaCaminhoes() {
  pronto ??= (async () => {
    const { prisma } = await import("./prisma");
    await prisma.$executeRawUnsafe(SQL_TABELA);
  })().catch((e) => {
    pronto = null;
    throw e;
  });
  return pronto;
}

const CHAVE = "caminhoes_ativa";

// A linha inteira está ligada? (botão no admin). Padrão: desligada até o usuário ativar.
export async function linhaCaminhoesAtiva(): Promise<boolean> {
  const { prisma } = await import("./prisma");
  const r = await prisma.configuracoes.findUnique({ where: { chave: CHAVE } });
  return r?.valor === "1";
}

export async function definirLinhaCaminhoes(ativa: boolean): Promise<void> {
  const { prisma } = await import("./prisma");
  await prisma.configuracoes.upsert({
    where: { chave: CHAVE },
    create: { chave: CHAVE, valor: ativa ? "1" : "0" },
    update: { valor: ativa ? "1" : "0" },
  });
}

type Produto = {
  codigo: string;
  referencia: string | null;
  nome: string;
  montadora: string;
  montadora_slug: string;
  grupo: string | null;
  grupo_slug: string | null;
  aplicacao: string | null;
  fabricante: string | null;
  imagem: string | null;
  imagem_local: string | null;
  slug: string;
  origem_url: string | null;
};

// Imagem a mostrar: a local (Hostinger) tem prioridade; senão a URL linkada do ronichaves.
export function fotoDe(p: { imagem_local: string | null; imagem: string | null }): string | null {
  return p.imagem_local || p.imagem || null;
}

export async function listarMontadoras() {
  await garantirTabelaCaminhoes();
  const { prisma } = await import("./prisma");
  return prisma
    .$queryRawUnsafe<{ montadora: string; montadora_slug: string; n: bigint }[]>(
      `SELECT montadora, montadora_slug, COUNT(*) AS n FROM caminhoes
     WHERE ativo=1 GROUP BY montadora_slug, montadora ORDER BY n DESC`,
    )
    .then((rows) => rows.map((r) => ({ ...r, n: Number(r.n) })));
}

export async function listarGrupos(montadoraSlug: string) {
  await garantirTabelaCaminhoes();
  const { prisma } = await import("./prisma");
  return prisma
    .$queryRawUnsafe<{ grupo: string | null; grupo_slug: string | null; n: bigint }[]>(
      `SELECT grupo, grupo_slug, COUNT(*) AS n FROM caminhoes
       WHERE ativo=1 AND montadora_slug=? GROUP BY grupo_slug, grupo ORDER BY grupo`,
      montadoraSlug,
    )
    .then((rows) => rows.map((r) => ({ ...r, n: Number(r.n) })));
}

export async function nomeMontadora(slug: string): Promise<string | null> {
  await garantirTabelaCaminhoes();
  const { prisma } = await import("./prisma");
  const r = await prisma.$queryRawUnsafe<{ montadora: string }[]>(
    `SELECT montadora FROM caminhoes WHERE montadora_slug=? LIMIT 1`,
    slug,
  );
  return r[0]?.montadora ?? null;
}

const POR_PAGINA = 36;

export async function listarProdutos(opts: {
  montadoraSlug?: string;
  grupoSlug?: string;
  q?: string;
  pagina?: number;
}): Promise<{ itens: Produto[]; total: number; pagina: number; porPagina: number }> {
  await garantirTabelaCaminhoes();
  const { prisma } = await import("./prisma");
  const where: string[] = ["ativo=1"];
  const params: unknown[] = [];
  if (opts.montadoraSlug) {
    where.push("montadora_slug=?");
    params.push(opts.montadoraSlug);
  }
  if (opts.grupoSlug) {
    where.push("grupo_slug=?");
    params.push(opts.grupoSlug);
  }
  if (opts.q && opts.q.trim()) {
    // busca em espanhol → termos em português (glossário), casando código, nome e aplicação
    const termos = buscaParaPortugues(opts.q).split(/\s+/).filter(Boolean).slice(0, 6);
    for (const t of termos) {
      where.push("(codigo LIKE ? OR nome LIKE ? OR referencia LIKE ? OR aplicacao LIKE ?)");
      const like = `%${t}%`;
      params.push(like, like, like, like);
    }
  }
  const whereSql = where.join(" AND ");
  const pagina = Math.max(1, opts.pagina || 1);
  const offset = (pagina - 1) * POR_PAGINA;

  const totalRows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*) AS n FROM caminhoes WHERE ${whereSql}`,
    ...params,
  );
  const total = Number(totalRows[0]?.n || 0);
  const itens = await prisma.$queryRawUnsafe<Produto[]>(
    `SELECT codigo, referencia, nome, montadora, montadora_slug, grupo, grupo_slug,
            aplicacao, fabricante, imagem, imagem_local, slug, origem_url
     FROM caminhoes WHERE ${whereSql} ORDER BY nome LIMIT ? OFFSET ?`,
    ...params,
    POR_PAGINA,
    offset,
  );
  return { itens, total, pagina, porPagina: POR_PAGINA };
}

export async function produtoPorCodigo(codigo: string): Promise<Produto | null> {
  await garantirTabelaCaminhoes();
  const { prisma } = await import("./prisma");
  const r = await prisma.$queryRawUnsafe<Produto[]>(
    `SELECT codigo, referencia, nome, montadora, montadora_slug, grupo, grupo_slug,
            aplicacao, fabricante, imagem, imagem_local, slug, origem_url
     FROM caminhoes WHERE codigo=? LIMIT 1`,
    codigo,
  );
  return r[0] ?? null;
}

// Peças parecidas: mesmo grupo e montadora, para a página do produto.
export async function relacionados(p: Produto, limite = 12): Promise<Produto[]> {
  await garantirTabelaCaminhoes();
  const { prisma } = await import("./prisma");
  return prisma.$queryRawUnsafe<Produto[]>(
    `SELECT codigo, referencia, nome, montadora, montadora_slug, grupo, grupo_slug,
            aplicacao, fabricante, imagem, imagem_local, slug, origem_url
     FROM caminhoes WHERE ativo=1 AND montadora_slug=? AND grupo_slug=? AND codigo<>?
     ORDER BY RAND() LIMIT ?`,
    p.montadora_slug,
    p.grupo_slug,
    p.codigo,
    limite,
  );
}

export async function contagemCaminhoes(): Promise<{ total: number; montadoras: number }> {
  await garantirTabelaCaminhoes();
  const { prisma } = await import("./prisma");
  const r = await prisma.$queryRawUnsafe<{ total: bigint; montadoras: bigint }[]>(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT montadora_slug) AS montadoras FROM caminhoes`,
  );
  return { total: Number(r[0]?.total || 0), montadoras: Number(r[0]?.montadoras || 0) };
}
