import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, LayoutGrid, MessageCircle, ShoppingCart, User, Tractor, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/components/CartContext";
import { useLanguage } from "@/components/LanguageContext";
import { getSessionFn } from "@/lib/user-auth";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { MONTADORAS } from "@/lib/navegacao";
import { useCategoriasLoja } from "@/hooks/use-categorias-loja";
import { cn } from "@/lib/utils";

// Barra de navegação inferior no celular, como em aplicativo.
// Não aparece no admin nem em telas a partir de md (desktop usa o header).
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sheet, setSheet] = useState<"categorias" | "conta" | null>(null);
  const { items, setIsCartOpen } = useCart();
  const { language, setLanguage } = useLanguage();
  const { data: user } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const cartItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const categorias = useCategoriasLoja();

  if (pathname.startsWith("/admin")) return null;

  const tab =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors active:scale-95";
  const ativo = "text-primary";

  return (
    <>
      {/* Espaço no fim da página para a barra não cobrir o rodapé */}
      <div className="h-20 md:hidden" aria-hidden />
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 pb-safe backdrop-blur-md md:hidden"
      >
        <div className="flex h-16 items-stretch">
          <Link to="/" className={cn(tab, pathname === "/" && ativo)}>
            <Home className="h-6 w-6" />
            Início
          </Link>
          <button
            onClick={() => setSheet("categorias")}
            className={cn(tab, (sheet === "categorias" || pathname.startsWith("/loja")) && ativo)}
          >
            <LayoutGrid className="h-6 w-6" />
            Categorias
          </button>

          {/* Ação principal: cotação pelo WhatsApp */}
          <a
            href={whatsappContactUrl()}
            target="_blank"
            rel="noreferrer noopener"
            className="flex flex-1 flex-col items-center justify-start text-[11px] font-semibold text-[#128C4B] active:scale-95"
          >
            <span className="-mt-5 mb-0.5 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 ring-4 ring-white">
              <MessageCircle className="h-7 w-7" />
            </span>
            Cotação
          </a>

          <button onClick={() => setIsCartOpen(true)} className={tab}>
            <span className="relative">
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-zinc-900">
                  {cartItemCount}
                </span>
              )}
            </span>
            Carrinho
          </button>
          {user ? (
            <button onClick={() => setSheet("conta")} className={cn(tab, sheet === "conta" && ativo)}>
              <User className="h-6 w-6" />
              Conta
            </button>
          ) : (
            <Link to="/login" className={cn(tab, pathname === "/login" && ativo)}>
              <User className="h-6 w-6" />
              Entrar
            </Link>
          )}
        </div>
      </nav>

      <Sheet open={sheet === "categorias"} onOpenChange={(o) => setSheet(o ? "categorias" : null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-safe">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-zinc-200" />
          <SheetHeader>
            <SheetTitle>Categorias</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4">
            {categorias.map((c) => (
              <Link
                key={c.nome}
                to="/loja"
                search={{ linha: "AGRICOLA", categoria: c.nome } as never}
                onClick={() => setSheet(null)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-zinc-50 p-3 text-center text-xs font-medium text-zinc-700 active:scale-95 active:bg-primary/10"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <c.icon className="h-5 w-5" />
                </span>
                {c.curto}
              </Link>
            ))}
          </div>

          <h3 className="mt-6 px-4 text-sm font-semibold text-zinc-900">Montadoras</h3>
          <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto px-4">
            {MONTADORAS.map((m) => (
              <Link
                key={m}
                to="/loja"
                search={{ linha: "AGRICOLA", marca: m } as never}
                onClick={() => setSheet(null)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 active:scale-95"
              >
                <Tractor className="h-4 w-4 text-primary" /> {m}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 px-4 pb-4">
            <Link
              to="/loja"
              onClick={() => setSheet(null)}
              className="flex-1 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white active:scale-95"
            >
              Ver todo o catálogo
            </Link>
            <button
              onClick={() => setLanguage(language === "pt-BR" ? "es-UY" : "pt-BR")}
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium active:scale-95"
            >
              {language === "pt-BR" ? "🇺🇾 Español" : "🇧🇷 Português"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheet === "conta"} onOpenChange={(o) => setSheet(o ? "conta" : null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-zinc-200" />
          <SheetHeader>
            <SheetTitle>Olá, {user?.nome.split(" ")[0]}</SheetTitle>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {user?.role === "ADMIN" && (
              <Link
                to="/admin"
                onClick={() => setSheet(null)}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium"
              >
                Painel administrativo
              </Link>
            )}
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/";
              }}
              className="flex items-center gap-2 rounded-xl border border-red-100 px-4 py-3 text-sm font-medium text-red-600"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
