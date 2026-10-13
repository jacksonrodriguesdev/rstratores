// Preço das nossas peças a partir do agrotrator.com.br: mesmo código → preço de lá + margem.
// Lê dados/precos_agrotrator/catalogo.json (baixado por scripts/extratores/agrotrator_precos.cjs).
//
// Como acha a peça (nesta ordem):
//   1. exato: nosso SKU = referência do agrotrator sem "-AGROTRATOR" (ex.: 022886NOR);
//   2. código: o código do fabricante (ou o SKU) aparece como código no título/referência de lá.
//      Se houver mais de uma peça com o mesmo código, usa o MAIOR preço.
// Grava: valor_compra = preço do agrotrator (R$), margem = MARGEM %, preco_brl = valor × (1 + margem),
// preco_modo = AUTO ($U pela cotação do dia). Peças com preço fixo em $U (FIXO) não são mexidas.
//
// Uso (raiz do projeto):
//   node scripts/catalogo/precos_agrotrator.cjs                 -> simulação + relatório CSV
//   node scripts/catalogo/precos_agrotrator.cjs --aplicar       -> grava no banco local (com backup)
//                                                                  + SQL para produção
//   node scripts/catalogo/precos_agrotrator.cjs --restaurar <arquivo de backup>
//   --todas  inclui peças sem foto (padrão: só as que têm foto)
//   --margem=50
//   --so-exatas  só as encontradas pelo SKU exato

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const RAIZ = path.join(__dirname, "../..");
const DADOS = path.join(RAIZ, "dados/precos_agrotrator");
const APLICAR = process.argv.includes("--aplicar");
const TODAS = process.argv.includes("--todas");
// --so-exatas: só peças com o mesmo SKU (o código igual de outra marca pode ter outro preço)
const SO_EXATAS = process.argv.includes("--so-exatas");
const MARGEM = Number((process.argv.find((a) => a.startsWith("--margem=")) || "--margem=50").split("=")[1]);
const iRest = process.argv.indexOf("--restaurar");
// --arquivo=nossas.json: usa só as peças buscadas por referência (extrator com --nossas)
const ARQUIVO = (process.argv.find((a) => a.startsWith("--arquivo=")) || "--arquivo=catalogo.json").split("=")[1];
const SO_CATALOGO = ARQUIVO === "nossas.json"; // só as peças com foto do agrotrator (/catalogo)

const prisma = new PrismaClient();
const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const centavos = (v) => Math.round(v * 100) / 100;

// Códigos de peça dentro de um texto: tokens com dígito e pelo menos 5 caracteres
const codigosDoTexto = (t) =>
  String(t || "")
    .split(/[\s/,;()]+/)
    .map(norm)
    .filter((x) => x.length >= 5 && /\d/.test(x) && !/^\d{1,3}(MM|CM|V|W|CV|HP)$/.test(x));

async function restaurar(arquivo) {
  const backup = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  for (const b of backup) {
    await prisma.agricolas.update({
      where: { sku: b.sku },
      data: { valor_compra: b.valor_compra, margem: b.margem, preco_brl: b.preco_brl, preco_modo: b.preco_modo, precificado_em: b.precificado_em ? new Date(b.precificado_em) : null },
    });
  }
  console.log(`Restaurado: ${backup.length} peças.`);
}

(async () => {
  if (iRest > 0) return restaurar(process.argv[iRest + 1]);

  const cat = JSON.parse(fs.readFileSync(path.join(DADOS, ARQUIVO), "utf8"));
  const precoDe = (p) => (p.preco > 0 ? p.preco : p.precoLista > 0 ? p.precoLista : 0);
  const porRef = new Map();
  const porCodigo = new Map();
  for (const p of cat) {
    if (!precoDe(p)) continue;
    const base = norm(p.ref.replace(/-AGROTRATOR$/i, ""));
    porRef.set(base, p);
    for (const c of new Set([...codigosDoTexto(p.nome), base])) {
      if (!porCodigo.has(c)) porCodigo.set(c, []);
      porCodigo.get(c).push(p);
    }
  }

  const nossas = await prisma.agricolas.findMany({
    where: { duplicado_de: null, ...(SO_CATALOGO ? { imagem_principal: { startsWith: "/catalogo/" } } : TODAS ? {} : { imagem_principal: { not: null } }) },
    select: { sku: true, nome: true, nome_es: true, codigo_fabricante: true, valor_compra: true, margem: true, preco_brl: true, preco_modo: true, precificado_em: true },
  });

  const achadas = [];
  let fixas = 0;
  for (const n of nossas) {
    if (n.preco_modo === "FIXO") {
      fixas++;
      continue;
    }
    let como = "";
    let alvo = porRef.get(norm(n.sku));
    if (alvo) como = "exato";
    else if (!SO_EXATAS) {
      const cands = [...new Set([norm(n.codigo_fabricante), norm(n.sku)].filter((c) => c.length >= 5))].flatMap((c) => porCodigo.get(c) || []);
      if (cands.length) {
        alvo = cands.reduce((a, b) => (precoDe(b) > precoDe(a) ? b : a));
        como = new Set(cands.map((c) => c.ref)).size > 1 ? `código (${new Set(cands.map((c) => c.ref)).size} opções, maior preço)` : "código";
      }
    }
    if (!alvo) continue;
    const custo = centavos(precoDe(alvo));
    achadas.push({ n, alvo, como, custo, venda: centavos(custo * (1 + MARGEM / 100)) });
  }

  // Relatório
  fs.mkdirSync(DADOS, { recursive: true });
  const csv = ["sku;nosso_nome;como;ref_agrotrator;nome_agrotrator;preco_agrotrator_brl;nosso_preco_brl;link"]
    .concat(achadas.map((a) => [a.n.sku, a.n.nome_es || a.n.nome, a.como, a.alvo.ref, a.alvo.nome, a.custo, a.venda, a.alvo.link].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";")))
    .join("\n");
  fs.writeFileSync(path.join(DADOS, "relatorio.csv"), "﻿" + csv);

  const exatas = achadas.filter((a) => a.como === "exato").length;
  const varias = achadas.filter((a) => a.como.includes("opções")).length;
  console.log(`Nossas peças ${TODAS ? "(todas)" : "com foto"}: ${nossas.length}`);
  console.log(`Achadas no agrotrator: ${achadas.length} (${exatas} pelo SKU exato, ${achadas.length - exatas} pelo código; ${varias} com mais de uma opção)`);
  console.log(`Sem correspondência: ${nossas.length - achadas.length - fixas}${fixas ? ` · ${fixas} com preço fixo, não mexidas` : ""}`);
  console.log(`Margem: ${MARGEM}% · relatório: dados/precos_agrotrator/relatorio.csv`);
  console.log("Exemplos:");
  for (const a of achadas.slice(0, 8)) console.log(`  ${a.n.sku}  R$ ${a.custo} → R$ ${a.venda}  (${a.como}: ${a.alvo.nome.slice(0, 60)})`);

  if (!APLICAR) {
    console.log("\nSimulação: nada foi gravado. Rode com --aplicar para gravar.");
    return;
  }

  const agora = new Date();
  const carimbo = agora.toISOString().replace(/[:.]/g, "-");
  const backupArq = path.join(RAIZ, `dados/backup_precos_agrotrator_${carimbo}.json`);
  fs.writeFileSync(backupArq, JSON.stringify(achadas.map((a) => ({ sku: a.n.sku, valor_compra: a.n.valor_compra, margem: a.n.margem, preco_brl: a.n.preco_brl, preco_modo: a.n.preco_modo, precificado_em: a.n.precificado_em }))));
  for (let i = 0; i < achadas.length; i += 200) {
    await prisma.$transaction(
      achadas.slice(i, i + 200).map((a) =>
        prisma.agricolas.update({ where: { sku: a.n.sku }, data: { valor_compra: a.custo, margem: MARGEM, preco_brl: a.venda, preco_modo: "AUTO", precificado_em: agora } }),
      ),
    );
  }

  // SQL para produção (phpMyAdmin): não mexe em peças com preço fixo em $U
  const q = (s) => `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
  const sql = [
    `-- Preços a partir do agrotrator.com.br (margem ${MARGEM}%), gerado em ${agora.toISOString()}`,
    `-- ${achadas.length} peças. Rodar no phpMyAdmin do banco de produção.`,
    "START TRANSACTION;",
    ...achadas.map((a) => `UPDATE agricolas SET valor_compra=${a.custo}, margem=${MARGEM}, preco_brl=${a.venda}, preco_modo='AUTO', precificado_em=NOW() WHERE sku=${q(a.n.sku)} AND preco_modo<>'FIXO';`),
    "COMMIT;",
    "",
  ].join("\n");
  const sqlArq = path.join(RAIZ, "scripts/importacao/precos_agrotrator_producao.sql");
  fs.writeFileSync(sqlArq, sql);
  console.log(`\nGravado no banco local: ${achadas.length} peças.`);
  console.log(`Backup: ${path.relative(RAIZ, backupArq)} (desfazer: --restaurar <arquivo>)`);
  console.log(`SQL para produção: ${path.relative(RAIZ, sqlArq)}`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
