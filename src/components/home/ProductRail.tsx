import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { useCart } from "@/components/CartContext";
import { codigoExibicao, marcaExibicao, type Product } from "@/lib/products";
import { nomeProduto } from "@/lib/pecas-es";
import { cn } from "@/lib/utils";
import { usePreco, PrecoVisual, SeloOferta } from "@/components/PrecoTag";

// Preço da peça (quando tem e está liberado no admin); senão, o convite para consultar
function PrecoComFallback({ p }: { p: Product }) {
  const preco = usePreco(p);
  if (!preco) return <span className="text-sm font-semibold text-primary">Consultá el precio</span>;
  return <PrecoVisual preco={preco} />;
}

// Larguras por tela: no celular aparece um pedaço do próximo cartão, convidando a arrastar.
const LARGURA = "flex-[0_0_44%] sm:flex-[0_0_31%] md:flex-[0_0_24%] lg:flex-[0_0_19.2%] xl:flex-[0_0_16%]";

export function ProductRail({ products, loading }: { products: Product[]; loading?: boolean }) {
  const [emblaRef, api] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });
  const [pode, setPode] = useState({ prev: false, next: false });

  useEffect(() => {
    if (!api) return;
    const update = () => setPode({ prev: api.canScrollPrev(), next: api.canScrollNext() });
    api.on("select", update).on("reInit", update).on("scroll", update);
    update();
    return () => {
      api.off("select", update).off("reInit", update).off("scroll", update);
    };
  }, [api]);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(LARGURA, "animate-pulse rounded-xl border border-zinc-100")}>
            <div className="aspect-square rounded-t-xl bg-zinc-100" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-1/2 rounded bg-zinc-100" />
              <div className="h-3 w-full rounded bg-zinc-100" />
              <div className="h-3 w-2/3 rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="group/rail relative">
      <div className="-mx-1 overflow-hidden px-1 py-1" ref={emblaRef}>
        <div className="flex gap-3">
          {products.map((p) => (
            <div key={p.sku} className={cn(LARGURA, "min-w-0")}>
              <RailCard p={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Setas no desktop, aparecem ao passar o mouse */}
      {pode.prev && (
        <button
          onClick={() => api?.scrollPrev()}
          aria-label="Anteriores"
          className="absolute -left-4 top-1/3 hidden h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-700 opacity-0 shadow-lg ring-1 ring-zinc-200 transition group-hover/rail:opacity-100 md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {pode.next && (
        <button
          onClick={() => api?.scrollNext()}
          aria-label="Siguientes"
          className="absolute -right-4 top-1/3 hidden h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-700 opacity-0 shadow-lg ring-1 ring-zinc-200 transition group-hover/rail:opacity-100 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function RailCard({ p }: { p: Product }) {
  const { items, addItem } = useCart();
  const noCarrinho = items.some((i) => i.sku === p.sku);
  const nome = nomeProduto(p);
  const marca = marcaExibicao(p);

  return (
    <Link
      to="/produto/$sku"
      params={{ sku: p.sku }}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
    >
      <div className="relative aspect-square bg-white p-2">
        <SeloOferta p={p} className="absolute left-1.5 top-1.5 z-10 px-1.5 py-0.5 text-[10px]" />
        <ProductImage
          src={p.imagem_principal}
          alt={nome}
          marca={marca}
          className="object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-zinc-100 p-3">
        <span className="text-[11px] font-medium text-zinc-400">Cód. {codigoExibicao(p)}</span>
        <span className="line-clamp-2 min-h-[2.75em] text-[13px] leading-snug text-zinc-800">{nome}</span>
        <span className="mt-auto pt-1">
          <PrecoComFallback p={p} />
        </span>
        {marca && <span className="truncate text-[11px] uppercase tracking-wide text-zinc-400">{marca}</span>}
      </div>

      {/* Adicionar à cotação sem sair da vitrine */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!noCarrinho) {
            addItem({
              sku: p.sku,
              codigo: codigoExibicao(p),
              name: p.nome, nameEs: nomeProduto(p),
              image: p.imagem_principal || undefined,
              quantity: 1,
            });
          }
        }}
        aria-label={noCarrinho ? "Ya está en tu cotización" : "Agregar a la cotización"}
        className={cn(
          "absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-1 transition active:scale-90",
          noCarrinho
            ? "bg-primary text-white ring-primary"
            : "bg-white text-primary ring-zinc-200 hover:bg-primary hover:text-white",
        )}
      >
        {noCarrinho ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </Link>
  );
}
