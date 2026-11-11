import { createFileRoute } from "@tanstack/react-router";

// Aceite do convite do despachante: cria a senha e já entra logado. 10 tentativas por hora por IP.
const porIp = new Map<string, number[]>();

export const Route = createFileRoute("/api/despachante/convite")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { ipDaRequisicao } = await import("@/lib/rastreio.server");
        const ip = ipDaRequisicao(request) ?? "local";
        const agora = Date.now();
        const l = (porIp.get(ip) ?? []).filter((x) => agora - x < 60 * 60_000);
        if (l.length >= 10)
          return Response.json({ error: "Muitas tentativas. Tente em uma hora." }, { status: 429 });
        porIp.set(ip, [...l, agora]);
        try {
          const body = await request.json();
          if (String(body?.senha ?? "") !== String(body?.confirmar ?? ""))
            return Response.json({ error: "As senhas não conferem." }, { status: 400 });
          const { aceitarConvite } = await import("@/lib/despachante/despachante.server");
          const user = await aceitarConvite(String(body?.token ?? ""), String(body?.senha ?? ""));
          const { abrirSessao } = await import("@/lib/auth.server");
          const cookie = await abrirSessao(request, user);
          return Response.json(
            { ok: true, destino: "/despachante" },
            { headers: { "Set-Cookie": cookie } },
          );
        } catch (e: any) {
          return Response.json(
            { error: e?.message || "Não foi possível criar a senha." },
            { status: 400 },
          );
        }
      },
    },
  },
});
