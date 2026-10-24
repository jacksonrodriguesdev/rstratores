import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, MessageCircle } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { PerguntasBloco } from "@/components/GuiaSeo";
import { guiaPorSlug } from "@/lib/guias";
import { comPrefixo, linksIdioma, useT, type Idioma } from "@/lib/idioma";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { ldPerguntas } from "@/lib/seo-guias";

// /guias/<slug> (espanhol) e /pt/guias/<slug> (português): guia técnico com links para as peças
export const Route = createFileRoute("/guias/$slug")({
  loader: ({ params }) => {
    const guia = guiaPorSlug(params.slug);
    if (!guia) throw notFound();
    return { slug: guia.slug };
  },
  head: ({ params, match }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const g = guiaPorSlug(params.slug);
    if (!g) return {};
    const caminho = `/guias/${g.slug}`;
    const url = `${SITE_URL}${comPrefixo(caminho, idioma)}`;
    const titulo = `${g.titulo[idioma]} | AGRO PARTS`;
    const desc = g.resumo[idioma];
    return {
      links: linksIdioma(caminho, idioma),
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.titulo[idioma],
            description: desc,
            inLanguage: idioma === "pt" ? "pt-BR" : "es-UY",
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "AGRO PARTS" },
            publisher: {
              "@type": "Organization",
              name: "AGRO PARTS",
              logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            ldPerguntas(g.perguntas.map((q) => ({ p: q.p[idioma], r: q.r[idioma] }))),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: idioma === "pt" ? "Início" : "Inicio",
                item: `${SITE_URL}${comPrefixo("/", idioma)}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: idioma === "pt" ? "Guias" : "Guías",
                item: `${SITE_URL}${comPrefixo("/guias", idioma)}`,
              },
              { "@type": "ListItem", position: 3, name: g.titulo[idioma], item: url },
            ],
          }),
        },
      ],
    };
  },
  component: PaginaGuia,
});

function PaginaGuia() {
  const { slug } = Route.useLoaderData();
  const g = guiaPorSlug(slug)!;
  const { t, idioma, href } = useT();
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="bg-[#06321b] text-white">
          <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
            <nav
              aria-label={t("Ruta", "Caminho")}
              className="flex flex-wrap items-center gap-1 text-sm text-white/70"
            >
              <Link to="/" className="hover:text-white">
                {t("Inicio", "Início")}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <a href={href("/guias")} className="hover:text-white">
                {t("Guías", "Guias")}
              </a>
            </nav>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
              {g.titulo[idioma]}
            </h1>
            <p className="mt-3 text-base text-white/85 md:text-lg">{g.resumo[idioma]}</p>
          </div>
        </section>
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:py-12">
          <article className="space-y-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
            {g.secoes.map((s) => (
              <section key={s.titulo.es}>
                <h2 className="text-xl font-extrabold text-zinc-900">{s.titulo[idioma]}</h2>
                {s.paragrafos.map((p) => (
                  <p key={p.es.slice(0, 30)} className="mt-2 text-zinc-700">
                    {p[idioma]}
                  </p>
                ))}
              </section>
            ))}
          </article>
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-lg font-extrabold text-zinc-900">
              {t("Repuestos relacionados", "Peças relacionadas")}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={href(l.href)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f3f5f1] px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-black/5 hover:text-primary"
                  >
                    {l.texto[idioma]} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={whatsappContactUrl(
                t(
                  `Hola, leí la guía «${g.titulo.es}» y tengo una consulta.`,
                  `Olá, li o guia «${g.titulo.pt}» e tenho uma dúvida.`,
                ),
              )}
              target="_blank"
              rel="noreferrer noopener"
              data-livre="1"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-[#06381b]"
            >
              <MessageCircle className="h-4 w-4" />{" "}
              {t("Consultar por WhatsApp", "Tirar dúvida pelo WhatsApp")}
            </a>
          </section>
          <PerguntasBloco
            titulo={t("Preguntas frecuentes", "Perguntas frequentes")}
            perguntas={g.perguntas.map((q) => ({ p: q.p[idioma], r: q.r[idioma] }))}
          />
        </div>
      </main>
    </div>
  );
}
