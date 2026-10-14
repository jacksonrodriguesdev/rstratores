import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { comPrefixo, linksIdioma, tr, type Idioma } from "@/lib/idioma";
import { getPaginaLocalFn } from "@/lib/repuestos";
import { PaginaZonas } from "@/components/PaginaLocal";

// /repuestos-agricolas: todas as zonas de envio (links para as páginas por local)
export const Route = createFileRoute("/repuestos-agricolas/")({
  loader: async () => ({ total: (await getPaginaLocalFn({ data: {} })).total }),
  head: ({ match, loaderData }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const n = (loaderData?.total ?? 0).toLocaleString(idioma === "pt" ? "pt-BR" : "es-UY");
    const titulo = tr(
      idioma,
      "Repuestos agrícolas en todo Uruguay y Rio Grande do Sul | AGRO PARTS",
      "Peças agrícolas em todo o Uruguai e Rio Grande do Sul | AGRO PARTS",
    );
    const desc = tr(
      idioma,
      `Más de ${n} repuestos para tractores y cosechadoras con envío a los 19 departamentos de Uruguay y a todo Rio Grande do Sul. Elegí tu zona.`,
      `Mais de ${n} peças para tratores e colheitadeiras com envio para os 19 departamentos do Uruguai e todo o Rio Grande do Sul. Escolha sua região.`,
    );
    return {
      links: linksIdioma("/repuestos-agricolas", idioma),
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: `${SITE_URL}${comPrefixo("/repuestos-agricolas", idioma)}` },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: () => <PaginaZonas total={Route.useLoaderData().total} />,
});
