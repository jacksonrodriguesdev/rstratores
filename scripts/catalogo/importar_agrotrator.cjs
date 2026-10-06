// Importa as peças com fotos extraídas em agrotrator_extracao (CSV + pasta de imagens).
//
// - SKU sem o sufixo da loja de origem ("022886NOR-AGROTRATOR" -> "022886NOR").
// - Código do fabricante: o código que aparece no título ("... Massey 022886 Durametal").
// - Marca do trator tirada do título (Massey, New Holland, Valtra...); a coluna MARCA do CSV é
//   o fabricante da peça (CNH, AGCO, AGEL...).
// - Categoria pelo tipo de peça (primeiras palavras do título) e, se não der, pelo caminho
//   do CSV. Descrição gerada pelo mesmo modelo das outras peças (não copia o texto de origem).
// - Preço do CSV não é usado (a loja trabalha com cotação).
// - Fotos: convertidas antes por scripts/catalogo/converter_fotos_agrotrator.ps1 para
//   public/catalogo/<sku>-<n>.jpg (vão no git e no deploy, sem upload manual).
// - Gera também scripts/importacao/agrotrator_producao.sql para rodar no phpMyAdmin.
//
// Uso (raiz do projeto):
//   node scripts/catalogo/importar_agrotrator.cjs [pasta]            -> simulação
//   node scripts/catalogo/importar_agrotrator.cjs [pasta] --aplicar  -> grava no banco local + SQL
//   node scripts/catalogo/importar_agrotrator.cjs --mapa [pasta]     -> lista origem;destino das fotos

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const { PrismaClient } = require("@prisma/client");
const { gerar } = require("./gerar_descricoes.cjs");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const PASTA = args[0] || "C:/Users/USER/Desktop/site-rs - Copia/rstratorparts/agrotrator_extracao";
const APLICAR = process.argv.includes("--aplicar");
const MAPA = process.argv.includes("--mapa");
const PASTA_FOTOS_SITE = "/catalogo";

const sa = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

const MONTADORAS = [
  [/\bMASSEY\b|\bMF\b/, "Massey Ferguson"],
  [/\bNEW HOLLAND\b|\bNH\b/, "New Holland"],
  [/\bVALTRA\b|\bVALMET\b/, "Valtra"],
  [/\bJOHN DEERE\b|\bJD\b/, "John Deere"],
  [/\bCASE\b/, "Case IH"],
  [/\bFORD\b/, "Ford"],
  [/\bAGRALE\b/, "Agrale"],
];

// Tipo de peça -> categoria do site (nomes iguais aos do banco). Testa a 1ª palavra do título.
const POR_TIPO = [
  [/^(RETENTOR|JUNTA|ANEL|ANEIS|VEDADOR|VEDACAO|ORING|O-RING|KIT RETENTOR|JOGO DE JUNTA|COIFA|GUARNICAO)/, "Vedações"],
  [/^(ROLAMENTO|MANCAL|BRONZINA|CAPA DO ROLAMENTO|CUBO|BUCHA)/, "Rolamentos e Mancais"],
  [/^(ELEMENTO FILTRANTE|FILTRO|CONJUNTO FILTRO|KIT FILTRO)/, "Filtros"],
  [/^(PARAFUSO|PORCA|ARRUELA|PINO|CHAVETA|GRAMPO|PRISIONEIRO|ABRACADEIRA|BRACADEIRA|TRAVA|CONTRAPINO|REBITE)/, "Elementos de Fixação"],
  [/^(DISCO DE EMBREAGEM|DISCO EMBREAGEM|PLATO|PLATOR|EMBREAGEM|KIT EMBREAGEM|LONA|PASTILHA|SAPATA DE FREIO|DISCO DE FREIO|DISCO FREIO|REPARO CILINDRO FREIO|CILINDRO FREIO|CILINDRO DE FREIO|CILINDRO EMBREAGEM|CILINDRO DE EMBREAGEM|CABO DE EMBREAGEM|GARFO DE EMBREAGEM|ROLAMENTO EMBREAGEM)/, "Freios e Embreagens"],
  [/^(SENSOR|INTERRUPTOR|FAROL|LANTERNA|ALTERNADOR|INDICADOR|CHAVE DE PARTIDA|CHAVE IGNICAO|MOTOR DE PARTIDA|RELE|SOLENOIDE|BUZINA|LAMPADA|CHICOTE|TERMOMETRO|MANOMETRO|HORIMETRO|TACOMETRO|VELOCIMETRO|PAINEL)/, "Elétrica e Sensores"],
  [/^(BOMBA HIDRAULICA|BOMBA DO HIDRAULICO|REPARO CILINDRO|REPARO DO CILINDRO|CILINDRO|MANGUEIRA|VALVULA|COMANDO HIDRAULICO|REPARO HIDRAULICO|REPARO DO HIDRAULICO|BRACO DO HIDRAULICO|BRACO HIDRAULICO|TERCEIRO PONTO|ENGATE)/, "Hidráulica e Pneumática"],
  [/^(ENGRENAGEM|COROA|PINHAO|EIXO|GARFO|SINCRONIZADOR|LUVA|SATELITE|PLANETARIA|DIFERENCIAL|ALAVANCA|CAIXA DE CAMBIO|TOMADA DE FORCA|CARDAN|CRUZETA)/, "Engrenagens e Transmissão"],
  [/^(PARALAMA|EXTENSAO PARALAMA|CAPO|SUPORTE|BARRA|TERMINAL|BRACO|AMORTECEDOR|ESTRIBO|DEGRAU|PARACHOQUE|CAPOTA|GRADE|MASCARA|RODA|ARO|DISCO DE RODA|BANCO|ASSENTO|VOLANTE|RETROVISOR|ESPELHO|VIDRO|PORTA|FECHADURA|DOBRADICA|PESO|CONTRAPESO)/, "Estrutura e Suspensão"],
];
const POR_CAMINHO = [
  [/FILTRO/, "Filtros"],
  [/RETENTORES|VEDACOES/, "Vedações"],
  [/ROLAMENTOS|BRONZINAS|CUBO/, "Rolamentos e Mancais"],
  [/PARAFUSOS, PORCAS|CHAVETAS|GUARNICOES, GRAMPOS/, "Elementos de Fixação"],
  [/\/FREIOS\/|\/EMBREAGEM\//, "Freios e Embreagens"],
  [/SENSORES|INTERRUPTORES|INDICADORES|FAROIS|ALTERNADORES|CIRCUITO ELETRICO|CHAVES|SOLENOIDE|PAINEL DE INSTRUMENTOS/, "Elétrica e Sensores"],
  [/HIDRAULICO|MANGUEIRAS/, "Hidráulica e Pneumática"],
  [/CAMBIO E TRANSMISSAO|\/EIXOS\/|ENGRENAGENS|DIRECAO/, "Engrenagens e Transmissão"],
  [/CABINE|PNEUS E RODAS|ACABAMENTOS/, "Estrutura e Suspensão"],
];

function categoriaDe(titulo, caminho) {
  // "Jogo Reparo Cilindro", "Kit Retentores": o tipo vem depois do prefixo
  const t = sa(titulo).replace(/^(JOGO|JG|KIT|CONJUNTO|CJ\.?|PAR)\s+(DE\s+)?/, "");
  for (const [re, cat] of POR_TIPO) if (re.test(t)) return cat;
  const c = sa(caminho);
  for (const [re, cat] of POR_CAMINHO) if (re.test(c)) return cat;
  return "Outros Componentes";
}

function montadoraDe(titulo) {
  const t = sa(titulo);
  for (const [re, m] of MONTADORAS) if (re.test(t)) return m;
  return null;
}

// Código do fabricante: o maior trecho do título que é o começo do SKU ("027539" de "027539AG")
function codigoDe(titulo, base) {
  const tokens = titulo.split(/\s+/).map((t) => t.replace(/[^A-Za-z0-9.-]/g, ""));
  let melhor = "";
  for (const t of tokens) {
    if (t.length >= 4 && /\d/.test(t) && base.toUpperCase().startsWith(t.toUpperCase()) && t.length > melhor.length) melhor = t;
  }
  return melhor || base;
}

// Fabricante bonito: "R MANN" -> "R Mann", "CNH" fica "CNH" (siglas curtas)
const fabricanteDe = (m) =>
  (m || "")
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 4 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ") || null;

function lerCsv() {
  const r = Papa.parse(fs.readFileSync(path.join(PASTA, "agrotrator.csv"), "utf8"), {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });
  return r.data.map((x) => {
    const base = x.SKU.replace(/-AGROTRATOR$/i, "").trim();
    const fotosOrigem = (x.IMAGENS_LOCAIS || "")
      .split(",")
      .map((s) => s.trim().replace(/^imagens[\\/]/, ""))
      .filter(Boolean);
    const fotos = fotosOrigem
      .map((f, i) => ({ origem: f, destino: `${base}-${i + 1}.jpg` }))
      // Na importação, só as fotos que a conversão conseguiu gerar (WebP, por exemplo, falha)
      .filter((f) => MAPA || fs.existsSync(path.join("public", PASTA_FOTOS_SITE, f.destino)));
    const titulo = x.TITULO.trim().replace(/\s+/g, " ");
    return {
      sku: base,
      nome: titulo,
      codigo_fabricante: codigoDe(titulo, base),
      fabricante: fabricanteDe(x.MARCA),
      marca: montadoraDe(titulo),
      categoria: categoriaDe(titulo, x.CATEGORIA),
      fotos,
    };
  });
}

const sqlStr = (v) =>
  v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;

async function main() {
  const pecas = lerCsv();

  if (MAPA) {
    for (const p of pecas) for (const f of p.fotos) console.log(`${f.origem};${f.destino}`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    const cats = await prisma.categories.findMany({ where: { linha: "AGRICOLA" }, select: { id: true, nome: true } });
    const idCat = new Map(cats.map((c) => [c.nome, c.id]));

    // Catálogo atual: SKU já existente (o MySQL compara sem maiúsculas: "023484EA" = "023484ea")
    // passa a usar o SKU de lá; peças antigas com o mesmo código viram versões da peça com foto.
    const todas = await prisma.agricolas.findMany({
      select: { sku: true, nome: true, duplicado_de: true, codigo_fabricante: true },
    });
    const normCod = (s) => sa(s || "").replace(/[^A-Z0-9]/g, "");
    const primeira = (nome) => sa(nome).split(/[^A-Z]+/).find((w) => w.length >= 3) || "";
    const porSkuMin = new Map(todas.map((r) => [r.sku.toLowerCase(), r]));
    const existentes = new Map();
    for (const p of pecas) {
      const r = porSkuMin.get(p.sku.toLowerCase());
      if (r) {
        existentes.set(r.sku, true);
        p.sku = r.sku;
      }
    }
    const novos = new Set(pecas.map((p) => p.sku));
    const principaisPorCodigo = new Map();
    for (const r of todas) {
      if (r.duplicado_de || novos.has(r.sku)) continue;
      for (const c of [normCod(r.sku), normCod(r.codigo_fabricante)]) {
        if (c.length < 4) continue;
        if (!principaisPorCodigo.has(c)) principaisPorCodigo.set(c, []);
        principaisPorCodigo.get(c).push(r);
      }
    }
    // antigo principal -> nova peça (só quando o tipo de peça bate: RETENTOR = Retentor)
    const agrupar = new Map();
    for (const p of pecas) {
      for (const r of principaisPorCodigo.get(normCod(p.codigo_fabricante)) ?? []) {
        if (!agrupar.has(r.sku) && primeira(r.nome) === primeira(p.nome)) agrupar.set(r.sku, p.sku);
      }
    }
    // versões que apontavam para um principal agrupado passam a apontar para a nova peça
    const mudancas = [];
    for (const r of todas) {
      if (novos.has(r.sku)) {
        if (r.duplicado_de) mudancas.push({ sku: r.sku, antes: r.duplicado_de, depois: null });
      } else if (agrupar.has(r.sku)) {
        mudancas.push({ sku: r.sku, antes: r.duplicado_de, depois: agrupar.get(r.sku) });
      } else if (r.duplicado_de && agrupar.has(r.duplicado_de)) {
        mudancas.push({ sku: r.sku, antes: r.duplicado_de, depois: agrupar.get(r.duplicado_de) });
      }
    }
    console.log(`Agrupamento: ${agrupar.size} peças antigas (sem foto) viram versões das novas; ${mudancas.length} linhas mudam duplicado_de`);
    for (const [antigo, novo] of [...agrupar].slice(0, 6)) console.log("  ", antigo, porSkuMin.get(antigo.toLowerCase())?.nome, "->", novo);

    const porCat = {};
    for (const p of pecas) porCat[p.categoria] = (porCat[p.categoria] || 0) + 1;
    console.log(`${pecas.length} peças, ${pecas.reduce((s, p) => s + p.fotos.length, 0)} fotos`);
    console.log("Por categoria:", porCat);
    console.log("Com marca de trator:", pecas.filter((p) => p.marca).length, "| SKUs que já existem (serão atualizados):", existentes.size);
    for (const p of pecas.slice(0, 8)) console.log(" ", p.sku, "|", p.codigo_fabricante, "|", p.marca, "|", p.fabricante, "|", p.categoria, "|", p.nome);

    const faltaCat = [...new Set(pecas.map((p) => p.categoria))].filter((c) => !idCat.has(c));
    if (faltaCat.length) throw new Error("Categorias inexistentes no banco: " + faltaCat.join(", "));

    // Linhas prontas para o banco
    const agora = new Date();
    const linhas = pecas.map((p) => {
      const base = {
        sku: p.sku,
        nome: p.nome,
        codigo_fabricante: p.codigo_fabricante,
        fabricante: p.fabricante,
        marca: p.marca,
        marca_confirmada: !!p.marca,
        categoria: p.categoria,
        category_id: idCat.get(p.categoria),
        imagem_principal: p.fotos.length ? `${PASTA_FOTOS_SITE}/${p.fotos[0].destino}` : null,
        estoque: 1,
      };
      const { descricao, descricao_es } = gerar(base);
      return { ...base, descricao, descricao_es };
    });

    // SQL para a produção (phpMyAdmin): reexecutável, atualiza se o SKU já existir
    const cols = ["sku", "nome", "codigo_fabricante", "fabricante", "marca", "marca_confirmada", "categoria", "category_id", "imagem_principal", "estoque", "descricao", "descricao_es", "created_at", "updated_at"];
    const data = agora.toISOString().slice(0, 19).replace("T", " ");
    const sql = [
      "-- Peças com fotos (importação agrotrator). Gerado por scripts/catalogo/importar_agrotrator.cjs",
      "-- Rode no phpMyAdmin do banco de produção. Pode rodar de novo sem duplicar.",
      "-- category_id é buscado pelo nome da categoria (os IDs da produção podem ser outros).",
      "SET NAMES utf8mb4;",
      "START TRANSACTION;",
    ];
    for (const l of linhas) {
      const vals = cols.map((c) =>
        c === "category_id"
          ? `(SELECT id FROM categories WHERE nome = ${sqlStr(l.categoria)} AND linha = 'AGRICOLA' LIMIT 1)`
          : c === "created_at" || c === "updated_at"
            ? `'${data}'`
            : c === "marca_confirmada"
              ? l.marca_confirmada ? "1" : "0"
              : sqlStr(l[c]),
      );
      sql.push(
        `INSERT INTO agricolas (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON DUPLICATE KEY UPDATE ` +
          cols.filter((c) => c !== "sku" && c !== "created_at").map((c) => `${c} = VALUES(${c})`).join(", ") +
          ";",
      );
    }
    sql.push("UPDATE agricolas SET duplicado_de = NULL WHERE sku IN (" + linhas.map((l) => sqlStr(l.sku)).join(", ") + ");");
    for (const m of mudancas.filter((m) => m.depois)) {
      sql.push(`UPDATE agricolas SET duplicado_de = ${sqlStr(m.depois)} WHERE sku = ${sqlStr(m.sku)};`);
    }
    sql.push(`DELETE FROM agricolas_img WHERE image_path LIKE '${PASTA_FOTOS_SITE}/%';`);
    for (const p of pecas) {
      p.fotos.forEach((f, i) => {
        sql.push(
          `INSERT INTO agricolas_img (sku, image_path, image_type, sort_order, created_at) VALUES (${sqlStr(p.sku)}, ${sqlStr(`${PASTA_FOTOS_SITE}/${f.destino}`)}, '${i === 0 ? "main" : "thumb"}', ${i}, '${data}');`,
        );
      });
    }
    sql.push("COMMIT;");

    if (!APLICAR) {
      console.log("\nSimulação: nada foi gravado. Use --aplicar para gravar.");
      return;
    }

    fs.mkdirSync("scripts/importacao", { recursive: true });
    fs.writeFileSync("scripts/importacao/agrotrator_producao.sql", sql.join("\n") + "\n");
    console.log("SQL da produção: scripts/importacao/agrotrator_producao.sql");

    // Backup do que muda nas peças existentes (para desfazer o agrupamento, se preciso)
    fs.mkdirSync("dados", { recursive: true });
    const backup = `dados/backup_agrotrator_${agora.toISOString().replace(/[:.]/g, "-")}.json`;
    const antigasAtualizadas = await prisma.agricolas.findMany({ where: { sku: { in: [...existentes.keys()] } } });
    fs.writeFileSync(backup, JSON.stringify({ mudancas, antigasAtualizadas }, null, 2));
    console.log("Backup:", backup);

    for (const l of linhas) {
      await prisma.agricolas.upsert({
        where: { sku: l.sku },
        create: { ...l, created_at: agora },
        update: { ...l, duplicado_de: null },
      });
    }
    for (const m of mudancas.filter((m) => m.depois)) {
      await prisma.agricolas.update({ where: { sku: m.sku }, data: { duplicado_de: m.depois } });
    }
    await prisma.agricolas_img.deleteMany({ where: { image_path: { startsWith: `${PASTA_FOTOS_SITE}/` } } });
    await prisma.agricolas_img.createMany({
      data: pecas.flatMap((p) =>
        p.fotos.map((f, i) => ({ sku: p.sku, image_path: `${PASTA_FOTOS_SITE}/${f.destino}`, image_type: i === 0 ? "main" : "thumb", sort_order: i })),
      ),
      skipDuplicates: true,
    });
    console.log(`Gravado no banco local: ${linhas.length} peças.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
