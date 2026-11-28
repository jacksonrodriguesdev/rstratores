import { useState } from "react";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  MessageCircle,
  Globe,
  Navigation,
  Share2,
  Tractor,
  UserPlus,
  Check,
} from "lucide-react";
import { MaquinaCard } from "@/components/marketplace/MaquinaCard";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/idioma";
import { getEmpresaFn, seguirFn } from "@/lib/marketplace";

const urlFoto = (p: string | null) =>
  !p ? null : p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`;

export const Route = createFileRoute("/m/$handle")({
  loader: async ({ params }) => {
    const e = await getEmpresaFn({ data: { handle: params.handle } });
    if (!e) throw notFound();
    return e;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.nome} (@${loaderData.handle}) | AGRO PARTS Marketplace`
          : "Tienda",
      },
      { name: "description", content: loaderData?.bio?.slice(0, 160) ?? "" },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const e = Route.useLoaderData();
  const { idioma } = useT();
  const es = idioma !== "pt";
  const cor = e.corTema || "#0b7a3b";
  const navigate = useNavigate();
  const [seguindo, setSeguindo] = useState(!!e.seguindo);
  const [nSeguidores, setNSeguidores] = useState(e.seguidores);
  const [cargando, setCargando] = useState(false);

  const onSeguir = async () => {
    if (cargando) return;
    setCargando(true);
    try {
      const r = await seguirFn({ data: { empresaId: e.id } });
      if (r.needLogin) {
        navigate({ to: "/login", search: { redirect: `/m/${e.handle}` } as any });
        return;
      }
      setSeguindo(r.seguindo);
      setNSeguidores(r.seguidores);
    } catch {
      /* ignora */
    } finally {
      setCargando(false);
    }
  };

  const waNum = (e.telefoneWa ?? "").replace(/\D/g, "");
  const waUrl = waNum
    ? `https://wa.me/${waNum}?text=${encodeURIComponent(
        es
          ? "¡Hola! Vi tu tienda en AGRO PARTS Marketplace."
          : "Olá! Vi sua loja no AGRO PARTS Marketplace.",
      )}`
    : null;
  const desde = new Date(e.desde).getFullYear();

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="overflow-hidden rounded-2xl border bg-white">
          {/* Capa */}
          <div
            className="h-32 w-full md:h-44"
            style={{
              background: e.capaUrl ? undefined : `linear-gradient(135deg, ${cor}, #082f49)`,
            }}
          >
            {e.capaUrl && (
              <img src={urlFoto(e.capaUrl)!} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          <div className="px-4 pb-4 md:px-6">
            {/* Avatar + nome */}
            <div className="-mt-10 flex items-end gap-3">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-emerald-100 text-emerald-700 shadow">
                {e.logoUrl ? (
                  <img src={urlFoto(e.logoUrl)!} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Tractor className="h-8 w-8" />
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-extrabold text-slate-800">{e.nome}</h1>
                  {e.verificada && <BadgeCheck className="h-5 w-5 text-sky-500" />}
                </div>
                <p className="text-sm text-slate-500">
                  @{e.handle}
                  {e.ubicacion ? ` · 📍 ${e.ubicacion}` : ""} ·{" "}
                  {es ? `Miembro desde ${desde}` : `Membro desde ${desde}`}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-3 flex gap-6 border-y py-3 text-sm">
              <div>
                <b className="text-base">{e.totalMaquinas}</b>{" "}
                <span className="text-slate-500">{es ? "máquinas" : "máquinas"}</span>
              </div>
              <div>
                <b className="text-base">{nSeguidores}</b>{" "}
                <span className="text-slate-500">{es ? "seguidores" : "seguidores"}</span>
              </div>
            </div>

            {e.bio && <p className="mt-3 text-sm text-slate-700">{e.bio}</p>}

            {/* Ações */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={onSeguir}
                disabled={cargando}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${
                  seguindo
                    ? "border border-slate-300 bg-white text-slate-700"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                }`}
              >
                {seguindo ? (
                  <>
                    <Check className="h-4 w-4" /> {es ? "Siguiendo" : "Seguindo"}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> {es ? "Seguir" : "Seguir"}
                  </>
                )}
              </button>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {e.web && (
                <a
                  href={e.web.startsWith("http") ? e.web : `https://${e.web}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  <Globe className="h-4 w-4" /> Web
                </a>
              )}
              {e.mapsUrl && (
                <a
                  href={e.mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  <Navigation className="h-4 w-4" /> {es ? "Cómo llegar" : "Como chegar"}
                </a>
              )}
              <button
                onClick={() => {
                  if (navigator.share) navigator.share({ title: e.nome, url: location.href });
                  else navigator.clipboard?.writeText(location.href);
                }}
                className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-slate-600"
              >
                <Share2 className="h-4 w-4" /> {es ? "Compartir" : "Compartilhar"}
              </button>
            </div>
          </div>
        </div>

        {/* Máquinas */}
        <h2 className="mb-3 mt-6 text-lg font-bold text-slate-800">
          {es ? "Máquinas en venta" : "Máquinas à venda"} ({e.totalMaquinas})
        </h2>
        {e.anuncios.length === 0 ? (
          <p className="rounded-xl border bg-white p-8 text-center text-slate-500">
            {es ? "Todavía no hay máquinas publicadas." : "Ainda não há máquinas publicadas."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {e.anuncios.map((a) => (
              <MaquinaCard key={a.id} a={a} es={es} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
