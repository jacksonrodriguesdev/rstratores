import { Link } from "@tanstack/react-router";
import {
  Settings,
  Wrench,
  OctagonAlert,
  Droplet,
  ArrowRight,
  Truck,
  ShieldCheck,
  Headset,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageContext";
import { useSegment } from "@/components/SegmentContext";
import { linhaPermitida } from "@/lib/linhas";
import { HeroSlider } from "@/components/HeroSlider";
import { ProductSlider } from "@/components/ProductSlider";
import { useQuery } from "@tanstack/react-query";
import { listProducts, type ListParams } from "@/lib/products";

// Produtos dos blocos da home. Se o bloco pede "só com imagem" e não há nenhum
// (o catálogo agrícola ainda não tem fotos), mostra os produtos apresentáveis.
async function listVitrine(params: ListParams, onlyWithImages: boolean) {
  if (onlyWithImages) {
    const comImagem = await listProducts({ ...params, hasImage: true });
    if (comImagem.rows.length > 0) return comImagem;
  }
  return listProducts({ ...params, vitrine: true });
}
import { listActiveBanners } from "@/lib/banners";
import { listCategories } from "@/lib/categories";
import { MiniCard } from "@/components/MiniCard";

// HERO SLIDER BLOCK
export function HeroSliderBlock({
  config,
  title,
}: {
  config: string | null;
  title: string | null;
}) {
  const { segment } = useSegment();
  const configData = config ? JSON.parse(config) : {};
  const subtitle = configData.subtitle;
  const tag = configData.tag;

  // Buscar banners ativos do site_banners filtrados por segmento
  const { data: heroBanners = [] } = useQuery({
    queryKey: ["hero_banners", segment],
    queryFn: () => listActiveBanners("hero", segment),
  });

  const mappedBanners = heroBanners;

  if (mappedBanners.length === 0) {
    return (
      <section className="my-12 rounded-2xl bg-muted/30 p-12 text-center border-dashed border-2">
        <h3 className="text-xl font-bold text-muted-foreground">Nenhum Banner Cadastrado</h3>
        <p className="text-muted-foreground text-sm mt-2">
          Acesse Admin {">"} Banners e cadastre banners para o segmento {segment}.
        </p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden min-h-[420px] flex items-center border-b border-zinc-800 rounded-b-2xl shadow-xl">
      <div className="absolute inset-0 z-0">
        <HeroSlider banners={mappedBanners} intervalMs={6000} />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/20 to-transparent z-10 pointer-events-none"></div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12 animate-in fade-in duration-1000 z-20 pointer-events-none">
        {(title || subtitle || tag) && (
          <div className="flex-1 flex flex-col gap-6 drop-shadow-lg">
            {tag && (
              <span className="w-fit bg-accent/90 text-accent-foreground backdrop-blur-sm px-4 py-1.5 shadow-lg shadow-accent/20 rounded-full text-xs font-bold uppercase pointer-events-auto">
                {tag}
              </span>
            )}
            {title && (
              <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl leading-[1.1] text-white">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-zinc-200 md:text-lg leading-relaxed max-w-xl font-medium">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// PRODUCTS GRID BLOCK
export function ProductsGridBlock({
  title,
  config,
}: {
  title: string | null;
  config: string | null;
}) {
  const { segment: userSegment } = useSegment();
  const configData = config ? JSON.parse(config) : {};
  const segmentFilter = configData.segment || "AMBOS";
  const categoriaFilter = configData.categoria || undefined;
  const marcaFilter = configData.marca || undefined;
  const sortFilter = configData.sort || undefined;
  const onlyWithImages = configData.onlyWithImages ?? true;
  const limit = configData.limit || 8;

  // Quando o bloco está configurado como "AMBOS", seguir o segmento ativo do usuário
  const linhaParam = linhaPermitida(segmentFilter === "AMBOS" ? userSegment : segmentFilter);

  const { data, isLoading } = useQuery({
    queryKey: [
      "home-products-grid",
      linhaParam,
      limit,
      onlyWithImages,
      categoriaFilter,
      marcaFilter,
      sortFilter,
    ],
    queryFn: () =>
      listVitrine(
        {
          page: 1,
          pageSize: limit,
          linha: linhaParam,
          categoria: categoriaFilter,
          marca: marcaFilter,
          sort: sortFilter,
        },
        onlyWithImages,
      ),
  });

  const products = data?.rows ?? [];
  const filteredProducts = products.slice(0, limit);

  return (
    <section className="my-12">
      <div className="mb-6 flex items-end justify-between">
        <h3 className="text-2xl font-bold tracking-tight">{title || "Produtos em Destaque"}</h3>
        <Button asChild variant="ghost" size="sm">
          <Link to="/loja" search={{ linha: linhaParam } as never}>
            Ver todos <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando produtos...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground bg-muted/10">
          <p>Nenhum produto encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredProducts.map((p: any) => (
            <MiniCard key={p.sku} p={p} />
          ))}
        </div>
      )}
    </section>
  );
}

// Mapa de ícones para categorias conhecidas (fallback)
const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  "Motor": <Settings className="h-8 w-8 text-primary" />,
  "Suspensão": <Wrench className="h-8 w-8 text-primary" />,
  "Freios": <OctagonAlert className="h-8 w-8 text-primary" />,
  "Filtros e Óleos": <Droplet className="h-8 w-8 text-primary" />,
  "Filtros": <Droplet className="h-8 w-8 text-primary" />,
  "Engrenagens e Transmissão": <Settings className="h-8 w-8 text-primary" />,
  "Hidráulica e Pneumática": <Wrench className="h-8 w-8 text-primary" />,
  "Vedações": <OctagonAlert className="h-8 w-8 text-primary" />,
};

const DEFAULT_ICON = <Package className="h-8 w-8 text-primary" />;

// CATEGORY GRID BLOCK
export function CategoryGridBlock({ config }: { config: string | null }) {
  const { t } = useLanguage();
  const { segment } = useSegment();

  // Buscar categorias reais do banco filtradas por segmento
  const { data: dbCategories = [], isLoading } = useQuery({
    queryKey: ["home_categories", segment],
    queryFn: () => listCategories({ linha: segment, onlyWithProducts: true }),
  });

  // Categorias hardcoded como fallback caso o DB não retorne resultados
  const fallback_auto = [
    { name: "Motor", label: t("home.motor") },
    { name: "Suspensão", label: t("home.suspensao") },
    { name: "Freios", label: t("home.freios") },
    { name: "Filtros e Óleos", label: t("home.filtros") },
  ];

  const fallback_agricola = [
    { name: "Engrenagens e Transmissão", label: "Transmissão" },
    { name: "Hidráulica e Pneumática", label: "Hidráulica" },
    { name: "Filtros", label: "Filtros" },
    { name: "Vedações", label: "Vedações" },
  ];

  // Usar categorias do DB (somente raízes / parent_id null) ou fallback
  const rootCategories = dbCategories.filter((c: any) => c.parent_id === null);
  const systems = rootCategories.length > 0
    ? rootCategories.map((c: any) => ({
        name: c.nome,
        label: c.nome,
        icon: CATEGORY_ICON_MAP[c.nome] || DEFAULT_ICON,
      }))
    : (segment === "AGRICOLA" ? fallback_agricola : fallback_auto).map((f) => ({
        ...f,
        icon: CATEGORY_ICON_MAP[f.name] || DEFAULT_ICON,
      }));

  return (
    <section className="my-12 rounded-2xl bg-muted/30 p-6 md:p-10">
      <h3 className="mb-6 text-2xl font-bold tracking-tight">{t("home.busquePorSistema")}</h3>
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Carregando categorias...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {systems.map((sys: any) => (
            <Link
              key={sys.name}
              to="/loja"
              search={{ search: "", page: 1, linha: segment, categoria: sys.name } as never}
              className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                {sys.icon}
              </div>
              <div className="font-semibold text-foreground/90">{sys.label}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// PRODUCTS CAROUSEL BLOCK
export function ProductsCarouselBlock({
  title,
  config,
}: {
  title: string | null;
  config: string | null;
}) {
  const { segment: userSegment } = useSegment();
  const configData = config ? JSON.parse(config) : {};
  const segmentFilter = configData.segment || "AMBOS";
  const categoriaFilter = configData.categoria || undefined;
  const marcaFilter = configData.marca || undefined;
  const sortFilter = configData.sort || undefined;
  const onlyWithImages = configData.onlyWithImages ?? true;
  const limit = configData.limit || 12;

  const rows = configData.rows || 1;

  // Quando o bloco está configurado como "AMBOS", seguir o segmento ativo do usuário
  const linhaParam = linhaPermitida(segmentFilter === "AMBOS" ? userSegment : segmentFilter);

  const { data, isLoading } = useQuery({
    queryKey: [
      "home-products-carousel",
      linhaParam,
      limit,
      onlyWithImages,
      categoriaFilter,
      marcaFilter,
      sortFilter,
    ],
    queryFn: () =>
      listVitrine(
        {
          page: 1,
          pageSize: limit,
          linha: linhaParam,
          categoria: categoriaFilter,
          marca: marcaFilter,
          sort: sortFilter,
        },
        onlyWithImages,
      ),
  });

  const products = data?.rows ?? [];
  const filteredProducts = products.slice(0, limit);

  return (
    <section className="my-8">
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando carrossel...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground bg-muted/10">
          <p>Nenhum produto encontrado com os filtros selecionados para o carrossel.</p>
        </div>
      ) : (
        <ProductSlider
          title={title || "Lançamentos e Destaques"}
          subtitle=""
          products={filteredProducts}
          rows={rows}
        />
      )}
    </section>
  );
}

// PROMO STRIP BLOCK
export function PromoStripBlock({
  title,
  config,
}: {
  title: string | null;
  config: string | null;
}) {
  const configData = config ? JSON.parse(config) : {};
  const imagePath = configData.image_path;
  const link = configData.link || "";

  const content = imagePath ? (
    <section className="my-12 overflow-hidden rounded-xl shadow-lg border">
      <img
        src={imagePath}
        alt={title || "Banner"}
        className="w-full object-cover"
        style={{ maxHeight: "300px" }}
      />
    </section>
  ) : (
    <section className="my-12 rounded-xl bg-accent p-8 text-center text-accent-foreground shadow-lg">
      <h3 className="text-xl font-bold md:text-2xl">
        {title ||
          "Oferta Especial - Frete Grátis para todo o Brasil nas compras acima de R$ 5.000,00"}
      </h3>
    </section>
  );

  return link ? (
    <a href={link} className="block cursor-pointer transition-transform hover:-translate-y-1">
      {content}
    </a>
  ) : (
    content
  );
}

// FEATURES STRIP BLOCK
export function FeaturesStripBlock({ config }: { config: string | null }) {
  return (
    <div className="bg-primary/5 py-6 my-6 rounded-lg border border-primary/10 shadow-sm overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="bg-primary/20 p-3 rounded-full flex-shrink-0">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-sm md:text-base text-zinc-800">
                Entregamos no Brasil inteiro
              </h4>
              <p className="text-xs md:text-sm text-zinc-600">
                Frete rápido via Correios e Transportadoras.
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-primary/20" />

          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="bg-primary/20 p-3 rounded-full flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-sm md:text-base text-zinc-800">Cotação 100% Segura</h4>
              <p className="text-xs md:text-sm text-zinc-600">
                Ambiente protegido para o seu pedido.
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-primary/20" />

          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="bg-primary/20 p-3 rounded-full flex-shrink-0">
              <Headset className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-sm md:text-base text-zinc-800">
                Atendimento Especializado
              </h4>
              <p className="text-xs md:text-sm text-zinc-600">
                Time pronto para encontrar a peça exata.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// BRANDS CAROUSEL BLOCK
export function BrandsCarouselBlock({ config }: { config: string | null }) {
  const brands = [
    { name: "Ford", img: "/site/brands/ford.png" },
    { name: "Valmet", img: "/site/brands/valmet.png" },
    { name: "MWM", img: "/site/brands/mwm.png" },
    // Pellegrino é fornecedor da linha automotiva (desligada) — ver src/lib/linhas.ts
    // { name: "Pellegrino", img: "/site/brands/pellegrino.png" },
    { name: "Massey Ferguson", img: "/site/brands/massey.png" },
  ];

  return (
    <section className="my-12 px-6">
      <h3 className="mb-6 text-center text-xl font-bold tracking-tight text-zinc-800">
        Trabalhamos com as Maiores Marcas
      </h3>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
        {brands.map((brand) => (
          <div key={brand.name} className="flex h-16 w-32 items-center justify-center">
            {/* If the image doesn't exist yet, we just show text. */}
            <span className="text-lg font-bold uppercase tracking-wider text-muted-foreground">
              {brand.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// BUSCA POR CÓDIGO
export function BuscaCodigoBlock({ config }: { config: string | null }) {
  return (
    <section className="my-12 bg-zinc-100 py-12 px-4 rounded-xl border border-zinc-200 shadow-inner">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-zinc-800 mb-2">Busca Direta por Código</h2>
          <p className="text-zinc-600">
            Sabe o código original ou o código do fabricante? Digite abaixo para encontrar a peça
            exata instantaneamente.
          </p>
        </div>
        <div className="flex-1 w-full">
          <div className="flex w-full relative shadow-md">
            <input
              type="text"
              placeholder="Ex: 8N3002, 94614... "
              className="w-full h-14 pl-4 pr-16 text-lg border-2 border-primary/30 rounded-l-lg focus:outline-none focus:border-primary"
            />
            <button className="h-14 px-8 bg-primary text-white font-bold rounded-r-lg hover:bg-primary/90 transition-colors uppercase tracking-wide">
              Buscar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// BANNERS DUPLOS
// Antes: fotos genéricas de carro/motor (Unsplash) e sem link. Agora levam às categorias agrícolas.
const PROMO_BANNERS = [
  {
    titulo: "Engrenagens e Transmissão",
    texto: "Peças para câmbio, diferencial e tração do seu trator.",
    categoria: "Engrenagens e Transmissão",
    cta: "VER PEÇAS",
    icon: Settings,
  },
  {
    titulo: "Filtros",
    texto: "Filtros de óleo, combustível e ar para a revisão do seu trator.",
    categoria: "Filtros",
    cta: "COMPRE AGORA",
    icon: Droplet,
  },
];

export function PromoBannersDuplosBlock({ config }: { config: string | null }) {
  return (
    <section className="my-12 flex flex-col md:flex-row gap-6">
      {PROMO_BANNERS.map((b) => (
        <Link
          key={b.categoria}
          to="/loja"
          search={{ linha: "AGRICOLA", categoria: b.categoria } as never}
          className="flex-1 h-48 md:h-64 rounded-xl overflow-hidden relative shadow-lg group bg-gradient-to-br from-primary to-primary/70"
        >
          <b.icon className="absolute -right-6 -bottom-6 h-48 w-48 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" />
          <div className="absolute inset-0 flex flex-col justify-center p-8">
            <h3 className="text-white text-2xl md:text-3xl font-black mb-2 uppercase">{b.titulo}</h3>
            <p className="text-white/85 mb-4 max-w-xs">{b.texto}</p>
            <span className="bg-white text-primary px-6 py-2 w-max font-bold rounded shadow-md">
              {b.cta}
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}

// CAROUSEL MONTADORAS (Circulares)
export function CarouselMontadorasBlock({ config }: { config: string | null }) {
  // Montadoras da linha pesada/automotiva (desligada — ver src/lib/linhas.ts):
  // ["Volvo", "Scania", "Mercedes", "Volkswagen", "Iveco", "Agrale"]
  // Nomes iguais ao campo `marca` da tabela agricolas, para o filtro da loja funcionar.
  const montadoras = [
    "Massey Ferguson",
    "Valtra",
    "New Holland",
    "John Deere",
    "Case IH",
    "Ford",
    "Agrale",
  ];
  return (
    <section className="my-12">
      <h3 className="mb-8 text-center text-2xl font-bold tracking-tight text-zinc-800 uppercase">
        Compre por Montadora
      </h3>
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
        {montadoras.map((m) => (
          <Link
            key={m}
            to="/loja"
            search={{ search: "", page: 1, linha: "AGRICOLA", marca: m } as never}
            className="flex flex-col items-center gap-3 cursor-pointer group"
          >
            <div className="w-24 h-24 rounded-full bg-white shadow-md border border-zinc-100 flex items-center justify-center p-4 group-hover:border-primary group-hover:shadow-lg transition-all">
              <span className="text-xs font-bold text-zinc-400 group-hover:text-primary">
                {m.toUpperCase()}
              </span>
            </div>
            <span className="font-semibold text-zinc-700">{m}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// DEPOIMENTOS
export function DepoimentosBlock({ config }: { config: string | null }) {
  return (
    <section className="my-16 bg-zinc-50 py-16 px-4 rounded-3xl border border-zinc-100">
      <h3 className="mb-10 text-center text-3xl font-black tracking-tight text-zinc-900 uppercase">
        O que os clientes dizem
      </h3>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 relative"
          >
            <div className="text-primary text-4xl font-serif absolute top-4 left-6">"</div>
            <p className="text-zinc-600 mt-4 italic mb-6">
              "Excelente atendimento e peças originais de qualidade. Chegou super rápido na minha
              oficina!"
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-500">
                CL
              </div>
              <div>
                <div className="font-bold text-zinc-800">Cliente Satisfeito</div>
                <div className="text-xs text-zinc-400">Há 2 dias</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// NEWSLETTER & INSTAGRAM
export function NewsletterInstagramBlock({ config }: { config: string | null }) {
  return (
    <section className="my-16 flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-xl">
      {/* Instagram */}
      <div className="flex-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-12 text-white flex flex-col justify-center items-center text-center">
        <h3 className="text-3xl font-black mb-4 uppercase tracking-wider">Siga nosso Instagram</h3>
        <p className="mb-8 text-white/90">
          Fique por dentro das novidades, lançamentos e dicas exclusivas para o seu negócio.
        </p>
        <a
          href="#"
          className="bg-white text-purple-600 px-8 py-3 rounded-full font-bold uppercase tracking-wide hover:scale-105 transition-transform shadow-lg"
        >
          @rstratorpecas
        </a>
      </div>
      {/* Newsletter */}
      <div className="flex-1 bg-zinc-900 p-12 text-white flex flex-col justify-center items-center text-center">
        <h3 className="text-3xl font-black mb-4 uppercase tracking-wider">Ofertas Exclusivas</h3>
        <p className="mb-8 text-zinc-400">
          Cadastre seu e-mail e receba descontos especiais antes de todo mundo.
        </p>
        <div className="flex w-full max-w-sm">
          <input
            type="email"
            placeholder="Seu melhor e-mail"
            className="w-full h-12 px-4 rounded-l-md text-zinc-900 focus:outline-none"
          />
          <button className="bg-primary px-6 font-bold rounded-r-md hover:bg-primary/90">
            ASSINAR
          </button>
        </div>
      </div>
    </section>
  );
}
