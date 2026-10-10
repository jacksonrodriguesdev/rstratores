import { createFileRoute, Link } from "@tanstack/react-router";
import { ListChecks, BookOpen, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BandeiraUruguay } from "@/components/Bandeiras";
import { CotizacionForm, VANTAGENS } from "@/components/CotizacionDistribuidor";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";

// Página de cotação: "Somos distribuidores de repuestos agrícolas en Uruguay"
export const Route = createFileRoute("/cotizar")({
  head: () => ({
    links: [{ rel: "canonical", href: `${SITE_URL}/cotizar` }],
    meta: [
      { title: "Cotizá repuestos agrícolas — Distribuidores en Uruguay | AGRO PARTS" },
      {
        name: "description",
        content:
          "Somos distribuidores de repuestos para tractores y cosechadoras en Uruguay. Pedí tu cotización gratis: te respondemos por WhatsApp. Envíos por DAC a los 19 departamentos.",
      },
      { property: "og:title", content: "Cotizá tus repuestos con AGRO PARTS — Distribuidores en Uruguay" },
      { property: "og:url", content: `${SITE_URL}/cotizar` },
    ],
  }),
  component: CotizarPage,
});

const PASSOS = [
  ["Contanos qué necesitás", "Código, nombre de la pieza o una foto."],
  ["Te pasamos el precio", "Por WhatsApp, con disponibilidad y costo de envío."],
  ["Recibilo en tu ciudad", "Despachamos por DAC con número de seguimiento."],
];

function CotizarPage() {
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <section className="relative overflow-hidden bg-[#06321b] text-white">
        <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]" />
        <div aria-hidden className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 md:grid-cols-[1fr_1.05fr] md:gap-12 md:pb-16 md:pt-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold ring-1 ring-white/15">
              <BandeiraUruguay className="h-3.5 w-5 rounded-sm" /> Distribuidores en Uruguay
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-5xl md:leading-[1.05]">Somos distribuidores de repuestos agrícolas en Uruguay</h1>
            <p className="mt-3 text-xl font-bold text-amber-300 md:text-2xl">Hacé tu cotización con nosotros.</p>
            <p className="mt-4 max-w-xl text-white/80">
              Tienda online con base en Chuy (Rocha). Repuestos para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New Holland, Case IH y más. Para productores, talleres y revendedores.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {VANTAGENS.map((v) => (
                <li key={v.titulo} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><v.icon className="h-5 w-5 text-emerald-300" /></span>
                  <div>
                    <p className="font-bold">{v.titulo}</p>
                    <p className="text-sm text-white/70">{v.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <CotizacionForm />
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:py-14">
        <section>
          <h2 className="text-2xl font-extrabold text-zinc-900">¿Cómo funciona?</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {PASSOS.map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 font-extrabold text-[#06321b]">{i + 1}</span>
                <div>
                  <p className="font-bold text-zinc-900">{t}</p>
                  <p className="text-sm text-zinc-600">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Link to="/pedido-rapido" className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 hover:ring-primary/40">
            <ListChecks className="h-8 w-8 shrink-0 text-primary" />
            <div><p className="font-bold">¿Muchos códigos?</p><p className="text-sm text-zinc-600">Pegá tu lista en el pedido rápido.</p></div>
          </Link>
          <Link to="/catalogos" className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 hover:ring-primary/40">
            <BookOpen className="h-8 w-8 shrink-0 text-primary" />
            <div><p className="font-bold">¿No sabés el código?</p><p className="text-sm text-zinc-600">Buscalo en los catálogos en PDF.</p></div>
          </Link>
          <a href={whatsappContactUrl("¡Hola! Quiero cotizar repuestos con AGRO PARTS.")} target="_blank" rel="noreferrer noopener" className="flex items-center gap-4 rounded-2xl bg-[#25D366] p-5 text-white shadow-sm">
            <MessageCircle className="h-8 w-8 shrink-0" />
            <div><p className="font-bold">¿Preferís hablar?</p><p className="text-sm text-white/90">Escribinos directo por WhatsApp.</p></div>
          </a>
        </section>
      </main>
    </div>
  );
}
