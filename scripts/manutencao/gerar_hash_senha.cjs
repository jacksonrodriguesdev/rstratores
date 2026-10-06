// Gera o hash (bcrypt) de uma senha, para redefinir a senha de um usuário direto no banco
// (ex.: no phpMyAdmin da Hostinger, campo users.senha_hash).
//
// Uso (a partir da raiz do projeto):
//   node scripts/manutencao/gerar_hash_senha.cjs
// Digite a senha nova quando pedir; o hash aparece na tela. A senha não é salva em lugar nenhum.

const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Senha nova (mínimo 8 caracteres): ", (senha) => {
  rl.close();
  if (!senha || senha.length < 8) {
    console.error("Senha muito curta.");
    process.exitCode = 1;
    return;
  }
  // Mesmo custo usado no cadastro do site (src/routes/api/auth.register.ts)
  console.log("\nCole este valor no campo senha_hash:\n");
  console.log(bcrypt.hashSync(senha, 10));
});
