// Exporta o banco local para importar na hospedagem (Hostinger).
//
// Leva a estrutura de TODAS as tabelas (o Prisma espera todas), mas os DADOS só do que o
// site usa hoje: a linha agrícola e as tabelas do site. A linha automotiva (desligada em
// src/lib/linhas.ts) tem ~600 MB e fica só no banco local.
//
// Uso (a partir da raiz do projeto, com o MySQL do Laragon ligado):
//   node scripts/deploy/exportar_banco.cjs
// Gera dados/deploy/rstratores_hostinger.sql (pasta fora do git).

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const MYSQLDUMP =
  process.env.MYSQLDUMP || "C:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysqldump.exe";

const TABELAS_COM_DADOS = [
  "agricolas",
  "agricolas_img",
  "agricolas_aplicacao",
  "agricolas_similar",
  "agricolas_ficha_tecnica",
  "categories",
  "homepage_blocks",
  "site_banners",
  "users",
  "quotes",
  "site_visits",
];

function lerDatabaseUrl() {
  const linha = fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!linha) throw new Error("DATABASE_URL não encontrado no .env");
  const url = new URL(linha.slice("DATABASE_URL=".length).replace(/^"|"$/g, ""));
  return {
    usuario: decodeURIComponent(url.username),
    senha: decodeURIComponent(url.password),
    host: url.hostname,
    porta: url.port || "3306",
    banco: url.pathname.slice(1),
  };
}

function dump(db, args) {
  return execFileSync(
    MYSQLDUMP,
    [
      `--host=${db.host}`,
      `--port=${db.porta}`,
      `--user=${db.usuario}`,
      "--default-character-set=utf8mb4",
      "--single-transaction",
      "--skip-lock-tables",
      "--no-tablespaces", // hospedagem compartilhada não dá esse privilégio
      "--set-gtid-purged=OFF",
      "--skip-comments",
      ...args,
    ],
    // senha por variável de ambiente, nunca na linha de comando
    { env: { ...process.env, MYSQL_PWD: db.senha }, maxBuffer: 1024 * 1024 * 1024 },
  ).toString("utf8");
}

const db = lerDatabaseUrl();
console.log(`Exportando ${db.banco} de ${db.host}...`);

const estrutura = dump(db, ["--no-data", db.banco]);
const dados = dump(db, ["--no-create-info", "--extended-insert", db.banco, ...TABELAS_COM_DADOS]);

// MariaDB (comum na Hostinger) não conhece a collation padrão do MySQL 8
const compativel = (sql) => sql.replace(/utf8mb4_0900_ai_ci/g, "utf8mb4_unicode_ci");

const saida = path.join("dados", "deploy", "rstratores_hostinger.sql");
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(
  saida,
  [
    "-- RS Trator Peças: estrutura completa + dados da linha agrícola e do site",
    "SET FOREIGN_KEY_CHECKS=0;",
    compativel(estrutura),
    compativel(dados),
    "SET FOREIGN_KEY_CHECKS=1;",
    "",
  ].join("\n"),
);

const mb = (fs.statSync(saida).size / 1024 / 1024).toFixed(1);
console.log(`Pronto: ${saida} (${mb} MB)`);
console.log(`Tabelas com dados: ${TABELAS_COM_DADOS.join(", ")}`);
