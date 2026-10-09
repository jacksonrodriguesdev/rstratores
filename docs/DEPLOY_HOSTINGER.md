# Deploy na Hostinger (plano com Node.js)

O site é um app **Node.js** (não PHP). O plano suporta Node 18/20/22/24 e deploy pelo GitHub.
Use **Node 22**.

> **Atenção:** o plano vence em **11/10/2026**. Renove antes de publicar, ou o site sai do ar.

## O que vai para o servidor

| Item | Origem | Tamanho |
|---|---|---|
| Código | repositório `jacksonrodriguesdev/rstratores` (branch `main`) | — |
| Banco | `dados/deploy/rstratores_hostinger.sql.gz` (gerado no PC) | 2,3 MB (40 MB descompactado) |
| Imagens | `dados/deploy/uploads.zip` (banners, categorias, cotações) | 13,5 MB |

O banco leva a estrutura de todas as tabelas, mas os dados só da linha agrícola e do site.
A linha automotiva (desligada) tem ~600 MB de dados e 9,4 GB de imagens e fica só no PC.

Para gerar de novo os arquivos de `dados/deploy/` (com o MySQL do Laragon ligado):

```bash
node scripts/deploy/exportar_banco.cjs
```

## 1. Banco de dados

1. hPanel → **Bancos de dados → MySQL**: crie um banco e um usuário. Anote nome do banco,
   usuário e senha (o host costuma ser `localhost`).
2. **phpMyAdmin** desse banco → **Importar** → envie `rstratores_hostinger.sql.gz`.
3. Confira: a tabela `agricolas` deve ter 39.014 linhas.

## 2. Imagens

1. **Gerenciador de arquivos**: crie uma pasta **fora** da pasta do app, por exemplo
   `/home/SEU_USUARIO/rstratores-uploads`. (Fora do app para não ser apagada a cada deploy.)
2. Envie `uploads.zip` para essa pasta e extraia. Devem ficar as subpastas `site`,
   `categorias`, `quotes` e `produtos`.

## 3. App Node.js

hPanel → **Websites** → app Node.js → importar do **GitHub** (`rstratores`, branch `main`).

| Campo | Valor |
|---|---|
| Versão do Node | 22.x |
| Instalação | `npm install` (gera o Prisma automaticamente no `postinstall`) |
| Build | `npm run build` |
| Início | `npm start` (ou arquivo de entrada `.output/server/index.mjs`) |

### Variáveis de ambiente

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `mysql://USUARIO:SENHA@localhost:3306/NOME_DO_BANCO` |
| `JWT_SECRET` | texto aleatório com 64+ caracteres, **diferente** do `.env` local |
| `UPLOADS_DIR` | `/home/SEU_USUARIO/rstratores-uploads` |
| `NODE_ENV` | `production` |
| `BRAVE_SEARCH_API_KEY` | opcional (busca de fotos) |
| `GOOGLE_PLACES_API_KEY` / `GOOGLE_PLACE_ID` | opcionais (avaliações do Google) |
| `VITE_SITE_URL` | endereço público do site com https (ex.: `https://www.seudominio.com`). Usado no sitemap, robots, links do WhatsApp e Google. Entra no build |
| `GEOIP_DIR` | opcional: pasta da base de localização por IP (~130 MB, baixada e atualizada pelo servidor). Padrão: `geoip-agroparts` ao lado da pasta de uploads |
| `VITE_GA4_ID` | opcional: Google Analytics 4 (`G-XXXXXXX`). Entra no build: faça novo deploy depois de mudar |
| `VITE_META_PIXEL_ID` | opcional: Meta Pixel (Facebook/Instagram), só números. Também entra no build |

A porta (`PORT`) é definida pela Hostinger; o servidor usa a que receber.

Para gerar um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Se a senha do banco tiver caracteres especiais (`@`, `#`, `/`, `:`), codifique-os no
`DATABASE_URL` (ex.: `@` vira `%40`).

## 4. Conferir depois de publicar

- Página inicial carrega com banners e produtos.
- `/loja` lista peças; busca por código (ex.: `AL81843`) encontra a peça.
- `/admin` pede login; entre com uma conta de papel `ADMIN`.
- Envie um banner de teste no admin: ele deve aparecer na home na hora (e a imagem
  ficar em `UPLOADS_DIR`).
- `/sitemap.xml` lista as peças. Cadastre o site no Google Search Console
  (https://search.google.com/search-console) e envie `https://rsautopecas.com/sitemap.xml`.
- Admin > Interesse dos clientes mostra cliques no WhatsApp e buscas (inclusive as sem resultado).

## Atualizações

Envie as mudanças para o `main` do GitHub e faça um novo deploy no hPanel (ou ative o
deploy automático). Mudanças no `prisma/schema.prisma` também precisam ser aplicadas no
banco da Hostinger (`npx prisma db push` com o `DATABASE_URL` de produção).
