import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappQuoteUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type Props = {
  product: { sku: string; nome: string };
  size?: "sm" | "default" | "lg";
  className?: string;
  fullWidth?: boolean;
  label?: string;
};

export function QuoteButton({ product, size = "sm", className, fullWidth, label = "Fazer cotação" }: Props) {
  return (
    <Button
      asChild
      size={size}
      className={cn("bg-[#25D366] text-white hover:bg-[#1EBE57]", fullWidth && "w-full", className)}
    >
      <a
        href={whatsappQuoteUrl(product)}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
