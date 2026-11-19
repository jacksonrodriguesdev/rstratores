import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { maquinaPorSlug, tituloExport, descripcionExport } from "@/lib/seo-exportacion";
import { getPaginaExportFn } from "@/lib/exportacion";
import { PaginaExportacionMaquina, ldExportMaquina } from "@/components/PaginaExportacion";

// /exportacion/<maquina> — pilar por tipo de máquina (lista todas as cidades do Uruguai).
export const Route = createFileRoute("/exportacion/$maquina")({
  loader: async ({ params }) => {
    const maquina = maquinaPorSlug(params.maquina);
    if (!maquina) throw notFound();
    const dados = await getPaginaExportFn({ data: { maquina: maquina.slug } });
    return { maquina, dados };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const { maquina, dados } = loaderData;
    const url = `${SITE_URL}/exportacion/${params.maquina}`;
    const titulo = `${tituloExport(maquina)} | AGRO PARTS`;
    const desc = descripcionExport(maquina, dados.total);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldExportMaquina(maquina, url, dados.total).map((ld) => ({
        type: "application/ld+json",
        children: JSON.stringify(ld),
      })),
    };
  },
  component: Pagina,
});

function Pagina() {
  const { maquina, dados } = Route.useLoaderData();
  return <PaginaExportacionMaquina maquina={maquina} dados={dados} />;
}
