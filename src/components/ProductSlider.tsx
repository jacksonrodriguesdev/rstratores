import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { QuoteButton } from "@/components/QuoteButton";
import { useLanguage } from "@/components/LanguageContext";
import type { Product } from "@/lib/products";

type Props = {
  title: string;
  subtitle?: string;
  products: Product[];
  rows?: number;
};

export function ProductSlider({ title, subtitle, products, rows = 1 }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  if (!products || products.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll(-1)} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll(1)} aria-label="Próximo">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
      >
        {Array.from({ length: Math.ceil(products.length / rows) }).map((_, colIdx) => {
          const colProducts = products.slice(colIdx * rows, colIdx * rows + rows);
          return (
            <div
              key={colIdx}
              className="w-[45%] shrink-0 snap-start sm:w-[32%] lg:w-[24%] xl:w-[19%] flex flex-col gap-4"
            >
              {colProducts.map((p) => (
                <div key={p.sku} className="flex-1">
                  <Card className="flex h-full flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <Link
                      to="/produto/$sku"
                      params={{ sku: p.sku }}
                      className="block aspect-square overflow-hidden bg-muted"
                    >
                      <ProductImage
                        src={p.imagem_principal}
                        alt={language === "es-UY" && p.nome_es ? p.nome_es : p.nome}
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
                      </div>
                      <Link
                        to="/produto/$sku"
                        params={{ sku: p.sku }}
                        className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug hover:text-primary"
                      >
                        {language === "es-UY" && p.nome_es ? p.nome_es : p.nome}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">SKU {p.sku}</div>
                      <div className="mt-auto pt-2">
                        <QuoteButton product={p} fullWidth />
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
