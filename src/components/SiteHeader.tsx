import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  Phone,
  Tractor,
  Car,
  X,
  MessageCircle,
  Truck,
  ShieldCheck,
  Mail,
  Search,
  ChevronDown,
  AlignJustify,
  User,
  ShoppingCart,
  Settings,
  Wrench,
  OctagonAlert,
  Droplet,
  Instagram,
  Facebook,
  Info,
} from "lucide-react";
import { whatsappContactUrl } from "@/lib/whatsapp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { useSegment } from "@/components/SegmentContext";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import { useLanguage } from "@/components/LanguageContext";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { getSessionFn } from "@/lib/user-auth";
import { useCart } from "@/components/CartContext";

const POPULAR_BRANDS_AGRICOLA = [
  "Massey Ferguson",
  "Valmet",
  "Ford",
  "Case",
  "John Deere",
  "New Holland",
  "CBT",
  "Agrale",
  "Perkins",
  "MWM",
];
const POPULAR_BRANDS_AUTO = [
  "Bosch",
  "Nakata",
  "Cofap",
  "Monroe",
  "Sachs",
  "Luk",
  "Valeo",
  "SKF",
  "NGK",
  "Magneti Marelli",
];

const CATEGORIES_NAV_AUTO = [
  { name: "Motor", icon: Settings },
  { name: "Suspensão", icon: Wrench },
  { name: "Freios", icon: OctagonAlert },
  { name: "Filtros", icon: Droplet },
  { name: "Acessórios", icon: Tractor },
];

const CATEGORIES_NAV_AGRICOLA = [
  { name: "Transmissão", fullName: "Engrenagens e Transmissão", icon: Settings },
  { name: "Hidráulica", fullName: "Hidráulica e Pneumática", icon: Wrench },
  { name: "Filtros", fullName: "Filtros", icon: Droplet },
  { name: "Vedações", fullName: "Vedações", icon: OctagonAlert },
  { name: "Rolamentos", fullName: "Rolamentos e Mancais", icon: Tractor },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { segment, setSegment } = useSegment();
  const { language, setLanguage, t } = useLanguage();

  const sessionQuery = useQuery({
    queryKey: ["auth_session"],
    queryFn: () => getSessionFn(),
  });
  const user = sessionQuery.data;

  const { items, setIsCartOpen } = useCart();
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const isAgricola = segment === "AGRICOLA";
  const toggleSegment = () => {
    setSegment(isAgricola ? "AUTOMOTIVA" : "AGRICOLA");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/loja", search: { q: searchQuery.trim() } as never });
      setSearchQuery("");
      setOpen(false);
    }
  };

  const popularBrands = isAgricola ? POPULAR_BRANDS_AGRICOLA : POPULAR_BRANDS_AUTO;
  const categoriesNav = isAgricola ? CATEGORIES_NAV_AGRICOLA : CATEGORIES_NAV_AUTO;

  return (
    <header className="z-50 w-full flex flex-col bg-white shadow-sm border-b">
      {/* 1. Top Bar */}
      <div className="bg-zinc-900 text-zinc-300 text-[11px] sm:text-xs py-2 px-4 font-medium tracking-wide">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="#" className="hover:text-white transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
          </div>

          <div className="hidden md:block text-center flex-1 text-zinc-400">
            Seja bem-vindo à RS Trator Peças - A Maior Loja de Peças Agrícolas do Sul!
          </div>

          <div className="flex items-center gap-4">
            <a
              href="mailto:comercialrsautoparts@gmail.com"
              className="hidden sm:flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> comercialrsautoparts@gmail.com
            </a>
            <a
              href={whatsappContactUrl()}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Fale Conosco
            </a>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded px-2 py-1 transition-colors outline-none cursor-pointer border border-zinc-700 ml-2">
                <span className="text-sm leading-none">{language === "pt-BR" ? "🇧🇷" : "🇺🇾"}</span>
                <span>{language === "pt-BR" ? "PT" : "ES"}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-32 bg-zinc-900 text-zinc-200 border-zinc-800"
              >
                <DropdownMenuItem
                  onClick={() => setLanguage("pt-BR")}
                  className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  <span className="mr-2 text-lg leading-none">🇧🇷</span> Português
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage("es-UY")}
                  className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  <span className="mr-2 text-lg leading-none">🇺🇾</span> Español
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 2. Main Header (Logo, Big Search, Icons) */}
      <div className="py-4 md:py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-2xl font-black text-zinc-900 shrink-0"
            onClick={() => setOpen(false)}
          >
            <div className="rounded-xl bg-primary p-2 text-white shadow-md">
              <Tractor className="h-7 w-7" />
            </div>
            <div className="flex flex-col leading-none hidden lg:flex">
              <span className="tracking-tight text-xl">RS Trator</span>
              <span className="tracking-tight text-primary text-2xl">Peças</span>
            </div>
          </Link>

          {/* Busca Gigante (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-2xl relative">
            <SearchAutocomplete
              segment={segment}
              showButton={false}
              placeholder="Digite o código da peça ou o nome do produto..."
              inputClassName="h-12 text-base rounded-l-md rounded-r-none border-2 border-primary/20 bg-white pl-4 pr-12 transition-all focus:bg-white focus:ring-0 focus:border-primary shadow-sm w-full"
            />
            <button className="h-12 px-6 bg-primary text-white rounded-r-md hover:bg-primary/90 transition-colors flex items-center justify-center font-bold">
              <Search className="h-5 w-5" />
            </button>
          </div>

          {/* Ações (Desktop) */}
          <div className="hidden items-center gap-6 md:flex shrink-0">
            {/* Troca de linha Agrícola/Automotiva — oculta enquanto a automotiva estiver desligada */}
            {AUTOMOTIVA_ATIVA && (
            <button
              onClick={toggleSegment}
              className="flex items-center gap-2 text-zinc-600 hover:text-primary transition-colors text-sm font-semibold"
            >
              <div className="bg-zinc-100 p-2 rounded-full text-zinc-500">
                {isAgricola ? <Car className="w-5 h-5" /> : <Tractor className="w-5 h-5" />}
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] uppercase text-zinc-400">Linha atual</span>
                <span>{isAgricola ? "Agrícola" : "Automotiva"}</span>
              </div>
            </button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 text-zinc-600 hover:text-primary transition-colors text-sm font-semibold outline-none cursor-pointer">
                  <div className="bg-zinc-100 p-2 rounded-full text-zinc-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-[10px] uppercase text-zinc-400">Minha Conta</span>
                    <span>Olá, {user.nome.split(" ")[0]}</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-white border-zinc-200 shadow-xl rounded-xl"
                >
                  <DropdownMenuItem
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/";
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 font-bold p-3"
                  >
                    Sair da Conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 text-zinc-600 hover:text-primary transition-colors text-sm font-semibold"
              >
                <div className="bg-zinc-100 p-2 rounded-full text-zinc-500">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] uppercase text-zinc-400">Bem-vindo</span>
                  <span>Entrar / Cadastrar</span>
                </div>
              </Link>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 text-zinc-600 hover:text-primary transition-colors text-sm font-semibold relative outline-none"
            >
              <div className="bg-zinc-100 p-2 rounded-full text-zinc-500">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {cartItemCount}
              </span>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] uppercase text-zinc-400">Carrinho</span>
                <span>{cartItemCount} itens</span>
              </div>
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-800 hover:bg-zinc-100 md:hidden"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* 3. Category Nav Bar (Desktop) */}
      <div className="hidden md:flex bg-primary text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-4 w-full">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-full items-center gap-2 px-4 font-bold bg-black/10 hover:bg-black/20 transition-colors outline-none">
              <AlignJustify className="h-5 w-5" />
              TODAS AS CATEGORIAS
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64 font-medium bg-white text-zinc-800 rounded-none border-zinc-200 mt-0"
            >
              {popularBrands.map((marca) => (
                <DropdownMenuItem
                  key={marca}
                  asChild
                  className="cursor-pointer py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <Link to="/loja" search={{ search: "", page: 1, linha: segment, marca } as never}>
                    {marca}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {categoriesNav.map((cat) => (
            <Link
              key={cat.name}
              to="/loja"
              search={
                {
                  search: "",
                  page: 1,
                  linha: segment,
                  categoria: (cat as any).fullName || cat.name,
                } as never
              }
              className="flex items-center gap-2 text-sm font-bold tracking-wide hover:text-white/80 transition-colors py-4 uppercase"
            >
              <cat.icon className="h-4 w-4 opacity-80" />
              {cat.name}
            </Link>
          ))}

          <div className="flex-1" />

          <Link
            to="/loja"
            className="text-sm font-bold tracking-wide hover:text-white/80 transition-colors flex items-center gap-1.5 uppercase bg-black/10 px-4 h-full"
          >
            <Info className="h-4 w-4" /> OFERTAS
          </Link>
        </div>
      </div>

      {/* Mobile menu (Expanded) */}
      {open && (
        <div className="border-b bg-white shadow-lg md:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="mx-auto flex flex-col gap-2 px-4 py-4">
            <form onSubmit={handleSearch} className="relative mb-4 mt-2 flex">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produtos..."
                className="h-12 w-full rounded-l-md rounded-r-none bg-zinc-50 pl-4 text-base border-2 border-primary/20 focus:border-primary"
              />
              <button className="w-12 bg-primary text-white rounded-r-md flex items-center justify-center">
                <Search className="h-5 w-5" />
              </button>
            </form>

            <div className="font-bold text-zinc-400 mb-2 mt-2 text-xs uppercase tracking-wider">
              Navegação
            </div>
            {categoriesNav.map((cat) => (
              <Link
                key={cat.name}
                to="/loja"
                search={
                  {
                    search: "",
                    page: 1,
                    linha: segment,
                    categoria: (cat as any).fullName || cat.name,
                  } as never
                }
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-zinc-700 hover:bg-zinc-100 border border-zinc-100 mb-2"
              >
                <cat.icon className="h-5 w-5 text-primary" />
                {cat.name}
              </Link>
            ))}

            <div className="font-bold text-zinc-400 mb-2 mt-4 text-xs uppercase tracking-wider">
              Marcas
            </div>
            <div className="grid grid-cols-2 gap-2">
              {popularBrands.slice(0, 4).map((marca) => (
                <Link
                  key={marca}
                  to="/loja"
                  search={{ search: "", page: 1, linha: segment, marca } as never}
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-zinc-50 px-3 py-3 text-sm font-medium text-center text-zinc-700 border border-zinc-200"
                >
                  {marca}
                </Link>
              ))}
            </div>

            <a
              href={whatsappContactUrl()}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-4 text-base font-bold text-white shadow-sm"
            >
              <MessageCircle className="h-5 w-5" />
              Atendimento via WhatsApp
            </a>

            {AUTOMOTIVA_ATIVA && (
            <button
              onClick={() => {
                toggleSegment();
                setOpen(false);
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-bold text-zinc-700 transition-colors"
            >
              {isAgricola ? <Car className="w-5 h-5" /> : <Tractor className="w-5 h-5" />}
              Mudar para Linha {isAgricola ? "Automotiva" : "Agrícola"}
            </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
