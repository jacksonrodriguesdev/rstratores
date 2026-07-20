import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Package, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductImage } from "@/components/ProductImage";
import { ProductSlider } from "@/components/ProductSlider";
import { QuoteButton } from "@/components/QuoteButton";
import { HeroSlider } from "@/components/HeroSlider";
import { TrustCards } from "@/components/TrustCards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listProducts, getFacets } from "@/lib/products";
import { listActiveBanners, type Banner } from "@/lib/banners";
import { BannerImage } from "@/components/BannerImage";

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
      { property: "og:description", content: "Catálogo completo de peças para tratores Ford, Valmet, Massey Ferguson e outras marcas. Faça sua cotação pelo WhatsApp." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const [search, setSearch] = useState("");

  const facetsQuery = useQuery({
    queryKey: ["facets"],
    queryFn: getFacets,
    staleTime: 60_000,
  });

  const hasSearch = !!search.trim();

  const searchQuery = useQuery({
    queryKey: ["home-search", search],
    queryFn: () => listProducts({ search, page: 1, pageSize: 24, sort: "nome-asc" }),
    enabled: hasSearch,
  });

  const featuredQuery = useQuery({
    queryKey: ["featured"],
    queryFn: () => listProducts({ sort: "nome-asc", page: 1, pageSize: 12 }),
    staleTime: 60_000,
    enabled: !hasSearch,
  });

  const topCategorias = (facetsQuery.data?.categorias ?? []).slice(0, 3);

  const catA = useQuery({
    queryKey: ["slider-cat", topCategorias[0]],
    queryFn: () => listProducts({ categoria: topCategorias[0], page: 1, pageSize: 12, sort: "nome-asc" }),
    enabled: !hasSearch && !!topCategorias[0],
    staleTime: 60_000,
  });
  const catB = useQuery({
    queryKey: ["slider-cat", topCategorias[1]],
    queryFn: () => listProducts({ categoria: topCategorias[1], page: 1, pageSize: 12, sort: "nome-asc" }),
    enabled: !hasSearch && !!topCategorias[1],
    staleTime: 60_000,
  });
  const catC = useQuery({
    queryKey: ["slider-cat", topCategorias[2]],
    queryFn: () => listProducts({ categoria: topCategorias[2], page: 1, pageSize: 12, sort: "nome-asc" }),
    enabled: !hasSearch && !!topCategorias[2],
    staleTime: 60_000,
  });

  const heroBannersQuery = useQuery({
    queryKey: ["banners", "hero"],
    queryFn: () => listActiveBanners("hero"),
    staleTime: 60_000,
  });
  const stripBannersQuery = useQuery({
    queryKey: ["banners", "strip"],
    queryFn: () => listActiveBanners("strip"),
    staleTime: 60_000,
  });
  const heroBanners = heroBannersQuery.data ?? [];
  const stripBanners = stripBannersQuery.data ?? [];
  const stripAt = (i: number) => stripBanners[i % stripBanners.length];

  const searchRows = searchQuery.data?.rows ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero slider */}
      {heroBanners.length > 0 ? (
        <div className="relative border-b">
          <HeroSlider banners={heroBanners} />
          <div className="pointer-events-none absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-7xl px-4 pb-6 md:pb-10">
              <div className="pointer-events-auto max-w-xl">
                <Badge className="mb-3 bg-accent text-accent-foreground hover:bg-accent">
                  Peças originais e paralelas
                </Badge>
                <h1 className="mb-3 text-2xl font-bold tracking-tight text-white drop-shadow-md md:text-4xl">
                  RS Trator Peças — catálogo completo
                </h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou SKU (ex: 7239)"
                    className="h-12 border-0 bg-background pl-11 text-foreground shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
            <div className="flex flex-col gap-4 md:max-w-2xl">
              <Badge className="w-fit bg-accent text-accent-foreground hover:bg-accent">
                Peças originais e paralelas
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                RS Trator Peças — catálogo completo
              </h1>
              <p className="text-primary-foreground/90 md:text-lg">
                Encontre a peça exata pelo SKU, marca ou modelo do trator.
              </p>
              <div className="relative mt-2 max-w-xl">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou SKU (ex: 7239)"
                  className="h-12 border-0 bg-background pl-11 text-foreground shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8">
        <TrustCards />

        {hasSearch ? (
          <section className="mb-10">
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
                {searchRows.map((p) => (
                  <MiniCard key={p.sku} p={p} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {featuredQuery.data && (
              <ProductSlider
                title="Destaques"
                subtitle="Produtos em destaque no catálogo"
                products={featuredQuery.data.rows}
              />
            )}
            {stripAt(0) && <StripBanner banner={stripAt(0)!} />}
            {catA.data && topCategorias[0] && (
              <ProductSlider title={topCategorias[0]} products={catA.data.rows} />
            )}
            {stripAt(1) && <StripBanner banner={stripAt(1)!} />}
            {catB.data && topCategorias[1] && (
              <ProductSlider title={topCategorias[1]} products={catB.data.rows} />
            )}
            {stripAt(2) && <StripBanner banner={stripAt(2)!} />}
            {catC.data && topCategorias[2] && (
              <ProductSlider title={topCategorias[2]} products={catC.data.rows} />
            )}
            {stripAt(3) && <StripBanner banner={stripAt(3)!} />}
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link to="/loja">
                  Ver todos os produtos na loja
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function MiniCard({ p }: { p: import("@/lib/products").Product }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-lg">
      <Link
        to="/produto/$sku"
        params={{ sku: p.sku }}
        className="block aspect-square overflow-hidden bg-muted"
      >
        <ProductImage src={p.imagem_principal} alt={p.nome} className="transition-transform hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap gap-1">
          {p.categoria && (
            <Badge variant="secondary" className="text-[10px]">
              {p.categoria}
            </Badge>
          )}
        </div>
        <Link
          to="/produto/$sku"
          params={{ sku: p.sku }}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug hover:text-primary"
        >
          {p.nome}
        </Link>
        <div className="text-[11px] text-muted-foreground">SKU {p.sku}</div>
        <div className="mt-auto pt-2">
          <QuoteButton product={p} fullWidth />
        </div>
      </div>
    </Card>
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

function StripBanner({ banner }: { banner: Banner }) {
  const content = (
    <div
      className="mx-auto mb-8 overflow-hidden rounded"
      style={{ maxWidth: 1200, height: 40 }}
    >
      <BannerImage
        src={banner.image_path}
        alt="banner"
        className="h-[40px] w-full object-cover"
      />
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
