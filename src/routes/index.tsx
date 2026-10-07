import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  VistosRecientesBlock,
} from "@/components/homepage-blocks";
import type { HomepageBlock } from "@/lib/homepage";
import { tituloEs } from "@/lib/pecas-es";
import { SITE_URL } from "@/lib/site";
import { PHONE } from "@/lib/whatsapp";

// Dados estruturados da loja: nome, logo, contato e a caixa de busca nos resultados do Google
const lojaLd = {
  "@context": "https://schema.org",
  "@type": "Store",
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
    streetAddress: "Av. Justino Amonte Anacker 812",
    addressLocality: "Santa Vitória do Palmar",
    addressRegion: "RS",
    addressCountry: "BR",
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
  head: () => ({
    meta: [
      { title: "AGRO PARTS — Repuestos para tractores en Uruguay" },
      {
        name: "description",
        content:
          "Más de 29.000 repuestos para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New Holland y Case IH. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
      },
      { property: "og:title", content: "AGRO PARTS — Repuestos para tractores en Uruguay" },
      {
        property: "og:description",
        content:
          "Más de 29.000 repuestos para tractores y cosechadoras. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(lojaLd) },
      { type: "application/ld+json", children: JSON.stringify(siteLd) },
    ],
  }),
  loader: () => import("@/lib/homepage").then((m) => m.listHomepageBlocks()),
  component: HomePage,
});

function Bloco({ block }: { block: HomepageBlock }) {
  const { config } = block;
  const title = tituloEs(block.title);
  switch (block.type) {
    case "HERO_SLIDER":
      return <HeroSliderBlock config={config} title={title} />;
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
    default:
      return null;
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
  const iniciais = Route.useLoaderData();
  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["homepage_blocks"],
    queryFn: () => import("@/lib/homepage").then((m) => m.listHomepageBlocks()),
    initialData: iniciais,
    staleTime: 60 * 1000,
  });
  const ativos = blocks.filter((b) => b.active);
  // O banner ocupa a largura toda; os demais blocos ficam no container, sobre fundo cinza.
  const hero = ativos.filter((b) => b.type === "HERO_SLIDER");
  const resto = ativos.filter((b) => b.type !== "HERO_SLIDER");

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
        <h1 className="sr-only">Repuestos para tractores y maquinaria agrícola en Uruguay</h1>
        {hero.map((b) => (
          <Bloco key={b.id} block={b} />
        ))}

        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 pb-8 pt-1 md:gap-5 md:px-4 md:pt-4">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/70" />
            ))}

          {!isLoading && ativos.length === 0 && (
            <div className="rounded-2xl bg-white py-16 text-center">
              <p className="mb-4 text-muted-foreground">Estamos preparando la página de inicio.</p>
              <Button asChild>
                <Link to="/loja">Ver catálogo</Link>
              </Button>
            </div>
          )}

          {resto.map((b, i) => (
            <Fragment key={b.id}>
              <Bloco block={b} />
              {/* Logo depois do primeiro bloco: quem volta ao site vê o que já estava olhando */}
              {i === 0 && <VistosRecientesBlock />}
            </Fragment>
          ))}
        </div>
      </main>
    </div>
  );
}
