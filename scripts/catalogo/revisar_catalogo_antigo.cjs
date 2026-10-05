// Limpeza dos produtos agrícolas da fonte antiga (os que não vieram do redeparts).
//
// 1. Versões por sufixo: na fonte antiga, "0070314127zf" é a versão ZF de "0070314127".
//    Viram variantes do código base (`duplicado_de`), como em agrupar_duplicatas.cjs.
//    Só agrupa se a primeira palavra do nome bate.
// 2. Marca: 99% da fonte antiga está como "Massey Ferguson" por padrão. Infere a marca pelo
//    prefixo de letras do código (AH, RE, DQ...), com regras aprendidas dos produtos de marca
//    confiável. Códigos só numéricos não são inferidos: os dados confiáveis não têm Massey, e
//    a regra trocaria peças Massey verdadeiras. O que não for resolvido fica com
//    `marca_confirmada = false` e a marca deixa de ser exibida.
// 3. Gera dados/revisao_codigos_ambiguos.csv: códigos iguais com nomes diferentes, para
//    revisão manual (não são alterados).
//
// Uso (a partir da raiz do projeto):
//   node scripts/catalogo/revisar_catalogo_antigo.cjs            -> simulação (gera o CSV)
//   node scripts/catalogo/revisar_catalogo_antigo.cjs --aplicar  -> backup e grava
//   node scripts/catalogo/revisar_catalogo_antigo.cjs --restaurar dados/backup_catalogo_antigo_xxx.json

const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { gerar } = require("./gerar_descricoes.cjs");
const prisma = new PrismaClient();

const APLICAR = process.argv.includes("--aplicar");
const RESTAURAR = process.argv.indexOf("--restaurar");
const MARCA_PADRAO_ANTIGA = "Massey Ferguson";
const MIN_SUPORTE = 20;
const MIN_PUREZA = 0.95;
// Sufixos com fabricante inequívoco. Os demais ficam sem fabricante (o sufixo aparece no código).
const FABRICANTE_POR_SUFIXO = {
  zf: "ZF",
  luk: "LUK",
  arc: "ARCA",
  fsa: "FERSA",
  fag: "FAG",
  ina: "INA",
  mann: "MANN",
  mwm: "MWM",
};

const primeiraPalavra = (nome) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .find((w) => w.length >= 3) || "";

const prefixoLetras = (codigo) => (codigo || "").match(/^([A-Za-z]+)\d/)?.[1].toUpperCase() ?? null;

const CAMPOS = {
  sku: true,
  nome: true,
  marca: true,
  categoria: true,
  codigo_fabricante: true,
  fabricante: true,
  descricao: true,
  descricao_es: true,
  marca_confirmada: true,
  duplicado_de: true,
};

async function emLotes(itens, montar) {
  for (let i = 0; i < itens.length; i += 500) {
    await prisma.$transaction(itens.slice(i, i + 500).map(montar));
    process.stdout.write(`\r${Math.min(i + 500, itens.length)}/${itens.length}`);
  }
  console.log();
}

function csv(linhas) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + linhas.map((l) => l.map(esc).join(";")).join("\r\n");
}

async function main() {
  if (RESTAURAR > -1) {
    const linhas = JSON.parse(fs.readFileSync(process.argv[RESTAURAR + 1], "utf8"));
    console.log(`Restaurando ${linhas.length} produtos...`);
    await emLotes(linhas, ({ sku, ...data }) => prisma.agricolas.update({ where: { sku }, data }));
    return;
  }

  const todos = await prisma.agricolas.findMany({
    select: { ...CAMPOS, _count: { select: { variantes: true } } },
  });
  const antigos = todos.filter((p) => !p.fabricante && !p.duplicado_de);
  const antigoPorSku = new Map(antigos.map((a) => [a.sku.toLowerCase(), a]));
  const mudancas = new Map(); // sku -> { antes, data }
  const mudar = (p, data) => {
    const m = mudancas.get(p.sku) || { antes: p, data: {} };
    Object.assign(m.data, data);
    mudancas.set(p.sku, m);
  };

  // 1. Versões por sufixo
  const sufixos = {};
  for (const a of antigos) {
    const m = a.sku.toLowerCase().match(/^(.*\d)([a-z]{1,4})$/);
    const base = m && antigoPorSku.get(m[1]);
    if (!base || base.sku === a.sku) continue;
    if (a._count.variantes > 0) continue; // já é principal de versões do redeparts: evita cadeia
    if (primeiraPalavra(base.nome) !== primeiraPalavra(a.nome)) continue;
    mudar(a, { duplicado_de: base.sku, fabricante: FABRICANTE_POR_SUFIXO[m[2]] ?? null });
    sufixos[m[2]] = (sufixos[m[2]] || 0) + 1;
  }
  const variantesSufixo = mudancas.size;

  // 2. Marca por prefixo de letras, aprendida dos produtos com marca confiável
  const confiaveis = todos.filter((p) => p.fabricante || p._count.variantes > 0);
  const contagem = new Map();
  for (const p of confiaveis) {
    const k = prefixoLetras(p.codigo_fabricante || p.sku);
    if (!k) continue;
    const m = contagem.get(k) || new Map();
    m.set(p.marca, (m.get(p.marca) || 0) + 1);
    contagem.set(k, m);
  }
  const regras = new Map();
  for (const [k, m] of contagem) {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    const [marca, n] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (total >= MIN_SUPORTE && n / total >= MIN_PUREZA) regras.set(k, marca);
  }

  let inferidas = 0;
  let naoConfirmadas = 0;
  for (const a of antigos) {
    if (a.marca !== MARCA_PADRAO_ANTIGA || a._count.variantes > 0) continue; // já confirmada
    const marca = regras.get(prefixoLetras(a.sku));
    // Versões herdam a situação do principal; só o principal precisa aparecer certo.
    if (marca) {
      inferidas++;
      const data = { marca, marca_confirmada: true };
      if (a.descricao === gerar(a).descricao) Object.assign(data, gerar({ ...a, ...data }));
      mudar(a, data);
    } else {
      naoConfirmadas++;
      mudar(a, { marca_confirmada: false });
    }
  }

  // 3. Planilha de códigos ambíguos (redeparts x antigo com nomes diferentes)
  const ambiguos = [];
  for (const n of todos.filter((p) => p.fabricante && !p.duplicado_de && p.codigo_fabricante)) {
    const antigo = antigoPorSku.get(n.codigo_fabricante.split("-")[0].toLowerCase());
    if (antigo && primeiraPalavra(antigo.nome) !== primeiraPalavra(n.nome)) {
      ambiguos.push([
        n.codigo_fabricante,
        n.nome,
        n.fabricante,
        n.marca,
        antigo.sku.toUpperCase(),
        antigo.nome,
        antigo.categoria,
        "",
      ]);
    }
  }
  const arquivoCsv = "dados/revisao_codigos_ambiguos.csv";
  fs.writeFileSync(
    arquivoCsv,
    csv([
      [
        "Código redeparts",
        "Nome redeparts",
        "Fabricante",
        "Marca",
        "Código antigo",
        "Nome antigo",
        "Categoria antiga",
        "Mesma peça? (SIM/NAO)",
      ],
      ...ambiguos,
    ]),
  );

  console.log(`1. Versões por sufixo: ${variantesSufixo}`, sufixos);
  console.log(`2. Regras de marca: ${[...regras].map(([k, m]) => `${k}=${m}`).join(", ")}`);
  console.log(`   Marca inferida: ${inferidas} | não confirmada (marca oculta): ${naoConfirmadas}`);
  console.log(`3. Planilha: ${ambiguos.length} casos em ${arquivoCsv}`);

  if (!APLICAR) {
    console.log("\nSimulação. Para gravar, rode com --aplicar");
    return;
  }

  const lista = [...mudancas.values()];
  const backup = `dados/backup_catalogo_antigo_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(
    backup,
    JSON.stringify(
      lista.map(({ antes, data }) => ({
        sku: antes.sku,
        ...Object.fromEntries(Object.keys(data).map((k) => [k, antes[k]])),
      })),
    ),
  );
  console.log(`\nBackup salvo em ${backup}`);
  await emLotes(lista, ({ antes, data }) => prisma.agricolas.update({ where: { sku: antes.sku }, data }));
  console.log(`Pronto. Para desfazer: node scripts/catalogo/revisar_catalogo_antigo.cjs --restaurar ${backup}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
