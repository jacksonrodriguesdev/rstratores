import { createFileRoute, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/idioma";
import { gruposCaminhoesFn } from "@/lib/caminhoes";

// /repuestos-camiones/mercedes-benz: grupos de uma montadora.
export const Route = createFileRoute("/repuestos-camiones/$montadora")({
  loader: async ({ params }) => {
    try {
      const r = await gruposCaminhoesFn({ data: { montadora: params.montadora } });
      if (!r.montadora) throw notFound();
      return r;
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const nome = loaderData?.montadora ?? "Camiones";
    const titulo = `Repuestos para ${nome} | AGRO PARTS`;
    const desc = `Repuestos para camiones ${nome}: motor, frenos, caja de cambios, cabina, suspensión y más, con aplicación. Cotizá por WhatsApp.`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: Montadora,
});

function Montadora() {
  const { montadora, grupos } = Route.useLoaderData();
  const { montadora: slug } = Route.useParams();
  const { href } = useT();
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="bg-[#06321b] text-white">
          <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
              <a href={href("/")} className="hover:text-white">
                Inicio
              </a>
              <ChevronRight className="h-3.5 w-3.5" />
              <a href={href("/repuestos-camiones")} className="hover:text-white">
                Camiones
              </a>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">{montadora}</span>
            </nav>
            <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">Repuestos para {montadora}</h1>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="text-xl font-extrabold text-zinc-900">Por grupo</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {grupos.map((g) => (
              <a
                key={g.grupo_slug ?? "x"}
                href={href(`/repuestos-camiones/${slug}/${g.grupo_slug}`)}
                className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
              >
                <span className="block font-bold text-zinc-900 group-hover:text-primary">
                  {g.grupo_es ?? g.grupo}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {g.n.toLocaleString("es-UY")} repuestos
                </span>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
