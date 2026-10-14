import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { comPrefixo, linksIdioma, type Idioma } from "@/lib/idioma";
import { marcaPorSlug, categoriaPorSlug } from "@/lib/seo-paginas";
import { getPaginaRepuestosFn } from "@/lib/repuestos";
import {
  PaginaRepuestos,
  tituloRepuestos,
  descricaoRepuestos,
  ldRepuestos,
} from "@/components/PaginaRepuestos";

// /repuestos/john-deere/filtros: categoria dentro da marca ("Filtros para John Deere en Uruguay")
export const Route = createFileRoute("/repuestos/$slug_/$sub")({
  loader: async ({ params }) => {
    const marca = marcaPorSlug(params.slug);
    const categoria = categoriaPorSlug(params.sub);
    if (!marca || !categoria) throw notFound();
    const dados = await getPaginaRepuestosFn({
      data: { marca: marca.marca, categoria: categoria.categoria },
    });
    return { marca, categoria, dados };
  },
  head: ({ loaderData, params, match }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    if (!loaderData) return {};
    const { marca, categoria, dados } = loaderData;
    const caminho = `/repuestos/${params.slug}/${params.sub}`;
    const url = `${SITE_URL}${comPrefixo(caminho, idioma)}`;
    const titulo = `${tituloRepuestos(marca, categoria, idioma)} | AGRO PARTS`;
    const desc = descricaoRepuestos(marca, categoria, dados.total, idioma);
    return {
      links: linksIdioma(caminho, idioma),
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        // Combinação sem peças não deve ir para o índice
        ...(dados.total ? [] : [{ name: "robots", content: "noindex, follow" }]),
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldRepuestos(url, marca, categoria, dados, idioma).map((ld) => ({
        type: "application/ld+json",
        children: JSON.stringify(ld),
      })),
    };
  },
  component: () => {
    const { marca, categoria, dados } = Route.useLoaderData();
    return <PaginaRepuestos marca={marca} categoria={categoria} dados={dados} />;
  },
});
