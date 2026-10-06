import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/products";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

export function BannerImage({ src, alt, className }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!src) return;
    resolveImageUrl(src).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!url) return null;
  return <img decoding="async" src={url} alt={alt} className={cn("block", className)} loading="lazy" />;
}
