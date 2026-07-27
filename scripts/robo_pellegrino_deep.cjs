const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();

const LOGIN_URL = 'https://compreonline.pellegrino.com.br/Account/Login';
const EMAIL = 'jacksonrodriguesdev@gmail.com';
const PASSWORD = 'bzhudi';

// Cria o diretório de uploads se não existir
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Função para baixar arquivo
function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return resolve('');
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve(dest));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function start() {
  console.log('Iniciando Robô Extrator Avançado - Pellegrino...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Fazendo Login...');
  await page.goto(LOGIN_URL);
  
  // Adicionando um pequeno delay para a página renderizar
  await page.waitForTimeout(5000);
  
  // Salvar screenshot e HTML para depuração
  await page.screenshot({ path: 'debug_login.png' });
  const loginHtml = await page.content();
  fs.writeFileSync('debug_login.html', loginHtml, 'utf8');
  console.log('Screenshot salvo em debug_login.png e HTML em debug_login.html');

  // Preencher email e senha e clicar em logar
  // Tentar encontrar qualquer input de texto que seja o email/username
  const userInputs = await page.$$('input[type="text"], input[type="email"], input[name="UserName"], input[name="Email"]');
  if (userInputs.length > 0) {
      await userInputs[0].fill(EMAIL);
  }
  const passInputs = await page.$$('input[type="password"]');
  if (passInputs.length > 0) {
      await passInputs[0].fill(PASSWORD);
  }
  
  // O site deles pode ter um botão de submit diferente, então buscamos por texto
  const btns = await page.$$('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
  if (btns.length > 0) {
      await btns[0].click();
  } else {
      console.log('Botão de login não encontrado');
  }
  
  // Aguardar carregamento da home
  await page.waitForTimeout(5000); 
  console.log('Login Concluído!');

  // Exemplo de como vamos estruturar o Crawler (a lógica detalhada vamos construir a seguir):
  // 1. Pegar links das categorias principais
  // 2. Para cada categoria, navegar nas páginas e pegar links de produtos
  // 3. Entrar em cada link de produto e extrair os detalhes profundos
  
  // Interceptar respostas da API
  page.on('response', async (response) => {
      if (response.url().includes('api') || response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
          try {
              const body = await response.json();
              if (body) {
                  fs.appendFileSync('api_logs.txt', `\n\n=== URL: ${response.url()} ===\n` + JSON.stringify(body).substring(0, 5000), 'utf8');
              }
          } catch (e) {}
      }
  });

  console.log('Buscando por filtro FCA1559 para teste piloto...');
  fs.writeFileSync('api_logs.txt', '', 'utf8'); // Limpar logs antigos
  await page.goto('https://compreonline.pellegrino.com.br/catalogo/ais?words=FCA1559', { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000); // Aguarda a API responder

  console.log('Dados da API interceptados e salvos em api_logs.txt!');

  // Fechar no fim do teste inicial
  console.log('Encerrando navegador do teste inicial.');
  await browser.close();
  await prisma.$disconnect();
}

start().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
