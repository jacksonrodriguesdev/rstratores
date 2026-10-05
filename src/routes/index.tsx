import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Search,
  Package,
  ArrowRight,
  MessageCircle,
  Settings,
  Wrench,
  OctagonAlert,
  Droplet,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductImage } from "@/components/ProductImage";
import { ProductSlider } from "@/components/ProductSlider";
import { CategorySlider } from "@/components/CategorySlider";
import { MiniCard } from "@/components/MiniCard";
import { QuoteButton } from "@/components/QuoteButton";
import { HeroSlider } from "@/components/HeroSlider";
import { TrustCards } from "@/components/TrustCards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { FloatingQuoteButton } from "@/components/FloatingQuoteButton";
import { listProducts, getFacets } from "@/lib/products";
import { listCategories } from "@/lib/categories";
import { BannerImage } from "@/components/BannerImage";
import { useSegment } from "@/components/SegmentContext";
import { useLanguage } from "@/components/LanguageContext";
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
} from "@/components/homepage-blocks";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RS Trator Peças — Catálogo de Peças para Tratores" },
      {
        name: "description",
        content:
          "Catálogo completo de peças para tratores Ford, Valmet, Massey Ferguson e outras marcas. Faça sua cotação pelo WhatsApp.",
      },
      { property: "og:title", content: "RS Trator Peças — Catálogo de Peças para Tratores" },
      {
        property: "og:description",
        content:
          "Catálogo completo de peças para tratores Ford, Valmet, Massey Ferguson e outras marcas. Faça sua cotação pelo WhatsApp.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const [inputValue, setInputValue] = useState("");
  const search = useDebounce(inputValue, 400);

  const { segment, setSegment } = useSegment();
  const { t } = useLanguage();
  const [showPortal, setShowPortal] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("store_segment")) {
      setShowPortal(true);
    }
  }, []);

  const handleSelectSegment = (s: "AGRICOLA" | "AUTOMOTIVA") => {
    setSegment(s);
    setShowPortal(false);
  };

  const hasSearch = !!search.trim();

  const searchQuery = useQuery({
    queryKey: ["home-search", search, segment],
    queryFn: () => listProducts({ search, page: 1, pageSize: 24, sort: "sku", linha: segment }),
    enabled: hasSearch,
  });

  // Lançamentos e Destaques foram removidos para evitar carregamento automático desnecessário.
  // Apenas a barra de busca e navegação por categorias são renderizadas inicialmente.

  const blocksQuery = useQuery({
    queryKey: ["homepage_blocks"],
    queryFn: () => import("@/lib/homepage").then((m) => m.listHomepageBlocks()),
  });

  const activeBlocks = (blocksQuery.data ?? []).filter((b) => b.active);
  const stripBanners: any[] = [];
  const stripAt = (i: number) => stripBanners[i % stripBanners.length];

  const searchRows = searchQuery.data?.rows ?? [];

  return (
    <div className="min-h-screen bg-background">
      {showPortal && <WelcomePortal onSelect={handleSelectSegment} />}
      <SiteHeader />
      <FloatingQuoteButton />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {hasSearch ? (
          <section className="mb-10 mt-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                Resultados para "{search}"
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/loja" search={{ q: search } as never}>
                  Ver todos <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            {searchQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Buscando…</p>
            ) : searchRows.length === 0 ? (
              <EmptyState hasFilter />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {searchRows.map((p: any) => (
                  <MiniCard key={p.sku} p={p} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className="flex flex-col gap-8">
            {blocksQuery.isLoading && (
              <div className="py-20 text-center text-muted-foreground">Carregando blocos...</div>
            )}

            {activeBlocks.length === 0 && !blocksQuery.isLoading && (
              <div className="py-20 text-center">
                <p className="text-muted-foreground mb-4">
                  A página inicial não possui blocos configurados.
                </p>
                <Button asChild>
                  <Link to="/loja">Ver Catálogo</Link>
                </Button>
              </div>
            )}

            {activeBlocks.map((block) => {
              switch (block.type) {
                case "HERO_SLIDER":
                  return (
                    <HeroSliderBlock key={block.id} config={block.config} title={block.title} />
                  );
                case "CATEGORY_GRID":
                  return <CategoryGridBlock key={block.id} config={block.config} />;
                case "PRODUCTS_CAROUSEL":
                  return (
                    <ProductsCarouselBlock
                      key={block.id}
                      title={block.title}
                      config={block.config}
                    />
                  );
                case "PRODUCTS_GRID":
                  return (
                    <ProductsGridBlock key={block.id} title={block.title} config={block.config} />
                  );
                case "PROMO_STRIP":
                  return (
                    <PromoStripBlock key={block.id} title={block.title} config={block.config} />
                  );
                case "FEATURES_STRIP":
                  return <FeaturesStripBlock key={block.id} config={block.config} />;
                case "BRANDS_CAROUSEL":
                  return <BrandsCarouselBlock key={block.id} config={block.config} />;
                case "BUSCA_CODIGO":
                  return <BuscaCodigoBlock key={block.id} config={block.config} />;
                case "PROMO_BANNERS_DUPLOS":
                  return <PromoBannersDuplosBlock key={block.id} config={block.config} />;
                case "CAROUSEL_MONTADORAS":
                  return <CarouselMontadorasBlock key={block.id} config={block.config} />;
                case "DEPOIMENTOS":
                  return <DepoimentosBlock key={block.id} config={block.config} />;
                case "NEWSLETTER_INSTAGRAM":
                  return <NewsletterInstagramBlock key={block.id} config={block.config} />;
                default:
                  return null;
              }
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <Package className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">Nenhum produto encontrado</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilter
          ? "Tente remover alguns filtros ou ajustar a busca."
          : "Ainda não há produtos cadastrados."}
      </p>
    </div>
  );
}

function StripBanner({ banner }: { banner: any }) {
  const content = (
    <div className="mx-auto mb-8 overflow-hidden rounded" style={{ maxWidth: 1200, height: 120 }}>
      <BannerImage src={banner.image_path} alt="banner" className="h-[120px] w-full object-cover" />
    </div>
  );
  if (banner.link_url) {
    return (
      <a href={banner.link_url} target="_blank" rel="noreferrer" className="block">
        {content}
      </a>
    );
  }
  return content;
}
