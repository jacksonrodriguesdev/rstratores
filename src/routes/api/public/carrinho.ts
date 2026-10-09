import { createFileRoute } from "@tanstack/react-router";

// Recebe o carrinho (lista de cotação) do navegador a cada mudança, para o painel de vendas
// (Admin → Carrinhos). Cada visitante tem no máximo um carrinho ABERTO; quando ele pede preço
// pelo WhatsApp, o carrinho vira ENVIADO e a próxima lista abre outro.
const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

function limparItens(v: unknown) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 100).flatMap((i: any) => {
    const sku = texto(i?.sku, 64);
    const name = texto(i?.name, 300);
    const quantity = Math.min(Math.max(Math.round(Number(i?.quantity) || 0), 0), 9999);
    if (!sku || !name || !quantity) return [];
    return [{ sku, name, quantity, codigo: texto(i?.codigo, 80), nameEs: texto(i?.nameEs, 300), image: texto(i?.image, 500) }];
  });
}

export const Route = createFileRoute("/api/public/carrinho")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = () => Response.json({ ok: true });
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, any>;
          const vid = texto(body.vid, 64);
          if (!vid) return ok();
          const { ehRobo } = await import("@/lib/rastreio.server");
          if (ehRobo(request.headers.get("user-agent") ?? "")) return ok();
          const { getSessionFromRequest } = await import("@/lib/auth.server");
          const sessao = await getSessionFromRequest(request).catch(() => null);
          if (sessao?.role === "ADMIN") return ok(); // testes do admin não poluem o painel

          const { prisma } = await import("@/lib/prisma");
          const itens = limparItens(body.itens);
          const enviado = body.enviado === true;
          const aberto = await prisma.carrinhos.findFirst({
            where: { visitante_id: vid, status: "ABERTO" },
            orderBy: { id: "desc" },
          });

          if (!itens.length) {
            // Esvaziou a lista sem pedir preço: some do painel se ninguém mexeu nele ainda
            if (aberto && aberto.etapa === "NOVO" && !aberto.contatos && !aberto.nota) {
              await prisma.carrinhos.delete({ where: { id: aberto.id } });
            }
            return ok();
          }

          const dados = {
            itens: JSON.stringify(itens),
            qtd_itens: itens.reduce((s, i) => s + i.quantity, 0),
            ...(sessao && { user_id: sessao.id }),
            ...(enviado && { status: "ENVIADO", enviado_em: new Date() }),
          };
          if (aberto) await prisma.carrinhos.update({ where: { id: aberto.id }, data: dados });
          else await prisma.carrinhos.create({ data: { visitante_id: vid, ...dados } });
          return ok();
        } catch (e) {
          console.error("carrinho:", e);
          return ok();
        }
      },
    },
  },
});
