import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Banner } from "@/lib/banners";
import { useState, useEffect, Fragment } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useSegment } from "@/components/SegmentContext";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import { WelcomePortal } from "@/components/WelcomePortal";
import {
  HeroSliderBlock,
  CategoryGridBlock,
  ProductsCarouselBlock,
  ProductsGridBlock,
  PromoStripBlock,
  FeaturesStripBlock,
  BrandsCarouselBlock,
  BuscaCodigoBlock,
  PromoBannersDuplosBlock,
  CarouselMontadorasBlock,
  DepoimentosBlock,
  NewsletterInstagramBlock,
  EnvioDacBlock,
  ParaVoceBlock,
} from "@/components/homepage-blocks";
import { CatalogosCtaBlock } from "@/components/home/CatalogosCta";
import { CotizacionDistribuidorBlock } from "@/components/CotizacionDistribuidor";
import type { HomepageBlock } from "@/lib/homepage";
import { tituloEs } from "@/lib/pecas-es";
import { linksIdioma, tr, useT, type Idioma } from "@/lib/idioma";
import { SITE_URL } from "@/lib/site";
import { PHONE } from "@/lib/whatsapp";
import { ehLarguraTotal, temH1, tipoNovo } from "@/lib/blocos-home";
import { BlocoNovo } from "@/components/home/BlocosNovos";
import { HeroCampanhaHome } from "@/components/campanha/Campanha";
import { GUIA_INICIO, ldPerguntas } from "@/lib/seo-guias";
import { GuiaSeoBloco, LINKS_BUSCAS_PRINCIPAIS, PerguntasBloco } from "@/components/GuiaSeo";

// Dados estruturados da loja: nome, logo, contato e a caixa de busca nos resultados do Google
const lojaLd = {
  "@context": "https://schema.org",
  // Loja online, sem atendimento ao público em endereço fixo: só a cidade
  "@type": "OnlineStore",
  name: "AGRO PARTS",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/icon-512.png`,
  description: "Repuestos para tractores y maquinaria agrícola con envíos a todo Uruguay por DAC.",
  telephone: `+${PHONE}`,
  email: "comercialrsautoparts@gmail.com",
  areaServed: { "@type": "Country", name: "Uruguay" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Chuy",
    addressRegion: "Rocha",
    addressCountry: "UY",
  },
};
const siteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "AGRO PARTS",
  url: SITE_URL,
  inLanguage: "es-UY",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/loja?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export const Route = createFileRoute("/")({
  head: ({ match, loaderData }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const b0 = loaderData?.hero?.[0];
    const u = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);
    const preloadBanner = b0
      ? b0.image_path_mobile
        ? [
            {
              rel: "preload",
              as: "image",
              href: u(b0.image_path_mobile),
              media: "(max-width: 767px)",
              fetchPriority: "high" as const,
            },
            {
              rel: "preload",
              as: "image",
              href: u(b0.image_path),
              media: "(min-width: 768px)",
              fetchPriority: "high" as const,
            },
          ]
        : [{ rel: "preload", as: "image", href: u(b0.image_path), fetchPriority: "high" as const }]
      : [];
    const t = (es: string, pt: string) => tr(idioma, es, pt);
    const titulo = t(
      "AGRO PARTS — Repuestos para tractores en Uruguay",
      "AGRO PARTS — Peças para tratores com envio para todo o Uruguai",
    );
    return {
      meta: [
        { title: titulo },
        {
          name: "description",
          content: t(
            "Más de 49.000 repuestos para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New Holland y Case IH. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
            "Mais de 49.000 peças para tratores e colheitadeiras Massey Ferguson, Valtra, John Deere, New Holland e Case IH. Envio para todo o Uruguai. Orçamento pelo WhatsApp.",
          ),
        },
        { property: "og:title", content: titulo },
        {
          property: "og:description",
          content: t(
            "Más de 49.000 repuestos para tractores y cosechadoras. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
            "Mais de 49.000 peças para tratores e colheitadeiras. Envio para todo o Uruguai. Orçamento pelo WhatsApp.",
          ),
        },
      ],
      links: [...linksIdioma("/", idioma), ...preloadBanner],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(lojaLd) },
        {
          type: "application/ld+json",
          children: JSON.stringify({ ...siteLd, inLanguage: idioma === "pt" ? "pt-BR" : "es-UY" }),
        },
        ...(idioma === "es"
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify(ldPerguntas(GUIA_INICIO.perguntas)),
              },
            ]
          : []),
      ],
    };
  },
  // Blocos e banners do topo vêm do servidor: o banner já sai no HTML (é a maior imagem da página)
  loader: async () => {
    const [blocos, hero] = await Promise.all([
      import("@/lib/homepage").then((m) => m.listHomepageBlocks()),
      import("@/lib/banners")
        .then((m) => m.listActiveBanners("hero", "AGRICOLA"))
        .catch(() => [] as Banner[]),
    ]);
    return { blocos, hero };
  },
  component: HomePage,
});

function Bloco({
  block,
  heroInicial,
  prioridade,
}: {
  block: HomepageBlock;
  heroInicial?: Banner[];
  prioridade?: boolean;
}) {
  const { config } = block;
  const { idioma } = useT();
  // Título do bloco: cadastrado em português no admin; em espanhol é traduzido pelo glossário
  const title = idioma === "pt" ? block.title : tituloEs(block.title);
  switch (block.type) {
    case "HERO_SLIDER":
      return <HeroSliderBlock config={config} title={title} iniciais={heroInicial} />;
    case "CATEGORY_GRID":
      return <CategoryGridBlock config={config} title={title} />;
    case "PRODUCTS_CAROUSEL":
      return <ProductsCarouselBlock title={title} config={config} />;
    case "PRODUCTS_GRID":
      return <ProductsGridBlock title={title} config={config} />;
    case "PROMO_STRIP":
      return <PromoStripBlock title={title} config={config} />;
    case "FEATURES_STRIP":
      return <FeaturesStripBlock config={config} />;
    case "BRANDS_CAROUSEL":
      return <BrandsCarouselBlock config={config} />;
    case "BUSCA_CODIGO":
      return <BuscaCodigoBlock config={config} />;
    case "PROMO_BANNERS_DUPLOS":
      return <PromoBannersDuplosBlock config={config} />;
    case "CAROUSEL_MONTADORAS":
      return <CarouselMontadorasBlock config={config} />;
    case "DEPOIMENTOS":
      return <DepoimentosBlock config={config} title={title} />;
    case "NEWSLETTER_INSTAGRAM":
      return <NewsletterInstagramBlock config={config} />;
    case "ENVIO_DAC":
      return <EnvioDacBlock config={config} />;
    case "CATALOGOS_CTA":
      return <CatalogosCtaBlock />;
    case "COTIZACION":
      return <CotizacionDistribuidorBlock />;
    default:
      // Componentes do Construtor da Home (src/lib/blocos-home.ts)
      return tipoNovo(block.type) ? (
        <BlocoNovo tipo={block.type} config={config} prioridade={prioridade} />
      ) : null;
  }
}

function HomePage() {
  const { setSegment } = useSegment();
  const [showPortal, setShowPortal] = useState(false);

  useEffect(() => {
    // Portal de escolha de linha só faz sentido com a linha automotiva ligada.
    if (AUTOMOTIVA_ATIVA && !localStorage.getItem("store_segment")) setShowPortal(true);
  }, []);

  // Os blocos vêm prontos do servidor (loader): a página já nasce com a estrutura certa,
  // sem os retângulos provisórios que depois "pulavam" ao trocar pelo conteúdo.
  const { blocos: iniciais, hero: heroInicial } = Route.useLoaderData();
  const { t, idioma } = useT();
  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["homepage_blocks"],
    queryFn: () => import("@/lib/homepage").then((m) => m.listHomepageBlocks()),
    initialData: iniciais,
    staleTime: 60 * 1000,
  });
  const ativos = blocks.filter((b) => b.active);
  // Blocos de largura total (banner, heróis, fitas) ocupam a tela toda; os demais ficam no
  // container, sobre fundo cinza. A ordem é a do Construtor da Home, e os de largura total
  // podem ficar entre os outros (a página é dividida em trechos).
  const resto = ativos.filter((b) => !ehLarguraTotal(b.type));
  const trechos: Array<{ total: HomepageBlock } | { grupo: HomepageBlock[] }> = [];
  for (const b of ativos) {
    if (ehLarguraTotal(b.type)) trechos.push({ total: b });
    else {
      const ultimo = trechos[trechos.length - 1];
      if (ultimo && "grupo" in ultimo) ultimo.grupo.push(b);
      else trechos.push({ grupo: [b] });
    }
  }
  const primeiroId = ativos[0]?.id;
  // Chamada dos catálogos: se o admin não colocou o bloco no CMS, entra sozinha depois do 2º bloco
  const ctaNoCms = blocks.some((b) => b.type === "CATALOGOS_CTA");
  const posCta = ctaNoCms ? -1 : Math.min(1, resto.length - 1);
  // "Somos distribuidores… hacé tu cotización": sem bloco no CMS, entra depois do 4º bloco (ou no fim)
  const posCotizacao = blocks.some((b) => b.type === "COTIZACION")
    ? -1
    : Math.min(3, resto.length - 1);

  return (
    <div className="min-h-screen bg-zinc-100">
      {showPortal && (
        <WelcomePortal
          onSelect={(s) => {
            setSegment(s);
            setShowPortal(false);
          }}
        />
      )}
      <SiteHeader />

      <main>
        {/* Um H1 só: o fixo sai quando um hero do Construtor foi marcado como título principal */}
        {!temH1(blocks) && (
          <h1 className="sr-only">
            {t(
              "Repuestos para tractores y maquinaria agrícola en Uruguay",
              "Peças para tratores e máquinas agrícolas com envio para todo o Uruguai",
            )}
          </h1>
        )}
        {/* Campanha no ar (Black Friday…): hero no topo, se a campanha pediu e não está no Construtor */}
        {!ativos.some((b) => b.type === "CAMPANHA_CONTAGEM") && <HeroCampanhaHome />}
        {(isLoading || ativos.length === 0) && (
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 pb-8 pt-1 md:gap-5 md:px-4 md:pt-4">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/70" />
              ))}

            {!isLoading && ativos.length === 0 && (
              <div className="rounded-2xl bg-white py-16 text-center">
                <p className="mb-4 text-muted-foreground">
                  {t(
                    "Estamos preparando la página de inicio.",
                    "Estamos preparando a página inicial.",
                  )}
                </p>
                <Button asChild>
                  <Link to="/loja">{t("Ver catálogo", "Ver catálogo")}</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {trechos.map((trecho, n) =>
          "total" in trecho ? (
            <div key={trecho.total.id} className={n > 0 ? "mt-3 md:mt-5" : undefined}>
              <Bloco
                block={trecho.total}
                heroInicial={heroInicial}
                prioridade={trecho.total.id === primeiroId}
              />
            </div>
          ) : (
            <div
              key={`g${trecho.grupo[0].id}`}
              className="mx-auto flex max-w-7xl flex-col gap-3 px-3 pb-8 pt-1 md:gap-5 md:px-4 md:pt-4"
            >
              {trecho.grupo.map((b) => {
                const i = resto.indexOf(b);
                return (
                  <Fragment key={b.id}>
                    <Bloco block={b} prioridade={b.id === primeiroId} />
                    {/* Logo depois do primeiro bloco: quem volta ao site vê o que já estava olhando */}
                    {i === 0 && <ParaVoceBlock />}
                    {i === posCta && <CatalogosCtaBlock />}
                    {i === posCotizacao && <CotizacionDistribuidorBlock />}
                  </Fragment>
                );
              })}
            </div>
          ),
        )}
        {/* Texto para o Google: "repuestos para tractores en Uruguay" e links para as outras buscas */}
        {idioma === "es" && (
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:py-12">
            <GuiaSeoBloco guia={GUIA_INICIO} links={LINKS_BUSCAS_PRINCIPAIS} />
            <PerguntasBloco titulo="Preguntas frecuentes" perguntas={GUIA_INICIO.perguntas} />
          </div>
        )}
      </main>
    </div>
  );
}
