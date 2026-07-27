import { createFileRoute } from "@tanstack/react-router";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createSessionToken, AUTH_COOKIE } from "@/lib/auth.server";

const prisma = new PrismaClient();

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { nome_completo, email, senha, telefone, endereco, cidade, ponto_referencia, numero_casa, cep, pais } = body;
          
          if (!nome_completo || !email || !senha) {
            return new Response(JSON.stringify({ error: "Preencha os campos obrigatórios." }), { status: 400 });
          }

          const existing = await prisma.users.findUnique({ where: { email } });
          if (existing) {
            return new Response(JSON.stringify({ error: "E-mail já cadastrado." }), { status: 400 });
          }

          const senha_hash = await bcrypt.hash(senha, 10);

          const user = await prisma.users.create({
            data: {
              nome_completo,
              email,
              senha_hash,
              telefone,
              endereco,
              cidade,
              ponto_referencia,
              numero_casa,
              cep,
              pais
            }
          });

          const token = await createSessionToken({
            id: user.id,
            nome: user.nome_completo,
            email: user.email,
            role: user.role
          });

          return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: {
              "Set-Cookie": `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
            }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
    }
  }
});
