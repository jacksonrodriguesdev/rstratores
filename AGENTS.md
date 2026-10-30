# AGRO PARTS (agropartsuy.com)

Loja de peças agrícolas: TanStack Start (React 19, SSR) + Prisma + MySQL.
Projeto independente (saiu da Lovable); repositório: github.com/jacksonrodriguesdev/rstratores.

## Rodando

```bash
npm install
npx prisma generate
npm run dev        # http://localhost:8080
npm run build      # gera o servidor Node em .output/
npm start          # roda o build (node .output/server/index.mjs)
```

Variáveis em `.env` (modelo em `.env.example`). `.env` não vai para o git.
Deploy na Hostinger: ver `docs/DEPLOY_HOSTINGER.md`.

## Pontos importantes

- Só a linha agrícola está ativa: `AUTOMOTIVA_ATIVA` em `src/lib/linhas.ts`.
- Uploads (banners, fotos) ficam em `uploads/` (fora do git e fora de `public/`, para o
  build não copiá-los) e são servidos pela rota `src/routes/uploads.$.ts`. Em produção,
  use `UPLOADS_DIR` para apontar uma pasta persistente. Ver `src/lib/uploads.server.ts`.
- Scripts de manutenção do catálogo em `scripts/catalogo/` (simulação por padrão,
  `--aplicar` grava com backup em `dados/`, `--restaurar` desfaz).
- Mudança no `prisma/schema.prisma`: pare o servidor de desenvolvimento antes do
  `npx prisma db push` (no Windows o arquivo do Prisma fica travado).
- Formatação: Prettier (`.prettierrc`). Antes de enviar: `npx prettier --write <arquivos>` e
  `npm run lint` (zero erros; a verificação do GitHub bloqueia se falhar). O commit da formatação
  geral está em `.git-blame-ignore-revs` (`git config blame.ignoreRevsFile .git-blame-ignore-revs`).
- Verificação automática (`.github/workflows/verificar.yml`): TypeScript, lint, banco MySQL de teste
  com `scripts/ci/semente.cjs`, `scripts/ci/testar-resumo.ts`, build e `scripts/ci/fumaca.cjs`
  (páginas principais). Passou → o código vai para o ramo `producao`, que a Hostinger publica.
  Página nova importante? Acrescente em `PAGINAS` no `fumaca.cjs`.
- Eventos (WhatsApp, busca, carrinho, pop-up, clique, rolagem) ficam em `site_eventos`; as
  análises somam resumos diários (`analise_dia`, `src/lib/resumo-diario.server.ts`). Mudou o
  formato do resumo? Suba `VERSAO` lá: os dias são recalculados sozinhos.
