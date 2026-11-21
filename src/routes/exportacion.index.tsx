import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { totalExportFn, destaquesExportFn } from "@/lib/exportacion";
import { PaginaExportacionHome } from "@/components/PaginaExportacion";

// /exportacion — página pilar geral do projeto de exportação ao Uruguai (espanhol).
export const Route = createFileRoute("/exportacion/")({
  loader: async () => ({
    total: await totalExportFn().catch(() => 0),
    productos: await destaquesExportFn().catch(() => []),
  }),
  head: () => {
    const url = `${SITE_URL}/exportacion`;
    const titulo = "Exportación de repuestos a Uruguay | AGRO PARTS";
    const desc =
      "Importá repuestos para tractores, cosechadoras, excavadoras, camiones e inyección diesel directo desde Brasil. Origen Mercosur (0% de arancel) y despacho a todo Uruguay.";
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: Pagina,
});

function Pagina() {
  const { total, productos } = Route.useLoaderData();
  return <PaginaExportacionHome total={total} productos={productos} />;
}
