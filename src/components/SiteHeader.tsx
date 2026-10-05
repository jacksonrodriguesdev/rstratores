import { Link } from "@tanstack/react-router";
import {
  Tractor,
  Car,
  MessageCircle,
  Mail,
  ChevronDown,
  AlignJustify,
  User,
  ShoppingCart,
  Instagram,
  Facebook,
  LogOut,
} from "lucide-react";
import { whatsappContactUrl, PHONE_DISPLAY } from "@/lib/whatsapp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { useSegment } from "@/components/SegmentContext";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import { useLanguage } from "@/components/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { getSessionFn } from "@/lib/user-auth";
import { useCart } from "@/components/CartContext";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { CATEGORIAS, MONTADORAS, INSTAGRAM_URL, FACEBOOK_URL } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

// Header fixo e dinâmico:
// - desktop: a faixa superior recolhe ao sair do topo; a barra de categorias some ao rolar
//   para baixo e volta ao rolar para cima.
// - celular: busca e carrinho sempre visíveis; a faixa de categorias recolhe ao rolar para baixo.
//   A navegação principal fica na barra inferior (MobileTabBar).
export function SiteHeader() {
  const { segment, setSegment } = useSegment();
  const { language, setLanguage } = useLanguage();
  const { scrolled, hidden } = useScrollDirection();

  const { data: user } = useQuery({
    queryKey: ["auth_session"],
    queryFn: () => getSessionFn(),
  });

  const { items, setIsCartOpen } = useCart();
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const isAgricola = segment === "AGRICOLA";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-primary text-white pt-safe transition-shadow duration-300",
        scrolled && "shadow-lg shadow-black/15",
      )}
    >
      {/* Faixa superior (desktop) */}
      <div
        className={cn(
          "hidden overflow-hidden bg-black/20 text-[12px] font-medium text-white/85 transition-all duration-300 md:block",
          scrolled ? "max-h-0" : "max-h-10",
        )}
      >
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <a
              href={whatsappContactUrl()}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 hover:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Cotação rápida pelo WhatsApp · {PHONE_DISPLAY}
            </a>
            <a
              href="mailto:comercialrsautoparts@gmail.com"
              className="hidden items-center gap-1.5 hover:text-white lg:flex"
            >
              <Mail className="h-3.5 w-3.5" /> comercialrsautoparts@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            {INSTAGRAM_URL && (
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" aria-label="Instagram">
                <Instagram className="h-4 w-4 hover:text-white" />
              </a>
            )}
            {FACEBOOK_URL && (
              <a href={FACEBOOK_URL} target="_blank" rel="noreferrer noopener" aria-label="Facebook">
                <Facebook className="h-4 w-4 hover:text-white" />
              </a>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 outline-none hover:bg-white/10">
                <span>{language === "pt-BR" ? "🇧🇷 PT" : "🇺🇾 ES"}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => setLanguage("pt-BR")} className="cursor-pointer">
                  🇧🇷 Português
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("es-UY")} className="cursor-pointer">
                  🇺🇾 Español
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Barra principal: logo, busca, conta e carrinho */}
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center gap-3 px-3 transition-all duration-300 md:gap-6 md:px-4",
          scrolled ? "py-2" : "py-2.5 md:py-4",
        )}
      >
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="RS Trator Peças — início">
          <div className="rounded-xl bg-white p-1.5 text-primary shadow-sm md:p-2">
            <Tractor className="h-6 w-6 md:h-7 md:w-7" />
          </div>
          <div className="hidden flex-col leading-none lg:flex">
            <span className="text-lg font-extrabold tracking-tight">RS Trator</span>
            <span className="text-sm font-semibold tracking-wide text-accent">PEÇAS AGRÍCOLAS</span>
          </div>
        </Link>

        <div className="min-w-0 flex-1 md:max-w-2xl">
          <SearchAutocomplete
            segment={segment}
            placeholder="Buscar por código ou nome da peça…"
            inputClassName="h-10 md:h-11 rounded-full border-0 bg-white text-zinc-900 text-[15px] pl-11 shadow-sm placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-4">
          {AUTOMOTIVA_ATIVA && (
            <button
              onClick={() => setSegment(isAgricola ? "AUTOMOTIVA" : "AGRICOLA")}
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/10 md:flex"
            >
              {isAgricola ? <Car className="h-5 w-5" /> : <Tractor className="h-5 w-5" />}
              {isAgricola ? "Agrícola" : "Automotiva"}
            </button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold outline-none hover:bg-white/10 md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                  {user.nome.charAt(0).toUpperCase()}
                </span>
                <span className="hidden lg:inline">Olá, {user.nome.split(" ")[0]}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "ADMIN" && (
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin">Painel administrativo</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/";
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-700"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/10 md:flex"
            >
              <User className="h-5 w-5" />
              <span className="hidden lg:inline">Entrar</span>
            </Link>
          )}

          <button
            onClick={() => setIsCartOpen(true)}
            aria-label={`Carrinho com ${cartItemCount} itens`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full outline-none transition-transform hover:bg-white/10 active:scale-90"
          >
            <ShoppingCart className="h-6 w-6" />
            {cartItemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-zinc-900 ring-2 ring-primary">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Categorias: chips no celular, menu no desktop. Recolhe ao rolar para baixo. */}
      <nav
        aria-label="Categorias"
        className={cn(
          "overflow-hidden transition-all duration-300",
          hidden ? "max-h-0 opacity-0" : "max-h-14 opacity-100",
        )}
      >
        {/* Celular */}
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-2.5 md:hidden">
          {CATEGORIAS.map((c) => (
            <Link
              key={c.nome}
              to="/loja"
              search={{ linha: "AGRICOLA", categoria: c.nome } as never}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-medium active:scale-95 active:bg-white/25"
            >
              <c.icon className="h-3.5 w-3.5" />
              {c.curto}
            </Link>
          ))}
        </div>

        {/* Desktop */}
        <div className="mx-auto hidden h-11 max-w-7xl items-center gap-1 px-4 text-sm font-medium md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 font-semibold outline-none hover:bg-white/10">
              <AlignJustify className="h-4 w-4" /> Categorias
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="grid w-[460px] grid-cols-2 gap-x-2 p-2">
              <DropdownMenuLabel className="col-span-2">Categorias</DropdownMenuLabel>
              {CATEGORIAS.map((c) => (
                <DropdownMenuItem key={c.nome} asChild className="cursor-pointer py-2">
                  <Link to="/loja" search={{ linha: "AGRICOLA", categoria: c.nome } as never}>
                    <c.icon className="mr-2 h-4 w-4 text-primary" /> {c.nome}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="col-span-2" />
              <DropdownMenuLabel className="col-span-2">Montadoras</DropdownMenuLabel>
              {MONTADORAS.map((m) => (
                <DropdownMenuItem key={m} asChild className="cursor-pointer py-2">
                  <Link to="/loja" search={{ linha: "AGRICOLA", marca: m } as never}>
                    <Tractor className="mr-2 h-4 w-4 text-primary" /> {m}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {CATEGORIAS.slice(0, 6).map((c) => (
            <Link
              key={c.nome}
              to="/loja"
              search={{ linha: "AGRICOLA", categoria: c.nome } as never}
              className="rounded-full px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              {c.curto}
            </Link>
          ))}

          <div className="flex-1" />
          <Link
            to="/loja"
            className="rounded-full px-3 py-1.5 font-semibold text-accent transition-colors hover:bg-white/10"
          >
            Ver todo o catálogo
          </Link>
        </div>
      </nav>
    </header>
  );
}
