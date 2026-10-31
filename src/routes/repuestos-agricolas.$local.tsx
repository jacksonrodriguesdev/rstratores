import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { comPrefixo, type Idioma } from "@/lib/idioma";
import { idiomaDoLocal, tituloLocal, descricaoLocal } from "@/lib/locais-seo";
import { getLocalFn, getPaginaLocalFn } from "@/lib/repuestos";
import { PaginaLocal, ldLocal } from "@/components/PaginaLocal";

// /repuestos-agricolas/rocha (Uruguai, espanhol), /pt/pecas-agricolas/pelotas (Sul do Brasil,
// português). Cada local só existe na língua do seu país: na outra, leva para a certa (301).
// Além dos locais escritos à mão (src/lib/locais-seo.ts), as cidades do RS, SC e PR com mais
// lavoura vêm dos dados do IBGE (src/lib/municipios-sul.server.ts), resolvidas no servidor.
export const Route = createFileRoute("/repuestos-agricolas/$local")({
  loader: async ({ params, context }) => {
    const achado = await getLocalFn({ data: { slug: params.local } });
    if (!achado) throw notFound();
    const { local, extras } = achado;
    const idioma: Idioma = ((context as any)?.idioma ?? "es") as Idioma;
    const certo = idiomaDoLocal(local);
    if (certo !== idioma)
      throw redirect({
        href: comPrefixo(`/repuestos-agricolas/${local.slug}`, certo),
        statusCode: 301,
      });
    const dados = await getPaginaLocalFn({ data: { foco: local.foco } });
    return { local, dados, extras };
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
  const { local, dados, extras } = Route.useLoaderData();
  return <PaginaLocal local={local} dados={dados} extras={extras} />;
}
