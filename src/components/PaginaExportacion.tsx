// Páginas de SEO de exportação para o Uruguai (espanhol). Estrutura pilar + satélite:
//   PaginaExportacionHome    → /exportacion (todas as máquinas + cidades)
//   PaginaExportacionMaquina → /exportacion/<maquina> (pilar da máquina, todas as cidades)
//   PaginaExportacionCiudad  → /exportacion/<maquina>/<ciudad> (a página que rankeia)
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  MessageCircle,
  Globe2,
  ShieldCheck,
  FileCheck2,
  Boxes,
  Truck,
  ArrowRight,
  Factory,
  Wrench,
  Sparkles,
  Calculator,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CardLoja } from "@/components/CardPeca";
import { MapaCaminhos } from "@/components/MapaCaminhos";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";
import type { Product } from "@/lib/products";
import {
  MAQUINAS_EXPORT,
  CIUDADES_EXPORT,
  TIPOS_PIEZA,
  PILARES_ESTRUCTURA,
  PASOS_IMPORTAR,
  ciudadesVecinas,
  ciudadesPorDepartamento,
  maquinaPorSlug,
  tituloExport,
  descripcionExport,
  textoExport,
  preguntasExport,
  frasesExport,
  urlCatalogoExport,
  urlCatalogoTipo,
  tituloTipo,
  descripcionTipo,
  statsExport,
  type MaquinaExport,
  type CiudadExport,
  type TipoPieza,
} from "@/lib/seo-exportacion";

import { ETAPAS, PONTOS_FRONTEIRA, TAXAS_PADRAO } from "@/lib/aduana/aduana-comum";

// Ícones dos pilares da estrutura (string -> componente)
const ICONOS = { Factory, FileCheck2, MapPin, Truck, ShieldCheck, Boxes } as const;

// Fundo fotográfico do hero (caixote AGRO PARTS na fronteira) + overlay verde para legibilidade.
function FondoHero() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/export/hero-frontera.webp')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#06321b]/95 via-[#06321b]/85 to-[#06321b]/65" />
    </div>
  );
}

type Dados = { total: number; produtos: Product[] };
const fmt = (n: number) => n.toLocaleString("es-UY");
const u = (c: string) => `${SITE_URL}${c}`;

// ---------------------------------------------------------------- JSON-LD
export function ldExportCiudad(m: MaquinaExport, c: CiudadExport, url: string, dados: Dados) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Inicio", item: u("/") },
        { name: "Exportación a Uruguay", item: u("/exportacion") },
        { name: m.es, item: u(`/exportacion/${m.slug}`) },
        { name: c.nombre, item: url },
      ].map((t, i) => ({ "@type": "ListItem", position: i + 1, ...t })),
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: tituloExport(m, c),
      url,
      inLanguage: "es-UY",
      description: descripcionExport(m, dados.total, c),
      about: {
        "@type": "Store",
        name: "AGRO PARTS",
        url: SITE_URL,
        areaServed: {
          "@type": "City",
          name: c.nombre,
          containedInPlace: { "@type": "AdministrativeArea", name: c.departamento },
        },
      },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: dados.produtos.length,
        itemListElement: dados.produtos.slice(0, 18).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: u(`/produto/${encodeURIComponent(p.sku.trim())}`),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: preguntasExport(m, c).map((q) => ({
        "@type": "Question",
        name: q.p,
        acceptedAnswer: { "@type": "Answer", text: q.r },
      })),
    },
  ];
}

export function ldExportMaquina(m: MaquinaExport, url: string, total: number) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Inicio", item: u("/") },
        { name: "Exportación a Uruguay", item: u("/exportacion") },
        { name: m.es, item: url },
      ].map((t, i) => ({ "@type": "ListItem", position: i + 1, ...t })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: `Exportación de repuestos para ${m.plural}`,
      provider: { "@type": "Organization", name: "AGRO PARTS", url: SITE_URL },
      areaServed: { "@type": "Country", name: "Uruguay" },
      description: descripcionExport(m, total),
    },
  ];
}

// ---------------------------------------------------------------- selos de confiança (reutilizáveis)
const SELOS = [
  {
    icon: Globe2,
    t: "Origen Mercosur · USD",
    d: "0% de arancel con origen comprobado (ACE 02/18). Precios cotizados en USD (FOB).",
  },
  { icon: FileCheck2, t: "NCM verificada", d: "Cada pieza con su clasificación fiscal." },
  { icon: Boxes, t: "Proforma y packing list", d: "Documentos listos para tu despachante." },
  { icon: ShieldCheck, t: "Compatibilidad confirmada", d: "Antes de comprar, sin errores." },
];

function BotonesCTA({ wa, catalogo }: { wa: string; catalogo: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-6 font-bold text-[#06381b] hover:brightness-95"
      >
        <MessageCircle className="h-5 w-5" /> Cotizar por WhatsApp
      </a>
      <Link
        to="/empresas"
        className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-bold text-[#06321b] hover:bg-white/90"
      >
        Conocé nuestra exportación <ArrowRight className="h-5 w-5" />
      </Link>
      <a
        href={catalogo}
        className="inline-flex h-12 items-center rounded-full border border-white/40 px-6 font-semibold text-white hover:bg-white/10"
      >
        Ver catálogo
      </a>
    </div>
  );
}

// ---------------------------------------------------------------- página satélite (máquina × cidade)
export function PaginaExportacionCiudad({
  maquina: m,
  ciudad: c,
  dados,
}: {
  maquina: MaquinaExport;
  ciudad: CiudadExport;
  dados: Dados;
}) {
  const parrafos = textoExport(m, c, dados.total);
  const faq = preguntasExport(m, c);
  const frases = frasesExport(m, c.nombre);
  const vecinas = ciudadesVecinas(c, 10);
  const wa = whatsappContactUrl(
    `¡Hola! Quiero importar repuestos para ${m.plural} a ${c.nombre}, Uruguay.`,
  );
  const otras = MAQUINAS_EXPORT.filter((x) => x.slug !== m.slug);

  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#06321b] text-white">
          <FondoHero />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
          />
          <div className="relative mx-auto max-w-7xl px-4 py-8 md:py-12">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
              <Link to="/" className="hover:text-white">
                Inicio
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/exportacion" className="hover:text-white">
                Exportación
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link
                to="/exportacion/$maquina"
                params={{ maquina: m.slug }}
                className="hover:text-white"
              >
                {m.es}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">{c.nombre}</span>
            </nav>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
              {tituloExport(m, c)}
            </h1>
            <p className="mt-4 max-w-3xl text-white/85 md:text-lg">{parrafos[0]}</p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-300" /> Entrada por {c.frontera}
              </li>
              <li className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-amber-300" /> Origen Mercosur · 0% arancel · USD
                (FOB)
              </li>
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-300" /> Despacho a {c.nombre} y todo Uruguay
              </li>
            </ul>
            <BotonesCTA wa={wa} catalogo={urlCatalogoExport(m)} />
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 md:py-12">
          {/* Selos */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SELOS.map((s) => (
              <div key={s.t} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <s.icon className="h-6 w-6 text-emerald-600" />
                <p className="mt-2 font-bold text-zinc-900">{s.t}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{s.d}</p>
              </div>
            ))}
          </section>

          {/* Texto */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
              <h2 className="text-xl font-extrabold text-zinc-900">
                Repuestos para {m.plural} en {c.nombre}
              </h2>
              <p className="mt-3 text-zinc-700">{parrafos[1]}</p>
              <p className="mt-3 text-zinc-700">{parrafos[2]}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
              <h2 className="text-xl font-extrabold text-zinc-900">Sistemas y marcas</h2>
              <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Sistemas
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {m.sistemas.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[#f3f5f1] px-3 py-1.5 text-sm font-medium text-zinc-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Marcas
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {m.marcas.map((mar) => (
                  <span
                    key={mar}
                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100"
                  >
                    {mar}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Produtos reais */}
          {dados.produtos.length > 0 && (
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                  Repuestos para {m.plural} disponibles
                </h2>
                <a
                  href={urlCatalogoExport(m)}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Ver los {fmt(dados.total)} repuestos →
                </a>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
                {dados.produtos.map((p, i) => (
                  <CardLoja key={p.sku} p={p} prioridade={i < 2} />
                ))}
              </div>
            </section>
          )}

          {/* Outras máquinas na mesma cidade (silo) */}
          <section>
            <h2 className="text-lg font-extrabold text-zinc-900">
              Otros repuestos para exportar a {c.nombre}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {otras.map((x) => (
                <Link
                  key={x.slug}
                  to="/exportacion/$maquina/$ciudad"
                  params={{ maquina: x.slug, ciudad: c.slug }}
                  className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <Factory className="h-5 w-5 text-primary" />
                  <span className="mt-2 block font-bold text-zinc-900 group-hover:text-primary">
                    {x.es}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Repuestos para {x.plural} en {c.nombre}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              Preguntas frecuentes
            </h2>
            <div className="mt-3 divide-y divide-zinc-100">
              {faq.map((q) => (
                <details key={q.p} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-zinc-900">
                    {q.p}
                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-zinc-600">{q.r}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Cidades vizinhas (silo) */}
          {vecinas.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-zinc-900">
                Repuestos para {m.plural} en otras ciudades
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {vecinas.map((v) => (
                  <Link
                    key={v.slug}
                    to="/exportacion/$maquina/$ciudad"
                    params={{ maquina: m.slug, ciudad: v.slug }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {v.nombre}
                  </Link>
                ))}
                <Link
                  to="/exportacion/$maquina"
                  params={{ maquina: m.slug }}
                  className="inline-flex items-center rounded-full px-4 py-2 text-sm font-bold text-primary hover:underline"
                >
                  Todas las ciudades →
                </Link>
              </div>
            </section>
          )}

          {/* Frases-chave (densidade, discreto) */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
              {frases.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- pilar por máquina
export function PaginaExportacionMaquina({
  maquina: m,
  dados,
}: {
  maquina: MaquinaExport;
  dados: Dados;
}) {
  const wa = whatsappContactUrl(`¡Hola! Quiero importar repuestos para ${m.plural} a Uruguay.`);
  const otras = MAQUINAS_EXPORT.filter((x) => x.slug !== m.slug);
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-[#06321b] text-white">
          <FondoHero />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
          />
          <div className="relative mx-auto max-w-7xl px-4 py-8 md:py-12">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
              <Link to="/" className="hover:text-white">
                Inicio
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/exportacion" className="hover:text-white">
                Exportación
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">{m.es}</span>
            </nav>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
              Repuestos para {m.plural} — exportación a todo Uruguay
            </h1>
            <p className="mt-4 max-w-3xl text-white/85 md:text-lg">
              {dados.total > 0 ? `Más de ${fmt(dados.total)} ` : ""}
              {m.intro}
            </p>
            <BotonesCTA wa={wa} catalogo={urlCatalogoExport(m)} />
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 md:py-12">
          {dados.produtos.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                Repuestos para {m.plural}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
                {dados.produtos.map((p, i) => (
                  <CardLoja key={p.sku} p={p} prioridade={i < 2} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              Exportamos repuestos para {m.plural} a cada ciudad de Uruguay
            </h2>
            <p className="mt-2 text-zinc-600">
              Elegí tu ciudad para ver la frontera de entrada, los tiempos y cómo importar.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {CIUDADES_EXPORT.map((c) => (
                <Link
                  key={c.slug}
                  to="/exportacion/$maquina/$ciudad"
                  params={{ maquina: m.slug, ciudad: c.slug }}
                  className="group flex items-center gap-2 rounded-xl bg-white p-3 font-semibold text-zinc-800 shadow-sm ring-1 ring-black/5 hover:text-primary hover:ring-primary/40"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-primary" /> {c.nombre}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-zinc-900">Otras líneas de exportación</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {otras.map((x) => (
                <Link
                  key={x.slug}
                  to="/exportacion/$maquina"
                  params={{ maquina: x.slug }}
                  className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <Factory className="h-5 w-5 text-primary" />
                  <span className="mt-2 block font-bold text-zinc-900 group-hover:text-primary">
                    {x.es}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- hub geral /exportacion (landing)
function Stat({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-extrabold text-amber-300 md:text-4xl">{valor}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/70 md:text-xs">
        {label}
      </div>
    </div>
  );
}

export function PaginaExportacionHome({
  total,
  productos = [],
}: {
  total: number;
  productos?: Product[];
}) {
  const wa = whatsappContactUrl("¡Hola! Soy revendedor en Uruguay y quiero importar repuestos.");
  const s = statsExport(total);
  const deps = ciudadesPorDepartamento();
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        {/* Hero + mapa */}
        <section className="relative overflow-hidden bg-[#06321b] text-white">
          <FondoHero />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:py-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300 ring-1 ring-white/15">
                <Sparkles className="h-3.5 w-3.5" /> Hub de exportación Brasil → Uruguay
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.05] md:text-5xl">
                Importá repuestos de Brasil a <span className="text-amber-300">todo Uruguay</span>,
                sin complicarte con la aduana.
              </h1>
              <p className="mt-4 max-w-2xl text-white/85 md:text-lg">
                {s.repuestos > 0 ? `Más de ${fmt(s.repuestos)} repuestos ` : "Repuestos "}
                para tractores, cosechadoras, línea amarilla, camiones e inyección diesel. Origen
                Mercosur (0% de arancel), documentación completa y despacho a tu local. Nosotros
                resolvemos la frontera; vos recibís la pieza.
              </p>
              <BotonesCTA wa={wa} catalogo="/empresas" />
              <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5">
                <Stat valor={`${fmt(s.repuestos)}+`} label="Repuestos" />
                <Stat valor={String(s.departamentos)} label="Departamentos" />
                <Stat valor={`${s.ciudades}+`} label="Ciudades" />
                <Stat valor={String(s.pasos)} label="Pasos de frontera" />
                <Stat valor="0%" label="Arancel Mercosur" />
              </div>
            </div>

            <div className="rounded-3xl bg-black/20 p-4 ring-1 ring-white/10 md:p-6">
              <p className="mb-2 text-center text-sm font-bold text-white/90">
                Entramos por los 6 pasos y llegamos a cada rincón del país
              </p>
              <MapaCaminhos />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 md:py-14">
          {/* Selos */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SELOS.map((sel) => (
              <div key={sel.t} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <sel.icon className="h-6 w-6 text-emerald-600" />
                <p className="mt-2 font-bold text-zinc-900">{sel.t}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{sel.d}</p>
              </div>
            ))}
          </section>

          {/* Vitrine de produtos reais */}
          {productos.length > 0 && (
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-extrabold text-zinc-900 md:text-3xl">
                    Algunos de los repuestos que exportamos
                  </h2>
                  <p className="mt-1 text-zinc-600">
                    Piezas reales de nuestro stock, con código original y foto. Cotizamos en USD
                    (FOB).
                  </p>
                </div>
                <a href="/loja" className="text-sm font-bold text-primary hover:underline">
                  Ver todo el catálogo →
                </a>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
                {productos.map((p, i) => (
                  <CardLoja key={p.sku} p={p} prioridade={i < 2} />
                ))}
              </div>
            </section>
          )}

          {/* Líneas de exportación */}
          <section>
            <h2 className="text-2xl font-extrabold text-zinc-900 md:text-3xl">
              Líneas de exportación
            </h2>
            <p className="mt-1 text-zinc-600">
              Elegí tu tipo de máquina y mirá los repuestos, sistemas y marcas que importamos.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MAQUINAS_EXPORT.map((m) => (
                <Link
                  key={m.slug}
                  to="/exportacion/$maquina"
                  params={{ maquina: m.slug }}
                  className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <Factory className="h-6 w-6 text-primary" />
                  <p className="mt-2 text-lg font-extrabold text-zinc-900 group-hover:text-primary">
                    Repuestos para {m.plural}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">{m.sistemas.slice(0, 5).join(", ")}…</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
                    Ver línea <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Tipos de repuesto */}
          <section>
            <h2 className="text-2xl font-extrabold text-zinc-900 md:text-3xl">
              Todo tipo de repuesto
            </h2>
            <p className="mt-1 text-zinc-600">
              Desde un retén hasta una bomba inyectora. Si tiene código, lo conseguimos.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {TIPOS_PIEZA.map((t) => (
                <Link
                  key={t.slug}
                  to="/exportacion/repuestos/$tipo"
                  params={{ tipo: t.slug }}
                  className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <Wrench className="h-5 w-5" />
                  </span>
                  <span className="font-bold leading-tight text-zinc-900 group-hover:text-primary">
                    {t.es}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Cómo importar */}
          <section className="rounded-3xl bg-[#06321b] p-6 text-white md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold md:text-3xl">Cómo importar en 5 pasos</h2>
                <p className="mt-1 max-w-2xl text-white/80">
                  Un asesor te acompaña de principio a fin. Vos no tocás la aduana.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/exportacion/calculadora"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-400 px-5 font-bold text-[#06321b] hover:brightness-95"
                >
                  <Calculator className="h-4 w-4" /> Calculá tu costo
                </Link>
                <Link
                  to="/exportacion/como-importar"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/40 px-5 font-semibold text-white hover:bg-white/10"
                >
                  Guía completa <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {PASOS_IMPORTAR.map((p) => (
                <li key={p.n} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-400 font-extrabold text-[#06321b]">
                    {p.n}
                  </div>
                  <p className="mt-3 font-bold">{p.t}</p>
                  <p className="mt-1 text-sm text-white/75">{p.d}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Nuestra estructura (startup) */}
          <section>
            <h2 className="text-2xl font-extrabold text-zinc-900 md:text-3xl">
              No somos un catálogo: somos tu operación de importación
            </h2>
            <p className="mt-1 max-w-3xl text-zinc-600">
              Montamos toda la cadena entre el stock en Brasil y tu local en Uruguay. Vos pedís; el
              resto lo hacemos nosotros.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PILARES_ESTRUCTURA.map((p) => {
                const Icono = ICONOS[p.icon as keyof typeof ICONOS] ?? Factory;
                return (
                  <div key={p.t} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <Icono className="h-5 w-5" />
                    </span>
                    <p className="mt-3 font-extrabold text-zinc-900">{p.t}</p>
                    <p className="mt-1 text-sm text-zinc-600">{p.d}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Exportamos a todo Uruguay — por departamento */}
          <section>
            <h2 className="text-2xl font-extrabold text-zinc-900 md:text-3xl">
              Exportamos a todo Uruguay
            </h2>
            <p className="mt-1 text-zinc-600">
              {s.departamentos} departamentos, {s.ciudades}+ ciudades. Elegí la tuya y mirá la
              frontera de entrada y cómo importar.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deps.map((d) => (
                <div
                  key={d.departamento}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
                >
                  <p className="flex items-center gap-2 font-extrabold text-zinc-900">
                    <MapPin className="h-4 w-4 text-primary" /> {d.departamento}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.ciudades.map((c) => (
                      <Link
                        key={c.slug}
                        to="/exportacion/$maquina/$ciudad"
                        params={{ maquina: "tractores", ciudad: c.slug }}
                        className="rounded-full bg-[#f3f5f1] px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-primary"
                      >
                        {c.nombre}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA revendedor */}
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#06321b] to-[#0f6b38] p-6 text-white md:p-10">
            <h2 className="text-2xl font-extrabold md:text-3xl">
              ¿Sos revendedor, taller o logista en Uruguay?
            </h2>
            <p className="mt-2 max-w-3xl text-white/85">
              Registrá tu empresa y accedé a precio de distribuidor, reposición recurrente y un
              asesor dedicado. Importá en grandes y pequeñas cantidades, con origen Mercosur y
              despacho hasta tu local.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/empresas/registro"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-400 px-6 font-bold text-[#06321b] hover:brightness-95"
              >
                Registrar mi empresa <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/40 px-6 font-semibold text-white hover:bg-white/10"
              >
                <MessageCircle className="h-5 w-5" /> Hablar por WhatsApp
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- pilar por TIPO de peça
export function ldExportTipo(t: TipoPieza, url: string, total: number) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Inicio", item: u("/") },
        { name: "Exportación a Uruguay", item: u("/exportacion") },
        { name: t.es, item: url },
      ].map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: `Exportación de ${t.plural}`,
      provider: { "@type": "Organization", name: "AGRO PARTS", url: SITE_URL },
      areaServed: { "@type": "Country", name: "Uruguay" },
      description: descripcionTipo(t, total),
    },
  ];
}

export function PaginaExportacionTipo({ tipo: t, dados }: { tipo: TipoPieza; dados: Dados }) {
  const wa = whatsappContactUrl(`¡Hola! Quiero importar ${t.plural} a Uruguay.`);
  const otras = TIPOS_PIEZA.filter((x) => x.slug !== t.slug).slice(0, 8);
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-[#06321b] text-white">
          <FondoHero />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
          />
          <div className="relative mx-auto max-w-7xl px-4 py-8 md:py-12">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
              <Link to="/" className="hover:text-white">
                Inicio
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/exportacion" className="hover:text-white">
                Exportación
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">{t.es}</span>
            </nav>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
              {t.es} — exportación a Uruguay
            </h1>
            <p className="mt-4 max-w-3xl text-white/85 md:text-lg">
              {dados.total > 0 ? `Más de ${fmt(dados.total)} ítems. ` : ""}
              {t.intro}
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              <li className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-amber-300" /> Origen Mercosur · 0% arancel · USD
                (FOB)
              </li>
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-300" /> Despacho a todo Uruguay
              </li>
            </ul>
            <BotonesCTA wa={wa} catalogo={urlCatalogoTipo(t)} />
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 md:py-12">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SELOS.map((sel) => (
              <div key={sel.t} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <sel.icon className="h-6 w-6 text-emerald-600" />
                <p className="mt-2 font-bold text-zinc-900">{sel.t}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{sel.d}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
            <h2 className="text-xl font-extrabold text-zinc-900">¿Qué incluye?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.incluye.map((x) => (
                <span
                  key={x}
                  className="rounded-full bg-[#f3f5f1] px-3 py-1.5 text-sm font-medium text-zinc-700"
                >
                  {x}
                </span>
              ))}
            </div>
          </section>

          {dados.produtos.length > 0 && (
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                  {t.es} disponibles
                </h2>
                <a
                  href={urlCatalogoTipo(t)}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Ver los {fmt(dados.total)} ítems →
                </a>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
                {dados.produtos.map((p, i) => (
                  <CardLoja key={p.sku} p={p} prioridade={i < 2} />
                ))}
              </div>
            </section>
          )}

          {/* Máquinas donde se usa */}
          <section>
            <h2 className="text-lg font-extrabold text-zinc-900">
              {t.es} para cada tipo de máquina
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {t.maquinas
                .map((s) => maquinaPorSlug(s))
                .filter((m): m is MaquinaExport => !!m)
                .map((m) => (
                  <Link
                    key={m.slug}
                    to="/exportacion/$maquina"
                    params={{ maquina: m.slug }}
                    className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                  >
                    <Factory className="h-5 w-5 text-primary" />
                    <span className="mt-2 block font-bold text-zinc-900 group-hover:text-primary">
                      {t.es} para {m.plural}
                    </span>
                  </Link>
                ))}
            </div>
          </section>

          {/* Otros tipos */}
          <section>
            <h2 className="text-lg font-extrabold text-zinc-900">Otros repuestos que exportamos</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {otras.map((x) => (
                <Link
                  key={x.slug}
                  to="/exportacion/repuestos/$tipo"
                  params={{ tipo: x.slug }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                >
                  <Wrench className="h-3.5 w-3.5 text-primary" /> {x.es}
                </Link>
              ))}
            </div>
          </section>

          {/* Ciudades */}
          <section>
            <h2 className="text-lg font-extrabold text-zinc-900">Exportamos a todo Uruguay</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {CIUDADES_EXPORT.map((c) => (
                <Link
                  key={c.slug}
                  to="/exportacion/$maquina/$ciudad"
                  params={{ maquina: t.maquinas[0] ?? "tractores", ciudad: c.slug }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {c.nombre}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- guia: /exportacion/como-importar
const DOCS_IMPORTAR = [
  {
    t: "Factura proforma",
    d: "Con NCM, origen, Incoterm y condiciones de pago. La armamos nosotros.",
  },
  {
    t: "Factura comercial y packing list",
    d: "Documentos del embarque que usa tu despachante en el DUA.",
  },
  { t: "Certificado / declaración de origen", d: "Prueba Mercosur (ACE 02/18). Válida 12 meses." },
  { t: "NF-e y DU-E de exportación", d: "Trámite brasileño. Lo hacemos de nuestro lado." },
  { t: "CRT y MIC/DTA", d: "Documentos del transporte internacional por carretera." },
];

const FAQ_IMPORTAR = [
  {
    p: "¿Cuánto pago de impuestos al importar?",
    r: `Con origen Mercosur comprobado, el arancel es 0% (ACE 02/18). Pagás la Tasa Consular (${TAXAS_PADRAO.tasaConsularMercosul}% Mercosur) y el IVA de importación (${TAXAS_PADRAO.iva}%), que suele ser crédito fiscal para empresas. Te mostramos el costo estimado antes de cerrar.`,
  },
  {
    p: "¿Necesito ser empresa para importar?",
    r: "Para importar y despachar en aduana conviene operar como empresa (RUT) con un despachante. Si sos persona física o pequeño taller, te orientamos la mejor vía y podemos consolidar con otros pedidos.",
  },
  {
    p: "¿Quién hace el despacho en Uruguay?",
    r: "El despachante del comprador registra el DUA en el sistema LUCIA de la DNA. Si no tenés uno, te conectamos con un despachante aliado en tu zona.",
  },
  {
    p: "¿Cómo se calcula el flete?",
    r: "Es interno y lo calculamos por el peso cubicado de tu pedido y la distancia hasta tu ciudad. Te lo informamos junto con la cotización, antes de confirmar.",
  },
  {
    p: "¿Cuánto tarda?",
    r: "Depende del armado del pedido y del stock, pero el tramo de frontera y despacho es ágil porque trabajamos los 6 pasos con despachante de cada lado.",
  },
];

export function ldComoImportar(url: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Inicio", item: u("/") },
        { name: "Exportación a Uruguay", item: u("/exportacion") },
        { name: "Cómo importar", item: url },
      ].map((t, i) => ({ "@type": "ListItem", position: i + 1, ...t })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "Cómo importar repuestos de Brasil a Uruguay",
      inLanguage: "es-UY",
      step: ETAPAS.map((e, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: e.es,
        text: e.base,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_IMPORTAR.map((q) => ({
        "@type": "Question",
        name: q.p,
        acceptedAnswer: { "@type": "Answer", text: q.r },
      })),
    },
  ];
}

export function PaginaComoImportar() {
  const wa = whatsappContactUrl(
    "¡Hola! Quiero importar repuestos de Brasil a Uruguay. ¿Me ayudan con el proceso?",
  );
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#06321b] text-white">
          <FondoHero />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:py-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
                <Link to="/" className="hover:text-white">
                  Inicio
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link to="/exportacion" className="hover:text-white">
                  Exportación
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-white">Cómo importar</span>
              </nav>
              <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">
                Cómo importar repuestos de Brasil a Uruguay
              </h1>
              <p className="mt-4 max-w-2xl text-white/85 md:text-lg">
                La guía completa, paso a paso, con la documentación, los impuestos y la frontera. Lo
                hacemos todo con vos: origen Mercosur (0% de arancel), despacho a tu local y un
                asesor dedicado.
              </p>
              <BotonesCTA wa={wa} catalogo="/exportacion" />
            </div>
            <div className="rounded-3xl bg-black/20 p-4 ring-1 ring-white/10 md:p-6">
              <MapaCaminhos />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 md:py-14">
          {/* Por qué conviene */}
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { t: "0% de arancel", d: "Con origen Mercosur comprobado (ACE 02/18)." },
              { t: "Documentación lista", d: "Proforma, NCM, origen y packing list resueltos." },
              { t: "Sin vueltas de aduana", d: "Trabajamos los 6 pasos con despachante aliado." },
            ].map((b) => (
              <div
                key={b.t}
                className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5"
              >
                <p className="text-lg font-extrabold text-emerald-700">{b.t}</p>
                <p className="mt-1 text-sm text-zinc-600">{b.d}</p>
              </div>
            ))}
          </section>

          {/* Timeline de etapas */}
          <section>
            <h2 className="text-2xl font-extrabold text-zinc-900 md:text-3xl">
              El trámite paso a paso
            </h2>
            <p className="mt-1 text-zinc-600">
              De la propuesta a la entrega. Marcamos lo que hacemos nosotros y lo que necesitamos de
              vos.
            </p>
            <ol className="mt-6 space-y-3">
              {ETAPAS.map((e, i) => (
                <li
                  key={e.id}
                  className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 font-extrabold text-white">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-extrabold text-zinc-900">{e.es}</p>
                    <p className="mt-0.5 text-sm text-zinc-600">{e.base}</p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        e.cliente
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {e.cliente ? "Con tu participación" : "Lo hacemos nosotros"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Documentos */}
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-2xl font-extrabold text-zinc-900">Documentación necesaria</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DOCS_IMPORTAR.map((d) => (
                <div key={d.t} className="flex gap-3">
                  <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-bold text-zinc-900">{d.t}</p>
                    <p className="text-sm text-zinc-600">{d.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Costos */}
          <section>
            <h2 className="text-2xl font-extrabold text-zinc-900 md:text-3xl">
              Qué pagás al importar
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { t: "Arancel", v: "0%", d: "Con origen Mercosur comprobado" },
                {
                  t: "Tasa Consular",
                  v: `${TAXAS_PADRAO.tasaConsularMercosul}%`,
                  d: "Sobre el valor en aduana (Mercosur)",
                },
                { t: "IVA importación", v: `${TAXAS_PADRAO.iva}%`, d: "Suele ser crédito fiscal" },
                { t: "Despachante", v: "A cotizar", d: "Honorarios del despacho en Uruguay" },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    {c.t}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-700">{c.v}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{c.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Estimación referencial para que compares; el cálculo oficial lo hace tu despachante.
              Te damos el costo estimado total junto con la proforma.
            </p>
            <Link
              to="/exportacion/calculadora"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700"
            >
              <Calculator className="h-4 w-4" /> Calculá tu costo desembarcado
            </Link>
          </section>

          {/* Pasos de frontera */}
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-2xl font-extrabold text-zinc-900">Los 6 pasos de frontera</h2>
            <p className="mt-1 text-zinc-600">
              Entramos por el paso más cercano a tu departamento, para acortar tiempos y flete.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(PONTOS_FRONTEIRA).map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 rounded-xl bg-[#f3f5f1] px-3 py-2 text-sm font-semibold text-zinc-800"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-primary" /> {f}
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-2xl font-extrabold text-zinc-900">Preguntas frecuentes</h2>
            <div className="mt-3 divide-y divide-zinc-100">
              {FAQ_IMPORTAR.map((q) => (
                <details key={q.p} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-zinc-900">
                    {q.p}
                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-zinc-600">{q.r}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#06321b] to-[#0f6b38] p-6 text-white md:p-10">
            <h2 className="text-2xl font-extrabold md:text-3xl">Empezá tu importación hoy</h2>
            <p className="mt-2 max-w-3xl text-white/85">
              Mandanos los códigos o contanos qué máquina tenés. Armamos la proforma con el costo
              estimado y te acompañamos hasta la entrega.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-400 px-6 font-bold text-[#06321b] hover:brightness-95"
              >
                <MessageCircle className="h-5 w-5" /> Cotizar por WhatsApp
              </a>
              <Link
                to="/empresas/registro"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/40 px-6 font-semibold text-white hover:bg-white/10"
              >
                Registrar mi empresa <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
