import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { comPrefixo, type Idioma } from "@/lib/idioma";
import { localPorSlug, idiomaDoLocal, tituloLocal, descricaoLocal } from "@/lib/locais-seo";
import { getPaginaLocalFn } from "@/lib/repuestos";
import { PaginaLocal, ldLocal } from "@/components/PaginaLocal";

// /repuestos-agricolas/rocha (Uruguai, espanhol), /pt/repuestos-agricolas/pelotas (Sul do Brasil,
// português). Cada local só existe na língua do seu país: na outra, leva para a certa (301).
export const Route = createFileRoute("/repuestos-agricolas/$local")({
  loader: async ({ params, context }) => {
    const local = localPorSlug(params.local);
    if (!local) throw notFound();
    const idioma: Idioma = ((context as any)?.idioma ?? "es") as Idioma;
    const certo = idiomaDoLocal(local);
    if (certo !== idioma)
      throw redirect({
        href: comPrefixo(`/repuestos-agricolas/${local.slug}`, certo),
        statusCode: 301,
      });
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
      // Página de um idioma só (o do país do local): canônico, sem versão na outra língua
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldLocal(local, url, dados, idioma).map((ld) => ({
        type: "application/ld+json",
        children: JSON.stringify(ld),
      })),
    };
  },
  component: PaginaDoLocal,
});

function PaginaDoLocal() {
  const { local, dados } = Route.useLoaderData();
  return <PaginaLocal local={local} dados={dados} />;
}
