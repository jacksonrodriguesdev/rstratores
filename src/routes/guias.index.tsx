import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { GUIAS } from "@/lib/guias";
import { comPrefixo, linksIdioma, tr, useT, type Idioma } from "@/lib/idioma";

// /guias: índice dos guias técnicos (espanhol) e /pt/guias (português)
export const Route = createFileRoute("/guias/")({
  head: ({ match }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const titulo = tr(
      idioma,
      "Guías de repuestos y mantenimiento de tractores | AGRO PARTS",
      "Guias de peças e manutenção de tratores | AGRO PARTS",
    );
    const desc = tr(
      idioma,
      "Cómo encontrar el código de un repuesto, cada cuánto cambiar los filtros, Valtra o Valmet y la revisión de la cosechadora antes de la zafra.",
      "Como achar o código de uma peça, quando trocar os filtros, Valtra ou Valmet e a revisão da colheitadeira antes da safra.",
    );
    return {
      links: linksIdioma("/guias", idioma),
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: `${SITE_URL}${comPrefixo("/guias", idioma)}` },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: IndiceGuias,
});

function IndiceGuias() {
  const { t, idioma, href } = useT();
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="bg-[#06321b] text-white">
          <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
            <nav
              aria-label={t("Ruta", "Caminho")}
              className="flex items-center gap-1 text-sm text-white/70"
            >
              <Link to="/" className="hover:text-white">
                {t("Inicio", "Início")}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">{t("Guías", "Guias")}</span>
            </nav>
            <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">
              {t("Guías de repuestos y mantenimiento", "Guias de peças e manutenção")}
            </h1>
          </div>
        </section>
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 md:grid-cols-2 md:py-12">
          {GUIAS.map((g) => (
            <a
              key={g.slug}
              href={href(`/guias/${g.slug}`)}
              className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
            >
              <h2 className="font-extrabold text-zinc-900 group-hover:text-primary">
                {g.titulo[idioma]}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">{g.resumo[idioma]}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
                {t("Leer", "Ler")} <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
