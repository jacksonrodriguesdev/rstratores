import { Link } from "@tanstack/react-router";
import { ChevronRight, Truck, MessageCircle, ShieldCheck, Search, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CardLoja } from "@/components/CardPeca";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";
import { comPrefixo, useT, type Idioma } from "@/lib/idioma";
import {
  MARCAS_SEO,
  CATEGORIAS_SEO,
  urlRepuestos,
  type MarcaSeo,
  type CategoriaSeo,
} from "@/lib/seo-paginas";
import { guiaDaPagina, ldPerguntas, perguntasDaPagina } from "@/lib/seo-guias";
import { GuiaSeoBloco, LINKS_BUSCAS_PRINCIPAIS, PerguntasBloco } from "@/components/GuiaSeo";
import type { PaginaRepuestos as Dados } from "@/lib/repuestos";

// Página de entrada para o Google: "Repuestos John Deere en Uruguay", "Filtros para Massey
// Ferguson"... Texto próprio, peças já no HTML, links para as combinações e perguntas frequentes.
// Em português (/pt/repuestos/...): o mesmo conteúdo para o cliente do Brasil.
type Props = { marca?: MarcaSeo | null; categoria?: CategoriaSeo | null; dados: Dados };

const fmt = (n: number, idioma: Idioma = "es") =>
  n.toLocaleString(idioma === "pt" ? "pt-BR" : "es-UY");
// Nome da categoria, texto e modelos no idioma da página
const nomeCat = (c: CategoriaSeo, idioma: Idioma) => (idioma === "pt" ? c.categoria : c.nome);
const textoCat = (c: CategoriaSeo, idioma: Idioma) => (idioma === "pt" ? c.texto_pt : c.texto);
const textoMarca = (m: MarcaSeo, idioma: Idioma) => (idioma === "pt" ? m.texto_pt : m.texto);
const modelos = (m: MarcaSeo, idioma: Idioma) =>
  idioma === "pt" ? m.modelos.replace(/ y /g, " e ").replace(/series/g, "séries") : m.modelos;

export function tituloRepuestos(
  marca?: MarcaSeo | null,
  categoria?: CategoriaSeo | null,
  idioma: Idioma = "es",
) {
  if (idioma === "pt") {
    if (marca && categoria)
      return `${nomeCat(categoria, idioma)} para ${marca.marca} com envio para todo o Uruguai`;
    if (marca) return `Peças ${marca.marca} com envio para todo o Uruguai`;
    if (categoria)
      return `${nomeCat(categoria, idioma)} para tratores com envio para todo o Uruguai`;
    return "Peças para tratores com envio para todo o Uruguai";
  }
  if (marca && categoria) return `${categoria.nome} para ${marca.marca} en Uruguay`;
  if (marca) return `Repuestos ${marca.marca} en Uruguay`;
  if (categoria) return `${categoria.nome} para tractores en Uruguay`;
  return "Repuestos para tractores en Uruguay";
}

export function descricaoRepuestos(
  marca?: MarcaSeo | null,
  categoria?: CategoriaSeo | null,
  total?: number,
  idioma: Idioma = "es",
) {
  if (idioma === "pt") {
    const qtd = total ? `${fmt(total, idioma)} peças` : "Peças";
    if (marca && categoria)
      return `${qtd} de ${nomeCat(categoria, idioma).toLowerCase()} para tratores ${marca.marca}. Código original, envio para todo o Uruguai e orçamento pelo WhatsApp.`;
    if (marca)
      return `${qtd} para tratores ${marca.marca} (${modelos(marca, idioma).split(",").slice(0, 4).join(",")}…). Envio para todo o Uruguai. Orçamento pelo WhatsApp.`;
    if (categoria)
      return `${qtd} de ${nomeCat(categoria, idioma).toLowerCase()} para Massey Ferguson, Valtra, John Deere, New Holland e mais. Envio para todo o Uruguai.`;
    return "Peças para tratores e colheitadeiras com envio para todo o Uruguai.";
  }
  const qtd = total ? `${fmt(total)} repuestos` : "Repuestos";
  if (marca && categoria)
    return `${qtd} de ${categoria.nome.toLowerCase()} para tractores ${marca.marca}. Código original, envío a todo Uruguay por DAC y cotización por WhatsApp.`;
  if (marca)
    return `${qtd} para tractores ${marca.marca} (${marca.modelos.split(",").slice(0, 4).join(",")}…). Envío a todo Uruguay por DAC. Cotizá por WhatsApp.`;
  if (categoria)
    return `${qtd} de ${categoria.nome.toLowerCase()} para Massey Ferguson, Valtra, John Deere, New Holland y más. Envío a todo Uruguay por DAC.`;
  return "Repuestos para tractores y cosechadoras con envío a todo Uruguay.";
}

const alvoDe = (
  marca: MarcaSeo | null | undefined,
  categoria: CategoriaSeo | null | undefined,
  idioma: Idioma,
) =>
  marca && categoria
    ? `${nomeCat(categoria, idioma).toLowerCase()} ${marca.marca}`
    : marca
      ? marca.marca
      : categoria
        ? nomeCat(categoria, idioma).toLowerCase()
        : "";

// Dados estruturados: trilha, lista de peças e perguntas frequentes
export function ldRepuestos(
  url: string,
  marca: MarcaSeo | null | undefined,
  categoria: CategoriaSeo | null | undefined,
  dados: Dados,
  idioma: Idioma = "es",
) {
  const titulo = tituloRepuestos(marca, categoria, idioma);
  const u = (caminho: string) => `${SITE_URL}${comPrefixo(caminho, idioma)}`;
  const trilha = [
    { name: idioma === "pt" ? "Início" : "Inicio", item: u("/") },
    { name: idioma === "pt" ? "Peças" : "Repuestos", item: u("/repuestos") },
    ...(marca ? [{ name: marca.marca, item: u(`/repuestos/${marca.slug}`) }] : []),
    ...(categoria ? [{ name: nomeCat(categoria, idioma), item: url }] : []),
  ];
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trilha.map((t, i) => ({ "@type": "ListItem", position: i + 1, ...t })),
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: titulo,
      url,
      inLanguage: idioma === "pt" ? "pt-BR" : "es-UY",
      description: descricaoRepuestos(marca, categoria, dados.total, idioma),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: dados.total,
        itemListElement: dados.produtos.slice(0, 20).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: u(`/produto/${encodeURIComponent(p.sku.trim())}`),
        })),
      },
    },
    ldPerguntas(perguntasDaPagina(marca, categoria, alvoDe(marca, categoria, idioma), idioma)),
  ];
}

export function PaginaRepuestos({ marca, categoria, dados }: Props) {
  const { t, idioma, href } = useT();
  const titulo = tituloRepuestos(marca, categoria, idioma);
  const alvo = alvoDe(marca, categoria, idioma);
  const guia = guiaDaPagina(marca, categoria, idioma);
  const lojaParams = new URLSearchParams();
  if (categoria) lojaParams.set("categoria", categoria.categoria);
  if (marca) lojaParams.set("marca", marca.marca);
  const lojaUrl = href(`/loja?${lojaParams.toString()}`);
  const whats = whatsappContactUrl(
    t(
      `¡Hola! Busco ${alvo ? `repuestos ${alvo}` : "repuestos"}. ¿Me ayudan?`,
      `Olá! Procuro ${alvo ? `peças ${alvo}` : "peças"}. Podem me ajudar?`,
    ),
  );
  const repuestosDe = (caminho: string | null) => href(caminho ?? "/loja");

  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        {/* Topo */}
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
              <Link to="/repuestos" className="hover:text-white">
                {t("Repuestos", "Peças")}
              </Link>
              {marca && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <a href={href(`/repuestos/${marca.slug}`)} className="hover:text-white">
                    {marca.marca}
                  </a>
                </>
              )}
              {categoria && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-white">{nomeCat(categoria, idioma)}</span>
                </>
              )}
            </nav>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
              {titulo}
            </h1>
            <p className="mt-4 max-w-3xl text-base text-white/85 md:text-lg">
              {marca && categoria
                ? `${textoCat(categoria, idioma)} ${t("Para tractores", "Para tratores")} ${marca.marca}: ${modelos(marca, idioma)}.`
                : marca
                  ? textoMarca(marca, idioma)
                  : categoria && textoCat(categoria, idioma)}
            </p>
            {marca && !categoria && (
              <p className="mt-2 max-w-3xl text-sm text-white/70">
                {t("Para modelos como", "Para modelos como")} {modelos(marca, idioma)}.
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={lojaUrl}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 font-bold text-[#06321b] hover:bg-amber-300"
              >
                <Search className="h-5 w-5" />{" "}
                {dados.total
                  ? t(
                      `Ver los ${fmt(dados.total)} repuestos`,
                      `Ver as ${fmt(dados.total, idioma)} peças`,
                    )
                  : t("Ver repuestos", "Ver peças")}
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
                {t("Envíos a todo Uruguay por DAC", "Envio para todo o Uruguai")}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-300" />{" "}
                {t(
                  "Código original y compatibilidad confirmada",
                  "Código original e compatibilidade confirmada",
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
          {/* Combinações: categorias da marca, ou marcas da categoria */}
          {dados.facetas.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                {marca
                  ? t(
                      `Repuestos ${marca.marca} por categoría`,
                      `Peças ${marca.marca} por categoria`,
                    )
                  : `${categoria ? nomeCat(categoria, idioma) : ""} ${t("por marca de tractor", "por marca de trator")}`}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {dados.facetas.map((f) => {
                  const url = marca
                    ? urlRepuestos({ marca: marca.marca, categoria: f.chave })
                    : urlRepuestos({ marca: f.chave, categoria: categoria!.categoria });
                  const cat = CATEGORIAS_SEO.find((c) => c.categoria === f.chave);
                  const rotulo = marca ? (cat ? nomeCat(cat, idioma) : f.chave) : f.chave;
                  return (
                    <a
                      key={f.chave}
                      href={url ? href(url) : lojaUrl}
                      className="group flex items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
                    >
                      <span>
                        <span className="block font-bold text-zinc-900 group-hover:text-primary">
                          {rotulo}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {fmt(f.total, idioma)} {t("repuestos", "peças")}
                        </span>
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
              <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                {marca && categoria
                  ? `${nomeCat(categoria, idioma)} ${marca.marca}`
                  : marca
                    ? t(`Repuestos ${marca.marca} destacados`, `Peças ${marca.marca} em destaque`)
                    : `${categoria ? nomeCat(categoria, idioma) : ""} ${t("destacados", "em destaque")}`}
              </h2>
              <a href={lojaUrl} className="text-sm font-bold text-primary hover:underline">
                {t("Ver todos →", "Ver todas →")}
              </a>
            </div>
            {dados.produtos.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
                {dados.produtos.map((p, i) => (
                  <CardLoja key={p.sku} p={p} prioridade={i < 2} />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-white p-6 text-zinc-600 ring-1 ring-black/5">
                {t(
                  `Consultanos por WhatsApp: conseguimos repuestos ${alvo} aunque no estén publicados en el sitio.`,
                  `Fale conosco pelo WhatsApp: conseguimos peças ${alvo} mesmo que não estejam publicadas no site.`,
                )}
              </p>
            )}
            {dados.total > dados.produtos.length && (
              <div className="mt-6 text-center">
                <a
                  href={lojaUrl}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-white hover:bg-primary/90"
                >
                  {t(
                    `Ver los ${fmt(dados.total)} repuestos en la tienda`,
                    `Ver as ${fmt(dados.total, idioma)} peças na loja`,
                  )}{" "}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </section>

          {/* Texto da página (o que o Google lê) e perguntas */}
          {guia && (
            <GuiaSeoBloco
              guia={guia}
              links={LINKS_BUSCAS_PRINCIPAIS.filter(
                (l) => l.href !== `/repuestos/${marca?.slug ?? categoria?.slug}`,
              ).map((l) => ({ ...l, href: href(l.href) }))}
            />
          )}
          <PerguntasBloco
            titulo={t("Preguntas frecuentes", "Perguntas frequentes")}
            perguntas={perguntasDaPagina(marca, categoria, alvo, idioma)}
          />

          {/* Outras marcas e categorias (links internos) */}
          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">
                {t("Repuestos por marca", "Peças por marca")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {MARCAS_SEO.map((m) => (
                  <a
                    key={m.slug}
                    href={repuestosDe(
                      categoria
                        ? urlRepuestos({ marca: m.marca, categoria: categoria.categoria })
                        : `/repuestos/${m.slug}`,
                    )}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                  >
                    {categoria ? `${nomeCat(categoria, idioma)} ${m.marca}` : m.marca}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">
                {t("Repuestos por categoría", "Peças por categoria")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIAS_SEO.map((c) => (
                  <a
                    key={c.slug}
                    href={repuestosDe(
                      marca
                        ? urlRepuestos({ marca: marca.marca, categoria: c.categoria })
                        : `/repuestos/${c.slug}`,
                    )}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-black/10 hover:text-primary hover:ring-primary/40"
                  >
                    {marca ? `${nomeCat(c, idioma)} ${marca.marca}` : nomeCat(c, idioma)}
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
