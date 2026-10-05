import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageContext";
import { ProductImage } from "@/components/ProductImage";
import { QuoteButton } from "@/components/QuoteButton";
import { codigoExibicao, type Product } from "@/lib/products";
import { useCart } from "@/components/CartContext";
import { ShoppingCart } from "lucide-react";

export function MiniCard({ p }: { p: Product }) {
  const { language } = useLanguage();
  const nomeDisplay = language === "es-UY" && p.nome_es ? p.nome_es : p.nome;
  const { addItem } = useCart();

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0 border-zinc-200/50 bg-white/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-primary/30 group">
      <Link
        to="/produto/$sku"
        params={{ sku: p.sku }}
        className="block aspect-square overflow-hidden bg-white/80 p-4 relative"
      >
        <ProductImage
          src={p.imagem_principal}
          alt={p.nome}
          marca={p.marca}
          className="transition-transform duration-700 ease-out group-hover:scale-110 object-contain drop-shadow-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-4 bg-white/40">
        <div className="flex flex-wrap gap-1.5 items-center justify-between">
          <div className="text-[11px] font-medium text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-full border border-black/5">
            Cód. {codigoExibicao(p)}
          </div>
          {p.marca && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {p.marca}
            </span>
          )}
        </div>
        <Link
          to="/produto/$sku"
          params={{ sku: p.sku }}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-800 transition-colors group-hover:text-primary"
        >
          {nomeDisplay}
        </Link>
        <div className="mt-auto pt-3 flex flex-col gap-2">
          <button
            onClick={() =>
              addItem({
                sku: p.sku,
                codigo: codigoExibicao(p),
                name: p.nome,
                image: p.imagem_principal || undefined,
                quantity: 1,
              })
            }
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-md font-bold text-xs uppercase tracking-wide hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Carrinho
          </button>
          <QuoteButton product={p} fullWidth />
        </div>
      </div>
    </Card>
  );
}
