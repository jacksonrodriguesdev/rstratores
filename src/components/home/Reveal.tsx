import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Entrada suave quando o bloco aparece na tela (CSS em styles.css: [data-reveal]).
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal className={className}>
      {children}
    </div>
  );
}

// Cartão branco com título e "Ver todos", como as seções do Mercado Livre.
export function Section({
  title,
  subtitle,
  verTodos,
  children,
  className,
  id,
}: {
  title?: string | null;
  subtitle?: string;
  verTodos?: { search?: Record<string, unknown>; label?: string };
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Reveal>
      <section
        id={id}
        className={cn("scroll-mt-28 rounded-2xl bg-white p-4 shadow-sm md:p-6", className)}
      >
        {(title || verTodos) && (
          <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
            <div>
              {title && (
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 md:text-xl">{title}</h2>
              )}
              {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
            </div>
            {verTodos && (
              <Link
                to="/loja"
                search={(verTodos.search ?? {}) as never}
                className="flex shrink-0 items-center text-sm font-semibold text-primary hover:underline"
              >
                {verTodos.label ?? "Ver todos"} <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
        {children}
      </section>
    </Reveal>
  );
}
