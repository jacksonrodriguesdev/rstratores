# RS Trator Peças (rstratores)

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

## Pontos importantes

- Só a linha agrícola está ativa: `AUTOMOTIVA_ATIVA` em `src/lib/linhas.ts`.
- Uploads (banners, fotos) ficam em `uploads/` (fora do git e fora de `public/`, para o
  build não copiá-los) e são servidos pela rota `src/routes/uploads.$.ts`. Em produção,
  use `UPLOADS_DIR` para apontar uma pasta persistente. Ver `src/lib/uploads.server.ts`.
- Scripts de manutenção do catálogo em `scripts/catalogo/` (simulação por padrão,
  `--aplicar` grava com backup em `dados/`, `--restaurar` desfaz).
- Mudança no `prisma/schema.prisma`: pare o servidor de desenvolvimento antes do
  `npx prisma db push` (no Windows o arquivo do Prisma fica travado).
