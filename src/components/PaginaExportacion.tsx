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
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CardLoja } from "@/components/CardPeca";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";
import type { Product } from "@/lib/products";
import {
  MAQUINAS_EXPORT,
  CIUDADES_EXPORT,
  ciudadesVecinas,
  tituloExport,
  descripcionExport,
  textoExport,
  preguntasExport,
  frasesExport,
  urlCatalogoExport,
  totalFrasesExport,
  type MaquinaExport,
  type CiudadExport,
} from "@/lib/seo-exportacion";

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
  { icon: Globe2, t: "Origen Mercosur", d: "0% de arancel con origen comprobado (ACE 02/18)." },
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
                <Globe2 className="h-4 w-4 text-amber-300" /> Origen Mercosur — 0% de arancel
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

// ---------------------------------------------------------------- hub geral /exportacion
export function PaginaExportacionHome({ total }: { total: number }) {
  const wa = whatsappContactUrl("¡Hola! Soy revendedor en Uruguay y quiero importar repuestos.");
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-[#06321b] text-white">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
          />
          <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-14">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-300">
              <Truck className="h-4 w-4" /> Exportación a Uruguay
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
              Repuestos importados para tractores, cosechadoras, excavadoras, camiones e inyección
              diesel
            </h1>
            <p className="mt-4 max-w-3xl text-white/85 md:text-lg">
              {total > 0 ? `Más de ${fmt(total)} repuestos ` : "Repuestos "}
              con origen Mercosur (0% de arancel), despacho a todo Uruguay y documentación completa.
              Importá directo desde Brasil, sin intermediarios.
            </p>
            <BotonesCTA wa={wa} catalogo="/empresas" />
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 md:py-12">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SELOS.map((s) => (
              <div key={s.t} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <s.icon className="h-6 w-6 text-emerald-600" />
                <p className="mt-2 font-bold text-zinc-900">{s.t}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{s.d}</p>
              </div>
            ))}
          </section>

          <section>
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              Líneas de exportación
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              Exportamos a todo Uruguay
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {CIUDADES_EXPORT.map((c) => (
                <Link
                  key={c.slug}
                  to="/exportacion/$maquina/$ciudad"
                  params={{ maquina: "tractores", ciudad: c.slug }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {c.nombre}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-xl font-extrabold text-zinc-900">
              ¿Sos revendedor o logista en Uruguay?
            </h2>
            <p className="mt-2 max-w-3xl text-zinc-700">
              Importá repuestos agrícolas, de camiones y de línea amarilla directo desde Brasil, en
              grandes y pequeñas cantidades. Precio de distribuidor, origen Mercosur y despacho
              hasta tu local. {totalFrasesExport() > 0 ? "" : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/empresas/registro"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"
              >
                Registrar mi empresa <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-300 px-6 font-semibold text-slate-700 hover:bg-slate-50"
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
