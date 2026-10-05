import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const marcas = [
  "Chevrolet",
  "Volkswagen",
  "Fiat",
  "Ford",
  "Toyota",
  "Honda",
  "Hyundai",
  "Renault",
  "Nissan",
  "Jeep",
  "Peugeot",
  "Citroën",
  "Mitsubishi",
  "Kia",
  "Audi",
  "BMW",
  "Mercedes-Benz",
  "Volvo",
];

const subcategorias = ["Acessórios", "Motor", "Suspensão"];

async function seed() {
  console.log("Iniciando seed de categorias Automotivas...");

  for (const marca of marcas) {
    // Tenta encontrar ou criar a categoria da marca
    let catMarca = await prisma.categories.findFirst({
      where: { nome: marca, parent_id: null, linha: "AUTOMOTIVA" },
    });

    if (!catMarca) {
      catMarca = await prisma.categories.create({
        data: {
          nome: marca,
          parent_id: null,
          linha: "AUTOMOTIVA",
        },
      });
      console.log(`[+] Criada marca: ${marca}`);
    } else {
      console.log(`[~] Marca já existe: ${marca}`);
    }

    // Cria as subcategorias
    for (const sub of subcategorias) {
      let subCat = await prisma.categories.findFirst({
        where: { nome: sub, parent_id: catMarca.id, linha: "AUTOMOTIVA" },
      });

      if (!subCat) {
        await prisma.categories.create({
          data: {
            nome: sub,
            parent_id: catMarca.id,
            linha: "AUTOMOTIVA",
          },
        });
        console.log(`   [+] Criada subcategoria: ${sub}`);
      } else {
        console.log(`   [~] Subcategoria já existe: ${sub}`);
      }
    }
  }

  console.log("Seed finalizado com sucesso!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
