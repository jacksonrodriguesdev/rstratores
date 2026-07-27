import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: Deletando blocos atuais...');
  await prisma.homepage_blocks.deleteMany({});
  
  console.log('Seed: Criando a sequencia de 11 blocos estilo RS Autoparts...');
  
  const blocks = [
    {
      type: "HERO_SLIDER",
      title: null,
      position: 1,
      active: true,
      config: JSON.stringify({
        images: [
          "https://images.unsplash.com/photo-1590240470659-1e3d64dfd60e?q=80&w=1200&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1621213458763-7140e4e5ebba?q=80&w=1200&auto=format&fit=crop"
        ], // mock
        subtitle: "Encontre tudo o que precisa para seu Trator ou Caminhão."
      })
    },
    {
      type: "BUSCA_CODIGO",
      title: null,
      position: 2,
      active: true,
      config: JSON.stringify({})
    },
    {
      type: "FEATURES_STRIP",
      title: null,
      position: 3,
      active: true,
      config: JSON.stringify({})
    },
    {
      type: "PROMO_BANNERS_DUPLOS",
      title: null,
      position: 4,
      active: true,
      config: JSON.stringify({})
    },
    {
      type: "PRODUCTS_CAROUSEL",
      title: "Lançamentos",
      position: 5,
      active: true,
      config: JSON.stringify({ segment: "AMBOS", onlyWithImages: true, limit: 12, rows: 1 })
    },
    {
      type: "CAROUSEL_MONTADORAS",
      title: null,
      position: 6,
      active: true,
      config: JSON.stringify({})
    },
    {
      type: "PRODUCTS_CAROUSEL",
      title: "Mais Vendidos",
      position: 7,
      active: true,
      config: JSON.stringify({ segment: "AMBOS", onlyWithImages: true, limit: 12, rows: 1 })
    },
    {
      type: "PRODUCTS_CAROUSEL",
      title: "Destaques",
      position: 8,
      active: true,
      config: JSON.stringify({ segment: "AMBOS", onlyWithImages: true, limit: 12, rows: 1 })
    },
    {
      type: "BRANDS_CAROUSEL",
      title: null,
      position: 9,
      active: true,
      config: JSON.stringify({})
    },
    {
      type: "DEPOIMENTOS",
      title: null,
      position: 10,
      active: true,
      config: JSON.stringify({})
    },
    {
      type: "NEWSLETTER_INSTAGRAM",
      title: null,
      position: 11,
      active: true,
      config: JSON.stringify({})
    }
  ];

  for (const b of blocks) {
    await prisma.homepage_blocks.create({ data: b });
  }

  console.log('Seed Finalizado: 11 blocos criados com sucesso!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
