import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { BookOpen, Search, Lock, FileText, Eye, MessageCircle, Wrench, Users, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { listarCatalogosFn, type Catalogo } from "@/lib/catalogos";
import { getSessionFn } from "@/lib/user-auth";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/catalogos/")({
  validateSearch: z.object({ abrir: z.coerce.number().optional() }),
  loader: () => listarCatalogosFn(),
  head: () => ({
    links: [{ rel: "canonical", href: `${SITE_URL}/catalogos` }],
    meta: [
      { title: "Catálogos y manuales para mecánicos | AGRO PARTS" },
      { name: "description", content: "Catálogos de piezas y manuales de taller en PDF para tractores y cosechadoras. Gratis para mecánicos de Uruguay." },
    ],
  }),
  component: CatalogosPage,
});

const COR_MARCA: Record<string, string> = {
  "Massey Ferguson": "#c8102e", Valtra: "#d52b1e", "John Deere": "#367c2b", "New Holland": "#0a5bb5", "Case IH": "#b5121b", Ford: "#1a4fa3", Agrale: "#e07b00",
};
const tamanhoMB = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(b > 104857600 ? 0 : 1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function CatalogosPage() {
  const catalogos = Route.useLoaderData() as Catalogo[];
  const { abrir } = Route.useSearch();
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const [busca, setBusca] = useState("");
  const [marca, setMarca] = useState<string | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);

  // Voltou do cadastro/login para abrir um catálogo: abre na hora
  useEffect(() => {
    if (abrir && sessao) window.location.href = `/catalogos/ver/${abrir}`;
  }, [abrir, sessao]);

  const marcas = useMemo(() => [...new Set(catalogos.map((c) => c.marca).filter(Boolean))] as string[], [catalogos]);
  const tipos = useMemo(() => [...new Set(catalogos.map((c) => c.tipo))], [catalogos]);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = catalogos.filter(
    (c) =>
      (!marca || c.marca === marca) &&
      (!tipo || c.tipo === tipo) &&
      (!busca || norm(`${c.titulo} ${c.marca ?? ""} ${c.tipo} ${c.descricao ?? ""}`).includes(norm(busca))),
  );

  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <section className="relative overflow-hidden bg-[#06321b] text-white">
        <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]" />
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 md:pb-20 md:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#06321b]"><Wrench className="h-3.5 w-3.5" /> Para mecánicos y talleres</span>
          <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">Catálogos y manuales en PDF</h1>
          <p className="mt-3 max-w-xl text-white/80 md:text-lg">Catálogos de piezas y manuales de taller de tractores y cosechadoras. Gratis con tu cuenta de AGRO PARTS.</p>
          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input id="busca-catalogos" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscá por modelo, marca o tipo de manual…" className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-12 text-base text-zinc-900 shadow-xl outline-none ring-amber-400 placeholder:text-zinc-400 focus:ring-4" />
            {busca && <button onClick={() => setBusca("")} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      </section>

      <main className="relative mx-auto -mt-8 max-w-6xl px-3 pb-12 md:px-4">
        {!sessao && catalogos.some((c) => c.exige_login) && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3 text-sm text-zinc-700"><Users className="h-5 w-5 shrink-0 text-primary" /> Creá tu cuenta gratis para ver los catálogos.</p>
            <div className="flex gap-2">
              <Link to="/cadastro" search={{ redirect: "/catalogos" } as never} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90">Crear cuenta</Link>
              <Link to="/login" search={{ redirect: "/catalogos" } as never} className="rounded-xl px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-primary/30 hover:bg-primary/5">Ingresar</Link>
            </div>
          </div>
        )}

        {catalogos.length > 0 && (
          <div className="mb-5 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
              {[null, ...marcas].map((m) => (
                <button key={m ?? "todas"} onClick={() => setMarca(m)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition", marca === m ? "bg-[#06321b] text-white ring-[#06321b]" : "bg-white text-zinc-700 ring-zinc-200 hover:ring-primary")}>
                  {m ?? "Todas las marcas"}
                </button>
              ))}
            </div>
            {tipos.length > 1 && (
              <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
                {[null, ...tipos].map((t) => (
                  <button key={t ?? "todos"} onClick={() => setTipo(t)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", tipo === t ? "bg-primary/10 text-primary" : "text-zinc-500 hover:bg-zinc-100")}>
                    {t ?? "Todos los tipos"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {lista.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((c) => {
              const bloqueado = c.exige_login && !sessao;
              // O visor manda para o cadastro quem não está logado e volta direto para o catálogo
              const href = `/catalogos/ver/${c.id}`;
              const cor = (c.marca && COR_MARCA[c.marca]) || "#0b7a3b";
              return (
                <article key={c.id} className={cn("group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg", abrir === c.id && "ring-2 ring-amber-400")}>
                  <div className="h-1.5" style={{ background: cor }} />
                  <div className="flex flex-1 gap-4 p-4">
                    <div className="relative flex h-16 w-13 shrink-0 flex-col items-center justify-center rounded-lg bg-red-50 px-3 text-red-600 ring-1 ring-red-100">
                      <FileText className="h-6 w-6" />
                      <span className="mt-0.5 text-[10px] font-extrabold">PDF</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {c.marca && <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: cor }}>{c.marca}</p>}
                      <h2 className="mt-0.5 line-clamp-2 font-bold leading-snug text-zinc-900">{c.titulo}</h2>
                      <p className="mt-1 text-xs text-zinc-500">{[c.tipo, c.idioma, tamanhoMB(c.tamanho)].filter(Boolean).join(" · ")}</p>
                      {c.descricao && <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{c.descricao}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3">
                    <span className="text-xs text-zinc-400">{c.downloads > 0 ? `${c.downloads} vistas` : "Nuevo"}</span>
                    <a href={href} className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-95", bloqueado ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200" : "bg-primary text-white hover:bg-primary/90")}>
                      {bloqueado ? <><Lock className="h-4 w-4" /> Ver gratis</> : <><Eye className="h-4 w-4" /> Ver catálogo</>}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
            <BookOpen className="h-12 w-12 text-zinc-300" />
            <h2 className="mt-4 text-lg font-bold text-zinc-900">{catalogos.length ? "No encontramos catálogos con ese filtro" : "Estamos sumando catálogos"}</h2>
            <p className="mt-1 max-w-md text-sm text-zinc-500">¿Buscás un catálogo o manual en particular? Pedilo por WhatsApp y te ayudamos.</p>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl bg-[#06321b] p-6 text-center text-white md:p-10">
          <h2 className="text-xl font-extrabold md:text-2xl">¿Necesitás otro catálogo o manual?</h2>
          <p className="max-w-lg text-white/75">Decinos la marca y el modelo del tractor y te ayudamos a encontrar la pieza por código.</p>
          <a href={whatsappContactUrl("¡Hola! Soy mecánico y busco un catálogo o manual de: ")} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 font-bold text-[#06381b] hover:brightness-95">
            <MessageCircle className="h-5 w-5" /> Pedir por WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
