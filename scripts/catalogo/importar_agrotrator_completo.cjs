// Importa o catálogo completo do agrotrator.com.br (baixado por scripts/extratores/agrotrator_precos.cjs
// em dados/precos_agrotrator/catalogo.json) para as peças agrícolas.
//
// - Peça que já temos com o MESMO SKU: ganha preço (+MARGEM %) e, se não tem foto visível
//   (só redeparts ou nenhuma), todas as fotos de lá.
// - Peça com o mesmo código original de OUTRO fabricante: não mexe (foto/preço seriam de outra marca).
// - Peça que não temos: entra como nova (título, fabricante, marca do trator, categoria e descrição
//   gerada pelo mesmo modelo das outras; o título em espanhol é feito pelo site, em pecas-es.ts).
// Fotos: endereço 600×600 da VTEX. O botão "Copiar fotos do agrotrator" (admin) baixa depois cada
// uma para a pasta de uploads do servidor e troca o endereço (src/lib/fotos-agrotrator.server.ts).
//
// Uso (raiz do projeto):
//   node scripts/catalogo/importar_agrotrator_completo.cjs              -> simulação
//   node scripts/catalogo/importar_agrotrator_completo.cjs --aplicar    -> banco local (com backup) + SQL
//   --margem=50
// O SQL de produção sai em partes: scripts/importacao/agrotrator_completo_producao_<n>.sql

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { gerar } = require("./gerar_descricoes.cjs");

const RAIZ = path.join(__dirname, "../..");
const APLICAR = process.argv.includes("--aplicar");
// --so-sql: só gera os arquivos SQL de produção (o banco local já foi importado)
const SO_SQL = process.argv.includes("--so-sql");
const MARGEM = Number((process.argv.find((a) => a.startsWith("--margem=")) || "--margem=50").split("=")[1]);
const POR_ARQUIVO = 3000; // peças por arquivo SQL (o phpMyAdmin tem limite de tamanho)

const sa = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const norm = (s) => sa(s).replace(/[^A-Z0-9]/g, "");
const centavos = (v) => Math.round(v * 100) / 100;
const codigosDoTexto = (t) => String(t || "").split(/[\s/,;()]+/).map(norm).filter((x) => x.length >= 5 && /\d/.test(x));

// Mesmas regras da importação das primeiras 999 peças
const MONTADORAS = [
  [/\bMASSEY\b|\bMF\b/, "Massey Ferguson"],
  [/\bNEW HOLLAND\b|\bNH\b/, "New Holland"],
  [/\bVALTRA\b|\bVALMET\b/, "Valtra"],
  [/\bJOHN DEERE\b|\bJD\b/, "John Deere"],
  [/\bCASE\b/, "Case IH"],
  [/\bFORD\b/, "Ford"],
  [/\bAGRALE\b/, "Agrale"],
];
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
  const t = sa(titulo).replace(/^(JOGO|JG|KIT|CONJUNTO|CJ\.?|PAR)\s+(DE\s+)?/, "");
  for (const [re, cat] of POR_TIPO) if (re.test(t)) return cat;
  const c = sa(caminho);
  for (const [re, cat] of POR_CAMINHO) if (re.test(c)) return cat;
  return "Outros Componentes";
}
const montadoraDe = (titulo) => {
  const t = sa(titulo);
  for (const [re, m] of MONTADORAS) if (re.test(t)) return m;
  return null;
};
function codigoDe(titulo, base) {
  let melhor = "";
  for (const t of titulo.split(/\s+/).map((x) => x.replace(/[^A-Za-z0-9.-]/g, ""))) {
    if (t.length >= 4 && /\d/.test(t) && base.toUpperCase().startsWith(t.toUpperCase()) && t.length > melhor.length) melhor = t;
  }
  return melhor || base;
}
const fabricanteDe = (m) =>
  (m || "").trim().split(/\s+/).map((w) => (w.length <= 4 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join(" ") || null;

// https://...vteximg.com.br/arquivos/ids/236448/x.jpg?v=1 -> .../ids/236448-600-600/x.jpg
// Fotos que são só a logo do agrotrator (produto sem foto real), achadas por
// scripts/extratores/agrotrator_fotos_logo.cjs: ficam de fora
const ARQ_LOGOS = path.join(RAIZ, "dados/precos_agrotrator/fotos_logo.json");
const LOGOS = (() => {
  if (!fs.existsSync(ARQ_LOGOS)) return new Set();
  const j = JSON.parse(fs.readFileSync(ARQ_LOGOS, "utf8"));
  return new Set([...j.logos, ...j.quebradas]);
})();
const foto600 = (u) => u.replace(/\/ids\/(\d+)(-\d+-\d+)?\//, "/ids/$1-600-600/").replace(/\?.*$/, "");

const sqlStr = (v) => (v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`);

(async () => {
  const prisma = new PrismaClient();
  try {
    const cat = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados/precos_agrotrator/catalogo.json"), "utf8"));
    let nossas = await prisma.agricolas.findMany({ select: { sku: true, codigo_fabricante: true, imagem_principal: true, preco_modo: true, duplicado_de: true } });
    if (SO_SQL) {
      // O banco local já tem a importação: volta ao estado de antes, pelo último backup
      const ult = fs.readdirSync(path.join(RAIZ, "dados")).filter((f) => /^backup_agrotrator_completo_.*\.json$/.test(f)).sort().pop();
      if (!ult) throw new Error("Sem backup da importação em dados/: rode primeiro com --aplicar");
      const bk = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados", ult), "utf8"));
      const eraNova = new Set(bk.novas.map((s) => s.toLowerCase()));
      const antes = new Map(bk.antes.map((a) => [a.sku, a]));
      nossas = nossas.filter((n) => !eraNova.has(n.sku.trim().toLowerCase())).map((n) => ({ ...n, ...(antes.has(n.sku) && { imagem_principal: antes.get(n.sku).imagem_principal, preco_modo: antes.get(n.sku).preco_modo, duplicado_de: antes.get(n.sku).duplicado_de }) }));
      console.log(`--so-sql: estado de antes pelo backup ${ult}`);
    }
    const porSku = new Map(nossas.map((n) => [n.sku.trim().toLowerCase(), n]));
    const porCod = new Set();
    for (const n of nossas) for (const c of [norm(n.codigo_fabricante), norm(n.sku)]) if (c.length >= 5) porCod.add(c);
    const temFotoVisivel = (n) => !!n.imagem_principal && !/redeparts/i.test(n.imagem_principal);
    const cats = await prisma.categories.findMany({ where: { linha: "AGRICOLA" }, select: { id: true, nome: true } });
    const idCat = new Map(cats.map((c) => [c.nome, c.id]));

    const atualizar = []; // { sku, preco, fotos? }
    const novas = [];
    const vistos = new Set();
    const produtosVistos = new Set(); // variações (tamanhos) do mesmo produto: entra só uma
    let outraMarca = 0;
    let semPreco = 0;
    for (const p of cat) {
      const base = p.ref.replace(/-AGROTRATOR$/i, "").trim();
      if (!base || vistos.has(base.toLowerCase())) continue;
      vistos.add(base.toLowerCase());
      const variacao = p.idProduto && produtosVistos.has(p.idProduto);
      if (p.idProduto) produtosVistos.add(p.idProduto);
      const custo = centavos(p.preco > 0 ? p.preco : p.precoLista > 0 ? p.precoLista : 0);
      if (!custo) semPreco++;
      const fotos = [...new Set(p.fotos.map(foto600))].filter((u) => !LOGOS.has(u));
      const nossa = porSku.get(base.toLowerCase());
      if (nossa) {
        atualizar.push({
          sku: nossa.sku,
          custo: nossa.preco_modo === "FIXO" ? 0 : custo,
          fotos: temFotoVisivel(nossa) ? [] : fotos,
          // versão escondida de outra peça: com foto e preço, passa a aparecer sozinha
          liberar: !!nossa.duplicado_de && fotos.length > 0 && !temFotoVisivel(nossa),
        });
        continue;
      }
      if (variacao) continue;
      if ([...codigosDoTexto(p.nome), norm(base)].some((c) => porCod.has(c))) {
        outraMarca++;
        continue;
      }
      const nome = p.nome.trim().replace(/\s+/g, " ");
      const caminho = p.categorias.slice().sort((a, b) => b.length - a.length)[0] || p.categoria;
      const linha = {
        sku: base,
        nome,
        codigo_fabricante: codigoDe(nome, base),
        fabricante: fabricanteDe(p.marca),
        marca: montadoraDe(nome),
        categoria: categoriaDe(nome, caminho),
        imagem_principal: fotos[0] || null,
        estoque: p.disponivel > 0 ? 1 : 0,
        ean: p.ean || null,
      };
      linha.marca_confirmada = !!linha.marca;
      linha.category_id = idCat.get(linha.categoria);
      Object.assign(linha, gerar(linha));
      novas.push({ linha, custo, fotos });
    }

    const faltaCat = [...new Set(novas.map((n) => n.linha.categoria))].filter((c) => !idCat.has(c));
    if (faltaCat.length) throw new Error("Categorias inexistentes no banco: " + faltaCat.join(", "));

    const fotosNovas = novas.reduce((t, n) => t + n.fotos.length, 0) + atualizar.reduce((t, a) => t + a.fotos.length, 0);
    const porCat = {};
    for (const n of novas) porCat[n.linha.categoria] = (porCat[n.linha.categoria] || 0) + 1;
    const porMarca = {};
    for (const n of novas) porMarca[n.linha.marca || "(sem marca de trator)"] = (porMarca[n.linha.marca || "(sem marca de trator)"] || 0) + 1;
    console.log(`Agrotrator: ${cat.length} itens`);
    console.log(`Peças que já temos (mesmo SKU): ${atualizar.length} · ganham foto: ${atualizar.filter((a) => a.fotos.length).length} · ganham preço: ${atualizar.filter((a) => a.custo).length}`);
    console.log(`Mesmo código, outro fabricante (não mexe): ${outraMarca}`);
    console.log(`NOVAS: ${novas.length} · com preço: ${novas.filter((n) => n.custo).length} · sem preço lá: ${novas.filter((n) => !n.custo).length}`);
    console.log(`Fotos a gravar: ${fotosNovas}`);
    console.log("Novas por categoria:", porCat);
    console.log("Novas por marca de trator:", porMarca);
    for (const n of novas.slice(0, 6)) console.log(`  ${n.linha.sku} | ${n.linha.categoria} | ${n.linha.marca ?? "-"} | ${n.linha.fabricante} | R$ ${n.custo} → ${centavos(n.custo * (1 + MARGEM / 100))} | ${n.linha.nome}`);

    if (!APLICAR && !SO_SQL) {
      console.log("\nSimulação: nada foi gravado. Use --aplicar para gravar.");
      return;
    }

    const agora = new Date();
    const preco = (custo) => (custo ? { valor_compra: custo, margem: MARGEM, preco_brl: centavos(custo * (1 + MARGEM / 100)), preco_modo: "AUTO", precificado_em: agora } : {});
    if (!SO_SQL) {
    const carimbo = agora.toISOString().replace(/[:.]/g, "-");
    // Backup das peças existentes que mudam (para desfazer)
    const antes = await prisma.agricolas.findMany({ where: { sku: { in: atualizar.map((a) => a.sku) } }, include: { images: true } });
    const backupArq = path.join(RAIZ, `dados/backup_agrotrator_completo_${carimbo}.json`);
    fs.writeFileSync(backupArq, JSON.stringify({ antes, novas: novas.map((n) => n.linha.sku) }));

    // Banco local
    for (let i = 0; i < novas.length; i += 500) {
      await prisma.agricolas.createMany({ data: novas.slice(i, i + 500).map((n) => ({ ...n.linha, ...preco(n.custo), created_at: agora })), skipDuplicates: true });
      process.stdout.write(`\rNovas: ${Math.min(i + 500, novas.length)}/${novas.length}`);
    }
    const imgs = [
      ...novas.flatMap((n) => n.fotos.map((f, i) => ({ sku: n.linha.sku, image_path: f, image_type: i === 0 ? "main" : "thumb", sort_order: i }))),
      ...atualizar.flatMap((a) => a.fotos.map((f, i) => ({ sku: a.sku, image_path: f, image_type: i === 0 ? "main" : "thumb", sort_order: i }))),
    ];
    for (let i = 0; i < imgs.length; i += 2000) await prisma.agricolas_img.createMany({ data: imgs.slice(i, i + 2000), skipDuplicates: true });
    for (let i = 0; i < atualizar.length; i += 200) {
      await prisma.$transaction(
        atualizar.slice(i, i + 200).map((a) =>
          prisma.agricolas.update({
            where: { sku: a.sku },
            data: { ...preco(a.custo), ...(a.fotos.length && { imagem_principal: a.fotos[0] }), ...(a.liberar && { duplicado_de: null }) },
          }),
        ),
      );
    }
    console.log(`\nBanco local: ${novas.length} novas, ${atualizar.length} atualizadas, ${imgs.length} fotos.`);
    console.log(`Backup: ${path.relative(RAIZ, backupArq)}`);
    }

    // SQL para produção, em partes
    const data = agora.toISOString().slice(0, 19).replace("T", " ");
    const cols = ["sku", "nome", "codigo_fabricante", "fabricante", "marca", "marca_confirmada", "categoria", "category_id", "imagem_principal", "estoque", "ean", "descricao", "descricao_es", "valor_compra", "margem", "preco_brl", "preco_modo", "precificado_em", "created_at", "updated_at"];
    const valor = (l, c, custo) => {
      const pr = preco(custo);
      if (c === "category_id") return `(SELECT id FROM categories WHERE nome = ${sqlStr(l.categoria)} AND linha = 'AGRICOLA' LIMIT 1)`;
      if (c === "created_at" || c === "updated_at") return `'${data}'`;
      if (c === "precificado_em") return custo ? `'${data}'` : "NULL";
      if (c === "marca_confirmada") return l.marca_confirmada ? "1" : "0";
      if (c === "preco_modo") return "'AUTO'";
      if (c in pr) return sqlStr(pr[c]);
      if (["valor_compra", "margem", "preco_brl"].includes(c)) return "NULL";
      return sqlStr(l[c]);
    };
    const imgSql = (sku, fotos) =>
      fotos.map((f, i) => `INSERT IGNORE INTO agricolas_img (sku, image_path, image_type, sort_order, created_at) VALUES (${sqlStr(sku)}, ${sqlStr(f)}, '${i === 0 ? "main" : "thumb"}', ${i}, '${data}');`);
    const partes = [];
    for (let i = 0; i < novas.length; i += POR_ARQUIVO) {
      const linhas = [];
      for (const n of novas.slice(i, i + POR_ARQUIVO)) {
        linhas.push(`INSERT INTO agricolas (${cols.join(", ")}) VALUES (${cols.map((c) => valor(n.linha, c, n.custo)).join(", ")}) ON DUPLICATE KEY UPDATE ${cols.filter((c) => c !== "sku" && c !== "created_at").map((c) => `${c} = VALUES(${c})`).join(", ")};`);
        linhas.push(...imgSql(n.linha.sku, n.fotos));
      }
      partes.push(linhas);
    }
    const atual = [];
    for (const a of atualizar) {
      const pr = preco(a.custo);
      const sets = [
        ...(a.custo ? [`valor_compra=${pr.valor_compra}`, `margem=${MARGEM}`, `preco_brl=${pr.preco_brl}`, "preco_modo='AUTO'", "precificado_em=NOW()"] : []),
        ...(a.fotos.length ? [`imagem_principal=${sqlStr(a.fotos[0])}`] : []),
        ...(a.liberar ? ["duplicado_de=NULL"] : []),
      ];
      if (sets.length) atual.push(`UPDATE agricolas SET ${sets.join(", ")} WHERE sku=${sqlStr(a.sku)} AND preco_modo<>'FIXO';`);
      atual.push(...imgSql(a.sku, a.fotos));
    }
    partes.push(atual);
    // Remove partes antigas antes de gravar
    for (const f of fs.readdirSync(path.join(RAIZ, "scripts/importacao"))) if (/^agrotrator_completo_producao_\d+\.sql$/.test(f)) fs.rmSync(path.join(RAIZ, "scripts/importacao", f));
    partes.forEach((linhas, i) => {
      const arq = path.join(RAIZ, `scripts/importacao/agrotrator_completo_producao_${i + 1}.sql`);
      fs.writeFileSync(
        arq,
        [
          `-- Catálogo agrotrator (parte ${i + 1} de ${partes.length}${i === partes.length - 1 ? ": peças que já existiam" : ": peças novas"}). Margem ${MARGEM}%.`,
          "-- Rodar no phpMyAdmin da produção, na ordem das partes. Pode rodar de novo sem duplicar.",
          "SET NAMES utf8mb4;",
          "START TRANSACTION;",
          ...linhas,
          "COMMIT;",
          "",
        ].join("\n"),
      );
    });
    const tamanhos = partes.map((_, i) => (fs.statSync(path.join(RAIZ, `scripts/importacao/agrotrator_completo_producao_${i + 1}.sql`)).size / 1048576).toFixed(1) + " MB");
    console.log(`SQL de produção: ${partes.length} partes em scripts/importacao/agrotrator_completo_producao_N.sql (${tamanhos.join(", ")})`);
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
