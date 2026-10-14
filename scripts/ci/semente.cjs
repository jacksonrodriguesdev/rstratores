// Dados mínimos para testar o site num banco vazio (GitHub Actions: .github/workflows/verificar.yml).
// Categorias, 12 peças de marcas diferentes, visitas e eventos de ontem e de hoje e um evento no
// formato antigo ("/_evento/..." em site_visits) para testar a migração automática.
// NUNCA rode contra o banco de produção: o script recusa se o banco não se chamar "*ci*" ou "*teste*".
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
const banco = url.split("/").pop().split("?")[0];
if (!/ci|teste/i.test(banco)) {
  console.error(`Recusado: o banco "${banco}" não parece de teste (o nome precisa ter "ci" ou "teste").`);
  process.exit(1);
}

const prisma = new PrismaClient();
const CATEGORIAS = ["Filtros", "Rolamentos e Mancais", "Engrenagens e Transmissão", "Hidráulica e Pneumática"];
const MARCAS = ["John Deere", "Massey Ferguson", "Valtra", "New Holland"];
const H = 3600_000;

(async () => {
  const cats = [];
  for (const nome of CATEGORIAS) cats.push(await prisma.categories.create({ data: { nome, linha: "AGRICOLA" } }));
  for (let i = 1; i <= 12; i++) {
    const cat = cats[i % cats.length];
    await prisma.agricolas.create({
      data: {
        sku: `CI-${String(i).padStart(3, "0")}`,
        nome: `${cat.nome === "Filtros" ? "Filtro de óleo" : cat.nome === "Rolamentos e Mancais" ? "Rolamento" : cat.nome === "Hidráulica e Pneumática" ? "Bomba hidráulica" : "Engrenagem"} teste ${i}`,
        categoria: cat.nome,
        category_id: cat.id,
        marca: MARCAS[i % MARCAS.length],
        estoque: 5,
        preco_brl: 100 + i * 10,
        imagem_principal: `produtos/ci-${i}.jpg`,
      },
    });
  }

  // Visitas: 2 sessões ontem (Rocha e Pelotas) e 1 hoje, com eventos. Dias no horário do Uruguai.
  const hojeUY = new Date(Date.now() - 3 * H).toISOString().slice(0, 10);
  const inicioHoje = Date.parse(`${hojeUY}T00:00:00-03:00`);
  const ontem = inicioHoje - 24 * H + 10 * H; // ontem, 10h
  const agora = Math.max(inicioHoje + 1000, Date.now() - 60_000);
  const visita = (t, vid, sid, path, extra = {}) =>
    prisma.site_visits.create({ data: { created_at: new Date(t), path, visitor_id: vid, session_id: sid, device: "mobile", fonte: "google", language: "es:es-UY", ...extra } });
  const rocha = { city: "Rocha", region: "Rocha", country: "Uruguay", country_code: "UY", latitude: -34.48, longitude: -54.33 };
  const pelotas = { city: "Pelotas", region: "Rio Grande do Sul", country: "Brazil", country_code: "BR", latitude: -31.77, longitude: -52.34, language: "pt:pt-BR" };
  await visita(ontem, "vis-a", "ses-a", "/", rocha);
  await visita(ontem + 60_000, "vis-a", "ses-a", "/produto/CI-001", rocha);
  await visita(ontem + 120_000, "vis-a", "ses-a", "/produto/CI-002", rocha);
  await visita(ontem + 5 * H, "vis-b", "ses-b", "/pt", pelotas);
  await visita(Math.min(agora, Date.now() - 500), "vis-c", "ses-c", "/loja", rocha);
  await prisma.site_eventos.create({ data: { created_at: new Date(ontem + 90_000), tipo: "whatsapp", dado: "CI-001", visitor_id: "vis-a", session_id: "ses-a", ...rocha } });
  await prisma.site_eventos.create({ data: { created_at: new Date(ontem + 100_000), tipo: "busca", dado: "3|filtro john deere", visitor_id: "vis-a", session_id: "ses-a", ...rocha } });
  // Formato antigo: deve ser movido para site_eventos na primeira leitura
  await visita(ontem + 110_000, "vis-a", "ses-a", "/_evento/carrinho/CI-002", { ...rocha, referrer: "/produto/CI-002" });
  console.log("Semente gravada: 4 categorias, 12 peças, 5 visitas, 2 eventos + 1 evento antigo");
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
