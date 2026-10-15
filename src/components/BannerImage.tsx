import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

export function BannerImage({ src, alt, className }: Props) {
  // Endereço calculado na hora: o banner já sai no HTML do servidor
  const url = src
    ? src.startsWith("http") || src.startsWith("/")
      ? src
      : `/uploads/${src}`
    : null;
  if (!url) return null;
  return (
    <img decoding="async" src={url} alt={alt} className={cn("block", className)} loading="lazy" />
  );
}
