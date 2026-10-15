import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappQuoteUrl } from "@/lib/whatsapp";
import { pedirPrecoWhatsapp } from "@/lib/pedir-cadastro";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/idioma";

type Props = {
  product: { sku: string; nome: string };
  size?: "sm" | "default" | "lg";
  className?: string;
  fullWidth?: boolean;
  label?: string;
};

export function QuoteButton({ product, size = "sm", className, fullWidth, label }: Props) {
  const { t, idioma } = useT();
  return (
    <Button
      asChild
      size={size}
      className={cn("bg-[#25D366] text-white hover:bg-[#1EBE57]", fullWidth && "w-full", className)}
    >
      {/* O link fica para quem está sem JavaScript; o clique passa pelo cadastro (pedir-cadastro.ts) */}
      <a
        href={whatsappQuoteUrl(product, idioma)}
        target="_blank"
        rel="noreferrer noopener"
        data-cadastro="whatsapp"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          pedirPrecoWhatsapp(whatsappQuoteUrl(product, idioma));
        }}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        {label ?? t("Consultar precio", "Consultar preço")}
      </a>
    </Button>
  );
}
