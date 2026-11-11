import { createFileRoute, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/idioma";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { produtoCaminhaoFn } from "@/lib/caminhoes";
import { GradeCaminhoes } from "@/components/caminhoes/CardCaminhao";

// /repuestos-camiones/producto/50030390: ficha da peça. Sem preço (Consultar por WhatsApp).
export const Route = createFileRoute("/repuestos-camiones/producto/$codigo")({
  loader: async ({ params }) => {
    let p;
    try {
      p = await produtoCaminhaoFn({ data: { codigo: params.codigo } });
    } catch {
      throw notFound();
    }
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const p = loaderData;
    const titulo = `${p.nome_es} ${p.montadora} ${p.codigo} | AGRO PARTS`;
    const desc = `${p.nome_es} para ${p.montadora}${p.aplicacao ? ` (${p.aplicacao})` : ""}. Código ${p.codigo}${p.referencia ? `, ref. ${p.referencia}` : ""}. Cotizá por WhatsApp.`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: `${SITE_URL}/repuestos-camiones/producto/${params.codigo}` },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
        ...(p.imagem ? [{ property: "og:image", content: p.imagem }] : []),
      ],
    };
  },
  component: Ficha,
});

function Ficha() {
  const p = Route.useLoaderData();
  const { href } = useT();
  const msg =
    `¡Hola! Quiero cotizar este repuesto de camión:\n\n*${p.nome_es}*\n` +
    (p.nome_es !== p.nome ? `(${p.nome})\n` : "") +
    `Marca: ${p.montadora}\nCódigo: ${p.codigo}\n` +
    (p.referencia ? `Ref.: ${p.referencia}\n` : "") +
    `${SITE_URL}/repuestos-camiones/producto/${encodeURIComponent(p.codigo)}`;
  const wa = whatsappContactUrl(msg);
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
          <a href={href("/")} className="hover:text-primary">
            Inicio
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <a href={href("/repuestos-camiones")} className="hover:text-primary">
            Camiones
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <a href={href(`/repuestos-camiones/${p.montadora_slug}`)} className="hover:text-primary">
            {p.montadora}
          </a>
          {p.grupo_slug && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <a
                href={href(`/repuestos-camiones/${p.montadora_slug}/${p.grupo_slug}`)}
                className="hover:text-primary"
              >
                {p.grupo_es ?? p.grupo}
              </a>
            </>
          )}
        </nav>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="grid aspect-square place-items-center bg-zinc-50">
              {p.imagem ? (
                <img src={p.imagem} alt={p.nome_es} className="h-full w-full object-contain p-4" />
              ) : (
                <span className="text-sm text-zinc-300">Sin foto</span>
              )}
            </div>
          </div>

          <div>
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {p.montadora}
              {p.grupo_es ? ` · ${p.grupo_es}` : ""}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold text-zinc-900 md:text-3xl">{p.nome_es}</h1>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-zinc-500">Código</dt>
                <dd className="font-mono font-semibold text-zinc-900">{p.codigo}</dd>
              </div>
              {p.referencia && (
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-zinc-500">Referencia</dt>
                  <dd className="font-mono text-zinc-900">{p.referencia}</dd>
                </div>
              )}
              {p.aplicacao && (
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-zinc-500">Aplicación</dt>
                  <dd className="text-zinc-900">{p.aplicacao}</dd>
                </div>
              )}
              {p.fabricante && (
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-zinc-500">Fabricante</dt>
                  <dd className="text-zinc-900">{p.fabricante}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <p className="text-sm text-zinc-500">Precio</p>
              <p className="text-xl font-extrabold text-emerald-700">A consultar</p>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              >
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        </div>

        {p.relacionados.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-extrabold text-zinc-900">Repuestos relacionados</h2>
            <div className="mt-4">
              <GradeCaminhoes itens={p.relacionados} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
