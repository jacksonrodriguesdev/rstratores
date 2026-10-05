const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CATEGORY_RULES = [
  {
    name: "Rolamentos e Mancais",
    regex: /\b(ROLAMENTO|MANCAL|ROLAM\w*)\b/i,
  },
  {
    name: "Vedações",
    regex: /\b(RETENTOR|ANEL|JUNTA|VEDA[CÇ][AÃ]O|VEDAO|O-?RING|GAXETA)\b/i,
  },
  {
    name: "Engrenagens e Transmissão",
    regex:
      /\b(ENGRENAGEM|EIXO|POLIA|CORREIA|CORRENTE|CUBO|TRANSMISSAO|PINH[AÃ]O|COROA|CRUZETA|CARDAN)\b/i,
  },
  {
    name: "Filtros",
    regex: /\b(FILTRO|ELEMENTO FILTRANTE)\b/i,
  },
  {
    name: "Elementos de Fixação",
    regex:
      /\b(PARAFUSO|ARRUELA|PORCA|PINO|PRISIONEIRO|BUCHA|CUPILHA|ANEL EL[ÁA]STICO|TRAVA|REBITE|ABRACADEIRA|ABRA[CÇ]ADEIRA)\b/i,
  },
  {
    name: "Hidráulica e Pneumática",
    regex:
      /\b(BOMBA|MANGUEIRA|V[AÁ]LVULA|CILINDRO|TUBO|REPARO|CONEX[AÃ]O|ENGATE|COMANDO HIDRAULICO)\b/i,
  },
  {
    name: "Estrutura e Suspensão",
    regex: /\b(SUPORTE|MOLA|BARRA|CHAPA|HASTE|COXIM|AMORTECEDOR|TIRANTE)\b/i,
  },
  {
    name: "Freios e Embreagens",
    regex: /\b(DISCO|PATIM|LONA|PASTILHA|FREIO|EMBREAGEM)\b/i,
  },
  {
    name: "Elétrica e Sensores",
    regex:
      /\b(SENSOR|CHICOTE|MOTOR( DE)? PARTIDA|ALTERNADOR|CHAVE|REL[EÉ]|L[AÂ]MPADA|FAROL|CABO( DE)? VELAS?|BATERIA|INTERRUPTOR|PLUG|TERMINAL|BOBINA)\b/i,
  },
];

const FALLBACK_CATEGORY = "Outros Componentes";

async function main() {
  console.log("Iniciando recategorização da Linha Agrícola...");

  // 1. Ensure categories exist
  const categoryMap = {}; // name -> id

  for (const rule of CATEGORY_RULES) {
    let cat = await prisma.categories.findFirst({
      where: { nome: rule.name, linha: "AGRICOLA" },
    });
    if (!cat) {
      cat = await prisma.categories.create({
        data: { nome: rule.name, linha: "AGRICOLA" },
      });
      console.log(`Criada categoria: ${rule.name}`);
    }
    categoryMap[rule.name] = cat.id;
  }

  // Create fallback
  let fallbackCat = await prisma.categories.findFirst({
    where: { nome: FALLBACK_CATEGORY, linha: "AGRICOLA" },
  });
  if (!fallbackCat) {
    fallbackCat = await prisma.categories.create({
      data: { nome: FALLBACK_CATEGORY, linha: "AGRICOLA" },
    });
    console.log(`Criada categoria: ${FALLBACK_CATEGORY}`);
  }
  categoryMap[FALLBACK_CATEGORY] = fallbackCat.id;

  // 2. Fetch all Agricola products
  console.log("\nBuscando produtos...");
  const produtos = await prisma.agricolas.findMany({
    select: { sku: true, nome: true, categoria: true, category_id: true },
  });
  console.log(`Encontrados ${produtos.length} produtos.`);

  let updatedCount = 0;
  const stats = {};
  for (const catName of Object.keys(categoryMap)) {
    stats[catName] = 0;
  }
  stats["Mantidos (Outras Categorias Específicas)"] = 0;

  for (const produto of produtos) {
    let newCategoryName = null;

    // Check rules
    if (produto.nome) {
      for (const rule of CATEGORY_RULES) {
        if (rule.regex.test(produto.nome)) {
          newCategoryName = rule.name;
          break;
        }
      }
    }

    if (!newCategoryName) {
      // If no rule matches, but it was in a generic category ("Geral" or a brand name like "Massey Ferguson")
      if (produto.categoria === "Geral" || produto.categoria === "Massey Ferguson") {
        newCategoryName = FALLBACK_CATEGORY;
      }
    }

    if (newCategoryName) {
      const newCatId = categoryMap[newCategoryName];

      // Update if changed
      if (produto.category_id !== newCatId || produto.categoria !== newCategoryName) {
        await prisma.agricolas.update({
          where: { sku: produto.sku },
          data: {
            categoria: newCategoryName,
            category_id: newCatId,
          },
        });
        updatedCount++;
        stats[newCategoryName]++;
      } else {
        stats[newCategoryName]++; // Already in the right category
      }
    } else {
      stats["Mantidos (Outras Categorias Específicas)"]++;
    }

    if (updatedCount % 1000 === 0 && updatedCount > 0) {
      console.log(`Progresso: ${updatedCount} produtos atualizados...`);
    }
  }

  console.log(`\nConcluído! ${updatedCount} produtos atualizados no banco de dados.`);
  console.log("Estatísticas finais da Linha Agrícola:");
  for (const [catName, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`- ${catName}: ${count}`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
