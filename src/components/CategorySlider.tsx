import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageContext";
import type { CategoryWithChildren } from "@/lib/categories";

type Props = {
  categories: CategoryWithChildren[];
};

export function CategorySlider({ categories }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  if (!categories || categories.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="mb-14">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t("home.comprePorCategoria")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("home.exploreVariedade")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm hover:bg-accent hover:text-accent-foreground" onClick={() => scroll(-1)} aria-label="Anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm hover:bg-accent hover:text-accent-foreground" onClick={() => scroll(1)} aria-label="Próximo">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((cat) => {
          const imgSrc = cat.image_path
            ? (cat.image_path.startsWith("/") ? cat.image_path : `/uploads/${cat.image_path}`)
            : null;

          return (
            <div
              key={cat.id}
              className="w-[45%] sm:w-[30%] md:w-[22%] lg:w-[16%] shrink-0 snap-start"
            >
              <Link
                to="/loja"
                search={{ categoria: cat.nome } as never}
                className="group relative block aspect-square overflow-hidden rounded-2xl bg-muted shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={cat.nome}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
                    <ImageIcon className="h-10 w-10 text-primary/40 transition-transform duration-500 group-hover:scale-110 group-hover:text-primary/60" />
                  </div>
                )}
                
                {/* Overlay with subtle gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                
                <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                  <h3 className="text-sm font-semibold text-white md:text-base tracking-wide drop-shadow-md transition-transform duration-300 group-hover:-translate-y-1">
                    {cat.nome}
                  </h3>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
