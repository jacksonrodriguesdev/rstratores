import { createFileRoute } from "@tanstack/react-router";

// AGRO PARTS Mayorista (página /empresas): confere uma lista colada contra o catálogo, sem preços.
// Até 60 linhas; 20 conferências a cada 10 minutos por IP.
const porIp = new Map<string, number[]>();

export const Route = createFileRoute("/api/public/empresas-lista")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { ipDaRequisicao } = await import("@/lib/rastreio.server");
        const ip = ipDaRequisicao(request) ?? "local";
        const agora = Date.now();
        const l = (porIp.get(ip) ?? []).filter((x) => agora - x < 10 * 60_000);
        if (l.length >= 20)
          return Response.json(
            { error: "Muchas consultas seguidas. Probá en unos minutos." },
            { status: 429 },
          );
        porIp.set(ip, [...l, agora]);
        if (porIp.size > 5000) porIp.clear();
        const corpo = await request.json().catch(() => ({}));
        const texto = String(corpo?.texto ?? "").slice(0, 8000);
        const { lerLista } = await import("@/lib/b2b-comum");
        const linhas = lerLista(texto, 60);
        if (!linhas.length)
          return Response.json({ error: "Pegá al menos un código." }, { status: 400 });
        const { conferirListaPublica } = await import("@/lib/b2b.server");
        return Response.json(await conferirListaPublica(linhas));
      },
    },
  },
});
