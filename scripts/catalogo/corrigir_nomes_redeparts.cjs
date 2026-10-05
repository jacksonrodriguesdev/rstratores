// Corrige os produtos agrícolas importados do redeparts com o nome errado.
//
// Na extração, o campo `nome` recebeu o fabricante da peça ("GERAL", "DANA", "MWM"...),
// mas o endereço de origem guarda o código e o nome reais:
//   https://redeparts.com.br/pecas/807045-12fsa-rolamento-807045-012
//   -> código 807045-12FSA, nome ROLAMENTO 807045 012, fabricante FERSA (o nome antigo)
//
// Também atribui categoria pela primeira palavra do nome, usando a categoria mais comum
// dessa palavra entre os produtos já categorizados.
//
// Uso (a partir da raiz do projeto):
//   node scripts/catalogo/corrigir_nomes_redeparts.cjs           -> simulação, não grava
//   node scripts/catalogo/corrigir_nomes_redeparts.cjs --aplicar -> faz backup e grava
//   node scripts/catalogo/corrigir_nomes_redeparts.cjs --restaurar dados/backup_xxx.json

const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const APLICAR = process.argv.includes("--aplicar");
const RESTAURAR = process.argv.indexOf("--restaurar");

// Primeira palavra precisa aparecer ao menos N vezes e ter uma categoria dominante.
const MIN_OCORRENCIAS = 5;
const MIN_DOMINANCIA = 0.5;
const CATEGORIA_PADRAO = "Outros Componentes";

function parseUrl(url) {
  const slug = decodeURIComponent(url.split("/pecas/")[1] || "").split(/[?#]/)[0];
  const tokens = slug.split("-").filter(Boolean);
  let i = 0;
  while (i < tokens.length && /\d/.test(tokens[i])) i++;
  const codigo = tokens.slice(0, i).join("-").toUpperCase();
  const nome = tokens.slice(i).join(" ").toUpperCase();
  return codigo && nome ? { codigo, nome } : null;
}

const primeiraPalavra = (nome) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .find((w) => w.length >= 3) || "";

async function mapaDeCategorias() {
  const categorizados = await prisma.agricolas.findMany({
    where: { category_id: { not: null } },
    select: { nome: true, category_id: true },
  });
  const porPalavra = new Map();
  for (const p of categorizados) {
    const w = primeiraPalavra(p.nome);
    if (!w) continue;
    const m = porPalavra.get(w) || new Map();
    m.set(p.category_id, (m.get(p.category_id) || 0) + 1);
    porPalavra.set(w, m);
  }
  const mapa = new Map();
  for (const [w, m] of porPalavra) {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    const [catId, n] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (total >= MIN_OCORRENCIAS && n / total >= MIN_DOMINANCIA) mapa.set(w, catId);
  }
  return mapa;
}

async function restaurar(arquivo) {
  const linhas = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  console.log(`Restaurando ${linhas.length} produtos de ${arquivo}...`);
  for (let i = 0; i < linhas.length; i += 500) {
    await prisma.$transaction(
      linhas.slice(i, i + 500).map(({ sku, ...data }) =>
        prisma.agricolas.update({ where: { sku }, data }),
      ),
    );
  }
  console.log("Restaurado.");
}

async function main() {
  if (RESTAURAR > -1) return restaurar(process.argv[RESTAURAR + 1]);

  const categorias = await prisma.categories.findMany({ where: { linha: "AGRICOLA" } });
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const idPadrao = categorias.find((c) => c.nome === CATEGORIA_PADRAO)?.id;
  const mapa = await mapaDeCategorias();

  const alvos = await prisma.agricolas.findMany({
    where: { category_id: null, url: { startsWith: "https://redeparts.com.br/pecas/" } },
    select: {
      sku: true,
      nome: true,
      categoria: true,
      category_id: true,
      codigo_fabricante: true,
      fabricante: true,
      url: true,
    },
  });

  const updates = [];
  let semPadrao = 0;
  let porMapa = 0;
  for (const p of alvos) {
    const r = parseUrl(p.url);
    if (!r) {
      semPadrao++;
      continue;
    }
    const mapeada = mapa.get(primeiraPalavra(r.nome));
    if (mapeada) porMapa++;
    const category_id = mapeada ?? idPadrao;
    updates.push({
      antes: p,
      data: {
        nome: r.nome,
        codigo_fabricante: r.codigo,
        fabricante: p.nome,
        category_id,
        categoria: nomeCategoria.get(category_id),
      },
    });
  }

  const porCategoria = {};
  updates.forEach((u) => (porCategoria[u.data.categoria] = (porCategoria[u.data.categoria] || 0) + 1));
  console.log(`Alvos: ${alvos.length} | corrigíveis: ${updates.length} | sem padrão no endereço: ${semPadrao}`);
  console.log(`Categoria pela palavra: ${porMapa} | "${CATEGORIA_PADRAO}": ${updates.length - porMapa}`);
  console.log("Por categoria:", porCategoria);
  console.log("Exemplos:");
  updates
    .slice(0, 8)
    .forEach((u) =>
      console.log(`  ${u.antes.nome.padEnd(10)} -> ${u.data.nome} [${u.data.codigo_fabricante}] (${u.data.categoria})`),
    );

  if (!APLICAR) {
    console.log("\nSimulação. Para gravar, rode com --aplicar");
    return;
  }

  const backup = `dados/backup_agricolas_redeparts_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(
    backup,
    JSON.stringify(updates.map(({ antes: { url, ...campos } }) => campos), null, 1),
  );
  console.log(`\nBackup salvo em ${backup}`);

  for (let i = 0; i < updates.length; i += 500) {
    await prisma.$transaction(
      updates
        .slice(i, i + 500)
        .map((u) => prisma.agricolas.update({ where: { sku: u.antes.sku }, data: u.data })),
    );
    process.stdout.write(`\r${Math.min(i + 500, updates.length)}/${updates.length}`);
  }
  console.log(`\nPronto. Para desfazer: node scripts/catalogo/corrigir_nomes_redeparts.cjs --restaurar ${backup}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
