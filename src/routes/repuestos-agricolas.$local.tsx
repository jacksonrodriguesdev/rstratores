import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { comPrefixo, linksIdioma, type Idioma } from "@/lib/idioma";
import { localPorSlug, tituloLocal, descricaoLocal } from "@/lib/locais-seo";
import { getPaginaLocalFn } from "@/lib/repuestos";
import { PaginaLocal, ldLocal } from "@/components/PaginaLocal";

// /repuestos-agricolas/rocha, /pt/repuestos-agricolas/pelotas... (src/lib/locais-seo.ts)
export const Route = createFileRoute("/repuestos-agricolas/$local")({
  loader: async ({ params }) => {
    const local = localPorSlug(params.local);
    if (!local) throw notFound();
    const dados = await getPaginaLocalFn({ data: { foco: local.foco } });
    return { local, dados };
  },
  head: ({ loaderData, params, match }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    if (!loaderData) return {};
    const { local, dados } = loaderData;
    const caminho = `/repuestos-agricolas/${params.local}`;
    const url = `${SITE_URL}${comPrefixo(caminho, idioma)}`;
    const titulo = `${tituloLocal(local, idioma)} | AGRO PARTS`;
    const desc = descricaoLocal(local, idioma, dados.total);
    return {
      links: linksIdioma(caminho, idioma),
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldLocal(local, url, dados, idioma).map((ld) => ({ type: "application/ld+json", children: JSON.stringify(ld) })),
    };
  },
  component: () => {
    const { local, dados } = Route.useLoaderData();
    return <PaginaLocal local={local} dados={dados} />;
  },
});
