import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { comPrefixo, linksIdioma, tr, type Idioma } from "@/lib/idioma";
import { getPaginaLocalFn } from "@/lib/repuestos";
import { PaginaZonas } from "@/components/PaginaLocal";
import { guiaZonas, ldPerguntas } from "@/lib/seo-guias";

// /repuestos-agricolas: todas as zonas de envio (links para as páginas por local)
export const Route = createFileRoute("/repuestos-agricolas/")({
  loader: async () => ({ total: (await getPaginaLocalFn({ data: {} })).total }),
  head: ({ match, loaderData }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const n = (loaderData?.total ?? 0).toLocaleString(idioma === "pt" ? "pt-BR" : "es-UY");
    const titulo = tr(
      idioma,
      "Repuestos agrícolas en Uruguay | Envío a los 19 departamentos | AGRO PARTS",
      "Peças agrícolas no RS, SC e PR | AGRO PARTS",
    );
    const desc = tr(
      idioma,
      `Repuestos agrícolas en Uruguay: más de ${n} repuestos para tractores y cosechadoras Massey Ferguson, John Deere, Valtra, New Holland y más, con envío por DAC a los 19 departamentos. Cotizá por WhatsApp.`,
      `Mais de ${n} peças para tratores e colheitadeiras com envio para RS, SC e PR. Escolha sua região.`,
    );
    return {
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(ldPerguntas(guiaZonas(idioma).perguntas)),
        },
      ],
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
  component: PaginaDasZonas,
});

function PaginaDasZonas() {
  return <PaginaZonas total={Route.useLoaderData().total} />;
}
