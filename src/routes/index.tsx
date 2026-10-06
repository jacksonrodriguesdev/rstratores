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
} from "@/components/homepage-blocks";
import type { HomepageBlock } from "@/lib/homepage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RS Trator Peças — Catálogo de Peças para Tratores" },
      {
        name: "description",
        content:
          "Catálogo de peças para tratores Massey Ferguson, Valtra, John Deere, New Holland e outras marcas. Faça sua cotação pelo WhatsApp.",
      },
      { property: "og:title", content: "RS Trator Peças — Catálogo de Peças para Tratores" },
      {
        property: "og:description",
        content:
          "Catálogo de peças para tratores Massey Ferguson, Valtra, John Deere, New Holland e outras marcas. Faça sua cotação pelo WhatsApp.",
      },
    ],
  }),
  component: HomePage,
});

function Bloco({ block }: { block: HomepageBlock }) {
  const { config, title } = block;
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

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["homepage_blocks"],
    queryFn: () => import("@/lib/homepage").then((m) => m.listHomepageBlocks()),
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
              <p className="mb-4 text-muted-foreground">A página inicial não possui blocos configurados.</p>
              <Button asChild>
                <Link to="/loja">Ver catálogo</Link>
              </Button>
            </div>
          )}

          {resto.map((b) => (
            <Fragment key={b.id}>
              <Bloco block={b} />
            </Fragment>
          ))}
        </div>
      </main>
    </div>
  );
}
