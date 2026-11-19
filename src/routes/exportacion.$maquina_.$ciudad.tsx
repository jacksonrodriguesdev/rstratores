import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import {
  maquinaPorSlug,
  ciudadPorSlug,
  tituloExport,
  descripcionExport,
} from "@/lib/seo-exportacion";
import { getPaginaExportFn } from "@/lib/exportacion";
import { PaginaExportacionCiudad, ldExportCiudad } from "@/components/PaginaExportacion";

// /exportacion/<maquina>/<ciudad> — a página que rankeia ("repuestos para excavadoras en Salto").
export const Route = createFileRoute("/exportacion/$maquina_/$ciudad")({
  loader: async ({ params }) => {
    const maquina = maquinaPorSlug(params.maquina);
    const ciudad = ciudadPorSlug(params.ciudad);
    if (!maquina || !ciudad) throw notFound();
    const dados = await getPaginaExportFn({ data: { maquina: maquina.slug } });
    return { maquina, ciudad, dados };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const { maquina, ciudad, dados } = loaderData;
    const url = `${SITE_URL}/exportacion/${params.maquina}/${params.ciudad}`;
    const titulo = `${tituloExport(maquina, ciudad)} | AGRO PARTS`;
    const desc = descripcionExport(maquina, dados.total, ciudad);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldExportCiudad(maquina, ciudad, url, dados).map((ld) => ({
        type: "application/ld+json",
        children: JSON.stringify(ld),
      })),
    };
  },
  component: Pagina,
});

function Pagina() {
  const { maquina, ciudad, dados } = Route.useLoaderData();
  return <PaginaExportacionCiudad maquina={maquina} ciudad={ciudad} dados={dados} />;
}
