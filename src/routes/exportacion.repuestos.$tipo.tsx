import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { tipoPorSlug, tituloTipo, descripcionTipo } from "@/lib/seo-exportacion";
import { getPaginaTipoFn } from "@/lib/exportacion";
import { PaginaExportacionTipo, ldExportTipo } from "@/components/PaginaExportacion";

// /exportacion/repuestos/<tipo> — pilar por tipo de peça (ex: "filtros para exportación").
export const Route = createFileRoute("/exportacion/repuestos/$tipo")({
  loader: async ({ params }) => {
    const tipo = tipoPorSlug(params.tipo);
    if (!tipo) throw notFound();
    const dados = await getPaginaTipoFn({ data: { tipo: tipo.slug } });
    return { tipo, dados };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const { tipo, dados } = loaderData;
    const url = `${SITE_URL}/exportacion/repuestos/${params.tipo}`;
    const titulo = `${tituloTipo(tipo)} | AGRO PARTS`;
    const desc = descripcionTipo(tipo, dados.total);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldExportTipo(tipo, url, dados.total).map((ld) => ({
        type: "application/ld+json",
        children: JSON.stringify(ld),
      })),
    };
  },
  component: Pagina,
});

function Pagina() {
  const { tipo, dados } = Route.useLoaderData();
  return <PaginaExportacionTipo tipo={tipo} dados={dados} />;
}
