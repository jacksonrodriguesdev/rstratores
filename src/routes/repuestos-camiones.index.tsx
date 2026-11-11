import { createFileRoute, notFound } from "@tanstack/react-router";
import { ChevronRight, Truck } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/idioma";
import { montadorasCaminhoesFn } from "@/lib/caminhoes";

// /repuestos-camiones: índice da linha de caminhões (lista de montadoras). Só espanhol.
export const Route = createFileRoute("/repuestos-camiones/")({
  loader: async () => {
    try {
      return { montadoras: await montadorasCaminhoesFn() };
    } catch {
      throw notFound();
    }
  },
  head: () => {
    const titulo = "Repuestos para camiones multimarca | AGRO PARTS";
    const desc =
      "Repuestos para camiones Mercedes-Benz, Scania, Volvo, Volkswagen, MAN, Iveco, Ford, DAF y más. Miles de piezas con aplicación. Cotizá por WhatsApp.";
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: `${SITE_URL}/repuestos-camiones` },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: Indice,
});

function Indice() {
  const { montadoras } = Route.useLoaderData();
  const { href } = useT();
  const total = montadoras.reduce((s, m) => s + m.n, 0);
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="bg-[#06321b] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
            <nav className="flex items-center gap-1 text-sm text-white/70">
              <a href={href("/")} className="hover:text-white">
                Inicio
              </a>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">Camiones</span>
            </nav>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold md:text-5xl">
              <Truck className="h-8 w-8 md:h-10 md:w-10" /> Repuestos para camiones
            </h1>
            <p className="mt-4 max-w-3xl text-white/85 md:text-lg">
              Elegí la marca de tu camión. {total.toLocaleString("es-UY")} piezas multimarca con
              código y aplicación. Precios a consultar por WhatsApp.
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {montadoras.map((m) => (
              <a
                key={m.montadora_slug}
                href={href(`/repuestos-camiones/${m.montadora_slug}`)}
                className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
              >
                <span className="block text-lg font-extrabold text-zinc-900 group-hover:text-primary">
                  {m.montadora}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {m.n.toLocaleString("es-UY")} repuestos
                </span>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
