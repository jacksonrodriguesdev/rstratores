import { Link } from "@tanstack/react-router";
import { ChevronRight, ChevronDown, Truck, MessageCircle, ShieldCheck, Search, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CardLoja } from "@/components/CardPeca";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";
import { MARCAS_SEO, CATEGORIAS_SEO, perguntasFrequentes, urlRepuestos, type MarcaSeo, type CategoriaSeo } from "@/lib/seo-paginas";
import type { PaginaRepuestos as Dados } from "@/lib/repuestos";

// Página de entrada para o Google: "Repuestos John Deere en Uruguay", "Filtros para Massey
// Ferguson"... Texto próprio, peças já no HTML, links para as combinações e perguntas frequentes.
type Props = { marca?: MarcaSeo | null; categoria?: CategoriaSeo | null; dados: Dados };

const fmt = (n: number) => n.toLocaleString("es-UY");

export function tituloRepuestos(marca?: MarcaSeo | null, categoria?: CategoriaSeo | null) {
  if (marca && categoria) return `${categoria.nome} para ${marca.marca} en Uruguay`;
  if (marca) return `Repuestos ${marca.marca} en Uruguay`;
  if (categoria) return `${categoria.nome} para tractores en Uruguay`;
  return "Repuestos para tractores en Uruguay";
}

export function descricaoRepuestos(marca?: MarcaSeo | null, categoria?: CategoriaSeo | null, total?: number) {
  const qtd = total ? `${fmt(total)} repuestos` : "Repuestos";
  if (marca && categoria) return `${qtd} de ${categoria.nome.toLowerCase()} para tractores ${marca.marca}. Código original, envío a todo Uruguay por DAC y cotización por WhatsApp.`;
  if (marca) return `${qtd} para tractores ${marca.marca} (${marca.modelos.split(",").slice(0, 4).join(",")}…). Envío a todo Uruguay por DAC. Cotizá por WhatsApp.`;
  if (categoria) return `${qtd} de ${categoria.nome.toLowerCase()} para Massey Ferguson, Valtra, John Deere, New Holland y más. Envío a todo Uruguay por DAC.`;
  return "Repuestos para tractores y cosechadoras con envío a todo Uruguay.";
}

// Dados estruturados: trilha, lista de peças e perguntas frequentes
export function ldRepuestos(url: string, marca: MarcaSeo | null | undefined, categoria: CategoriaSeo | null | undefined, dados: Dados) {
  const titulo = tituloRepuestos(marca, categoria);
  const trilha = [
    { name: "Inicio", item: `${SITE_URL}/` },
    { name: "Repuestos", item: `${SITE_URL}/repuestos` },
    ...(marca ? [{ name: marca.marca, item: `${SITE_URL}/repuestos/${marca.slug}` }] : []),
    ...(categoria ? [{ name: categoria.nome, item: url }] : []),
  ];
  const alvo = marca && categoria ? `${categoria.nome.toLowerCase()} ${marca.marca}` : marca ? marca.marca : categoria ? categoria.nome.toLowerCase() : "";
  return [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: trilha.map((t, i) => ({ "@type": "ListItem", position: i + 1, ...t })) },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: titulo,
      url,
      description: descricaoRepuestos(marca, categoria, dados.total),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: dados.total,
        itemListElement: dados.produtos.slice(0, 20).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/produto/${encodeURIComponent(p.sku.trim())}` })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: perguntasFrequentes(alvo).map((q) => ({ "@type": "Question", name: q.p, acceptedAnswer: { "@type": "Answer", text: q.r } })),
    },
  ];
}

export function PaginaRepuestos({ marca, categoria, dados }: Props) {
  const titulo = tituloRepuestos(marca, categoria);
  const alvo = marca && categoria ? `${categoria.nome.toLowerCase()} ${marca.marca}` : marca ? marca.marca : categoria?.nome.toLowerCase() ?? "";
  const lojaParams = new URLSearchParams();
  if (categoria) lojaParams.set("categoria", categoria.categoria);
  if (marca) lojaParams.set("marca", marca.marca);
  const lojaUrl = `/loja?${lojaParams.toString()}`;
  const whats = whatsappContactUrl(`¡Hola! Busco ${alvo ? `repuestos ${alvo}` : "repuestos"}. ¿Me ayudan?`);

  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        {/* Topo */}
        <section className="relative overflow-hidden bg-[#06321b] text-white">
          <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-8 md:py-12">
            <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1 text-sm text-white/70">
              <Link to="/" className="hover:text-white">Inicio</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/repuestos" className="hover:text-white">Repuestos</Link>
              {marca && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <a href={`/repuestos/${marca.slug}`} className="hover:text-white">{marca.marca}</a>
                </>
              )}
              {categoria && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-white">{categoria.nome}</span>
                </>
              )}
            </nav>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">{titulo}</h1>
            <p className="mt-4 max-w-3xl text-base text-white/85 md:text-lg">
              {marca && categoria ? `${categoria.texto} Para tractores ${marca.marca}: ${marca.modelos}.` : marca ? marca.texto : categoria?.texto}
            </p>
            {marca && !categoria && <p className="mt-2 max-w-3xl text-sm text-white/70">Para modelos como {marca.modelos}.</p>}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={lojaUrl} className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 font-bold text-[#06321b] hover:bg-amber-300">
                <Search className="h-5 w-5" /> Ver {dados.total ? `los ${fmt(dados.total)} repuestos` : "repuestos"}
              </a>
              <a href={whats} target="_blank" rel="noreferrer noopener" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-5 font-bold text-[#06381b] hover:brightness-95">
                <MessageCircle className="h-5 w-5" /> Cotizar por WhatsApp
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-amber-300" /> Envíos a todo Uruguay por DAC</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" /> Código original y compatibilidad confirmada</li>
              <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-amber-300" /> Atención por WhatsApp</li>
            </ul>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 md:py-12">
          {/* Combinações: categorias da marca, ou marcas da categoria */}
          {dados.facetas.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                {marca ? `Repuestos ${marca.marca} por categoría` : `${categoria?.nome} por marca de tractor`}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {dados.facetas.map((f) => {
                  const url = marca ? urlRepuestos({ marca: marca.marca, categoria: f.chave }) : urlRepuestos({ marca: f.chave, categoria: categoria!.categoria });
                  const rotulo = marca ? CATEGORIAS_SEO.find((c) => c.categoria === f.chave)?.nome ?? f.chave : f.chave;
                  return (
                    <a key={f.chave} href={url ?? lojaUrl} className="group flex items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40">
                      <span>
                        <span className="block font-bold text-zinc-900 group-hover:text-primary">{rotulo}</span>
                        <span className="text-xs text-zinc-500">{fmt(f.total)} repuestos</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-primary" />
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Peças */}
          <section>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">{marca && categoria ? `${categoria.nome} ${marca.marca}` : marca ? `Repuestos ${marca.marca} destacados` : `${categoria?.nome} destacados`}</h2>
              <a href={lojaUrl} className="text-sm font-bold text-primary hover:underline">Ver todos →</a>
            </div>
            {dados.produtos.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
                {dados.produtos.map((p) => <CardLoja key={p.sku} p={p} />)}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-white p-6 text-zinc-600 ring-1 ring-black/5">
                Consultanos por WhatsApp: conseguimos repuestos {alvo} aunque no estén publicados en el sitio.
              </p>
            )}
            {dados.total > dados.produtos.length && (
              <div className="mt-6 text-center">
                <a href={lojaUrl} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-white hover:bg-primary/90">
                  Ver los {fmt(dados.total)} repuestos en la tienda <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </section>

          {/* Perguntas */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">Preguntas frecuentes</h2>
            <div className="mt-3 divide-y divide-zinc-100">
              {perguntasFrequentes(alvo).map((q) => (
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

          {/* Outras marcas e categorias (links internos) */}
          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">Repuestos por marca</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {MARCAS_SEO.map((m) => (
                  <a key={m.slug} href={categoria ? urlRepuestos({ marca: m.marca, categoria: categoria.categoria })! : `/repuestos/${m.slug}`}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40">
                    {categoria ? `${categoria.nome} ${m.marca}` : m.marca}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">Repuestos por categoría</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIAS_SEO.map((c) => (
                  <a key={c.slug} href={marca ? urlRepuestos({ marca: marca.marca, categoria: c.categoria })! : `/repuestos/${c.slug}`}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40">
                    {marca ? `${c.nome} ${marca.marca}` : c.nome}
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
