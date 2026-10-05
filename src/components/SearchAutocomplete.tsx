import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { useDebounce } from "@/hooks/use-debounce";
import { listProducts, formatBRL } from "@/lib/products";

interface SearchAutocompleteProps {
  segment: "AGRICOLA" | "AUTOMOTIVA";
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showButton?: boolean;
}

export function SearchAutocomplete({
  segment,
  placeholder = "Buscar...",
  className = "",
  inputClassName = "",
  showButton = false,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useQuery({
    queryKey: ["autocomplete", debouncedQuery, segment],
    queryFn: () => listProducts({ search: debouncedQuery, linha: segment, page: 1, pageSize: 5 }),
    enabled: debouncedQuery.length >= 3,
    staleTime: 30000,
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      navigate({ to: "/loja", search: { q: query.trim() } });
    }
  };

  const hasResults = searchResults.data?.rows && searchResults.data.rows.length > 0;
  const isLoading = searchResults.isFetching && debouncedQuery.length >= 3;

  return (
    <div ref={wrapperRef} className={`relative flex w-full gap-2 ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex-1 group">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`h-14 rounded-xl pl-12 pr-4 text-base ${inputClassName}`}
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {showButton && (
        <Button
          className="h-14 rounded-xl px-8 shadow-md text-base font-semibold"
          onClick={() => handleSubmit()}
        >
          Buscar
        </Button>
      )}

      {/* Dropdown de Resultados */}
      {isOpen && debouncedQuery.length >= 3 && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-background border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {!isLoading && !hasResults && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para "{debouncedQuery}"
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="flex flex-col">
              {searchResults.data?.rows?.map((product: any) => (
                <button
                  key={product.sku}
                  onClick={() => {
                    setIsOpen(false);
                    navigate({ to: "/produto/$sku", params: { sku: product.sku } });
                  }}
                  className="flex items-center gap-4 p-3 hover:bg-accent/10 transition-colors text-left border-b last:border-b-0"
                >
                  <div className="h-12 w-12 shrink-0 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <ProductImage src={product.imagem_principal} alt={product.nome} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-foreground">
                      {product.nome}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {product.marca || product.categoria || product.sku}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-primary shrink-0 pl-2">
                    {product.preco_brl ? formatBRL(product.preco_brl) : "Sob consulta"}
                  </div>
                </button>
              ))}

              <button
                onClick={() => handleSubmit()}
                className="p-3 text-sm font-semibold text-center text-primary bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                Ver todos os resultados
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
