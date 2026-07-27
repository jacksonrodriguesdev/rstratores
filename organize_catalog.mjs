import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Palavras para limpeza de concorrentes
const CONCORRENTES = [
  /stockcar/gi, /stock car/gi, /a camargo/gi, /acamargo/gi, /dalmoro/gi, /dal moro/gi
];

// Montadoras / Veículos
const BRANDS = [
  { name: 'Volkswagen', id: 17, keywords: ['vw', 'volkswagen', 'gol', 'saveiro', 'fox', 'amarok', 'polo', 'jetta', 'kombi', 'voyage', 'nivus', 't-cross', 'up'] },
  { name: 'Fiat', id: 21, keywords: ['fiat', 'uno', 'palio', 'strada', 'toro', 'argo', 'mobi', 'siena', 'fiorino', 'pulse', 'cronos', 'doblo'] },
  { name: 'Chevrolet', id: 13, keywords: ['chevrolet', 'gm', 'celta', 'corsa', 's10', 'onix', 'prisma', 'tracker', 'cruze', 'cobalt', 'spin', 'montana'] },
  { name: 'Ford', id: 25, keywords: ['ford', 'ka', 'fiesta', 'ranger', 'ecosport', 'focus', 'fusion', 'escort', 'corcel', 'f1000', 'f250'] },
  { name: 'Toyota', id: 29, keywords: ['toyota', 'hilux', 'corolla', 'yaris', 'etios', 'sw4', 'rav4'] },
  { name: 'Honda', id: 33, keywords: ['honda', 'civic', 'fit', 'hr-v', 'city', 'cr-v', 'wr-v'] },
  { name: 'Hyundai', id: 37, keywords: ['hyundai', 'hb20', 'creta', 'tucson', 'ix35', 'santa fe', 'i30'] },
  { name: 'Renault', id: 41, keywords: ['renault', 'sandero', 'logan', 'duster', 'kwid', 'clio', 'captur', 'kangoo'] },
  { name: 'Nissan', id: 45, keywords: ['nissan', 'frontier', 'kicks', 'march', 'versa', 'sentra'] },
  { name: 'Jeep', id: 49, keywords: ['jeep', 'renegade', 'compass', 'commander'] },
  { name: 'Peugeot', id: 53, keywords: ['peugeot', '206', '207', '208', '2008', '308'] },
  { name: 'Citroën', id: 57, keywords: ['citroen', 'citroën', 'c3', 'c4', 'picasso'] },
  { name: 'Mitsubishi', id: 61, keywords: ['mitsubishi', 'l200', 'pajero', 'outlander', 'triton'] },
  { name: 'Kia', id: 65, keywords: ['kia', 'sportage', 'cerato', 'sorento', 'picanto'] },
  { name: 'Audi', id: 69, keywords: ['audi', 'a3', 'a4', 'q3', 'q5'] },
  { name: 'BMW', id: 73, keywords: ['bmw', 'serie 3', 'x1', 'x3', '118i', '320i'] },
  { name: 'Mercedes-Benz', id: 77, keywords: ['mercedes', 'c180', 'gla', 'sprinter'] },
  { name: 'Volvo', id: 81, keywords: ['volvo', 'xc60', 'xc40', 'xc90'] }
];

// Subcategorias de Peças
const PART_TYPES = [
  { name: 'Suspensão', keywords: ['amortecedor', 'bucha', 'pivô', 'pivo', 'bandeja', 'terminal', 'bieleta', 'batente', 'coifa', 'homocinetica', 'mola', 'bandeija'] },
  { name: 'Motor', keywords: ['correia', 'bomba', 'cabeçote', 'cabecote', 'junta', 'pistão', 'pistao', 'anel', 'valvula', 'tensor', 'polia', 'coxim', 'radiador', 'aditivo', 'carburador', 'injecao', 'bico', 'vela'] },
  { name: 'Freios', keywords: ['pastilha', 'disco', 'lona', 'cilindro', 'fluido', 'sapata', 'freio', 'abs'] },
  { name: 'Filtros e Óleos', keywords: ['filtro', 'óleo', 'oleo', 'lubrificante', '5w30', '10w40', '15w40', 'sintetico', 'mineral'] }
]; // Default será "Acessórios" se não bater nenhuma acima

// Helper: limpa textos
function cleanText(text) {
  if (!text) return text;
  let t = text;
  CONCORRENTES.forEach(regex => {
    t = t.replace(regex, '');
  });
  // Clean double spaces
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

// Helper: encontra a marca no texto (retorna o objeto da marca, se achar)
function findBrand(text) {
  const t = text.toLowerCase();
  for (const brand of BRANDS) {
    for (const kw of brand.keywords) {
      if (t.includes(kw)) {
        return brand;
      }
    }
  }
  return null;
}

// Helper: encontra o tipo de peça (retorna string do nome da subcategoria)
function findPartType(text) {
  const t = text.toLowerCase();
  for (const type of PART_TYPES) {
    for (const kw of type.keywords) {
      if (t.includes(kw)) return type.name;
    }
  }
  return 'Acessórios'; // Fallback
}

async function getOrCreateSubcategory(parentId, parentName, subName) {
  let sub = await prisma.categories.findFirst({
    where: { parent_id: parentId, nome: subName }
  });
  if (!sub) {
    // Para simplificar, vou criar a subcategoria no banco!
    // Precisamos definir um slug seguro.
    const slug = `${parentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${subName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    sub = await prisma.categories.create({
      data: {
        nome: subName,
        parent_id: parentId,
        linha: 'AUTOMOTIVA'
      }
    });
  }
  return sub.id;
}

async function main() {
  console.log("Iniciando organização inteligente do catálogo AUTOMOTIVO...");

  // Cache das subcategorias para não ter que ir no banco toda hora
  // categoryCache[parentId][subName] = categoryId
  const categoryCache = {};

  const products = await prisma.products.findMany({
    where: { linha: 'AUTOMOTIVA' },
    select: { sku: true, nome: true, descricao: true, category_id: true }
  });

  console.log(`Analisando ${products.length} produtos...`);
  
  let updatedCount = 0;

  // Processo sequencial (por causa de getOrCreateSubcategory ser mais seguro assim)
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    
    // 1. Limpeza
    const nomeLimpo = cleanText(p.nome);
    const descLimpa = cleanText(p.descricao);

    // 2. Identificação de Marca
    const brand = findBrand(nomeLimpo) || findBrand(descLimpa || '');
    let catId = p.category_id;
    let computedMarca = '';
    
    if (brand) {
      computedMarca = brand.name;
      const partTypeName = findPartType(nomeLimpo);
      
      // Pega do Cache ou cria no DB
      if (!categoryCache[brand.id]) categoryCache[brand.id] = {};
      
      if (!categoryCache[brand.id][partTypeName]) {
        const subId = await getOrCreateSubcategory(brand.id, brand.name, partTypeName);
        categoryCache[brand.id][partTypeName] = subId;
      }
      
      catId = categoryCache[brand.id][partTypeName];
    }

    // 3. Update se houve mudança (ou só atualizar tudo para garantir a limpeza)
    try {
      await prisma.products.update({
        where: { sku: p.sku },
        data: {
          nome: nomeLimpo,
          descricao: descLimpa,
          category_id: catId,
          marca: computedMarca || null, // salva a marca detectada no BD
        }
      });
      updatedCount++;
    } catch (e) {
      console.error(`Erro ao atualizar SKU ${p.sku}:`, e.message);
    }
    
    if (i > 0 && i % 500 === 0) {
      console.log(`Processados ${i}/${products.length}...`);
    }
  }

  console.log(`\nOperação concluída! ${updatedCount} produtos foram limpos e recategorizados com sucesso.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
