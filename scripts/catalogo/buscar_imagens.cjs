// Busca uma foto para cada peça agrícola sem imagem, pela Brave Search API (busca de imagens),
// baixa a primeira imagem válida e define como imagem do produto, sem aprovação manual.
//
// Atenção: a primeira imagem da busca frequentemente é de outra peça, e pertence a quem a
// publicou. Por isso a página de origem fica salva em `imagem_origem`, a página do produto
// mostra "Imagem ilustrativa" e há comandos para remover fotos erradas.
//
// Precisa de BRAVE_SEARCH_API_KEY no .env (https://api-dashboard.search.brave.com).
// Custo: US$ 5 por 1.000 buscas, com US$ 5 de crédito grátis por mês. Cada produto é
// pesquisado uma única vez (`imagem_buscada_em`), mesmo quando nada é encontrado.
//
// Uso (a partir da raiz do projeto):
//   node scripts/catalogo/buscar_imagens.cjs --limite 50   -> busca 50 produtos (padrão: 50)
//   node scripts/catalogo/buscar_imagens.cjs --status      -> quantos têm foto, faltam, etc.
//   node scripts/catalogo/buscar_imagens.cjs --remover SKU [SKU...]  -> tira fotos erradas
//   node scripts/catalogo/buscar_imagens.cjs --remover-todas         -> desfaz tudo

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PASTA = path.join(process.cwd(), "public", "uploads", "produtos");
const MIN_BYTES = 8 * 1024; // menor que isso costuma ser ícone ou miniatura inútil
const MAX_BYTES = 8 * 1024 * 1024;
const PAUSA_MS = 300;
const TIMEOUT_MS = 15000;

function lerEnv(nome) {
  if (process.env[nome]) return process.env[nome];
  const linha = fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${nome}=`));
  return linha ? linha.slice(nome.length + 1).replace(/^"|"$/g, "").trim() : "";
}

const arg = (nome) => {
  const i = process.argv.indexOf(nome);
  return i > -1 ? process.argv.slice(i + 1).filter((a) => !a.startsWith("--")) : null;
};

const SEM_FOTO = {
  OR: [
    { imagem_principal: null },
    { imagem_principal: "" },
    { imagem_principal: { contains: "redeparts" } }, // logo usado como placeholder na importação
  ],
};

// Identifica o formato pelos primeiros bytes (não confia no Content-Type do servidor).
function extensao(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf.slice(0, 4).toString("hex") === "89504e47") return "png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "webp";
  return null;
}

async function baixar(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "RSTratorPecas-Catalogo/1.0" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_BYTES || buf.length > MAX_BYTES) return null;
    const ext = extensao(buf);
    return ext ? { buf, ext } : null;
  } catch {
    return null;
  }
}

async function buscar(chave, consulta) {
  const url = new URL("https://api.search.brave.com/res/v1/images/search");
  url.searchParams.set("q", consulta);
  url.searchParams.set("count", "10");
  url.searchParams.set("safesearch", "strict");
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json", "X-Subscription-Token": chave },
  });
  if (res.status === 401 || res.status === 403) throw new Error("Chave da Brave inválida ou sem permissão.");
  if (res.status === 402) throw new Error("Créditos da Brave esgotados.");
  if (res.status === 429) throw new Error("Limite de requisições da Brave atingido. Tente mais tarde.");
  if (!res.ok) throw new Error(`Brave respondeu ${res.status}: ${await res.text()}`);
  return (await res.json()).results ?? [];
}

async function buscarEFixar(chave, p) {
  const codigo = (p.codigo_fabricante || p.sku).toUpperCase();
  const consulta = `${codigo} ${p.nome}`.replace(/\s+/g, " ").trim();
  const resultados = await buscar(chave, consulta);

  for (const r of resultados) {
    const original = r.properties?.url;
    if (!original || /logo|redeparts/i.test(original)) continue;
    // Tenta a imagem original; se o site recusar, usa a miniatura servida pela Brave.
    const img = (await baixar(original)) || (r.thumbnail?.src && (await baixar(r.thumbnail.src)));
    if (!img) continue;
    const arquivo = `${p.sku.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.${img.ext}`;
    fs.mkdirSync(PASTA, { recursive: true });
    fs.writeFileSync(path.join(PASTA, arquivo), img.buf);
    await prisma.agricolas.update({
      where: { sku: p.sku },
      data: {
        imagem_principal: `produtos/${arquivo}`,
        imagem_origem: r.url || original,
        imagem_buscada_em: new Date(),
      },
    });
    return { consulta, origem: r.url || original };
  }
  await prisma.agricolas.update({ where: { sku: p.sku }, data: { imagem_buscada_em: new Date() } });
  return { consulta, origem: null };
}

async function remover(where) {
  const fotos = await prisma.agricolas.findMany({
    where: { ...where, imagem_origem: { not: null } },
    select: { sku: true, imagem_principal: true },
  });
  for (const f of fotos) {
    if (f.imagem_principal?.startsWith("produtos/")) {
      fs.rmSync(path.join(process.cwd(), "public", "uploads", f.imagem_principal), { force: true });
    }
  }
  // imagem_buscada_em continua preenchido: o produto não é pesquisado (nem cobrado) de novo.
  await prisma.agricolas.updateMany({
    where: { sku: { in: fotos.map((f) => f.sku) } },
    data: { imagem_principal: null, imagem_origem: null },
  });
  console.log(`Fotos automáticas removidas: ${fotos.length}`);
}

async function status() {
  const visiveis = { duplicado_de: null };
  const [total, auto, pendentes, semResultado] = await Promise.all([
    prisma.agricolas.count({ where: visiveis }),
    prisma.agricolas.count({ where: { ...visiveis, imagem_origem: { not: null } } }),
    prisma.agricolas.count({ where: { ...visiveis, ...SEM_FOTO, imagem_buscada_em: null } }),
    prisma.agricolas.count({ where: { ...visiveis, ...SEM_FOTO, imagem_buscada_em: { not: null } } }),
  ]);
  console.log(
    `Produtos visíveis: ${total}\n` +
      `Com foto automática: ${auto}\n` +
      `Ainda não pesquisados: ${pendentes} (custo estimado: US$ ${((pendentes / 1000) * 5).toFixed(2)})\n` +
      `Pesquisados sem foto: ${semResultado}`,
  );
}

async function main() {
  if (process.argv.includes("--status")) return status();
  if (process.argv.includes("--remover-todas")) return remover({});
  const skus = arg("--remover");
  if (skus) return remover({ sku: { in: skus } });

  const chave = lerEnv("BRAVE_SEARCH_API_KEY");
  if (!chave) {
    console.error(
      "Falta BRAVE_SEARCH_API_KEY no .env.\nCrie a chave em https://api-dashboard.search.brave.com (plano Search).",
    );
    process.exitCode = 1;
    return;
  }

  const limite = Number(arg("--limite")?.[0] ?? 50);
  const alvos = await prisma.agricolas.findMany({
    // Produtos com categoria primeiro: são os que aparecem na vitrine.
    where: { duplicado_de: null, imagem_buscada_em: null, ...SEM_FOTO },
    orderBy: [{ category_id: { sort: "asc", nulls: "last" } }, { sku: "asc" }],
    select: { sku: true, nome: true, codigo_fabricante: true },
    take: limite,
  });
  console.log(`Buscando fotos para ${alvos.length} produtos...`);

  let achadas = 0;
  for (const [i, p] of alvos.entries()) {
    const r = await buscarEFixar(chave, p);
    if (r.origem) achadas++;
    console.log(`${i + 1}/${alvos.length} ${r.origem ? "OK " : "-- "} ${r.consulta}${r.origem ? `  <- ${r.origem}` : ""}`);
    await new Promise((ok) => setTimeout(ok, PAUSA_MS));
  }
  console.log(`\nFotos definidas: ${achadas}/${alvos.length}`);
  console.log("Para tirar uma foto errada: node scripts/catalogo/buscar_imagens.cjs --remover SKU");
}

module.exports = { buscarEFixar, remover, prisma };

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e.message || e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
