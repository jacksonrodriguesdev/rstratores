import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";

// Diagnóstico do servidor (público, sem segredos): diz só se cada configuração existe e se o
// banco responde. Nunca mostra valores. Útil quando as variáveis do hPanel somem ou mudam.
const tem = (k: string) => !!process.env[k]?.trim();
export const Route = createFileRoute("/api/public/saude")({
  server: {
    handlers: {
      GET: async () => {
        let banco: string;
        try {
          const { prisma } = await import("@/lib/prisma");
          await prisma.$queryRawUnsafe("SELECT 1");
          banco = "ok";
        } catch (e: any) {
          const m = String(e?.message ?? e);
          banco = /DATABASE_URL/.test(m)
            ? "faltando DATABASE_URL"
            : /Access denied/i.test(m)
              ? "usuário ou senha do banco errados"
              : /Unknown database/i.test(m)
                ? "nome do banco errado"
                : /Can't reach|ECONNREFUSED|ETIMEDOUT/i.test(m)
                  ? "servidor do banco não responde"
                  : "erro ao conectar";
        }
        const jwt = process.env.JWT_SECRET?.trim() ?? "";
        const gsec = process.env.GOOGLE_CLIENT_SECRET ?? "";
        const gid = process.env.GOOGLE_CLIENT_ID ?? "";
        const { pastaUploads } = await import("@/lib/uploads.server");
        const pasta = pastaUploads();
        const sub = (d: string) => fs.existsSync(`${pasta}/${d}`);
        const ok = (b: boolean, falta = "faltando") => (b ? "ok" : falta);
        const r = {
          banco,
          JWT_SECRET: !jwt ? "faltando" : jwt.length < 32 ? "curto demais (mínimo 32)" : "ok",
          login_google: !gid || !gsec
            ? "faltando GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET"
            : gid !== gid.trim() || gsec !== gsec.trim()
              ? "tem espaço antes ou depois do valor"
              : !gid.trim().endsWith(".apps.googleusercontent.com")
                ? "GOOGLE_CLIENT_ID não parece um ID de cliente"
                : !gsec.trim().startsWith("GOCSPX-")
                  ? "GOOGLE_CLIENT_SECRET não começa com GOCSPX-"
                  : "ok",
          UPLOADS_DIR: !tem("UPLOADS_DIR")
            ? "faltando (usando a pasta do app: fotos e banners somem)"
            : !fs.existsSync(pasta)
              ? "a pasta não existe"
              : sub("site") || sub("produtos") || sub("agrotrator")
                ? "ok"
                : "a pasta existe mas está vazia",
          NODE_ENV: process.env.NODE_ENV === "production" ? "ok" : "não é production",
          VITE_SITE_URL: ok(tem("VITE_SITE_URL")),
          emails_resend: ok(tem("RESEND_API_KEY") && tem("EMAIL_REMETENTE")),
          instagram: ok(tem("INSTAGRAM_APP_ID") && tem("INSTAGRAM_APP_SECRET")),
          facebook_meta: ok(tem("META_APP_ID") && tem("META_APP_SECRET")),
          avaliacoes_google: ok(tem("GOOGLE_PLACES_API_KEY") && tem("GOOGLE_PLACE_ID"), "faltando (opcional)"),
        };
        return new Response(JSON.stringify(r, null, 2), {
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
