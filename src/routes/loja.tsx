import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Search, Package, X, SlidersHorizontal, Loader2, Filter } from "lucide-react";
import { useSegment } from "@/components/SegmentContext";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductImage } from "@/components/ProductImage";
import { QuoteButton } from "@/components/QuoteButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { listProducts, getFacets, type ListParams } from "@/lib/products";

const searchSchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
  marca: z.string().optional(),
  linha: z.string().optional(),
});

export const Route = createFileRoute("/loja")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Loja — RS Trator Peças" },
      {
        name: "description",
        content:
          "Todos os produtos do catálogo. Filtre por categoria, marca e busque por SKU ou nome.",
      },
      { property: "og:title", content: "Loja — RS Trator Peças" },
      { property: "og:description", content: "Todos os produtos do catálogo com filtros por categoria e marca." },
    ],
  }),
  component: LojaPage,
});

const PAGE_SIZE = 30;

function LojaPage() {
  const { q, categoria, marca, linha } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");
  const [categorias, setCategorias] = useState<string[]>(categoria ? [categoria] : []);
  const [marcas, setMarcas] = useState<string[]>(marca ? [marca] : []);
  const [montadoras, setMontadoras] = useState<string[]>([]);
  const [sort, setSort] = useState<ListParams["sort"]>("sku");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { segment, setSegment } = useSegment();
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (linha && (linha === "AGRICOLA" || linha === "AUTOMOTIVA") && linha !== segment) {
      setSegment(linha as any);
    }
    if (categoria) setCategorias([categoria]);
    if (marca) setMarcas([marca]);
    if (q) setSearch(q);
  }, [linha, categoria, marca, q]);

  const queryParams = useMemo(
    () => ({
      search,
      linha: segment,
      categoria: categorias.length > 0 ? categorias : undefined,
      marca: marcas.length > 0 ? marcas : undefined,
      montadora: montadoras.length > 0 ? montadoras : undefined,
      sort,
      pageSize: PAGE_SIZE,
    }),
    [search, segment, categorias, marcas, montadoras, sort],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["loja", queryParams],
    queryFn: ({ pageParam }) => listProducts({ ...queryParams, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const { data: facets } = useQuery({
    queryKey: ["facets", segment],
    queryFn: () => getFacets(segment),
  });

  // Flat array of all rows across all fetched pages
  const rawRows = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.rows);
  }, [data]);

  // Client-side filtering when multiple are selected (Removido pois agora o backend suporta)
  const rows = rawRows;

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" } // Load before it comes fully into view
    );
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggle = (
    value: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => {
    if (list.includes(value)) setter(list.filter((x) => x !== value));
    else setter([...list, value]);
  };

  const activeCount = (search ? 1 : 0) + categorias.length + marcas.length + montadoras.length;
  const clearAll = () => {
    setSearch("");
    setCategorias([]);
    setMarcas([]);
    setMontadoras([]);
  };

  const sidebar = (
    <aside className="rounded-xl border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-bold text-zinc-900 tracking-tight">
          <Filter className="h-5 w-5 text-primary" />
          Refinar Busca
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs font-semibold text-muted-foreground hover:text-destructive">
            Limpar tudo
          </Button>
        )}
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-zinc-800">
          Palavra-chave ou SKU
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex: Filtro Bosch..."
            className="pl-9 bg-white border-zinc-200/80 shadow-inner"
          />
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["montadoras", "categorias"]} className="w-full">
        <AccordionItem value="montadoras" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-3 px-1 rounded-md hover:bg-muted/50">
            <span className="font-semibold text-zinc-800 text-sm uppercase tracking-wider">Montadoras</span>
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-1 pb-4">
              <div className="space-y-2.5">
                {facets?.montadoras ? (facets as any).montadoras.sort((a: any, b: any) => b.count - a.count).map((opt: any) => (
                <label key={opt.name} className="flex cursor-pointer items-center justify-between gap-3 rounded p-1.5 hover:bg-zinc-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={montadoras.includes(opt.name)} onCheckedChange={() => toggle(opt.name, montadoras, setMontadoras)} className="rounded-[4px] border-zinc-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">{opt.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-full">{opt.count}</span>
                </label>
              )) : (
                <div className="p-2 text-sm text-zinc-500">Carregando montadoras...</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="categorias" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-3 px-1 rounded-md hover:bg-muted/50">
              <span className="font-semibold text-zinc-800 text-sm uppercase tracking-wider">Subgrupo (Categoria)</span>
            </AccordionTrigger>
            <AccordionContent className="px-1 pt-1 pb-4">
              <div className="space-y-2.5">
                {facets?.categorias ? facets.categorias.sort((a,b) => b.count - a.count).map((cat) => (
                <label key={cat.name} className="flex cursor-pointer items-center justify-between gap-3 rounded p-1.5 hover:bg-zinc-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={categorias.includes(cat.name)} onCheckedChange={() => toggle(cat.name, categorias, setCategorias)} className="rounded-[4px] border-zinc-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">{cat.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-full">{cat.count}</span>
                </label>
              )) : (
                <div className="p-2 text-sm text-zinc-500">Carregando categorias...</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="marcas" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-3 px-1 rounded-md hover:bg-muted/50">
            <span className="font-semibold text-zinc-800 text-sm uppercase tracking-wider">Marcas de Peças</span>
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-1 pb-4">
              <div className="space-y-2.5">
                {facets?.marcas ? facets.marcas.sort((a,b) => b.count - a.count).map((marca) => (
                <label key={marca.name} className="flex cursor-pointer items-center justify-between gap-3 rounded p-1.5 hover:bg-zinc-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={marcas.includes(marca.name)} onCheckedChange={() => toggle(marca.name, marcas, setMarcas)} className="rounded-[4px] border-zinc-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">{marca.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-full">{marca.count}</span>
                </label>
              )) : (
                <div className="p-2 text-sm text-zinc-500">Carregando marcas...</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <SiteHeader />
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
               Catálogo <span className="text-primary font-medium text-2xl ml-2 tracking-normal">Linha {segment === "AGRICOLA" ? "Agrícola" : "Automotiva"}</span>
            </h1>
            <p className="text-sm text-zinc-500 mt-2 font-medium">
              {isLoading ? (
                 <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Sincronizando produtos...</span>
              ) : (
                 `${rows.length}+ resultados encontrados para sua busca`
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="lg:hidden h-10 bg-white shadow-sm"
              onClick={() => setMobileOpen(true)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" />
              Filtros
              {activeCount > 0 && (
                <Badge variant="default" className="ml-2 bg-primary">
                  {activeCount}
                </Badge>
              )}
            </Button>
            <div className="bg-white rounded-md shadow-sm border border-zinc-200 flex items-center p-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3">Ordenar:</span>
              <Select value={sort} onValueChange={(v) => setSort(v as ListParams["sort"])}>
                <SelectTrigger className="w-[180px] border-0 focus:ring-0 bg-transparent font-medium text-zinc-800 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sku">Lançamentos (SKU)</SelectItem>
                  <SelectItem value="nome-asc">Ordem Alfabética (A-Z)</SelectItem>
                  <SelectItem value="nome-desc">Ordem Alfabética (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="hidden lg:block">{sidebar}</div>

          <div className="flex flex-col gap-6 pb-20">
            {isLoading ? (
              <ProductGridSkeleton />
            ) : rows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {rows.map((p) => (
                  <Card
                    key={p.sku}
                    className="flex h-full flex-col overflow-hidden p-0 border-zinc-200/70 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] hover:border-primary/40 group relative"
                  >
                    <Link
                      to="/produto/$sku"
                      params={{ sku: p.sku }}
                      className="block aspect-square overflow-hidden bg-white p-4 relative"
                    >
                      <ProductImage
                        src={p.imagem_principal}
                        alt={p.nome}
                        className="transition-transform duration-700 ease-out group-hover:scale-105 object-contain drop-shadow-sm mix-blend-multiply"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                    <div className="flex flex-1 flex-col gap-2.5 p-4 border-t border-zinc-100">
                      <div className="flex flex-wrap gap-1.5 items-center justify-between">
                        <div className="text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200/80 tracking-wide">
                          SKU {p.sku}
                        </div>
                        {p.marca && (
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/90">{p.marca}</span>
                        )}
                      </div>
                      <Link
                        to="/produto/$sku"
                        params={{ sku: p.sku }}
                        className="line-clamp-2 min-h-[2.75rem] text-[15px] font-bold leading-tight text-zinc-800 transition-colors group-hover:text-primary mt-1"
                      >
                        {p.nome}
                      </Link>
                      <div className="mt-auto pt-3 opacity-90 group-hover:opacity-100 transition-opacity">
                        <QuoteButton product={p} fullWidth />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Infinite Scroll Loader Trigger */}
            {(hasNextPage || isFetchingNextPage) && (
              <div ref={loaderRef} className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            )}
            
            {!hasNextPage && rows.length > 0 && !isLoading && (
              <div className="flex justify-center py-10 opacity-60">
                <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> 
                  Fim do Catálogo
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Filter Button (Mobile) */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 transition-transform hover:scale-105"
          onClick={() => setMobileOpen(true)}
          aria-label="Filtros"
        >
          <SlidersHorizontal className="h-6 w-6 text-white" />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[11px] font-extrabold text-white shadow-md border-2 border-white">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile filter drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="w-[85%] max-w-sm overflow-y-auto bg-[#f8f9fc] p-5 shadow-2xl animate-in slide-in-from-right-full duration-300">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-lg font-bold text-zinc-900">Filtrar Produtos</div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="rounded-full bg-zinc-200/50 hover:bg-zinc-200">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {sidebar}
            <div className="mt-6 sticky bottom-4">
              <Button className="w-full h-12 text-base font-bold shadow-lg" onClick={() => setMobileOpen(false)}>
                Ver Resultados
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 15 }).map((_, i) => (
        <Card key={i} className="overflow-hidden p-0 border-zinc-200/70 bg-white shadow-sm">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-1/3 rounded-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-10 w-full mt-2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white/50 py-24 text-center">
      <Package className="mb-4 h-16 w-16 text-zinc-300" />
      <h3 className="text-xl font-bold text-zinc-900">Nenhum produto encontrado</h3>
      <p className="mt-2 max-w-sm text-sm font-medium text-zinc-500">
        Tente ajustar os filtros, remover alguma marca ou verificar a ortografia da busca.
      </p>
    </div>
  );
}