import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Truck,
  ShieldCheck,
  Headset,
  Settings,
  Droplet,
  MessageCircle,
  Calculator,
  LayoutGrid,
  Tractor,
  User,
  Instagram,
  ChevronRight,
  MapPin,
  PackageCheck,
} from "lucide-react";
import { useSegment } from "@/components/SegmentContext";
import { linhaPermitida } from "@/lib/linhas";
import { listProducts, type ListParams } from "@/lib/products";
import { listActiveBanners } from "@/lib/banners";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { MONTADORAS, INSTAGRAM_URL } from "@/lib/navegacao";
import { useCategoriasLoja } from "@/hooks/use-categorias-loja";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { ProductRail, RailCard } from "@/components/home/ProductRail";
import { Reveal, Section } from "@/components/home/Reveal";
import { GoogleReviews } from "@/components/home/GoogleReviews";
import { QuoteModal } from "@/components/QuoteModal";
import { BannerImage } from "@/components/BannerImage";
import { BandeiraUruguay } from "@/components/Bandeiras";

// Produtos dos blocos da home. Se o bloco pede "só com imagem" e não há nenhum
// (o catálogo agrícola ainda não tem fotos), mostra os produtos apresentáveis.
async function listVitrine(params: ListParams, onlyWithImages: boolean) {
  if (onlyWithImages) {
    const comImagem = await listProducts({ ...params, hasImage: true });
    if (comImagem.rows.length > 0) return comImagem;
  }
  return listProducts({ ...params, vitrine: true });
}

function lerConfig(config: string | null): Record<string, any> {
  try {
    return config ? JSON.parse(config) : {};
  } catch {
    return {};
  }
}

// Busca de produtos comum aos blocos de carrossel e grade.
function useProdutosDoBloco(config: string | null, limitePadrao: number) {
  const { segment } = useSegment();
  const c = lerConfig(config);
  const segmento = c.segment || "AMBOS";
  // Quando o bloco está configurado como "AMBOS", segue o segmento ativo do usuário.
  const linha = linhaPermitida(segmento === "AMBOS" ? segment : segmento);
  const filtros = {
    linha,
    categoria: c.categoria || undefined,
    marca: c.marca || undefined,
    sort: c.sort || undefined,
  };
  const limite = c.limit || limitePadrao;
  const onlyWithImages = c.onlyWithImages ?? true;

  const query = useQuery({
    queryKey: ["home-produtos", filtros, limite, onlyWithImages],
    queryFn: () => listVitrine({ page: 1, pageSize: limite, ...filtros }, onlyWithImages),
  });
  return {
    produtos: (query.data?.rows ?? []).slice(0, limite),
    carregando: query.isLoading,
    // Parâmetros do "Ver todos" na loja
    busca: { linha, ...(filtros.categoria && { categoria: filtros.categoria }), ...(filtros.marca && { marca: filtros.marca }) },
  };
}

// BANNER PRINCIPAL + ATALHOS (os cartões se sobrepõem ao banner no desktop, como no Mercado Livre)
export function HeroSliderBlock({ config, title }: { config: string | null; title: string | null }) {
  const { segment } = useSegment();
  const c = lerConfig(config);
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["hero_banners", segment],
    queryFn: () => listActiveBanners("hero", segment),
  });

  return (
    <div className="relative">
      {isLoading ? (
        // Esqueleto com a altura do banner: evita mostrar o banner reserva enquanto carrega
        <div className="px-3 pt-3 md:px-0 md:pt-0">
          <div className="h-[170px] animate-pulse rounded-2xl bg-zinc-200 sm:h-[240px] md:h-[400px] md:rounded-none" />
        </div>
      ) : banners.length > 0 ? (
        <HeroCarousel banners={banners} titulo={title} subtitulo={c.subtitle} tag={c.tag} />
      ) : (
        <div className="mx-3 mt-3 rounded-2xl bg-gradient-to-br from-primary to-emerald-900 px-6 py-10 text-white md:mx-0 md:mt-0 md:rounded-none md:px-0 md:pb-36 md:pt-16">
          <div className="mx-auto max-w-7xl md:px-8">
            <h2 className="max-w-xl text-2xl font-extrabold leading-tight md:text-5xl">
              {title || "Repuestos para tractores con cotización rápida"}
            </h2>
            <p className="mt-2 max-w-lg text-white/85 md:text-lg">
              {c.subtitle || "Buscá por el código original y recibí tu cotización por WhatsApp."}
            </p>
          </div>
        </div>
      )}
      <Atalhos />
    </div>
  );
}

function Atalhos() {
  const [cotarAberto, setCotarAberto] = useState(false);
  const card =
    "flex min-w-0 flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]";
  const icone = "flex h-11 w-11 items-center justify-center rounded-full";

  const itens = [
    {
      titulo: "Buscar por código",
      texto: "Encontrá la pieza exacta por el código original",
      icon: Search,
      cor: "bg-primary/10 text-primary",
      to: "/loja",
    },
    {
      titulo: "Categorías",
      texto: "Transmisión, hidráulica, filtros y más",
      icon: LayoutGrid,
      cor: "bg-amber-100 text-amber-700",
      href: "#categorias",
    },
    {
      titulo: "Marcas",
      texto: "Massey, Valtra, John Deere, New Holland…",
      icon: Tractor,
      cor: "bg-sky-100 text-sky-700",
      href: "#montadoras",
    },
    {
      titulo: "Cotizá por WhatsApp",
      texto: "Hablá directo con nuestro equipo",
      icon: MessageCircle,
      cor: "bg-[#25D366]/15 text-[#128C4B]",
      externo: whatsappContactUrl("¡Hola! Quiero cotizar repuestos."),
    },
    {
      titulo: "Mejoramos tu precio",
      texto: "Mandanos el presupuesto de otro proveedor",
      icon: Calculator,
      cor: "bg-violet-100 text-violet-700",
      acao: () => setCotarAberto(true),
    },
    {
      titulo: "Mi cuenta",
      texto: "Ingresá o creá tu cuenta",
      icon: User,
      cor: "bg-zinc-100 text-zinc-700",
      to: "/login",
    },
  ];

  return (
    <>
      <div className="relative z-10 mx-auto max-w-7xl md:-mt-20 md:px-4">
        <div className="scrollbar-none flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 py-3 md:grid md:grid-cols-6 md:overflow-visible md:px-0">
          {itens.map((it) => {
            const conteudo = (
              <>
                <div>
                  <h3 className="text-sm font-bold leading-tight text-zinc-900">{it.titulo}</h3>
                  <p className="mt-1 text-xs leading-snug text-zinc-500">{it.texto}</p>
                </div>
                <div className="flex items-end justify-between">
                  <span className={`${icone} ${it.cor}`}>
                    <it.icon className="h-5 w-5" />
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-300" />
                </div>
              </>
            );
            const largura = "w-[42%] shrink-0 snap-start md:w-auto";
            if (it.to)
              return (
                <Link key={it.titulo} to={it.to} className={`${largura} ${card}`}>
                  {conteudo}
                </Link>
              );
            if (it.acao)
              return (
                <button key={it.titulo} onClick={it.acao} className={`${largura} ${card} text-left`}>
                  {conteudo}
                </button>
              );
            return (
              <a
                key={it.titulo}
                href={it.href ?? it.externo}
                {...(it.externo && { target: "_blank", rel: "noreferrer noopener" })}
                className={`${largura} ${card}`}
              >
                {conteudo}
              </a>
            );
          })}
        </div>
      </div>
      <QuoteModal open={cotarAberto} onOpenChange={setCotarAberto} />
    </>
  );
}

// CATEGORIAS (círculos com ícone; rolagem horizontal no celular)
export function CategoryGridBlock({ config, title }: { config: string | null; title?: string | null }) {
  // Categorias do banco: o que for criado/renomeado/excluído no admin aparece aqui
  const categorias = useCategoriasLoja();

  return (
    <Section id="categorias" title={title || "Categorías"} verTodos={{ label: "Ver catálogo" }}>
      <div className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-5 md:gap-3 md:px-0">
        {categorias.map((c) => (
          <Link
            key={c.nome}
            to="/loja"
            search={{ linha: "AGRICOLA", categoria: c.nome } as never}
            className="group flex w-[76px] shrink-0 flex-col items-center gap-2 rounded-2xl p-1 text-center active:scale-95 md:w-auto md:flex-row md:gap-3 md:border md:border-zinc-100 md:p-3 md:text-left md:hover:border-primary/40 md:hover:shadow-md"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white md:h-12 md:w-12">
              {/* Imagem enviada em Admin > Categorias; sem imagem, o ícone */}
              {c.imagem ? (
                <img src={c.imagem} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <c.icon className="h-7 w-7 md:h-6 md:w-6" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-tight text-zinc-800 md:text-sm">
                <span className="md:hidden">{c.curto}</span>
                <span className="hidden md:inline">{c.rotulo}</span>
              </span>
              {c.total ? (
                <span className="hidden text-xs text-zinc-500 md:block">
                  {c.total.toLocaleString("es-UY")} repuestos
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

// CARROSSEL DE PRODUTOS
export function ProductsCarouselBlock({ title, config }: { title: string | null; config: string | null }) {
  const { produtos, carregando, busca } = useProdutosDoBloco(config, 12);
  if (!carregando && produtos.length === 0) return null;
  return (
    <Section title={title || "Destacados"} verTodos={{ search: busca }}>
      <ProductRail products={produtos} loading={carregando} />
    </Section>
  );
}

// GRADE DE PRODUTOS
export function ProductsGridBlock({ title, config }: { title: string | null; config: string | null }) {
  const { produtos, carregando, busca } = useProdutosDoBloco(config, 10);
  if (!carregando && produtos.length === 0) return null;
  return (
    <Section title={title || "Productos"} verTodos={{ search: busca }}>
      {carregando ? (
        <ProductRail products={[]} loading />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {produtos.map((p: any) => (
            <RailCard key={p.sku} p={p} />
          ))}
        </div>
      )}
    </Section>
  );
}

// FAIXA PROMOCIONAL: banners do tipo "Faixa promocional" em Admin > Banners
export function PromoStripBlock({ title, config }: { title: string | null; config: string | null }) {
  const c = lerConfig(config);
  const { data: faixas = [] } = useQuery({
    queryKey: ["home_banners", "strip"],
    queryFn: () => listActiveBanners("strip", "AGRICOLA"),
  });
  if (faixas.length > 0) {
    return (
      <Reveal>
        <HeroCarousel banners={faixas} variante="faixa" />
      </Reveal>
    );
  }
  // Reserva: imagem configurada no próprio bloco (Admin > Página Inicial)
  if (!c.image_path) return null;
  const img = (
    <BannerImage
      src={c.image_path}
      alt={title || "Promoción"}
      className="max-h-[260px] w-full rounded-2xl object-cover shadow-sm"
    />
  );
  return (
    <Reveal>
      {c.link ? (
        <a href={c.link} className="block transition hover:opacity-95 active:scale-[0.99]">
          {img}
        </a>
      ) : (
        img
      )}
    </Reveal>
  );
}

// BENEFÍCIOS
export function FeaturesStripBlock({ config }: { config: string | null }) {
  const itens = [
    { icon: Truck, titulo: "Envíos a todo Uruguay", texto: "Por DAC, con número de rastreo" },
    { icon: ShieldCheck, titulo: "Cotización sin compromiso", texto: "Rápida y segura por WhatsApp" },
    { icon: Headset, titulo: "Atención especializada", texto: "Te ayudamos a encontrar la pieza exacta" },
  ];
  return (
    <Reveal>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-sm md:gap-6 md:p-5">
        {itens.map((it) => (
          <div
            key={it.titulo}
            className="flex flex-col items-center gap-2 text-center md:flex-row md:gap-4 md:text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary md:h-12 md:w-12">
              <it.icon className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            <div>
              <h4 className="text-[11px] font-bold leading-tight text-zinc-800 md:text-sm">{it.titulo}</h4>
              <p className="hidden text-xs text-zinc-500 md:block">{it.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

// MARCAS (faixa com rolagem contínua)
export function BrandsCarouselBlock({ config }: { config: string | null }) {
  const marcas = ["Massey Ferguson", "Valtra", "Valmet", "John Deere", "New Holland", "Case IH", "Ford", "Agrale", "MWM", "Perkins"];
  return (
    <Reveal>
      <div className="overflow-hidden rounded-2xl bg-white py-5 shadow-sm">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Repuestos para las principales marcas
        </p>
        <div className="relative [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="animate-marquee flex w-max gap-10">
            {[...marcas, ...marcas].map((m, i) => (
              <span key={i} className="whitespace-nowrap text-lg font-extrabold uppercase tracking-wide text-zinc-300">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// BUSCA POR CÓDIGO
export function BuscaCodigoBlock({ config }: { config: string | null }) {
  const [codigo, setCodigo] = useState("");
  const navigate = useNavigate();
  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-emerald-900 p-5 text-white shadow-sm md:p-10">
        <Search className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 text-white/5" />
        <div className="relative mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-center md:gap-10">
          <div className="md:flex-1">
            <h2 className="text-xl font-extrabold md:text-3xl">¿Sabés el código de la pieza?</h2>
            <p className="mt-1 text-sm text-white/80 md:text-base">
              Escribí el código original o del fabricante y encontrá la pieza exacta.
            </p>
          </div>
          <form
            className="flex w-full gap-2 md:flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (codigo.trim()) navigate({ to: "/loja", search: { q: codigo.trim() } as never });
            }}
          >
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej.: AL81843, 807045…"
              className="h-12 min-w-0 flex-1 rounded-full bg-white px-5 text-base text-zinc-900 outline-none ring-accent placeholder:text-zinc-400 focus:ring-2"
            />
            <button className="h-12 rounded-full bg-accent px-6 font-bold text-zinc-900 transition hover:brightness-95 active:scale-95">
              Buscar
            </button>
          </form>
        </div>
      </section>
    </Reveal>
  );
}

// BANNERS DUPLOS (levam às categorias)
const PROMO_BANNERS = [
  {
    titulo: "Engranajes y Transmisión",
    texto: "Repuestos para caja, diferencial y tracción de tu tractor.",
    categoria: "Engrenagens e Transmissão",
    cta: "Ver repuestos",
    icon: Settings,
    fundo: "from-primary to-emerald-800",
  },
  {
    titulo: "Filtros",
    texto: "Filtros de aceite, combustible y aire para el service de tu tractor.",
    categoria: "Filtros",
    cta: "Comprar ahora",
    icon: Droplet,
    fundo: "from-amber-500 to-orange-600",
  },
];

export function PromoBannersDuplosBlock({ config }: { config: string | null }) {
  const { data: duplos = [] } = useQuery({
    queryKey: ["home_banners", "duplo"],
    queryFn: () => listActiveBanners("duplo", "AGRICOLA"),
  });

  // Banners enviados em Admin > Banners > "Banners promocionais"
  if (duplos.length > 0) {
    return (
      <Reveal>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {duplos.slice(0, 4).map((b) => {
            const url = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);
            const img = (
              <picture>
                {b.image_path_mobile && (
                  <source media="(max-width: 767px)" srcSet={url(b.image_path_mobile)} />
                )}
                <img
                  src={url(b.image_path)}
                  alt={b.titulo ?? ""}
                  loading="lazy"
                  className="aspect-[800/350] w-full rounded-2xl bg-zinc-200 object-cover shadow-sm md:aspect-[900/350]"
                />
              </picture>
            );
            return b.link_url ? (
              <a key={b.id} href={b.link_url} className="block transition hover:opacity-95 active:scale-[0.98]">
                {img}
              </a>
            ) : (
              <div key={b.id}>{img}</div>
            );
          })}
        </div>
      </Reveal>
    );
  }

  // Padrão enquanto não houver banners cadastrados
  return (
    <Reveal>
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {PROMO_BANNERS.map((b) => (
          <Link
            key={b.categoria}
            to="/loja"
            search={{ linha: "AGRICOLA", categoria: b.categoria } as never}
            className={`group relative flex h-36 overflow-hidden rounded-2xl bg-gradient-to-br ${b.fundo} shadow-sm transition active:scale-[0.98] md:h-52`}
          >
            <b.icon className="absolute -bottom-8 -right-8 h-44 w-44 text-white/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 md:h-56 md:w-56" />
            <div className="relative flex flex-col justify-center p-5 md:p-8">
              <h3 className="text-xl font-extrabold text-white md:text-3xl">{b.titulo}</h3>
              <p className="mt-1 max-w-xs text-sm text-white/85">{b.texto}</p>
              <span className="mt-3 inline-flex w-max items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-zinc-900 shadow">
                {b.cta} <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

// COMPRE POR MONTADORA
export function CarouselMontadorasBlock({ config }: { config: string | null }) {
  return (
    <Section id="montadoras" title="Comprá por marca de tractor">
      <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-7 md:px-0">
        {MONTADORAS.map((m) => (
          <Link
            key={m}
            to="/loja"
            search={{ linha: "AGRICOLA", marca: m } as never}
            className="group flex w-[84px] shrink-0 flex-col items-center gap-2 text-center active:scale-95 md:w-auto"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-zinc-100 bg-zinc-50 text-lg font-extrabold text-primary transition group-hover:border-primary group-hover:bg-primary group-hover:text-white">
              {m
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="text-xs font-semibold text-zinc-700 md:text-sm">{m}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

// AVALIAÇÕES DO GOOGLE (antigo "Depoimentos", que tinha textos fictícios)
export function DepoimentosBlock({ config, title }: { config: string | null; title?: string | null }) {
  return <GoogleReviews config={lerConfig(config)} titulo={title} />;
}

// CONTATO: ofertas pelo WhatsApp e Instagram (o cadastro de e-mail antigo não enviava nada)
export function NewsletterInstagramBlock({ config }: { config: string | null }) {
  return (
    <Reveal>
      <div className={`grid gap-3 md:gap-4 ${INSTAGRAM_URL ? "md:grid-cols-2" : ""}`}>
        <a
          href={whatsappContactUrl("¡Hola! Quiero recibir ofertas de repuestos por WhatsApp.")}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-4 rounded-2xl bg-[#25D366] p-5 text-white shadow-sm transition active:scale-[0.98] md:p-8"
        >
          <MessageCircle className="h-12 w-12 shrink-0" />
          <div>
            <h3 className="text-lg font-extrabold md:text-2xl">Ofertas por WhatsApp</h3>
            <p className="text-sm text-white/90">Recibí novedades y promociones directo en tu celular.</p>
          </div>
        </a>
        {INSTAGRAM_URL && (
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-400 p-5 text-white shadow-sm transition active:scale-[0.98] md:p-8"
          >
            <Instagram className="h-12 w-12 shrink-0" />
            <div>
              <h3 className="text-lg font-extrabold md:text-2xl">Seguinos en Instagram</h3>
              <p className="text-sm text-white/90">Consejos, novedades y el día a día del taller.</p>
            </div>
          </a>
        )}
      </div>
    </Reveal>
  );
}

// ENVÍOS A URUGUAY POR DAC (texto en español: público de Uruguay)
// El logo de DAC lo sube el admin (Página Inicial > este bloque > imagen); sin logo, se muestra
// el nombre en texto. No se copian imágenes del sitio de DAC.
const DAC_RASTREO = "https://www.dac.com.uy/envios/rastrear";

export function EnvioDacBlock({ config }: { config: string | null }) {
  const c = lerConfig(config);
  // Imagem de fundo enviada em Admin > Banners > "Seção DAC (Uruguai)" (a primeira ativa)
  const { data: fundos = [] } = useQuery({
    queryKey: ["home_banners", "dac"],
    queryFn: () => listActiveBanners("dac", "AGRICOLA"),
  });
  const fundo = fundos[0];
  const urlFundo = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);
  const logo = c.image_path
    ? c.image_path.startsWith("http") || c.image_path.startsWith("/")
      ? c.image_path
      : `/uploads/${c.image_path}`
    : null;
  const ventajas = [
    { icon: MapPin, titulo: "Todo Uruguay", texto: "Enviamos a los 19 departamentos." },
    { icon: Search, titulo: "Seguimiento en línea", texto: "Con tu número de envío seguís el paquete en dac.com.uy." },
    { icon: PackageCheck, titulo: "Embalaje cuidadoso", texto: "Cada pieza se embala para viajar protegida." },
    { icon: MessageCircle, titulo: "Te acompañamos", texto: "Te confirmamos el despacho y el número de seguimiento por WhatsApp." },
  ];

  return (
    <Reveal>
      <section
        id="envios-uruguay"
        lang="es-UY"
        className="relative scroll-mt-[calc(var(--altura-header,112px)+12px)] overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900 p-5 text-white shadow-sm md:p-10"
      >
        {fundo ? (
          <>
            <picture>
              {fundo.image_path_mobile && (
                <source media="(max-width: 767px)" srcSet={urlFundo(fundo.image_path_mobile)} />
              )}
              <img
                src={urlFundo(fundo.image_path)}
                alt={fundo.titulo ?? ""}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>
            {/* Camada azul: mantém o texto legível sobre qualquer foto */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-950/85 via-blue-900/70 to-blue-900/40 md:bg-gradient-to-r md:from-blue-950/90 md:via-blue-900/65 md:to-blue-900/10" />
          </>
        ) : (
          <Truck className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 text-white/5" />
        )}
        <div className="relative grid gap-6 md:grid-cols-2 md:items-center md:gap-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <BandeiraUruguay className="h-3.5 w-5 rounded-sm" /> Envíos a todo Uruguay
            </span>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight md:text-4xl">
              Recibí tus repuestos en cualquier punto de Uruguay
            </h2>
            <p className="mt-2 text-sm text-white/85 md:text-base">
              Despachamos tu pedido por DAC, con seguimiento en línea desde que sale hasta que llega.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-14 min-w-28 items-center justify-center rounded-xl bg-white px-4 shadow-sm">
                {logo ? (
                  <img src={logo} alt="DAC" className="max-h-10 w-auto object-contain" />
                ) : (
                  <span className="text-2xl font-black tracking-tight text-blue-900">DAC</span>
                )}
              </div>
              <span className="text-sm font-medium text-white/85">Envío por DAC</span>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a
                href={DAC_RASTREO}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-blue-900 shadow transition active:scale-95"
              >
                <Search className="h-4 w-4" /> Rastrear mi envío
              </a>
              <a
                href={whatsappContactUrl("¡Hola! Quiero consultar el envío de repuestos a Uruguay por DAC.")}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow transition active:scale-95"
              >
                <MessageCircle className="h-4 w-4" /> Consultar envío por WhatsApp
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {ventajas.map((v) => (
              <div key={v.titulo} className="rounded-xl bg-white/10 p-3 backdrop-blur-sm md:p-4">
                <v.icon className="h-6 w-6 text-sky-200" />
                <h3 className="mt-2 text-sm font-bold">{v.titulo}</h3>
                <p className="mt-0.5 text-xs leading-snug text-white/80">{v.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}
