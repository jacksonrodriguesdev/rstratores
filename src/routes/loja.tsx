import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Search, Package, X, SlidersHorizontal, Loader2, Filter, Plus, Check, MessageCircle } from "lucide-react";
import { useSegment } from "@/components/SegmentContext";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductImage } from "@/components/ProductImage";
import { QuoteButton } from "@/components/QuoteButton";
import { useCart } from "@/components/CartContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDebounce } from "@/hooks/use-debounce";
import { listProducts, getFacets, codigoExibicao, marcaExibicao, type ListParams, type Product } from "@/lib/products";
import { categoriaEs, nomeEs } from "@/lib/pecas-es";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { registrarEvento } from "@/lib/eventos";

// O roteador lê "?q=6205" como número; aceita os dois e converte para texto (código só com
// dígitos derrubava a página)
const texto = z.union([z.string(), z.number()]).transform(String).optional();
const searchSchema = z.object({
  q: texto,
  categoria: texto,
  marca: texto,
  linha: texto,
});

export const Route = createFileRoute("/loja")({
  validateSearch: searchSchema,
  head: ({ match }) => {
    const { categoria, marca, q } = (match.search ?? {}) as z.infer<typeof searchSchema>;
    // Título conforme o filtro: "Filtros para Massey Ferguson" rende melhor no Google que "Loja"
    const alvo = [categoria ? categoriaEs(categoria) : "Repuestos agrícolas", marca && `para ${marca}`]
      .filter(Boolean)
      .join(" ");
    const titulo = q ? `Resultados para "${q}"` : alvo;
    const desc = `${alvo} con envío a todo Uruguay por DAC. Buscá por código original y cotizá por WhatsApp.`;
    return {
      meta: [
        { title: `${titulo} | RS Auto Peças` },
        { name: "description", content: desc },
        { property: "og:title", content: `${titulo} | RS Auto Peças` },
        { property: "og:description", content: desc },
        // Buscas internas não devem ir para o índice do Google
        ...(q ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
    };
  },
  component: LojaPage,
});

const PAGE_SIZE = 30;

function LojaPage() {
  const { q, categoria, marca, linha } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");
  const busca = useDebounce(search.trim(), 400);
  const [categorias, setCategorias] = useState<string[]>(categoria ? [categoria] : []);
  const [marcas, setMarcas] = useState<string[]>(marca ? [marca] : []);
  const [sort, setSort] = useState<ListParams["sort"]>("nome-asc");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { segment, setSegment } = useSegment();
  const loaderRef = useRef<HTMLDivElement>(null);

  // Links do header/home trocam os filtros mesmo com a loja já aberta
  useEffect(() => {
    if (linha && (linha === "AGRICOLA" || linha === "AUTOMOTIVA") && linha !== segment) {
      setSegment(linha as any);
    }
    setCategorias(categoria ? [categoria] : []);
    setMarcas(marca ? [marca] : []);
    setSearch(q ?? "");
  }, [linha, categoria, marca, q]);

  const queryParams = useMemo(
    () => ({
      search: busca,
      linha: segment,
      categoria: categorias.length > 0 ? categorias : undefined,
      marca: marcas.length > 0 ? marcas : undefined,
      sort,
      pageSize: PAGE_SIZE,
      // Navegando sem busca, mostra só produtos apresentáveis; a busca procura em tudo.
      vitrine: !busca,
    }),
    [busca, segment, categorias, marcas, sort],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["loja", queryParams],
    // Conta o total só na primeira página (mostra "1.234 repuestos" no topo)
    queryFn: ({ pageParam }) => listProducts({ ...queryParams, cursor: pageParam, contar: !pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
  });

  const { data: facets } = useQuery({
    queryKey: ["facets", segment],
    queryFn: () => getFacets(segment),
  });

  const rows = useMemo(() => (data ? data.pages.flatMap((page) => page.rows as Product[]) : []), [data]);
  const total = data?.pages[0]?.total ?? -1;

  // Registra o que o cliente buscou e quantas peças achou (buscas sem resultado mostram
  // peças que faltam no catálogo). Uma vez por termo.
  const buscasRegistradas = useRef(new Set<string>());
  useEffect(() => {
    if (busca.length < 3 || isLoading || total < 0) return;
    const chave = busca.toLowerCase();
    if (buscasRegistradas.current.has(chave)) return;
    buscasRegistradas.current.add(chave);
    registrarEvento("busca", `${total}|${busca}`);
  }, [busca, total, isLoading]);

  // Rolagem infinita
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1, rootMargin: "400px" },
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggle = (value: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(value)) setter(list.filter((x) => x !== value));
    else setter([...list, value]);
  };

  const activeCount = (search ? 1 : 0) + categorias.length + marcas.length;
  const clearAll = () => {
    setSearch("");
    setCategorias([]);
    setMarcas([]);
  };

  const titulo =
    categorias.length === 1
      ? categoriaEs(categorias[0])
      : marcas.length === 1
        ? `Repuestos ${marcas[0]}`
        : "Repuestos agrícolas";

  const listaFiltro = (
    opcoes: { name: string; count: number }[] | undefined,
    selecionados: string[],
    setter: (v: string[]) => void,
    rotulo: (n: string) => string,
  ) =>
    opcoes ? (
      opcoes.map((opt) => (
        <label
          key={opt.name}
          className="group flex cursor-pointer items-center justify-between gap-3 rounded p-1.5 transition-colors hover:bg-zinc-100"
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selecionados.includes(opt.name)}
              onCheckedChange={() => toggle(opt.name, selecionados, setter)}
              className="rounded-[4px] border-zinc-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
            <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">{rotulo(opt.name)}</span>
          </div>
          <span className="rounded-full border border-zinc-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-zinc-400">
            {opt.count.toLocaleString("es-UY")}
          </span>
        </label>
      ))
    ) : (
      <div className="p-2 text-sm text-zinc-500">Cargando…</div>
    );

  const sidebar = (
    <aside className="sticky top-[calc(var(--altura-header,96px)+1rem)] max-h-[calc(100vh-var(--altura-header,96px)-2rem)] overflow-y-auto rounded-xl border bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-[top] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-bold tracking-tight text-zinc-900">
          <Filter className="h-5 w-5 text-primary" />
          Filtrar
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs font-semibold text-muted-foreground hover:text-destructive"
          >
            Limpiar todo
          </Button>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="busca-loja" className="mb-2 block text-sm font-semibold text-zinc-800">
          Nombre o código
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="busca-loja"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ej.: rodamiento, AL81843…"
            className="border-zinc-200/80 bg-white pl-9 text-base shadow-inner md:text-sm"
          />
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["categorias", "marcas"]} className="w-full">
        <AccordionItem value="categorias" className="border-b-0">
          <AccordionTrigger className="rounded-md px-1 py-3 hover:bg-muted/50 hover:no-underline">
            <span className="text-sm font-semibold uppercase tracking-wider text-zinc-800">Categoría</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-1 px-1 pb-4 pt-1">
            {listaFiltro(facets?.categorias, categorias, setCategorias, categoriaEs)}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="marcas" className="border-b-0">
          <AccordionTrigger className="rounded-md px-1 py-3 hover:bg-muted/50 hover:no-underline">
            <span className="text-sm font-semibold uppercase tracking-wider text-zinc-800">Marca del tractor</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-1 px-1 pb-4 pt-1">
            {listaFiltro((facets as any)?.marcas, marcas, setMarcas, (n) => n)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <SiteHeader />
      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 md:py-8 lg:px-8">
        <div className="mb-5 flex flex-col justify-between gap-3 md:mb-8 md:flex-row md:items-end md:gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 md:text-3xl">{titulo}</h1>
            <p className="mt-2 text-sm font-medium text-zinc-500">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Buscando repuestos…
                </span>
              ) : total >= 0 ? (
                `${total.toLocaleString("es-UY")} ${total === 1 ? "repuesto encontrado" : "repuestos encontrados"}${busca ? ` para "${busca}"` : ""}`
              ) : (
                `${rows.length} repuestos`
              )}
            </p>
            {/* Filtros ativos, removíveis com um toque */}
            {(categorias.length > 0 || marcas.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggle(c, categorias, setCategorias)}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    {categoriaEs(c)} <X className="h-3 w-3" />
                  </button>
                ))}
                {marcas.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggle(m, marcas, setMarcas)}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    {m} <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 md:w-auto md:gap-3">
            <Button
              variant="outline"
              className="h-10 shrink-0 bg-white shadow-sm lg:hidden"
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
            <div className="flex min-w-0 flex-1 items-center rounded-md border border-zinc-200 bg-white p-1 shadow-sm md:flex-none">
              <span className="hidden px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:inline">
                Ordenar:
              </span>
              <Select value={sort} onValueChange={(v) => setSort(v as ListParams["sort"])}>
                <SelectTrigger className="w-full min-w-0 border-0 bg-transparent font-medium text-zinc-800 shadow-none focus:ring-0 sm:w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome-asc">Nombre (A-Z)</SelectItem>
                  <SelectItem value="nome-desc">Nombre (Z-A)</SelectItem>
                  <SelectItem value="created-desc">Más recientes</SelectItem>
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
              <EmptyState busca={busca} />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {rows.map((p) => (
                  <CardLoja key={p.sku} p={p} />
                ))}
              </div>
            )}

            {(hasNextPage || isFetchingNextPage) && (
              <div ref={loaderRef} className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            )}

            {!hasNextPage && rows.length > 0 && !isLoading && (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm">
                <p className="font-semibold text-zinc-800">¿No encontraste lo que buscabas?</p>
                <p className="max-w-md text-sm text-zinc-500">
                  Tenemos muchas piezas que todavía no están publicadas. Mandanos el código o una foto y te la
                  conseguimos.
                </p>
                <a
                  href={whatsappContactUrl(`¡Hola! Busco un repuesto${busca ? `: ${busca}` : ""}.`)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1EBE57]"
                >
                  <MessageCircle className="h-4 w-4" /> Pedir por WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Botão de filtros flutuante (celular) */}
      <div className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6 lg:hidden">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-primary shadow-2xl transition-transform hover:scale-105 hover:bg-primary/90"
          onClick={() => setMobileOpen(true)}
          aria-label="Filtros"
        >
          <SlidersHorizontal className="h-6 w-6 text-white" />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-destructive text-[11px] font-extrabold text-white shadow-md">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filtros no celular */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="w-[85%] max-w-sm overflow-y-auto bg-[#f8f9fc] p-5 shadow-2xl animate-in slide-in-from-right-full duration-300">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-lg font-bold text-zinc-900">Filtrar repuestos</div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cerrar"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-zinc-200/50 hover:bg-zinc-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {sidebar}
            <div className="sticky bottom-4 mt-6">
              <Button className="h-12 w-full text-base font-bold shadow-lg" onClick={() => setMobileOpen(false)}>
                Ver {total >= 0 ? `${total.toLocaleString("es-UY")} ` : ""}resultados
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardLoja({ p }: { p: Product }) {
  const { items, addItem } = useCart();
  const naCotacao = items.some((i) => i.sku === p.sku);
  const nome = nomeEs(p.nome);
  const marca = marcaExibicao(p);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-zinc-200/70 bg-white p-0 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)]">
      <Link to="/produto/$sku" params={{ sku: p.sku }} className="relative block aspect-square overflow-hidden bg-white p-3 md:p-4">
        <ProductImage
          src={p.imagem_principal}
          alt={nome}
          marca={marca}
          className="object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </Link>
      {/* Agregar à cotação sem sair da lista */}
      <button
        onClick={() => {
          if (!naCotacao)
            addItem({ sku: p.sku, codigo: codigoExibicao(p), name: p.nome, image: p.imagem_principal || undefined, quantity: 1 });
        }}
        aria-label={naCotacao ? "Ya está en tu cotización" : "Agregar a la cotización"}
        title={naCotacao ? "Ya está en tu cotización" : "Agregar a la cotización"}
        className={cn(
          "absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-1 transition active:scale-90",
          naCotacao ? "bg-primary text-white ring-primary" : "bg-white text-primary ring-zinc-200 hover:bg-primary hover:text-white",
        )}
      >
        {naCotacao ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
      <div className="flex flex-1 flex-col gap-2 border-t border-zinc-100 p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="rounded-full border border-zinc-200/80 bg-zinc-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-zinc-500">
            Cód. {codigoExibicao(p)}
          </div>
          {marca && (
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/90">{marca}</span>
          )}
        </div>
        <Link
          to="/produto/$sku"
          params={{ sku: p.sku }}
          className="mt-0.5 line-clamp-2 min-h-[2.6rem] text-[14px] font-bold leading-tight text-zinc-800 transition-colors group-hover:text-primary md:text-[15px]"
        >
          {nome}
        </Link>
        <div className="mt-auto pt-2">
          <QuoteButton product={p} fullWidth />
        </div>
      </div>
    </Card>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 15 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-zinc-200/70 bg-white p-0 shadow-sm">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-1/3 rounded-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ busca }: { busca: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white/50 px-4 py-16 text-center md:py-24">
      <Package className="mb-4 h-16 w-16 text-zinc-300" />
      <h3 className="text-xl font-bold text-zinc-900">No encontramos repuestos{busca ? ` para "${busca}"` : ""}</h3>
      <p className="mt-2 max-w-sm text-sm font-medium text-zinc-500">
        Probá con el código original, otra palabra o quitá algún filtro. Si no aparece, te lo conseguimos.
      </p>
      <a
        href={whatsappContactUrl(`¡Hola! Busco un repuesto${busca ? `: ${busca}` : ""}.`)}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-5 flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1EBE57]"
      >
        <MessageCircle className="h-4 w-4" /> Pedir por WhatsApp
      </a>
    </div>
  );
}
