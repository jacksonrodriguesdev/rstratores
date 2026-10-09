import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, LayoutGrid, MessageCircle, ShoppingCart, User, Tractor, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/components/CartContext";
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
  const { data: user } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const cartItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const categorias = useCategoriasLoja();

  if (pathname.startsWith("/admin") || pathname.startsWith("/catalogos/ver/")) return null;
  // Páginas com barra fixa própria logo acima desta (ex.: comprar na página do produto)
  const barraPropria = pathname.startsWith("/produto/");

  const tab =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors active:scale-95";
  const ativo = "text-primary";

  return (
    <>
      {/* Espaço no fim da página para a barra não cobrir o rodapé */}
      <div className="h-[calc(var(--barra-inferior)+1rem)] md:hidden" aria-hidden />
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white pb-safe md:hidden"
      >
        <div className="flex h-16 items-stretch">
          <Link to="/" className={cn(tab, pathname === "/" && ativo)}>
            <Home className="h-6 w-6" />
            Inicio
          </Link>
          <button
            onClick={() => setSheet("categorias")}
            className={cn(tab, (sheet === "categorias" || pathname.startsWith("/loja")) && ativo)}
          >
            <LayoutGrid className="h-6 w-6" />
            Categorías
          </button>

          {/* Ação principal: cotação pelo WhatsApp. Na página do produto há uma barra própria
              de compra logo acima; lá o botão fica plano para não cobrir "Consultar precio". */}
          {barraPropria ? (
            <a
              href={whatsappContactUrl("¡Hola! Quiero cotizar repuestos.")}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(tab, "text-[#128C4B]")}
            >
              <MessageCircle className="h-6 w-6" />
              Cotizar
            </a>
          ) : (
            <a
              href={whatsappContactUrl("¡Hola! Quiero cotizar repuestos.")}
              target="_blank"
              rel="noreferrer noopener"
              className="flex flex-1 flex-col items-center justify-start text-[11px] font-semibold text-[#128C4B] active:scale-95"
            >
              <span className="-mt-5 mb-0.5 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 ring-4 ring-white">
                <MessageCircle className="h-7 w-7" />
              </span>
              Cotizar
            </a>
          )}

          <button onClick={() => setIsCartOpen(true)} className={tab}>
            <span className="relative">
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-zinc-900">
                  {cartItemCount}
                </span>
              )}
            </span>
            Carrito
          </button>
          {user ? (
            <button onClick={() => setSheet("conta")} className={cn(tab, sheet === "conta" && ativo)}>
              <User className="h-6 w-6" />
              Cuenta
            </button>
          ) : (
            <Link to="/login" className={cn(tab, pathname === "/login" && ativo)}>
              <User className="h-6 w-6" />
              Ingresar
            </Link>
          )}
        </div>
      </nav>

      <Sheet open={sheet === "categorias"} onOpenChange={(o) => setSheet(o ? "categorias" : null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-safe">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-zinc-200" />
          <SheetHeader>
            <SheetTitle>Categorías</SheetTitle>
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

          <h3 className="mt-6 px-4 text-sm font-semibold text-zinc-900">Marcas de tractor</h3>
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

          <div className="mt-6 px-4 pb-4">
            <Link
              to="/loja"
              onClick={() => setSheet(null)}
              className="block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white active:scale-95"
            >
              Ver todo el catálogo
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheet === "conta"} onOpenChange={(o) => setSheet(o ? "conta" : null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-zinc-200" />
          <SheetHeader>
            <SheetTitle>Hola, {user?.nome.split(" ")[0]}</SheetTitle>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-4">
            <Link to="/cuenta" onClick={() => setSheet(null)} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium">
              Mi perfil y datos
            </Link>
            <Link to="/catalogos" onClick={() => setSheet(null)} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium">
              Catálogos para mecánicos (PDF)
            </Link>
            {user?.role === "ADMIN" && (
              <Link
                to="/admin"
                onClick={() => setSheet(null)}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium"
              >
                Panel de administración
              </Link>
            )}
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/";
              }}
              className="flex items-center gap-2 rounded-xl border border-red-100 px-4 py-3 text-sm font-medium text-red-600"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
