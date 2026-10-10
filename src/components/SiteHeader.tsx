import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Tractor,
  Car,
  MessageCircle,
  ChevronDown,
  LayoutGrid,
  User,
  ShoppingCart,
  Instagram,
  Facebook,
  LogOut,
  Truck,
  ShieldCheck,
  Search,
  PackageSearch,
  ArrowRight,
  ListChecks,
  BookOpen,
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
import { BandeiraUruguay } from "@/components/Bandeiras";
import { useSegment } from "@/components/SegmentContext";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import { useQuery } from "@tanstack/react-query";
import { getSessionFn } from "@/lib/user-auth";
import { useCart } from "@/components/CartContext";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { MONTADORAS, INSTAGRAM_URL, FACEBOOK_URL } from "@/lib/navegacao";
import { useCategoriasLoja } from "@/hooks/use-categorias-loja";
import { cn } from "@/lib/utils";

const DAC_RASTREO = "https://www.dac.com.uy/envios/rastrear";
// Buscas rápidas: o termo em espanhol vira o termo em português na busca (src/lib/pecas-es.ts)
const MAIS_BUSCADOS = ["Retén", "Rodamiento", "Filtro", "Engranaje", "Bomba"];

// Avisos da faixa superior (trocam sozinhos)
const AVISOS = [
  { icon: ShieldCheck, texto: "Distribuidores de repuestos agrícolas en Uruguay" },
  { icon: Truck, texto: "Enviamos a todo Uruguay por DAC" },
  { icon: MessageCircle, texto: `Cotización rápida por WhatsApp · ${PHONE_DISPLAY}` },
  { icon: ShieldCheck, texto: "Repuestos para Massey, Valtra, John Deere, New Holland y más" },
  { icon: PackageSearch, texto: "Buscá por el código original de la pieza" },
];

// Header fixo e dinâmico. É `fixed` (não `sticky`) com um espaçador de altura constante:
// assim recolher partes do header não empurra a página. Com `sticky`, o encolhimento
// movia o conteúdo, o navegador via isso como rolagem e o header abria e fechava sem parar.
// A altura atual fica em --altura-header (usada pela barra de filtros da loja e pelas âncoras).
//
// - faixa de avisos e "mais buscados" recolhem ao sair do topo;
// - a barra de categorias some ao rolar para baixo e volta ao rolar para cima;
// - no celular, a navegação principal fica na barra inferior (MobileTabBar).
export function SiteHeader() {
  const { segment, setSegment } = useSegment();
  const { scrolled, hidden } = useScrollDirection();
  const categorias = useCategoriasLoja();

  const headerRef = useRef<HTMLElement>(null);
  const [alturaTopo, setAlturaTopo] = useState<number | null>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    let ultima = -1;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const medir = () => {
      const h = el.offsetHeight;
      // Grava só quando muda: cada escrita na variável do <html> recalcula o estilo da página
      // inteira, e durante a animação do header isso acontecia a cada quadro (travadas).
      if (h !== ultima) {
        ultima = h;
        document.documentElement.style.setProperty("--altura-header", `${h}px`);
      }
      // O espaçador usa a altura do header aberto (medida no topo da página)
      if (window.scrollY <= 8) setAlturaTopo((a) => (a === h ? a : h));
    };
    // Espera a animação de abrir/recolher (300ms) terminar antes de medir
    const ro = new ResizeObserver(() => {
      clearTimeout(espera);
      espera = setTimeout(medir, 320);
    });
    ro.observe(el);
    medir();
    return () => {
      ro.disconnect();
      clearTimeout(espera);
    };
  }, []);

  // Faixa de avisos rotativa
  const lista = AVISOS;
  const [aviso, setAviso] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAviso((i) => (i + 1) % lista.length), 4500);
    return () => clearInterval(t);
  }, [lista.length]);

  // Atalho "/" foca a busca (fora de campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (e.key !== "/" || /INPUT|TEXTAREA|SELECT/.test(alvo.tagName) || alvo.isContentEditable) return;
      const campo = document.querySelector<HTMLInputElement>("#busca-header input");
      if (campo) {
        e.preventDefault();
        campo.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: user } = useQuery({
    queryKey: ["auth_session"],
    queryFn: () => getSessionFn(),
  });

  const { items, setIsCartOpen } = useCart();
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const isAgricola = segment === "AGRICOLA";
  const Aviso = lista[aviso];

  const acao =
    "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left outline-none transition hover:bg-white/10";
  const icone =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15";

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-50 w-full text-white pt-safe transition-shadow duration-300",
          "bg-gradient-to-r from-emerald-950 via-[#0b4a2b] to-primary",
          scrolled && "shadow-xl shadow-black/25",
        )}
      >
        {/* Textura tecnológica: grade sutil + brilho. Contêiner próprio com overflow-hidden:
            o brilho passava da borda no celular, e o header em si não pode cortar (a lista de
            sugestões da busca sai dele). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute -top-24 left-1/3 h-48 w-96 max-w-[60vw] rounded-full bg-emerald-400/20 blur-3xl" />
        </div>

        {/* Faixa de avisos */}
        <div
          className={cn(
            "relative overflow-hidden border-b border-white/10 bg-black/25 text-[12px] font-medium text-white/85 transition-[max-height,border-color] duration-300",
            scrolled ? "max-h-0 border-transparent" : "max-h-10",
          )}
        >
          <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-4 px-3 md:h-9 md:px-4">
            <div key={aviso} className="flex min-w-0 items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-500">
              <Aviso.icon className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span className="truncate">{Aviso.texto}</span>
            </div>
            <div className="hidden shrink-0 items-center gap-4 md:flex">
              <a
                href={DAC_RASTREO}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 hover:text-white"
              >
                <BandeiraUruguay className="h-3 w-[18px] rounded-[2px]" />
                Rastrear envío
              </a>
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
            </div>
          </div>
        </div>

        {/* Barra principal: logo, busca e ações */}
        <div
          className={cn(
            "relative mx-auto flex max-w-7xl items-center gap-3 px-3 md:gap-6 md:px-4",
            scrolled ? "py-2" : "py-2.5 md:py-4",
          )}
        >
          <Link to="/" className="group flex shrink-0 items-center gap-3" aria-label="AGRO PARTS — inicio">
            <div className="rounded-2xl bg-white p-1 shadow-lg shadow-emerald-950/40 ring-1 ring-white/40 transition group-hover:scale-105">
              <img src="/logo.png" alt="" width={48} height={48} className="h-9 w-9 md:h-12 md:w-12" />
            </div>
            <div className="hidden flex-col leading-none md:flex">
              <span className="text-lg font-extrabold tracking-tight lg:text-xl">AGRO PARTS</span>
              <span className="mt-0.5 bg-gradient-to-r from-accent to-amber-200 bg-clip-text text-[11px] font-bold tracking-[0.18em] text-transparent lg:text-xs">
                REPUESTOS AGRÍCOLAS
              </span>
            </div>
          </Link>

          <div className="min-w-0 flex-1">
            <div id="busca-header" className="relative mx-auto md:max-w-2xl">
              <SearchAutocomplete
                segment={segment}
                placeholder="Buscá por código o nombre de la pieza…"
                inputClassName="h-10 md:h-12 rounded-full border-0 bg-white text-zinc-900 text-base pl-11 md:pr-14 shadow-lg shadow-emerald-950/30 ring-1 ring-white/30 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-accent"
              />
              <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400 md:block">
                /
              </kbd>
            </div>
            {/* Mais buscados (desktop, só no topo da página) */}
            <div
              className={cn(
                "mx-auto hidden items-center gap-2 overflow-hidden text-[12px] text-white/70 transition-[max-height,opacity,margin] duration-300 md:flex md:max-w-2xl",
                scrolled ? "mt-0 max-h-0 opacity-0" : "mt-2 max-h-6 opacity-100",
              )}
            >
              <span className="shrink-0">Más buscados:</span>
              {MAIS_BUSCADOS.map((t) => (
                <Link
                  key={t}
                  to="/loja"
                  search={{ q: t } as never}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-white/85 ring-1 ring-white/10 transition hover:bg-white/20 hover:text-white"
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            {AUTOMOTIVA_ATIVA && (
              <button
                onClick={() => setSegment(isAgricola ? "AUTOMOTIVA" : "AGRICOLA")}
                className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/10 md:flex"
              >
                {isAgricola ? <Car className="h-5 w-5" /> : <Tractor className="h-5 w-5" />}
                {isAgricola ? "Agrícola" : "Automotiva"}
              </button>
            )}

            {/* Cotação pelo WhatsApp (desktop) */}
            <a
              href={whatsappContactUrl("¡Hola! Quiero cotizar repuestos.")}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(acao, "hidden xl:flex")}
            >
              <span className={cn(icone, "bg-[#25D366]/90 ring-[#25D366]/40")}>
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-[11px] text-white/65">Cotización</span>
                <span className="block text-sm font-semibold">WhatsApp</span>
              </span>
            </a>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(acao, "hidden cursor-pointer md:flex")}>
                  <span className={icone}>
                    <span className="text-sm font-bold">{user.nome.charAt(0).toUpperCase()}</span>
                  </span>
                  <span className="hidden leading-tight lg:block">
                    <span className="block text-[11px] text-white/65">Hola, {user.nome.split(" ")[0]}</span>
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      Mi cuenta <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </span>
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/cuenta">Mi cuenta</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/catalogos">Catálogos (PDF)</Link>
                  </DropdownMenuItem>
                  {user.role === "ADMIN" && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/admin">Panel de administración</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/";
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Salir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className={cn(acao, "hidden md:flex")}>
                <span className={icone}>
                  <User className="h-5 w-5" />
                </span>
                <span className="hidden leading-tight lg:block">
                  <span className="block text-[11px] text-white/65">Bienvenido</span>
                  <span className="block text-sm font-semibold">Ingresar</span>
                </span>
              </Link>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label={`Carrito con ${cartItemCount} ítems`}
              className={cn(acao, "px-1 active:scale-95 md:px-2")}
            >
              <span className={cn(icone, "bg-transparent ring-0 md:bg-white/10 md:ring-1")}>
                <ShoppingCart className="h-6 w-6 md:h-5 md:w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-zinc-900 ring-2 ring-emerald-950">
                    {cartItemCount}
                  </span>
                )}
              </span>
              <span className="hidden leading-tight lg:block">
                <span className="block text-[11px] text-white/65">Carrito</span>
                <span className="block text-sm font-semibold">
                  {cartItemCount} {cartItemCount === 1 ? "ítem" : "ítems"}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Categorias: chips no celular, menu no desktop. Recolhe ao rolar para baixo. */}
        <nav
          aria-label="Categorías"
          className={cn(
            "relative overflow-hidden transition-[max-height,opacity] duration-300",
            hidden ? "max-h-0 opacity-0" : "max-h-14 opacity-100",
          )}
        >
          {/* Celular */}
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-2.5 md:hidden">
            {categorias.map((c) => (
              <Link
                key={c.nome}
                to="/loja"
                search={{ linha: "AGRICOLA", categoria: c.nome } as never}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium ring-1 ring-white/10 active:scale-95 active:bg-white/25"
              >
                <c.icon className="h-3.5 w-3.5 text-emerald-300" />
                {c.curto}
              </Link>
            ))}
          </div>

          {/* Desktop */}
          <div className="border-t border-white/10 bg-black/15">
            <div className="mx-auto hidden h-11 max-w-7xl items-center gap-1 whitespace-nowrap px-4 text-sm font-medium md:flex">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-accent px-3 font-semibold text-zinc-900 shadow outline-none transition hover:brightness-95">
                  <LayoutGrid className="h-4 w-4" /> Categorías
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[640px] p-0">
                  <div className="grid grid-cols-[1.6fr_1fr]">
                    <div className="p-3">
                      <DropdownMenuLabel>Categorías</DropdownMenuLabel>
                      <div className="grid grid-cols-2 gap-1">
                        {categorias.map((c) => (
                          <DropdownMenuItem key={c.nome} asChild className="cursor-pointer gap-3 py-2">
                            <Link to="/loja" search={{ linha: "AGRICOLA", categoria: c.nome } as never}>
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <c.icon className="h-4 w-4" />
                              </span>
                              <span className="text-[13px] leading-tight">{c.rotulo}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </div>
                    <div className="border-l bg-muted/40 p-3">
                      <DropdownMenuLabel>Marcas de tractor</DropdownMenuLabel>
                      {MONTADORAS.map((m) => (
                        <DropdownMenuItem key={m} asChild className="cursor-pointer gap-2 py-1.5">
                          <Link to="/loja" search={{ linha: "AGRICOLA", marca: m } as never}>
                            <Tractor className="h-4 w-4 text-primary" /> {m}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="cursor-pointer font-semibold text-primary">
                        <Link to="/loja">
                          Ver todo el catálogo <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Atalhos de categoria: 2 até 1280px, 4 até 1536px, 6 acima (o resto fica no menu) */}
              {categorias.slice(0, 6).map((c, i) => (
                <Link
                  key={c.nome}
                  to="/loja"
                  search={{ linha: "AGRICOLA", categoria: c.nome } as never}
                  className={cn(
                    "items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-white/85 transition-colors hover:bg-white/10 hover:text-white",
                    i < 2 ? "flex" : i < 4 ? "hidden xl:flex" : "hidden 2xl:flex",
                  )}
                >
                  <c.icon className="h-3.5 w-3.5 text-emerald-300" />
                  {c.curto}
                </Link>
              ))}

              <div className="flex-1" />
              <Link
                to="/catalogos"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-300" /> Catálogos
              </Link>
              <Link
                to="/cotizar"
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 font-bold text-[#06321b] transition hover:bg-amber-300"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Cotizá con nosotros
              </Link>
              <Link
                to="/pedido-rapido"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                <ListChecks className="h-3.5 w-3.5 text-emerald-300" /> Pedido rápido
              </Link>
              <a
                href="/#envios-uruguay"
                className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-white/85 transition hover:bg-white/10 hover:text-white xl:flex"
              >
                <BandeiraUruguay className="h-3 w-[18px] rounded-[2px]" />
                Envíos a todo Uruguay
              </a>
              <Link
                to="/loja"
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-accent transition hover:bg-white/10"
              >
                <Search className="h-3.5 w-3.5" /> Catálogo completo
              </Link>
            </div>
          </div>
        </nav>

        {/* Linha de luz na base */}
        {/* Anima por transform (só a placa de vídeo trabalha); animar background-position
            repintava o header inteiro a cada quadro */}
        <div aria-hidden className="h-[2px] w-full overflow-hidden">
          <div className="animate-brilho h-full w-[200%] bg-[linear-gradient(90deg,transparent,var(--color-emerald-300),var(--accent),var(--color-emerald-300),transparent)] bg-[length:50%_100%] bg-repeat-x" />
        </div>
      </header>
      {/* Ocupa o lugar do header no fluxo da página, sempre com a mesma altura */}
      <div
        aria-hidden
        className={alturaTopo ? undefined : "h-[112px] md:h-[188px]"}
        style={alturaTopo ? { height: alturaTopo } : undefined}
      />
    </>
  );
}
