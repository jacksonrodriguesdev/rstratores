import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Lock, Eye, MessageCircle, ChevronRight, Check, Mail, Wrench } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/site";
import { catalogoPublicoFn, idDoSlugCatalogo, urlCatalogo, type Catalogo } from "@/lib/catalogos";
import { getSessionFn } from "@/lib/user-auth";
import { pedirCadastro } from "@/lib/pedir-cadastro";
import { slugDaMarca } from "@/lib/seo-paginas";
import { whatsappContactUrl } from "@/lib/whatsapp";

// Página pública de um catálogo (/catalogos/<titulo>-<id>): o Google indexa o título, a marca e
// o que o PDF traz; o PDF em si continua pedindo a conta (pop-up só com e-mail).
export const Route = createFileRoute("/catalogos/$slug")({
  loader: async ({ params }) => {
    const id = idDoSlugCatalogo(params.slug);
    if (!id) throw notFound();
    const r = await catalogoPublicoFn({ data: { id } });
    if (!r) throw redirect({ to: "/catalogos" });
    // Título mudou: leva para o endereço certo
    const certo = urlCatalogo(r.catalogo);
    if (certo !== `/catalogos/${params.slug}`) throw redirect({ href: certo, statusCode: 301 });
    return r;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const c = loaderData.catalogo;
    const url = `${SITE_URL}${urlCatalogo(c)}`;
    const titulo = `${c.titulo}${c.marca && !c.titulo.toLowerCase().includes(c.marca.toLowerCase()) ? ` ${c.marca}` : ""} — ${c.tipo} PDF | AGRO PARTS`;
    const desc = descricaoCurta(c);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DigitalDocument",
            name: c.titulo,
            description: desc,
            url,
            encodingFormat: "application/pdf",
            ...(c.idioma && { inLanguage: c.idioma }),
            isAccessibleForFree: true,
            ...(c.marca && { about: { "@type": "Brand", name: c.marca } }),
            publisher: { "@type": "Organization", name: "AGRO PARTS", url: SITE_URL },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Catálogos", item: `${SITE_URL}/catalogos` },
              { "@type": "ListItem", position: 3, name: c.titulo, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: CatalogoPage,
});

// O que cada tipo de PDF traz (texto da página quando o admin não escreveu uma descrição)
const CONTEUDO: Record<string, string[]> = {
  "Catálogo de piezas": [
    "Despieces (vistas explotadas) de cada conjunto del equipo",
    "Códigos originales de cada pieza, para pedir el repuesto exacto",
    "Cantidades y posiciones de montaje",
  ],
  "Manual de taller": [
    "Procedimientos de desarme, reparación y armado",
    "Torques de apriete, ajustes y tolerancias",
    "Diagnóstico de fallas y especificaciones técnicas",
  ],
  "Manual del operador": [
    "Uso correcto y controles del equipo",
    "Mantenimiento diario e intervalos de servicio",
    "Lubricantes, filtros y capacidades recomendadas",
  ],
  "Ficha técnica": ["Especificaciones técnicas del equipo", "Medidas, pesos y capacidades"],
};
const itensDe = (c: Catalogo) => CONTEUDO[c.tipo] ?? ["Información técnica del equipo en PDF"];

function descricaoCurta(c: Catalogo) {
  const base = c.descricao?.trim() || `${c.tipo}${c.marca ? ` ${c.marca}` : ""} en PDF: ${c.titulo}. ${itensDe(c)[0]}.`;
  return `${base.slice(0, 150)}${base.length > 150 ? "…" : ""} Gratis con tu e-mail en AGRO PARTS, Uruguay.`;
}

const tamanhoMB = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(b > 104857600 ? 0 : 1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function CatalogoPage() {
  const { catalogo: c, relacionados } = Route.useLoaderData();
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const visor = `/catalogos/ver/${c.id}`;
  const livre = !c.exige_login || !!sessao;
  const marcaSlug = c.marca ? slugDaMarca(c.marca) : null;

  const abrir = (e: React.MouseEvent) => {
    if (livre) return;
    e.preventDefault();
    pedirCadastro({ motivo: "catalogo", destino: visor });
  };

  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <section className="bg-[#06321b] text-white">
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-6 md:pb-16 md:pt-10">
          <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1 text-sm text-white/60">
            <Link to="/" className="hover:text-white">Inicio</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/catalogos" className="hover:text-white">Catálogos</Link>
          </nav>
          <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-28 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-red-600 shadow-xl">
              <FileText className="h-10 w-10" />
              <span className="mt-1 text-xs font-extrabold">PDF</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400">{[c.tipo, c.marca].filter(Boolean).join(" · ")}</p>
              <h1 className="mt-1 text-2xl font-extrabold leading-tight md:text-4xl">{c.titulo}</h1>
              <p className="mt-2 text-sm text-white/70">{["PDF", c.idioma, tamanhoMB(c.tamanho), c.downloads > 0 ? `${c.downloads} vistas` : null].filter(Boolean).join(" · ")}</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <a href={visor} onClick={abrir} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 font-extrabold text-[#06321b] shadow-lg hover:bg-amber-300">
                  {livre ? <Eye className="h-5 w-5" /> : <Lock className="h-5 w-5" />} {livre ? "Ver el catálogo" : "Ver gratis con tu e-mail"}
                </a>
                <a href={whatsappContactUrl(`¡Hola! Vi el catálogo "${c.titulo}" y busco una pieza: `)} target="_blank" rel="noreferrer noopener" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-6 font-bold text-white ring-1 ring-white/25 hover:bg-white/15">
                  <MessageCircle className="h-5 w-5" /> Pedir una pieza
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative mx-auto -mt-6 max-w-5xl space-y-5 px-3 pb-12 md:px-4">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
          <h2 className="text-lg font-extrabold text-zinc-900">Qué trae este {c.tipo.toLowerCase()}</h2>
          {c.descricao?.trim() && <p className="mt-2 whitespace-pre-line text-zinc-700">{c.descricao.trim()}</p>}
          <ul className="mt-3 space-y-2">
            {itensDe(c).map((t) => (
              <li key={t} className="flex gap-2 text-zinc-700"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {t}</li>
            ))}
          </ul>
          {!livre && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-800"><Mail className="h-5 w-5 shrink-0 text-amber-600" /> Solo tu e-mail: accedés a este y a todos los catálogos, y te llevás un cupón para tu primera compra.</p>
              <button onClick={() => pedirCadastro({ motivo: "catalogo", destino: visor })} className="h-11 shrink-0 rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary/90">Acceder gratis</button>
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="flex items-center gap-2 font-extrabold text-zinc-900"><Wrench className="h-5 w-5 text-primary" /> ¿Encontraste el código de la pieza?</h2>
            <p className="mt-2 text-sm text-zinc-600">Buscalo en la tienda o mandanos el código por WhatsApp: te pasamos precio y te lo enviamos a todo Uruguay por DAC.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/loja" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90">Buscar por código</Link>
              {marcaSlug && <Link to="/repuestos/$slug" params={{ slug: marcaSlug }} className="rounded-xl px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-primary/30 hover:bg-primary/5">Repuestos {c.marca}</Link>}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="font-extrabold text-zinc-900">Preguntas frecuentes</h2>
            <dl className="mt-2 space-y-3 text-sm">
              <div><dt className="font-bold text-zinc-800">¿Es gratis?</dt><dd className="text-zinc-600">Sí. Solo necesitás una cuenta de AGRO PARTS, que se crea con tu e-mail en segundos.</dd></div>
              <div><dt className="font-bold text-zinc-800">¿Se puede ver en el celular?</dt><dd className="text-zinc-600">Sí, el catálogo se abre en el navegador, en el celular o en la computadora.</dd></div>
              <div><dt className="font-bold text-zinc-800">¿Venden las piezas del catálogo?</dt><dd className="text-zinc-600">Conseguimos la mayoría por código. Consultá por WhatsApp.</dd></div>
            </dl>
          </div>
        </section>

        {relacionados.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-zinc-900"><BookOpen className="h-5 w-5 text-primary" /> Otros catálogos</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relacionados.map((o) => (
                <a key={o.id} href={urlCatalogo(o)} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
                  {o.marca && <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">{o.marca}</p>}
                  <p className="mt-0.5 line-clamp-2 font-bold leading-snug text-zinc-900">{o.titulo}</p>
                  <p className="mt-1 text-xs text-zinc-500">{o.tipo}</p>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
