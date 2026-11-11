import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/idioma";
import { produtosCaminhoesFn } from "@/lib/caminhoes";
import { GradeCaminhoes } from "@/components/caminhoes/CardCaminhao";

// /repuestos-camiones/mercedes-benz/motores: produtos de um grupo (paginado).
export const Route = createFileRoute("/repuestos-camiones/$montadora_/$grupo")({
  validateSearch: (s: Record<string, unknown>) => ({
    pagina: s.pagina ? Math.max(1, Number(s.pagina)) : 1,
  }),
  loaderDeps: ({ search }) => ({ pagina: search.pagina }),
  loader: async ({ params, deps }) => {
    try {
      const r = await produtosCaminhoesFn({
        data: { montadora: params.montadora, grupo: params.grupo, pagina: deps.pagina },
      });
      if (!r.total) throw notFound();
      return r;
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    const nome = loaderData?.montadoraNome ?? "Camiones";
    const grupo = loaderData?.itens[0]?.grupo_es ?? params.grupo;
    const titulo = `${grupo} para ${nome} | Repuestos de camiones | AGRO PARTS`;
    const desc = `${loaderData?.total ?? ""} repuestos de ${grupo} para camiones ${nome}, con código y aplicación. Cotizá por WhatsApp.`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        {
          property: "og:url",
          content: `${SITE_URL}/repuestos-camiones/${params.montadora}/${params.grupo}`,
        },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: GrupoLista,
});

function GrupoLista() {
  const r = Route.useLoaderData();
  const { montadora, grupo } = Route.useParams();
  const { pagina } = Route.useSearch();
  const { href } = useT();
  const grupoNome = r.itens[0]?.grupo_es ?? grupo;
  const paginas = Math.ceil(r.total / r.porPagina);
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="bg-[#06321b] text-white">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
              <a href={href("/")} className="hover:text-white">
                Inicio
              </a>
              <ChevronRight className="h-3.5 w-3.5" />
              <a href={href("/repuestos-camiones")} className="hover:text-white">
                Camiones
              </a>
              <ChevronRight className="h-3.5 w-3.5" />
              <a href={href(`/repuestos-camiones/${montadora}`)} className="hover:text-white">
                {r.montadoraNome}
              </a>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">{grupoNome}</span>
            </nav>
            <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">
              {grupoNome} para {r.montadoraNome}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {r.total.toLocaleString("es-UY")} repuestos · precio a consultar
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <GradeCaminhoes itens={r.itens} />
          {paginas > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {pagina > 1 && (
                <Link
                  to="/repuestos-camiones/$montadora/$grupo"
                  params={{ montadora, grupo }}
                  search={{ pagina: pagina - 1 }}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-black/10 hover:text-primary"
                >
                  ← Anterior
                </Link>
              )}
              <span className="text-sm text-zinc-500">
                Página {pagina} de {paginas}
              </span>
              {pagina < paginas && (
                <Link
                  to="/repuestos-camiones/$montadora/$grupo"
                  params={{ montadora, grupo }}
                  search={{ pagina: pagina + 1 }}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-black/10 hover:text-primary"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
