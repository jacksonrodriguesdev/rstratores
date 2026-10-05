// Agrupa as peças agrícolas cadastradas duas vezes (fonte antiga + redeparts).
//
// O produto antigo tem como SKU o código original (ex.: "al81843"). O redeparts lista
// versões desse código com sufixo e fabricante (ex.: "AL81843-400", fabricante ARCA).
// Cada versão vira variante do produto antigo (`duplicado_de`): some da loja, mas aparece
// em "Versões disponíveis" na página do principal e continua achável pela busca.
//
// Só agrupa quando a primeira palavra do nome bate (RETENTOR = RETENTOR); códigos iguais
// com nomes diferentes podem ser peças diferentes e ficam como estão.
//
// Se todas as versões concordam na marca e o principal está com a marca padrão antiga
// ("Massey Ferguson"), o principal recebe a marca correta e a descrição gerada é refeita.
//
// Uso (a partir da raiz do projeto):
//   node scripts/catalogo/agrupar_duplicatas.cjs            -> simulação
//   node scripts/catalogo/agrupar_duplicatas.cjs --aplicar  -> backup e grava
//   node scripts/catalogo/agrupar_duplicatas.cjs --restaurar dados/backup_duplicatas_xxx.json

const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { gerar } = require("./gerar_descricoes.cjs");
const prisma = new PrismaClient();

const APLICAR = process.argv.includes("--aplicar");
const RESTAURAR = process.argv.indexOf("--restaurar");
const MARCA_PADRAO_ANTIGA = "Massey Ferguson";

const primeiraPalavra = (nome) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .find((w) => w.length >= 3) || "";

const CAMPOS = {
  sku: true,
  nome: true,
  marca: true,
  categoria: true,
  codigo_fabricante: true,
  fabricante: true,
  descricao: true,
  descricao_es: true,
};

async function emLotes(itens, montar) {
  for (let i = 0; i < itens.length; i += 500) {
    await prisma.$transaction(itens.slice(i, i + 500).map(montar));
    process.stdout.write(`\r${Math.min(i + 500, itens.length)}/${itens.length}`);
  }
  console.log();
}

async function restaurar(arquivo) {
  const { variantes, principais } = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  console.log(`Restaurando ${variantes.length} variantes e ${principais.length} principais...`);
  await emLotes(variantes, (sku) =>
    prisma.agricolas.update({ where: { sku }, data: { duplicado_de: null } }),
  );
  await emLotes(principais, ({ sku, ...data }) => prisma.agricolas.update({ where: { sku }, data }));
}

async function main() {
  if (RESTAURAR > -1) return restaurar(process.argv[RESTAURAR + 1]);

  const novos = await prisma.agricolas.findMany({
    where: { fabricante: { not: null }, duplicado_de: null },
    select: CAMPOS,
  });
  const antigos = await prisma.agricolas.findMany({
    where: { fabricante: null, duplicado_de: null },
    select: CAMPOS,
  });
  const antigoPorSku = new Map(antigos.map((a) => [a.sku.toLowerCase(), a]));

  const grupos = new Map(); // sku do principal -> { principal, variantes }
  let nomeDiferente = 0;
  for (const n of novos) {
    const base = n.codigo_fabricante.split("-")[0].toLowerCase();
    const principal = antigoPorSku.get(base);
    if (!principal) continue;
    if (primeiraPalavra(principal.nome) !== primeiraPalavra(n.nome)) {
      nomeDiferente++;
      continue;
    }
    const g = grupos.get(principal.sku) || { principal, variantes: [] };
    g.variantes.push(n);
    grupos.set(principal.sku, g);
  }

  const atualizacoesPrincipal = [];
  for (const { principal, variantes } of grupos.values()) {
    const marcas = new Set(variantes.map((v) => v.marca).filter(Boolean));
    const marcaPadrao = !principal.marca || principal.marca === MARCA_PADRAO_ANTIGA;
    if (marcas.size !== 1 || !marcaPadrao) continue;
    const marca = [...marcas][0];
    if (marca === principal.marca) continue;
    const data = { marca };
    // Refaz a descrição só se ela ainda for a gerada automaticamente (não apaga texto manual).
    const geradaAntes = gerar(principal);
    if (principal.descricao === geradaAntes.descricao) {
      Object.assign(data, gerar({ ...principal, marca, fabricante: null }));
    }
    atualizacoesPrincipal.push({ principal, data });
  }

  const totalVariantes = [...grupos.values()].reduce((s, g) => s + g.variantes.length, 0);
  console.log(`Principais: ${grupos.size} | variantes ocultadas: ${totalVariantes}`);
  console.log(`Ignorados (código igual, nome diferente): ${nomeDiferente}`);
  console.log(`Principais com marca corrigida: ${atualizacoesPrincipal.length}`);
  for (const g of [...grupos.values()].slice(0, 5)) {
    const nova = atualizacoesPrincipal.find((u) => u.principal.sku === g.principal.sku)?.data.marca;
    console.log(
      `  ${g.principal.sku} "${g.principal.nome}" [${g.principal.marca}${nova ? " -> " + nova : ""}]` +
        `\n     versões: ${g.variantes.map((v) => `${v.codigo_fabricante} (${v.fabricante})`).join(", ")}`,
    );
  }

  if (!APLICAR) {
    console.log("\nSimulação. Para gravar, rode com --aplicar");
    return;
  }

  const backup = `dados/backup_duplicatas_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(
    backup,
    JSON.stringify({
      variantes: [...grupos.values()].flatMap((g) => g.variantes.map((v) => v.sku)),
      principais: atualizacoesPrincipal.map(({ principal: p }) => ({
        sku: p.sku,
        marca: p.marca,
        descricao: p.descricao,
        descricao_es: p.descricao_es,
      })),
    }),
  );
  console.log(`\nBackup salvo em ${backup}`);

  const ligacoes = [...grupos.values()].flatMap((g) =>
    g.variantes.map((v) => ({ sku: v.sku, principal: g.principal.sku })),
  );
  await emLotes(ligacoes, (l) =>
    prisma.agricolas.update({ where: { sku: l.sku }, data: { duplicado_de: l.principal } }),
  );
  await emLotes(atualizacoesPrincipal, (u) =>
    prisma.agricolas.update({ where: { sku: u.principal.sku }, data: u.data }),
  );
  console.log(`Pronto. Para desfazer: node scripts/catalogo/agrupar_duplicatas.cjs --restaurar ${backup}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
