import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { MARCAS_SEO, CATEGORIAS_SEO } from "@/lib/seo-paginas";
import { comPrefixo, linksIdioma, tr, useT, type Idioma } from "@/lib/idioma";

// /repuestos: índice das páginas por marca e por categoria (porta de entrada para o Google)
export const Route = createFileRoute("/repuestos/")({
  head: ({ match }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const t = (es: string, pt: string) => tr(idioma, es, pt);
    const url = `${SITE_URL}${comPrefixo("/repuestos", idioma)}`;
    const titulo = t(
      "Repuestos para tractores por marca y categoría | AGRO PARTS",
      "Peças para tratores por marca e categoria | AGRO PARTS",
    );
    const desc = t(
      "Repuestos para Massey Ferguson, Valtra, John Deere, New Holland, Case IH, Ford y Agrale: filtros, rodamientos, juntas, transmisión, hidráulica y más. Envíos a todo Uruguay.",
      "Peças para Massey Ferguson, Valtra, John Deere, New Holland, Case IH, Ford e Agrale: filtros, rolamentos, juntas, transmissão, hidráulica e mais. Envio para todo o Sul do Brasil.",
    );
    return {
      links: linksIdioma("/repuestos", idioma),
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: IndiceRepuestos,
});

function IndiceRepuestos() {
  const { t, idioma, href } = useT();
  const pt = idioma === "pt";
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="bg-[#06321b] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
            <nav
              aria-label={t("Ruta", "Caminho")}
              className="flex items-center gap-1 text-sm text-white/70"
            >
              <Link to="/" className="hover:text-white">
                {t("Inicio", "Início")}
              </Link>{" "}
              <ChevronRight className="h-3.5 w-3.5" />{" "}
              <span className="text-white">{t("Repuestos", "Peças")}</span>
            </nav>
            <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">
              {t(
                "Repuestos para tractores por marca y categoría",
                "Peças para tratores por marca e categoria",
              )}
            </h1>
            <p className="mt-4 max-w-3xl text-white/85 md:text-lg">
              {t(
                "Elegí la marca de tu tractor o el tipo de repuesto. Todas las piezas con código original y envío a todo Uruguay por DAC.",
                "Escolha a marca do seu trator ou o tipo de peça. Todas as peças com código original e envio para todo o Sul do Brasil.",
              )}
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
          <section>
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              {t("Por marca", "Por marca")}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {MARCAS_SEO.map((m) => (
                <a
                  key={m.slug}
                  href={href(`/repuestos/${m.slug}`)}
                  className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <span className="flex items-center justify-between text-lg font-extrabold text-zinc-900 group-hover:text-primary">
                    {m.marca}{" "}
                    <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-primary" />
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-zinc-500">
                    {pt ? m.modelos.replace(/ y /g, " e ") : m.modelos}
                  </span>
                </a>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              {t("Por categoría", "Por categoria")}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {CATEGORIAS_SEO.map((c) => (
                <a
                  key={c.slug}
                  href={href(`/repuestos/${c.slug}`)}
                  className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <span className="block font-bold text-zinc-900 group-hover:text-primary">
                    {pt ? c.categoria : c.nome}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-zinc-500">
                    {pt ? c.texto_pt : c.texto}
                  </span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
