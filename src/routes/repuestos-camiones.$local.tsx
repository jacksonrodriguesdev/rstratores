import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { localCamionPorSlug, tituloCamion, descripcionCamion } from "@/lib/seo-camiones";
import { infoCamionesFn } from "@/lib/caminhoes";
import { PaginaCamionLocal, ldCamionLocal } from "@/components/PaginaCamionLocal";

// /repuestos-camiones/<ciudad>: SEO da linha de caminhões por cidade do Uruguai (espanhol).
// Só existe quando a linha de caminhões está ligada no admin.
export const Route = createFileRoute("/repuestos-camiones/$local")({
  loader: async ({ params }) => {
    const local = localCamionPorSlug(params.local);
    if (!local) throw notFound();
    const info = await infoCamionesFn();
    if (!info.ativa) throw notFound();
    return { local, total: info.total };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const { local, total } = loaderData;
    const url = `${SITE_URL}/repuestos-camiones/${params.local}`;
    const titulo = `${tituloCamion(local)} | AGRO PARTS`;
    const desc = descripcionCamion(local, total);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldCamionLocal(local, url, total).map((ld) => ({
        type: "application/ld+json",
        children: JSON.stringify(ld),
      })),
    };
  },
  component: Pagina,
});

function Pagina() {
  const { local, total } = Route.useLoaderData();
  return <PaginaCamionLocal local={local} total={total} />;
}
