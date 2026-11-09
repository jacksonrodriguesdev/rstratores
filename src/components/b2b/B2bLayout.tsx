// AGRO PARTS Mayorista: cabeçalho e peças visuais próprias da área das empresas (visual escuro,
// sóbrio, diferente da loja do consumidor). Usado em /empresas, /empresas/registro, portal e cotações.
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ArrowRight, Building2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSessionFn } from "@/lib/user-auth";

export function B2bHeader({ escuro = false }: { escuro?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const naHome = pathname === "/empresas";
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl",
        escuro
          ? "border-white/10 bg-slate-950/80 text-white"
          : "border-slate-200 bg-white/85 text-slate-900",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/empresas" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-9 w-auto" />
          <span className="leading-none">
            <span className="block text-[15px] font-extrabold tracking-tight">AGRO PARTS</span>
            <span
              className={cn(
                "block text-[10px] font-bold tracking-[0.22em]",
                escuro ? "text-emerald-300" : "text-emerald-700",
              )}
            >
              MAYORISTA
            </span>
          </span>
        </Link>
        <nav
          className={cn(
            "ml-6 hidden items-center gap-6 text-sm font-medium md:flex",
            escuro ? "text-slate-300" : "text-slate-600",
          )}
        >
          {naHome && (
            <>
              <a href="#probar" className="hover:text-current hover:opacity-100">
                Probar con mi lista
              </a>
              <a href="#como-funciona" className="hover:opacity-100">
                Cómo funciona
              </a>
              <a href="#preguntas" className="hover:opacity-100">
                Preguntas
              </a>
            </>
          )}
          <Link to="/" className="hover:opacity-100">
            Tienda minorista
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {sessao ? (
            <Link
              to="/empresas/portal"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                escuro
                  ? "bg-white text-slate-950 hover:bg-emerald-100"
                  : "bg-slate-950 text-white hover:bg-slate-800",
              )}
            >
              <Building2 className="h-4 w-4" /> Portal de mi empresa
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                search={{ redirect: "/empresas/portal" } as any}
                className={cn(
                  "hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold sm:inline-flex",
                  escuro ? "text-white hover:bg-white/10" : "hover:bg-slate-100",
                )}
              >
                <LogIn className="h-4 w-4" /> Ingresar
              </Link>
              <Link
                to="/empresas/registro"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-500 px-4 text-sm font-bold text-slate-950 shadow-[0_0_0_1px_rgba(16,185,129,.4),0_8px_24px_-8px_rgba(16,185,129,.7)] hover:bg-emerald-400"
              >
                Registrar empresa <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// Fundo da área: cinza muito claro com a grade técnica discreta
export function B2bPagina({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-screen bg-slate-50 text-slate-900", className)}>
      <B2bHeader />
      {children}
    </div>
  );
}

export function Selo({
  children,
  tom = "neutro",
  className,
}: {
  children: ReactNode;
  tom?: "neutro" | "verde" | "ambar" | "azul" | "vermelho";
  className?: string;
}) {
  const cores = {
    neutro: "bg-slate-100 text-slate-700 ring-slate-200",
    verde: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    ambar: "bg-amber-50 text-amber-800 ring-amber-200",
    azul: "bg-sky-50 text-sky-800 ring-sky-200",
    vermelho: "bg-rose-50 text-rose-800 ring-rose-200",
  }[tom];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        cores,
        className,
      )}
    >
      {children}
    </span>
  );
}

export const tomStatus = (s: string): "neutro" | "verde" | "ambar" | "azul" | "vermelho" =>
  (
    ({
      ENVIADA: "azul",
      COTADA: "verde",
      ACEITA: "verde",
      RECUSADA: "vermelho",
      CANCELADA: "neutro",
      VENCIDA: "ambar",
      PENDENTE: "ambar",
      APROVADA: "verde",
      SUSPENSA: "vermelho",
    }) as Record<string, "neutro" | "verde" | "ambar" | "azul" | "vermelho">
  )[s] ?? "neutro";
