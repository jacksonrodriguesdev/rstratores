import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Configuração própria (sem o preset da Lovable).
// O build gera um servidor Node.js em .output/ (`npm run build` e `npm start`):
// o sistema usa MySQL via Prisma e grava uploads em disco, o que exige Node
// (o preset da Lovable empacotava para Cloudflare por padrão).
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Entrada do servidor em src/server.ts (wrapper de erros do SSR)
      server: { entry: "server" },
      serverFns: { disableCsrfMiddlewareWarning: true },
      // Código de servidor não pode ir para o navegador
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
    viteReact(),
  ],
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    // Uploads são servidos pela rota /uploads/$; não precisam recarregar a página
    watch: { ignored: ["**/uploads/**"] },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "lucide-react",
      "@tanstack/react-router",
      "@tanstack/react-query",
      "recharts",
      "embla-carousel-react",
      // CommonJS usados no navegador (CSV e ZIP do admin): precisam ser pré-empacotados
      "papaparse",
      "jszip",
    ],
    exclude: ["@prisma/client", "prisma", "bcryptjs", "jose"],
  },
}));
