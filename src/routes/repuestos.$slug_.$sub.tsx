import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { marcaPorSlug, categoriaPorSlug } from "@/lib/seo-paginas";
import { getPaginaRepuestosFn } from "@/lib/repuestos";
import { PaginaRepuestos, tituloRepuestos, descricaoRepuestos, ldRepuestos } from "@/components/PaginaRepuestos";

// /repuestos/john-deere/filtros: categoria dentro da marca ("Filtros para John Deere en Uruguay")
export const Route = createFileRoute("/repuestos/$slug_/$sub")({
  loader: async ({ params }) => {
    const marca = marcaPorSlug(params.slug);
    const categoria = categoriaPorSlug(params.sub);
    if (!marca || !categoria) throw notFound();
    const dados = await getPaginaRepuestosFn({ data: { marca: marca.marca, categoria: categoria.categoria } });
    return { marca, categoria, dados };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const { marca, categoria, dados } = loaderData;
    const url = `${SITE_URL}/repuestos/${params.slug}/${params.sub}`;
    const titulo = `${tituloRepuestos(marca, categoria)} | AGRO PARTS`;
    const desc = descricaoRepuestos(marca, categoria, dados.total);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        // Combinação sem peças não deve ir para o índice
        ...(dados.total ? [] : [{ name: "robots", content: "noindex, follow" }]),
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldRepuestos(url, marca, categoria, dados).map((ld) => ({ type: "application/ld+json", children: JSON.stringify(ld) })),
    };
  },
  component: () => {
    const { marca, categoria, dados } = Route.useLoaderData();
    return <PaginaRepuestos marca={marca} categoria={categoria} dados={dados} />;
  },
});
