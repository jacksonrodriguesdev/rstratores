import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search, Package, X, SlidersHorizontal } from "lucide-react";
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
import { listProducts, getFacets, type ListParams } from "@/lib/products";

const searchSchema = z.object({
  q: z.string().optional(),
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

const PAGE_SIZE = 24;

function LojaPage() {
  const { q } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [sort, setSort] = useState<ListParams["sort"]>("nome-asc");
  const [page, setPage] = useState(1);
  const [mobileOpen, setMobileOpen] = useState(false);

  const facetsQuery = useQuery({
    queryKey: ["facets"],
    queryFn: getFacets,
    staleTime: 60_000,
  });

  // We use a single categoria/marca on the backend list call but expose
  // multi-select in the UI; when >1 selected we fetch client-side by
  // filtering after fetching by first value. For simplicity: use "any of"
  // by hitting the API with each value only when 1 is selected; otherwise
  // fall back to no server filter and filter client-side after fetch.
  const singleCategoria = categorias.length === 1 ? categorias[0] : undefined;
  const singleMarca = marcas.length === 1 ? marcas[0] : undefined;

  const params: ListParams = useMemo(
    () => ({
      search,
      categoria: singleCategoria,
      marca: singleMarca,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, singleCategoria, singleMarca, sort, page],
  );

  const productsQuery = useQuery({
    queryKey: ["loja", params],
    queryFn: () => listProducts(params),
  });

  const rawRows = productsQuery.data?.rows ?? [];
  const rows = rawRows.filter((p) => {
    if (categorias.length > 1 && (!p.categoria || !categorias.includes(p.categoria))) return false;
    if (marcas.length > 1 && (!p.marca || !marcas.includes(p.marca))) return false;
    return true;
  });

  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggle = (
    value: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => {
    setPage(1);
    if (list.includes(value)) setter(list.filter((x) => x !== value));
    else setter([...list, value]);
  };

  const activeCount =
    (search ? 1 : 0) + categorias.length + marcas.length;
  const clearAll = () => {
    setSearch("");
    setCategorias([]);
    setMarcas([]);
    setPage(1);
  };

  const sidebar = (
    <aside className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Limpar
          </Button>
        )}
      </div>

      <div className="mb-5">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Buscar
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Nome ou SKU"
            className="pl-8"
          />
        </div>
      </div>

      <FilterGroup
        title="Categorias"
        options={facetsQuery.data?.categorias ?? []}
        selected={categorias}
        onToggle={(v) => toggle(v, categorias, setCategorias)}
      />
      <FilterGroup
        title="Marcas"
        options={facetsQuery.data?.marcas ?? []}
        selected={marcas}
        onToggle={(v) => toggle(v, marcas, setMarcas)}
      />
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Loja</h1>
            <p className="text-sm text-muted-foreground">
              {productsQuery.isLoading
                ? "Carregando…"
                : `${total.toLocaleString("pt-BR")} produto${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeCount}
                </Badge>
              )}
            </Button>
            <Select value={sort} onValueChange={(v) => setSort(v as ListParams["sort"])}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome-asc">Nome (A–Z)</SelectItem>
                <SelectItem value="nome-desc">Nome (Z–A)</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="hidden lg:block">{sidebar}</div>

          <div>
            {productsQuery.isLoading ? (
              <ProductGridSkeleton />
            ) : rows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {rows.map((p) => (
                  <Card
                    key={p.sku}
                    className="flex h-full flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <Link
                      to="/produto/$sku"
                      params={{ sku: p.sku }}
                      className="block aspect-square overflow-hidden bg-muted"
                    >
                      <ProductImage
                        src={p.imagem_principal}
                        alt={p.nome}
                        className="transition-transform hover:scale-105"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div className="flex flex-wrap gap-1">
                        {p.categoria && (
                          <Badge variant="secondary" className="text-[10px]">
                            {p.categoria}
                          </Badge>
                        )}
                        {p.marca && p.marca !== p.categoria && (
                          <Badge variant="outline" className="text-[10px]">
                            {p.marca}
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
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="mx-2 text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="w-[85%] max-w-sm overflow-y-auto bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Filtros</div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebar}
            <div className="mt-4">
              <Button className="w-full" onClick={() => setMobileOpen(false)}>
                Ver {rows.length} produtos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, 8);
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">
        {visible.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"
          >
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={() => onToggle(opt)}
            />
            <span className="line-clamp-1">{opt}</span>
          </label>
        ))}
      </div>
      {options.length > 8 && (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Ver menos" : `Ver mais (${options.length - 8})`}
        </button>
      )}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <Card key={i} className="overflow-hidden p-0">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <Package className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">Nenhum produto encontrado</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Tente ajustar os filtros ou a busca.
      </p>
    </div>
  );
}