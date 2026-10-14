import { Link } from "@tanstack/react-router";
import { Plus, Check } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { QuoteButton } from "@/components/QuoteButton";
import { PrecoTag, SeloOferta } from "@/components/PrecoTag";
import { useCart } from "@/components/CartContext";
import { Card } from "@/components/ui/card";
import { codigoExibicao, marcaExibicao, type Product } from "@/lib/products";
import { nomeProduto, nomePeca } from "@/lib/pecas-es";
import { useT } from "@/lib/idioma";
import { cn } from "@/lib/utils";

// Cartão de peça da loja e das páginas /repuestos: foto, código, marca, preço e botão de cotação.
export function CardLoja({ p }: { p: Product }) {
  const { items, addItem } = useCart();
  const naCotacao = items.some((i) => i.sku === p.sku);
  const { t, idioma } = useT();
  const nome = nomePeca(p, idioma);
  const marca = marcaExibicao(p);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-zinc-200/70 bg-white p-0 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)]">
      <Link
        to="/produto/$sku"
        params={{ sku: p.sku }}
        className="relative block aspect-square overflow-hidden bg-white p-3 md:p-4"
      >
        <ProductImage
          src={p.imagem_principal}
          alt={nome}
          marca={marca}
          className="object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <SeloOferta p={p} className="absolute left-2 top-2" />
      </Link>
      {/* Agregar à cotação sem sair da lista */}
      <button
        onClick={() => {
          if (!naCotacao)
            addItem({
              sku: p.sku,
              codigo: codigoExibicao(p),
              name: p.nome,
              nameEs: nomeProduto(p),
              image: p.imagem_principal || undefined,
              quantity: 1,
            });
        }}
        aria-label={
          naCotacao
            ? t("Ya está en tu cotización", "Já está no seu orçamento")
            : t("Agregar a la cotización", "Adicionar ao orçamento")
        }
        title={
          naCotacao
            ? t("Ya está en tu cotización", "Já está no seu orçamento")
            : t("Agregar a la cotización", "Adicionar ao orçamento")
        }
        className={cn(
          "absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-1 transition active:scale-90",
          naCotacao
            ? "bg-primary text-white ring-primary"
            : "bg-white text-primary ring-zinc-200 hover:bg-primary hover:text-white",
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
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/90">
              {marca}
            </span>
          )}
        </div>
        <Link
          to="/produto/$sku"
          params={{ sku: p.sku }}
          className="mt-0.5 line-clamp-2 h-10 text-[14px] font-bold leading-5 text-zinc-800 transition-colors group-hover:text-primary md:text-[15px]"
        >
          {nome}
        </Link>
        <div className="mt-auto space-y-2 pt-2">
          <PrecoTag p={p} />
          <QuoteButton product={p} fullWidth />
        </div>
      </div>
    </Card>
  );
}
