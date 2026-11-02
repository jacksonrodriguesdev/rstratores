// Segurança do login e do painel, contra o site já compilado e rodando (depois do teste de fumaça).
// Uso: BASE_URL=http://localhost:3999 node scripts/ci/testar-seguranca.cjs   (precisa de JWT_SECRET)
// Confere: sessão do admin de 12 h, "sair de todos os aparelhos", token antigo de 7 dias recusado,
// pedido de outro site (CSRF) bloqueado e limite de senha por e-mail mesmo trocando o IP.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

// Cria e apaga usuários: só em banco de teste (nome com "ci" ou "teste")
const banco = (process.env.DATABASE_URL || "").split("?")[0].split("/").pop() || "";
if (!/ci|teste/i.test(banco)) {
  console.error(`Banco "${banco}" não parece de teste: recusado.`);
  process.exit(1);
}
const BASE = (process.env.BASE_URL || "http://localhost:3999").replace(/\/$/, "");
const prisma = new PrismaClient();
const falhas = [];
const conferir = (ok, texto) => {
  console.log(`${ok ? "✔" : "✘"} ${texto}`);
  if (!ok) falhas.push(texto);
};

const login = (email, senha, headers = {}) =>
  fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ email, senha }),
  });
const cookieDe = (r) => (r.headers.get("set-cookie") || "").split(";")[0];
const painel = (cookie) => fetch(BASE + "/api/admin/quotes", { headers: { cookie } });

async function main() {
  const senha = crypto.randomBytes(12).toString("hex") + "A1";
  const hash = await bcrypt.hash(senha, 10);
  const criar = (email, role) =>
    prisma.users.upsert({
      where: { email },
      create: { email, nome_completo: "CI Segurança", senha_hash: hash, role },
      update: { senha_hash: hash, role },
    });
  const admin = await criar("ci-seg-admin@teste.local", "ADMIN");
  await criar("ci-seg-cliente@teste.local", "USER");

  // 1) Login do admin: cookie de 12 h, HttpOnly, e o painel abre
  const r1 = await login(admin.email, senha);
  const sc = r1.headers.get("set-cookie") || "";
  conferir(r1.status === 200, `login do admin (${r1.status})`);
  conferir(/Max-Age=43200/.test(sc) && /HttpOnly/i.test(sc), "cookie do admin: 12 h e HttpOnly");
  const c1 = cookieDe(r1);
  conferir((await painel(c1)).status === 200, "painel abre com o cookie novo");

  // 2) Pedido vindo de outro site (CSRF): bloqueado; webhook em /api/public segue
  const r2 = await login(admin.email, senha, { origin: "https://golpe.example" });
  conferir(r2.status === 403, `POST com Origin de outro site bloqueado (${r2.status})`);
  const r3 = await login(admin.email, senha, { "sec-fetch-site": "cross-site" });
  conferir(r3.status === 403, `POST com Sec-Fetch-Site cross-site bloqueado (${r3.status})`);
  const r4 = await fetch(BASE + "/api/public/saude", {
    method: "POST",
    headers: { origin: "https://golpe.example" },
  });
  conferir(r4.status !== 403, `/api/public não passa pela trava (${r4.status})`);

  // 3) Token de admin com 7 dias (formato antigo) é recusado
  const { SignJWT } = await import("jose");
  const segredo = new TextEncoder().encode(process.env.JWT_SECRET || "");
  const antigo = await new SignJWT({ id: admin.id, nome: "x", email: admin.email, role: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(segredo);
  const r5 = await painel(`agroparts_auth=${antigo}`);
  conferir(r5.status === 401, `token de admin de 7 dias recusado (${r5.status})`);

  // 4) Sair de todos os aparelhos: o cookie anterior para de valer; login novo funciona
  const c2 = cookieDe(await login(admin.email, senha));
  await fetch(BASE + "/api/auth/logout", {
    method: "POST",
    headers: { cookie: c2, "content-type": "application/json" },
    body: JSON.stringify({ todos: true }),
  });
  conferir((await painel(c1)).status === 401, "cookie de outro aparelho derrubado");
  conferir((await painel(c2)).status === 401, "cookie deste aparelho derrubado");
  const c3 = cookieDe(await login(admin.email, senha));
  conferir((await painel(c3)).status === 200, "login novo depois de sair de todos");

  // 5) Adivinhar a senha trocando o IP a cada tentativa: o teto por e-mail trava
  let ultimo = 0;
  for (let i = 0; i < 21; i++) {
    const r = await login("ci-seg-cliente@teste.local", "errada" + i, {
      "x-forwarded-for": `203.0.113.${i + 1}`,
    });
    ultimo = r.status;
  }
  conferir(ultimo === 429, `20 senhas erradas de IPs diferentes: trava (${ultimo})`);
  const r6 = await login("ci-seg-cliente@teste.local", senha, { "x-forwarded-for": "198.51.100.9" });
  conferir(r6.status === 429, `travado até com a senha certa, por 15 min (${r6.status})`);

  await prisma.users.deleteMany({
    where: { email: { in: ["ci-seg-admin@teste.local", "ci-seg-cliente@teste.local"] } },
  });
  await prisma.$disconnect();
  if (falhas.length) {
    console.error(`\n${falhas.length} falha(s) de segurança:\n- ${falhas.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Segurança do login e do painel: ok");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
