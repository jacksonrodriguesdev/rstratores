import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ChevronDown,
  Truck,
  MessageCircle,
  ShieldCheck,
  Search,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CardLoja } from "@/components/CardPeca";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";
import { comPrefixo, useT, type Idioma } from "@/lib/idioma";
import { MARCAS_SEO, CATEGORIAS_SEO, urlRepuestos } from "@/lib/seo-paginas";
import {
  LOCAIS_SEO,
  localPorSlug,
  nomeLocal,
  textoLocal,
  tituloLocal,
  descricaoLocal,
  perguntasLocal,
  type LocalSeo,
} from "@/lib/locais-seo";
import type { Product } from "@/lib/products";

// Página de entrada por local ("repuestos agrícolas en Rocha", "peças agrícolas em Pelotas").
// O conteúdo muda com o perfil agrícola do local e as peças são da categoria em foco.
type Dados = { total: number; produtos: Product[] };
const fmt = (n: number, idioma: Idioma) => n.toLocaleString(idioma === "pt" ? "pt-BR" : "es-UY");

export function ldLocal(l: LocalSeo, url: string, dados: Dados, idioma: Idioma) {
  const u = (c: string) => `${SITE_URL}${comPrefixo(c, idioma)}`;
  const area =
    l.tipo === "pais"
      ? { "@type": "Country", name: "Uruguay" }
      : l.tipo === "cidade"
        ? {
            "@type": "City",
            name: l.nome,
            containedInPlace: { "@type": "AdministrativeArea", name: l.dentro },
          }
        : { "@type": "AdministrativeArea", name: l.nome };
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: idioma === "pt" ? "Início" : "Inicio", item: u("/") },
        {
          name: idioma === "pt" ? "Envios por região" : "Envíos por zona",
          item: u("/repuestos-agricolas"),
        },
        { name: nomeLocal(l, idioma), item: url },
      ].map((t, i) => ({ "@type": "ListItem", position: i + 1, ...t })),
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: tituloLocal(l, idioma),
      url,
      inLanguage: idioma === "pt" ? "pt-BR" : "es-UY",
      description: descricaoLocal(l, idioma, dados.total),
      about: { "@type": "Store", name: "AGRO PARTS", url: SITE_URL, areaServed: area },
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
      mainEntity: perguntasLocal(l, idioma).map((q) => ({
        "@type": "Question",
        name: q.p,
        acceptedAnswer: { "@type": "Answer", text: q.r },
      })),
    },
  ];
}

export function PaginaLocal({ local: l, dados }: { local: LocalSeo; dados: Dados }) {
  const { t, idioma, href } = useT();
  const nome = nomeLocal(l, idioma);
  const titulo = tituloLocal(l, idioma);
  const [p1, p2, p3] = textoLocal(l, idioma, dados.total);
  const cat = CATEGORIAS_SEO.find((c) => c.categoria === l.foco);
  const nomeCat = cat ? (idioma === "pt" ? cat.categoria : cat.nome) : "";
  const whats = whatsappContactUrl(
    t(
      `¡Hola! Estoy en ${nome} y busco un repuesto agrícola.`,
      `Olá! Estou em ${nome} e procuro uma peça agrícola.`,
    ),
  );
  const vizinhos = l.vizinhos.map(localPorSlug).filter(Boolean) as LocalSeo[];
  const lojaCat = href(`/loja?categoria=${encodeURIComponent(l.foco)}`);

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
            <nav
              aria-label={t("Ruta", "Caminho")}
              className="flex flex-wrap items-center gap-1 text-sm text-white/70"
            >
              <Link to="/" className="hover:text-white">
                {t("Inicio", "Início")}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <a href={href("/repuestos-agricolas")} className="hover:text-white">
                {t("Envíos por zona", "Envios por região")}
              </a>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">{nome}</span>
            </nav>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
              {titulo}
            </h1>
            <p className="mt-4 max-w-3xl text-base text-white/85 md:text-lg">{p1}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={href("/loja")}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 font-bold text-[#06321b] hover:bg-amber-300"
              >
                <Search className="h-5 w-5" />{" "}
                {t(
                  `Ver los ${fmt(dados.total, idioma)} repuestos`,
                  `Ver as ${fmt(dados.total, idioma)} peças`,
                )}
              </a>
              <a
                href={whats}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-5 font-bold text-[#06381b] hover:brightness-95"
              >
                <MessageCircle className="h-5 w-5" />{" "}
                {t("Cotizar por WhatsApp", "Orçamento pelo WhatsApp")}
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-300" />{" "}
                {l.pais === "RS"
                  ? t(
                      `Envío a ${nome} por Correios o transportadora`,
                      `Envio para ${nome} por Correios ou transportadora`,
                    )
                  : t(`Envío a ${nome} por DAC`, `Envio para ${nome} pela DAC`)}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-300" />{" "}
                {t(
                  "Compatibilidad confirmada antes de comprar",
                  "Compatibilidade confirmada antes da compra",
                )}
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-amber-300" />{" "}
                {t("Atención por WhatsApp", "Atendimento pelo WhatsApp")}
              </li>
            </ul>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 md:py-12">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
              <h2 className="text-xl font-extrabold text-zinc-900">
                {t(`Repuestos para el campo de ${nome}`, `Peças para o campo de ${nome}`)}
              </h2>
              <p className="mt-3 text-zinc-700">{p2}</p>
              <p className="mt-3 text-zinc-700">{p3}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
              <h2 className="text-xl font-extrabold text-zinc-900">
                {t(`Marcas más buscadas en ${nome}`, `Marcas mais procuradas em ${nome}`)}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {l.marcas.map((m) => {
                  const u = urlRepuestos({ marca: m });
                  return (
                    <a
                      key={m}
                      href={href(u ?? `/loja?marca=${encodeURIComponent(m)}`)}
                      className="group flex items-center justify-between rounded-xl bg-[#f3f5f1] px-3 py-2.5 font-semibold text-zinc-800 hover:text-primary"
                    >
                      {t(`Repuestos ${m}`, `Peças ${m}`)}{" "}
                      <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-primary" />
                    </a>
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                {t(`${nomeCat} con envío a ${nome}`, `${nomeCat} com envio para ${nome}`)}
              </h2>
              <a href={lojaCat} className="text-sm font-bold text-primary hover:underline">
                {t("Ver todos →", "Ver todas →")}
              </a>
            </div>
            {dados.produtos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
                {dados.produtos.map((p) => (
                  <CardLoja key={p.sku} p={p} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-zinc-900">
              {t("Repuestos por categoría", "Peças por categoria")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIAS_SEO.map((c) => (
                <a
                  key={c.slug}
                  href={href(`/repuestos/${c.slug}`)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                >
                  {idioma === "pt" ? c.categoria : c.nome}
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
              {t("Preguntas frecuentes", "Perguntas frequentes")}
            </h2>
            <div className="mt-3 divide-y divide-zinc-100">
              {perguntasLocal(l, idioma).map((q) => (
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

          {vizinhos.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-zinc-900">
                {t("También enviamos a", "Também enviamos para")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {vizinhos.map((v) => (
                  <a
                    key={v.slug}
                    href={href(`/repuestos-agricolas/${v.slug}`)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                  >
                    <MapPin className="h-3.5 w-3.5" /> {nomeLocal(v, idioma)}
                  </a>
                ))}
                <a
                  href={href("/repuestos-agricolas")}
                  className="inline-flex items-center rounded-full px-4 py-2 text-sm font-bold text-primary hover:underline"
                >
                  {t("Todas las zonas →", "Todas as regiões →")}
                </a>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// Página central: todas as zonas de envio (Uruguai e Rio Grande do Sul)
export function PaginaZonas({ total }: { total: number }) {
  const { t, idioma, href } = useT();
  const grupos: Array<{ titulo: string; itens: LocalSeo[] }> = [
    {
      titulo: t("Uruguay por zona", "Uruguai por região"),
      itens: LOCAIS_SEO.filter(
        (l) => l.pais === "UY" && (l.tipo === "regiao" || l.tipo === "pais"),
      ),
    },
    {
      titulo: t("Los 19 departamentos", "Os 19 departamentos"),
      itens: LOCAIS_SEO.filter((l) => l.pais === "UY" && l.tipo === "departamento"),
    },
    {
      titulo: t("Ciudades de Uruguay", "Cidades do Uruguai"),
      itens: LOCAIS_SEO.filter((l) => l.pais === "UY" && l.tipo === "cidade"),
    },
    {
      titulo: t("Rio Grande do Sul por región", "Rio Grande do Sul por região"),
      itens: LOCAIS_SEO.filter(
        (l) => l.pais === "RS" && (l.tipo === "estado" || l.tipo === "regiao"),
      ),
    },
    {
      titulo: t("Ciudades de Rio Grande do Sul", "Cidades do Rio Grande do Sul"),
      itens: LOCAIS_SEO.filter((l) => l.pais === "RS" && l.tipo === "cidade"),
    },
  ];
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        <section className="bg-[#06321b] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
            <h1 className="max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
              {t(
                "Repuestos agrícolas con envío a todo Uruguay y Rio Grande do Sul",
                "Peças agrícolas com envio para todo o Uruguai e todo o Rio Grande do Sul",
              )}
            </h1>
            <p className="mt-4 max-w-3xl text-white/85 md:text-lg">
              {t(
                `Tienda online con más de ${fmt(total, idioma)} repuestos para tractores y cosechadoras, en la frontera Chuy / Chuí. Elegí tu zona para ver las marcas y los repuestos más pedidos.`,
                `Loja online com mais de ${fmt(total, idioma)} peças para tratores e colheitadeiras, na fronteira Chuí / Chuy. Escolha sua região para ver as marcas e as peças mais procuradas.`,
              )}
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:py-12">
          {grupos.map((g) => (
            <section key={g.titulo}>
              <h2 className="text-xl font-extrabold text-zinc-900">{g.titulo}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {g.itens.map((l) => (
                  <a
                    key={l.slug}
                    href={href(`/repuestos-agricolas/${l.slug}`)}
                    className="group flex items-center gap-2 rounded-xl bg-white p-3 font-semibold text-zinc-800 shadow-sm ring-1 ring-black/5 hover:text-primary hover:ring-primary/40"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-primary" /> {nomeLocal(l, idioma)}
                  </a>
                ))}
              </div>
            </section>
          ))}
          <section>
            <h2 className="text-xl font-extrabold text-zinc-900">
              {t("Repuestos por marca", "Peças por marca")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {MARCAS_SEO.map((m) => (
                <a
                  key={m.slug}
                  href={href(`/repuestos/${m.slug}`)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary"
                >
                  {m.marca}
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
