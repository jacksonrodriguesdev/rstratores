// Gera descrições próprias (português e espanhol) para os produtos agrícolas,
// a partir dos dados do cadastro: nome, código, fabricante, marca e categoria.
//
// A marca só entra no texto quando é confiável. Nos produtos antigos, "Massey Ferguson"
// é um valor padrão (99% deles, inclusive peças com código John Deere/New Holland).
//
// Só preenche produtos com descrição vazia, para não apagar textos escritos à mão.
//
// Uso (a partir da raiz do projeto):
//   node scripts/catalogo/gerar_descricoes.cjs                 -> simulação, mostra exemplos
//   node scripts/catalogo/gerar_descricoes.cjs --aplicar       -> grava e salva a lista de SKUs
//   node scripts/catalogo/gerar_descricoes.cjs --desfazer dados/backup_descricoes_xxx.json

const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const APLICAR = process.argv.includes("--aplicar");
const DESFAZER = process.argv.indexOf("--desfazer");
const MARCA_PADRAO_ANTIGA = "Massey Ferguson";

// Uma frase por categoria, descrevendo a função da peça sem prometer o que não sabemos.
const CATEGORIAS = {
  "Engrenagens e Transmissão": {
    nome_es: "Engranajes y Transmisión",
    pt: "Faz parte do conjunto de transmissão, que leva a força do motor às rodas e à tomada de potência.",
    es: "Forma parte del conjunto de transmisión, que lleva la fuerza del motor a las ruedas y a la toma de fuerza.",
  },
  Vedações: {
    nome_es: "Sellos y Juntas",
    pt: "Itens de vedação evitam vazamentos de óleo e fluidos e impedem a entrada de poeira e água nos conjuntos mecânicos.",
    es: "Los elementos de sellado evitan pérdidas de aceite y fluidos e impiden la entrada de polvo y agua en los conjuntos mecánicos.",
  },
  "Hidráulica e Pneumática": {
    nome_es: "Hidráulica y Neumática",
    pt: "Componente dos sistemas hidráulicos e de condução de fluidos do equipamento.",
    es: "Componente de los sistemas hidráulicos y de conducción de fluidos del equipo.",
  },
  "Elementos de Fixação": {
    nome_es: "Elementos de Fijación",
    pt: "Elemento de fixação usado na montagem e na manutenção de conjuntos mecânicos.",
    es: "Elemento de fijación utilizado en el montaje y el mantenimiento de conjuntos mecánicos.",
  },
  "Rolamentos e Mancais": {
    nome_es: "Rodamientos y Soportes",
    pt: "Rolamentos e mancais sustentam eixos e peças girantes, reduzindo o atrito e o desgaste.",
    es: "Los rodamientos y soportes sostienen ejes y piezas giratorias, reduciendo la fricción y el desgaste.",
  },
  "Estrutura e Suspensão": {
    nome_es: "Estructura y Suspensión",
    pt: "Peça estrutural ou de suporte do equipamento.",
    es: "Pieza estructural o de soporte del equipo.",
  },
  Filtros: {
    nome_es: "Filtros",
    pt: "Trocar os filtros nos intervalos indicados pelo fabricante do equipamento protege o motor e os sistemas hidráulicos.",
    es: "Cambiar los filtros en los intervalos indicados por el fabricante del equipo protege el motor y los sistemas hidráulicos.",
  },
  "Freios e Embreagens": {
    nome_es: "Frenos y Embragues",
    pt: "Componente dos sistemas de freio ou embreagem, essenciais para a segurança e o controle do equipamento.",
    es: "Componente de los sistemas de freno o embrague, esenciales para la seguridad y el control del equipo.",
  },
  "Elétrica e Sensores": {
    nome_es: "Eléctrica y Sensores",
    pt: "Componente do sistema elétrico do equipamento.",
    es: "Componente del sistema eléctrico del equipo.",
  },
};

// "RETENTOR DA ARTICULACAO 014266 STD" -> "Retentor da articulacao 014266 STD"
function nomeLegivel(nome) {
  const palavras = nome.trim().split(/\s+/).map((w) => {
    if (/\d/.test(w)) return w; // códigos e medidas ficam como estão
    if (w.length <= 3 && !/[AEIOUÁÉÍÓÚÃÕÂÊÔ]/i.test(w)) return w.toUpperCase(); // siglas: STD, CJ, ZF
    return w.toLowerCase();
  });
  const s = palavras.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function marcaConfiavel(p) {
  if (!p.marca) return null;
  if (!p.fabricante && p.marca === MARCA_PADRAO_ANTIGA) return null;
  return p.marca;
}

function gerar(p) {
  const nome = nomeLegivel(p.nome);
  const codigo = p.codigo_fabricante || p.sku.toUpperCase();
  // SKUs como "0" ou "00" são lixo da importação: não entram no texto.
  const abertura = (codigo.length >= 3 ? `${nome}, código ${codigo}.` : `${nome}.`) +
    (p.fabricante ? ` Fabricante: ${p.fabricante}.` : "");
  const marca = marcaConfiavel(p);
  const cat = CATEGORIAS[p.categoria];

  const pt = [
    abertura,
    marca
      ? `Peça de reposição para tratores e máquinas ${marca}.`
      : "Peça de reposição para tratores e máquinas agrícolas.",
    cat?.pt,
    "Antes de comprar, confira o código da peça que será substituída. Se tiver dúvida sobre a compatibilidade, envie o modelo e o número de série do seu equipamento pelo WhatsApp que nossa equipe confirma para você.",
  ];
  const es = [
    abertura,
    marca
      ? `Repuesto para tractores y máquinas ${marca}.`
      : "Repuesto para tractores y máquinas agrícolas.",
    cat?.es,
    "Antes de comprar, verifique el código de la pieza a reemplazar. Si tiene dudas sobre la compatibilidad, envíe el modelo y el número de serie de su equipo por WhatsApp y nuestro equipo lo confirma.",
  ];
  return {
    descricao: pt.filter(Boolean).join("\n\n"),
    descricao_es: es.filter(Boolean).join("\n\n"),
  };
}

async function gravarEmLotes(itens, montar) {
  for (let i = 0; i < itens.length; i += 500) {
    await prisma.$transaction(itens.slice(i, i + 500).map(montar));
    process.stdout.write(`\r${Math.min(i + 500, itens.length)}/${itens.length}`);
  }
  console.log();
}

async function main() {
  if (DESFAZER > -1) {
    const skus = JSON.parse(fs.readFileSync(process.argv[DESFAZER + 1], "utf8"));
    console.log(`Limpando descrições geradas de ${skus.length} produtos...`);
    await gravarEmLotes(skus, (sku) =>
      prisma.agricolas.update({ where: { sku }, data: { descricao: null, descricao_es: null } }),
    );
    return;
  }

  const alvos = await prisma.agricolas.findMany({
    where: { OR: [{ descricao: null }, { descricao: "" }] },
    select: {
      sku: true,
      nome: true,
      marca: true,
      categoria: true,
      codigo_fabricante: true,
      fabricante: true,
    },
  });
  const comMarca = alvos.filter(marcaConfiavel).length;
  console.log(`Produtos sem descrição: ${alvos.length} | com marca no texto: ${comMarca}`);

  for (const sku of ["014266", "ah225672", alvos[0]?.sku]) {
    const p = alvos.find((a) => a.sku === sku);
    if (!p) continue;
    const d = gerar(p);
    console.log(`\n=== ${p.sku} (${p.nome}) ===\n${d.descricao}\n--- es ---\n${d.descricao_es}`);
  }

  if (!APLICAR) {
    console.log("\nSimulação. Para gravar, rode com --aplicar");
    return;
  }

  const backup = `dados/backup_descricoes_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(backup, JSON.stringify(alvos.map((p) => p.sku)));
  console.log(`\nLista de SKUs salva em ${backup}`);
  await gravarEmLotes(alvos, (p) => prisma.agricolas.update({ where: { sku: p.sku }, data: gerar(p) }));
  console.log(`Pronto. Para desfazer: node scripts/catalogo/gerar_descricoes.cjs --desfazer ${backup}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
