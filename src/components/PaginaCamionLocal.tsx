// Página de SEO da linha de caminhões por cidade do Uruguai. Conteúdo em espanhol, rico em
// palavras-chave (montadora × grupo × peça × cidade), levando à loja (/loja?linha=CAMINHOES).
import { Link } from "@tanstack/react-router";
import { ChevronRight, Truck, MessageCircle, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { whatsappContactUrl } from "@/lib/whatsapp";
import type { LocalSeo } from "@/lib/locais-seo";
import { localCamionPorSlug } from "@/lib/seo-camiones";
import {
  MONTADORAS_CAMION,
  GRUPOS_CAMION,
  PIEZAS_CAMION,
  frasesCamion,
  urlCamion,
} from "@/lib/seo-camiones";

export function PaginaCamionLocal({ local, total }: { local: LocalSeo; total: number }) {
  const ciudad = local.nome;
  const esPais = local.tipo === "pais";
  const enCiudad = esPais ? "en Uruguay" : `en ${ciudad}`;
  const vecinos = (local.vizinhos || [])
    .map((s) => localCamionPorSlug(s))
    .filter((l): l is LocalSeo => !!l && l.tipo !== "pais")
    .slice(0, 8);
  const frases = frasesCamion(ciudad);
  const wa = whatsappContactUrl(
    `¡Hola! Quiero cotizar repuestos de camión${esPais ? "" : ` (${ciudad})`}.`,
  );

  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="bg-[#06321b] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
              <Link to="/" className="hover:text-white">
                Inicio
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">Repuestos de camiones {enCiudad}</span>
            </nav>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold md:text-5xl">
              <Truck className="h-8 w-8 shrink-0 md:h-10 md:w-10" />
              Repuestos de camiones {esPais ? "en Uruguay" : `en ${ciudad}`}
            </h1>
            <p className="mt-4 max-w-3xl text-white/85 md:text-lg">
              {total.toLocaleString("es-UY")} repuestos para camiones multimarca — Mercedes-Benz,
              Scania, Volvo, Volkswagen, MAN, Iveco, Ford y DAF. Motor, frenos, caja de cambios,
              cabina, suspensión y eléctrica, con código y aplicación. Entrega a{" "}
              {esPais ? "todo Uruguay" : `${ciudad} y todo Uruguay`}. Cotizá por WhatsApp.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={urlCamion()}
                className="inline-flex h-12 items-center rounded-full bg-white px-6 font-bold text-[#06321b]"
              >
                Ver catálogo de camiones
              </a>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-600 px-6 font-bold text-white"
              >
                <MessageCircle className="h-5 w-5" /> Cotizar por WhatsApp
              </a>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
          {/* Montadoras */}
          <section>
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              Repuestos por marca de camión {enCiudad}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {MONTADORAS_CAMION.map((m) => (
                <a
                  key={m.marca}
                  href={urlCamion({ marca: m.marca })}
                  className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <span className="block font-bold text-zinc-900 group-hover:text-primary">
                    Repuestos {m.rotulo}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Repuestos para {m.rotulo} {enCiudad}
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* Grupos / sistemas */}
          <section>
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              Repuestos por sistema {enCiudad}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {GRUPOS_CAMION.map((g) => (
                <a
                  key={g.cat}
                  href={urlCamion({ categoria: g.cat })}
                  className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <span className="block font-bold text-zinc-900 group-hover:text-primary">
                    {g.es}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {g.es} de camión {enCiudad}
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* Peças long-tail */}
          <section>
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              Piezas más buscadas {enCiudad}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {PIEZAS_CAMION.map((p) => (
                <a
                  key={p}
                  href={urlCamion() + "&q=" + encodeURIComponent(p)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </a>
              ))}
            </div>
          </section>

          {/* Texto SEO com densidade de palavras-chave */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold text-zinc-900">
              Distribuidora de repuestos para camiones {enCiudad}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              En AGRO PARTS encontrás repuestos para camiones de línea pesada{" "}
              {esPais ? "en todo Uruguay" : `en ${ciudad}`}:{" "}
              {MONTADORAS_CAMION.map((m) => m.rotulo).join(", ")}. Trabajamos motor, frenos, caja de
              cambios, diferencial, eje delantero y trasero, embrague, dirección, suspensión,
              cabina, sistema eléctrico y filtros. Cada pieza con su código y aplicación por modelo
              de camión, para que cotices rápido y sin errores.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
              {frases.slice(0, 60).map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          </section>

          {/* Links internos: cidades vizinhas */}
          {vecinos.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                Repuestos de camiones en otras ciudades
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {vecinos.map((v) => (
                  <Link
                    key={v.slug}
                    to="/repuestos-camiones/$local"
                    params={{ local: v.slug }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                  >
                    <MapPin className="h-4 w-4 text-primary" /> {v.nome}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// JSON-LD (negócio local + catálogo) para o Google.
export function ldCamionLocal(local: LocalSeo, url: string, total: number) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Store",
      name: `AGRO PARTS — Repuestos de camiones${local.tipo === "pais" ? "" : ` en ${local.nome}`}`,
      description: `Repuestos para camiones multimarca${local.tipo === "pais" ? " en Uruguay" : ` en ${local.nome}, Uruguay`}.`,
      url,
      areaServed: local.tipo === "pais" ? "Uruguay" : `${local.nome}, Uruguay`,
      makesOffer: {
        "@type": "Offer",
        itemOffered: {
          "@type": "Product",
          category: "Repuestos para camiones",
          name: "Repuestos para camiones multimarca",
        },
      },
    },
  ];
}
