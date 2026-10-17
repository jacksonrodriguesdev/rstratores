// Os 15 componentes do Construtor da Home (configuração em src/lib/blocos-home.ts).
// Regras: tudo sai no HTML do servidor (o Google lê o texto), sem biblioteca nova, animação só em
// CSS (para quem pediu menos movimento no aparelho, fica parada), imagens com tamanho reservado
// (a página não "pula") e links para as páginas de marca e categoria.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  MessageCircle,
  Cog,
  Droplets,
  Filter,
  ShieldCheck,
  CircleDot,
  Wrench,
  Disc3,
  Frame,
  Zap,
  Boxes,
} from "lucide-react";
import { useT } from "@/lib/idioma";
import { cor, linkSeguro, txt } from "@/lib/blocos-home";
import { CATEGORIAS_SEO, MARCAS_SEO, urlRepuestos } from "@/lib/seo-paginas";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { BannerImage } from "@/components/BannerImage";
import { ProductsCarouselBlock } from "@/components/homepage-blocks";
import { cn } from "@/lib/utils";

type C = Record<string, any>;
type Props = { c: C; prioridade?: boolean };
const lista = (v: unknown): C[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [];

// Link: interno ganha o /pt quando a página está em português; externo abre em outra aba
function Lk({
  to,
  className,
  children,
  style,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const { href } = useT();
  const l = linkSeguro(to);
  if (!l)
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  const externo = /^https?:/i.test(l);
  return (
    <a
      href={externo ? l : href(l)}
      className={className}
      style={style}
      {...(externo && { target: "_blank", rel: "noreferrer noopener" })}
    >
      {children}
    </a>
  );
}

// Título da seção: H1 se o admin marcou, senão H2
function Titulo({
  c,
  k = "titulo",
  className,
  style,
}: {
  c: C;
  k?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { idioma } = useT();
  const t = txt(c, k, idioma);
  if (!t) return null;
  const Tag = c.h1 ? "h1" : "h2";
  return (
    <Tag className={className} style={style}>
      {t}
    </Tag>
  );
}

const vencido = (ate: unknown) => {
  if (typeof ate !== "string" || !ate) return false;
  const t = new Date(ate).getTime();
  return Number.isFinite(t) && t < Date.now();
};

// Contagem regressiva: no servidor (e no 1º desenho) mostra "--" para o HTML ser igual nos dois
function useContagem(ate: unknown) {
  const [resta, setResta] = useState<number | null>(null);
  useEffect(() => {
    if (typeof ate !== "string" || !ate) return;
    const fim = new Date(ate).getTime();
    if (!Number.isFinite(fim)) return;
    const tick = () => setResta(Math.max(0, fim - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ate]);
  if (resta == null) return null;
  const s = Math.floor(resta / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    acabou: resta <= 0,
  };
}
function Relogio({ ate, claro }: { ate: unknown; claro?: boolean }) {
  const { t } = useT();
  const r = useContagem(ate);
  const caixa = (v: number | string, rotulo: string) => (
    <span
      className={cn(
        "flex min-w-12 flex-col items-center rounded-lg px-2 py-1",
        claro ? "bg-white/15" : "bg-black/20",
      )}
    >
      <span className="font-mono text-xl font-black tabular-nums leading-none md:text-2xl">
        {typeof v === "number" ? String(v).padStart(2, "0") : v}
      </span>
      <span className="text-[10px] font-semibold uppercase opacity-80">{rotulo}</span>
    </span>
  );
  return (
    <span className="flex items-center gap-1.5" aria-label={t("Tiempo restante", "Tempo restante")}>
      {r && r.d > 0 && caixa(r.d, t("días", "dias"))}
      {caixa(r ? r.h : "--", "h")}
      {caixa(r ? r.m : "--", "min")}
      {caixa(r ? r.s : "--", "s")}
    </span>
  );
}

// ---------------------------------------------------------------- 1. Fita rolante
export function TickerBloco({ c }: Props) {
  const { idioma } = useT();
  const itens = lista(c.itens).filter((i) => txt(i, "texto", idioma));
  if (!itens.length) return null;
  const dur = { lenta: 60, normal: 35, rapida: 18 }[String(c.velocidade)] ?? 35;
  const sep = String(c.separador ?? "•").slice(0, 3);
  const faixa = (copia: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={copia || undefined}>
      {itens.map((i, n) => (
        <li
          key={n}
          className="flex items-center whitespace-nowrap px-4 text-sm font-semibold md:text-[15px]"
        >
          {i.link && !copia ? (
            <Lk to={i.link} className="hover:underline">
              {txt(i, "texto", idioma)}
            </Lk>
          ) : (
            txt(i, "texto", idioma)
          )}
          {sep && <span className="ml-8 opacity-60">{sep}</span>}
        </li>
      ))}
    </ul>
  );
  return (
    <section
      aria-label={idioma === "pt" ? "Avisos" : "Avisos"}
      className="ap-ticker overflow-hidden py-2.5"
      style={{ background: cor(c.cor_fundo, "#06321b"), color: cor(c.cor_texto, "#ffffff") }}
    >
      <div className="ap-ticker-trilho flex w-max" style={{ ["--ap-dur" as any]: `${dur}s` }}>
        {faixa(false)}
        {faixa(true)}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 2. Faixa de atenção / promoção
export function FitaPromoBloco({ c }: Props) {
  const { idioma } = useT();
  if (vencido(c.ate)) return null;
  const fundo = cor(c.cor_fundo, "#dc2626");
  const texto = cor(c.cor_texto, "#ffffff");
  const destaque = cor(c.cor_destaque, "#f2c94c");
  const bg =
    c.estilo === "gradiente"
      ? `linear-gradient(90deg, ${fundo}, color-mix(in srgb, ${fundo} 70%, #000))`
      : c.estilo === "listrada"
        ? `repeating-linear-gradient(-45deg, ${fundo} 0 18px, color-mix(in srgb, ${fundo} 85%, #000) 18px 36px)`
        : fundo;
  return (
    <section aria-label={txt(c, "texto", idioma)} style={{ background: bg, color: texto }}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3 text-center">
        {txt(c, "selo", idioma) && (
          <span
            className="rounded-full px-3 py-1 text-sm font-black uppercase"
            style={{ background: destaque, color: fundo }}
          >
            {txt(c, "selo", idioma)}
          </span>
        )}
        <p className="text-base font-extrabold md:text-lg">{txt(c, "texto", idioma)}</p>
        {c.ate && <Relogio ate={c.ate} claro />}
        {txt(c, "botao", idioma) && linkSeguro(c.link) && (
          <Lk
            to={c.link}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition hover:brightness-110"
            style={{ background: destaque, color: fundo }}
          >
            {txt(c, "botao", idioma)} <ArrowRight className="h-4 w-4" />
          </Lk>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 3. Hero dividido
export function HeroDivididoBloco({ c, prioridade }: Props) {
  const { idioma } = useT();
  const fundo = cor(c.cor_fundo, "#06321b");
  const texto = cor(c.cor_texto, "#ffffff");
  const destaque = cor(c.cor_destaque, "#f2c94c");
  const bg =
    c.fundo === "gradiente"
      ? `radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, ${fundo} 80%, #fff) 0%, ${fundo} 55%, color-mix(in srgb, ${fundo} 70%, #000) 100%)`
      : fundo;
  const imagemEsq = c.lado === "esquerda";
  return (
    <section className="relative overflow-hidden" style={{ background: bg, color: texto }}>
      {c.fundo === "padrao" && (
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,currentColor_0_2px,transparent_2px_42px)]"
        />
      )}
      <div
        className={cn(
          "relative mx-auto grid max-w-7xl items-center gap-6 px-4 py-8 md:grid-cols-2 md:gap-10 md:py-14",
          imagemEsq && "md:[&>*:first-child]:order-2",
        )}
      >
        <div>
          {txt(c, "selo", idioma) && (
            <p
              className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
              style={{ background: destaque, color: fundo }}
            >
              {txt(c, "selo", idioma)}
            </p>
          )}
          <Titulo c={c} className="text-3xl font-black leading-[1.05] tracking-tight md:text-5xl" />
          {txt(c, "texto", idioma) && (
            <p className="mt-4 max-w-xl text-base opacity-90 md:text-lg">
              {txt(c, "texto", idioma)}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {txt(c, "botao1", idioma) && (
              <Lk
                to={c.link1}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-extrabold shadow-lg transition hover:brightness-110"
                style={{ background: destaque, color: fundo }}
              >
                {txt(c, "botao1", idioma)} <ArrowRight className="h-4 w-4" />
              </Lk>
            )}
            {txt(c, "botao2", idioma) && (
              <Lk
                to={c.link2}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-5 py-3 font-bold transition hover:bg-white/10"
                style={{ borderColor: texto }}
              >
                {txt(c, "botao2", idioma)}
              </Lk>
            )}
          </div>
        </div>
        {c.imagem ? (
          <div className="aspect-[5/4] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
            <BannerImage
              src={c.imagem}
              alt={txt(c, "titulo", idioma)}
              className="h-full w-full object-cover"
              prioridade={prioridade}
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="hidden aspect-[5/4] items-center justify-center rounded-3xl md:flex"
            style={{ background: `color-mix(in srgb, ${texto} 8%, transparent)` }}
          >
            <Cog className="h-40 w-40 opacity-30" strokeWidth={1} />
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 4. Hero de busca
export function HeroBuscaBloco({ c, prioridade }: Props) {
  const { idioma, href } = useT();
  const fundo = cor(c.cor_fundo, "#0b7a3b");
  const texto = cor(c.cor_texto, "#ffffff");
  const populares = lista(c.populares).filter((p) => txt(p, "texto", idioma));
  return (
    <section className="relative overflow-hidden" style={{ background: fundo, color: texto }}>
      {c.imagem && (
        <div aria-hidden className="absolute inset-0">
          <BannerImage
            src={c.imagem}
            alt=""
            className="h-full w-full object-cover opacity-30"
            prioridade={prioridade}
          />
        </div>
      )}
      <div className="relative mx-auto max-w-3xl px-4 py-10 text-center md:py-16">
        <Titulo c={c} className="text-3xl font-black tracking-tight md:text-5xl" />
        {txt(c, "texto", idioma) && (
          <p className="mt-3 text-base opacity-90 md:text-lg">{txt(c, "texto", idioma)}</p>
        )}
        {/* Formulário comum: funciona até antes do JavaScript carregar */}
        <form
          action={href("/loja")}
          method="get"
          role="search"
          className="mx-auto mt-6 flex max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-4 ring-white/20"
        >
          <label className="sr-only" htmlFor="hero-busca">
            {txt(c, "titulo", idioma)}
          </label>
          <input
            id="hero-busca"
            name="q"
            type="search"
            placeholder={txt(c, "placeholder", idioma)}
            className="min-w-0 flex-1 px-5 py-4 text-base text-zinc-900 outline-none md:text-lg"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-5 font-extrabold text-white md:px-7"
            style={{ background: "#18181b" }}
          >
            <Search className="h-5 w-5" />{" "}
            <span className="hidden sm:inline">{idioma === "pt" ? "Buscar" : "Buscar"}</span>
          </button>
        </form>
        {populares.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {populares.map((p, i) => (
              <a
                key={i}
                href={`${href("/loja")}?q=${encodeURIComponent(txt(p, "texto", idioma))}`}
                className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/25"
              >
                {txt(p, "texto", idioma)}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 5. Hero com números
export function HeroNumerosBloco({ c }: Props) {
  const { idioma } = useT();
  const fundo = cor(c.cor_fundo, "#18181b");
  const texto = cor(c.cor_texto, "#ffffff");
  const destaque = cor(c.cor_destaque, "#f2c94c");
  const nums = lista(c.numeros)
    .filter((x) => x.numero)
    .slice(0, 4);
  return (
    <section style={{ background: fundo, color: texto }}>
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="max-w-3xl">
          <Titulo c={c} className="text-3xl font-black leading-tight tracking-tight md:text-5xl" />
          {txt(c, "texto", idioma) && (
            <p className="mt-3 text-base opacity-85 md:text-lg">{txt(c, "texto", idioma)}</p>
          )}
          {txt(c, "botao", idioma) && (
            <Lk
              to={c.link}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-extrabold transition hover:brightness-110"
              style={{ background: destaque, color: fundo }}
            >
              {txt(c, "botao", idioma)} <ArrowRight className="h-4 w-4" />
            </Lk>
          )}
        </div>
        {nums.length > 0 && (
          <dl
            className={cn(
              "mt-8 grid gap-3",
              nums.length >= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3",
            )}
          >
            {nums.map((x, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 ring-1 ring-white/10"
                style={{ background: `color-mix(in srgb, ${texto} 6%, transparent)` }}
              >
                <dt className="sr-only">{txt(x, "rotulo", idioma)}</dt>
                <dd className="text-3xl font-black md:text-4xl" style={{ color: destaque }}>
                  {x.numero}
                </dd>
                <dd className="mt-1 text-sm opacity-80">{txt(x, "rotulo", idioma)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

// Carrossel leve: rolagem nativa com "encaixe" + setas
function Trilho({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mover = (d: number) =>
    ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="group relative">
      <div
        ref={ref}
        className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-1"
        aria-label={label}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => mover(-1)}
        className="absolute -left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 hover:bg-zinc-50 md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => mover(1)}
        className="absolute -right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 hover:bg-zinc-50 md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
const Secao = ({
  children,
  className,
  style,
  label,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}) => (
  <section
    aria-label={label}
    className={cn("rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-6", className)}
    style={style}
  >
    {children}
  </section>
);

// ---------------------------------------------------------------- 6. Slide de categorias
const ICONE_CAT: Record<string, typeof Cog> = {
  "Engrenagens e Transmissão": Cog,
  "Hidráulica e Pneumática": Droplets,
  Filtros: Filter,
  Vedações: ShieldCheck,
  "Rolamentos e Mancais": CircleDot,
  "Elementos de Fixação": Wrench,
  "Freios e Embreagens": Disc3,
  "Estrutura e Suspensão": Frame,
  "Elétrica e Sensores": Zap,
};
export function SlideCategoriasBloco({ c }: Props) {
  const { idioma } = useT();
  const destaque = cor(c.cor_destaque, "#0b7a3b");
  const cats = CATEGORIAS_SEO.filter((x) => x.categoria !== "Outros Componentes");
  const nome = (x: (typeof cats)[number]) => (idioma === "pt" ? x.categoria : x.nome);
  return (
    <Secao label={txt(c, "titulo", idioma)}>
      <Titulo c={c} className="mb-4 text-xl font-extrabold text-zinc-900 md:text-2xl" />
      <Trilho label={txt(c, "titulo", idioma)}>
        {cats.map((x) => {
          const Icone = ICONE_CAT[x.categoria] ?? Boxes;
          const url = urlRepuestos({ categoria: x.categoria }) ?? "/loja";
          if (c.estilo === "pilulas")
            return (
              <Lk
                key={x.slug}
                to={url}
                className="flex shrink-0 snap-start items-center gap-2 rounded-full border-2 border-[var(--d)] px-4 py-2 text-sm font-bold text-[var(--d)] transition hover:bg-[var(--d)] hover:text-white"
                style={{ ["--d" as any]: destaque }}
              >
                <Icone className="h-4 w-4" /> {nome(x)}
              </Lk>
            );
          if (c.estilo === "circulos")
            return (
              <Lk
                key={x.slug}
                to={url}
                className="flex w-24 shrink-0 snap-start flex-col items-center gap-2 text-center md:w-28"
              >
                <span
                  className="flex h-20 w-20 items-center justify-center rounded-full text-white shadow-md transition hover:scale-105 md:h-24 md:w-24"
                  style={{ background: destaque }}
                >
                  <Icone className="h-9 w-9" />
                </span>
                <span className="text-xs font-bold leading-tight text-zinc-800 md:text-sm">
                  {nome(x)}
                </span>
              </Lk>
            );
          return (
            <Lk
              key={x.slug}
              to={url}
              className="group/c flex w-40 shrink-0 snap-start flex-col justify-between rounded-2xl bg-zinc-50 p-4 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md md:w-48"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                style={{ background: destaque }}
              >
                <Icone className="h-6 w-6" />
              </span>
              <span className="mt-6 text-sm font-extrabold leading-tight text-zinc-900">
                {nome(x)}
              </span>
              <span
                className="mt-1 flex items-center gap-1 text-xs font-semibold"
                style={{ color: destaque }}
              >
                {idioma === "pt" ? "Ver peças" : "Ver repuestos"}{" "}
                <ArrowRight className="h-3 w-3 transition group-hover/c:translate-x-0.5" />
              </span>
            </Lk>
          );
        })}
      </Trilho>
    </Secao>
  );
}

// ---------------------------------------------------------------- 7. Slide de marcas
export function SlideMarcasBloco({ c }: Props) {
  const { idioma } = useT();
  const logos = new Map(
    lista(c.logos)
      .filter((l) => l.marca && l.imagem)
      .map((l) => [String(l.marca).toLowerCase(), String(l.imagem)]),
  );
  const fundo = cor(c.cor_fundo, "#ffffff");
  const texto = cor(c.cor_texto, "#18181b");
  const item = (m: (typeof MARCAS_SEO)[number], copia = false) => {
    const logo = logos.get(m.marca.toLowerCase());
    const conteudo = logo ? (
      <BannerImage src={logo} alt={m.marca} className="h-10 w-auto max-w-[140px] object-contain" />
    ) : (
      <span className="whitespace-nowrap text-lg font-black uppercase tracking-tight md:text-xl">
        {m.marca}
      </span>
    );
    const cls =
      "flex h-20 shrink-0 snap-start items-center justify-center rounded-2xl px-6 ring-1 ring-black/5 transition hover:shadow-md";
    return copia ? (
      <span
        key={`c-${m.slug}`}
        aria-hidden
        className={cls}
        style={{ background: `color-mix(in srgb, ${texto} 4%, ${fundo})` }}
      >
        {conteudo}
      </span>
    ) : (
      <Lk
        key={m.slug}
        to={`/repuestos/${m.slug}`}
        className={cls}
        style={{ background: `color-mix(in srgb, ${texto} 4%, ${fundo})` }}
      >
        {conteudo}
      </Lk>
    );
  };
  return (
    <Secao label={txt(c, "titulo", idioma)} style={{ background: fundo, color: texto }}>
      <Titulo c={c} className="mb-4 text-xl font-extrabold md:text-2xl" />
      {c.modo === "setas" ? (
        <Trilho label={txt(c, "titulo", idioma)}>{MARCAS_SEO.map((m) => item(m))}</Trilho>
      ) : (
        <div className="ap-ticker overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="ap-ticker-trilho flex w-max gap-3" style={{ ["--ap-dur" as any]: "40s" }}>
            <div className="flex gap-3">{MARCAS_SEO.map((m) => item(m))}</div>
            <div className="flex gap-3">{MARCAS_SEO.map((m) => item(m, true))}</div>
          </div>
        </div>
      )}
    </Secao>
  );
}

// ---------------------------------------------------------------- 8. Oferta relâmpago
export function OfertaRelampagoBloco({ c }: Props) {
  const { idioma } = useT();
  if (vencido(c.ate)) return null;
  const fundo = cor(c.cor_fundo, "#dc2626");
  const texto = cor(c.cor_texto, "#ffffff");
  const filtro = JSON.stringify({
    marca: c.marca || undefined,
    categoria: c.categoria || undefined,
    limit: Math.min(Math.max(Number(c.limit) || 10, 4), 24),
  });
  return (
    <section
      aria-label={txt(c, "titulo", idioma)}
      className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5"
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6"
        style={{
          background: `linear-gradient(90deg, ${fundo}, color-mix(in srgb, ${fundo} 70%, #000))`,
          color: texto,
        }}
      >
        <div>
          <Titulo
            c={c}
            className="flex items-center gap-2 text-xl font-black uppercase tracking-tight md:text-2xl"
          />
          {txt(c, "texto", idioma) && (
            <p className="text-sm opacity-90">{txt(c, "texto", idioma)}</p>
          )}
        </div>
        {c.ate && <Relogio ate={c.ate} claro />}
      </div>
      <div className="bg-white">
        <ProductsCarouselBlock
          title={idioma === "pt" ? "Peças da oferta" : "Repuestos en oferta"}
          config={filtro}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 9. Vitrine em abas
export function AbasProdutosBloco({ c }: Props) {
  const { idioma } = useT();
  const abas = lista(c.abas).filter((a) => txt(a, "rotulo", idioma));
  const [ativa, setAtiva] = useState(0);
  const destaque = cor(c.cor_destaque, "#0b7a3b");
  if (!abas.length) return null;
  const a = abas[Math.min(ativa, abas.length - 1)];
  return (
    <Secao label={txt(c, "titulo", idioma)} className="p-0 md:p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 md:px-6 md:pt-6">
        <Titulo c={c} className="text-xl font-extrabold text-zinc-900 md:text-2xl" />
        <div
          role="tablist"
          className="scrollbar-none -mx-1 flex max-w-full gap-1 overflow-x-auto px-1"
        >
          {abas.map((x, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === ativa}
              onClick={() => setAtiva(i)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition",
                i === ativa ? "text-white shadow" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              )}
              style={i === ativa ? { background: destaque } : undefined}
            >
              {txt(x, "rotulo", idioma)}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel">
        <ProductsCarouselBlock
          key={ativa}
          title={txt(a, "rotulo", idioma)}
          config={JSON.stringify({
            marca: a.marca || undefined,
            categoria: a.categoria || undefined,
            limit: 12,
          })}
        />
      </div>
    </Secao>
  );
}

// ---------------------------------------------------------------- 10. Mosaico
export function MosaicoBloco({ c }: Props) {
  const { idioma } = useT();
  const cartoes = lista(c.cartoes)
    .filter((x) => txt(x, "titulo", idioma))
    .slice(0, 4);
  if (!cartoes.length) return null;
  const layout = String(c.layout || "1+2");
  const grade =
    layout === "4"
      ? "md:grid-cols-4"
      : layout === "3"
        ? "md:grid-cols-3"
        : "md:grid-cols-3 md:grid-rows-2";
  const grande = (i: number) => (layout === "1+2" && i === 0) || (layout === "2+1" && i === 2);
  return (
    <section
      aria-label={idioma === "pt" ? "Destaques" : "Destacados"}
      className={cn("grid grid-cols-2 gap-3", grade)}
    >
      {cartoes.map((x, i) => {
        const fundo = cor(x.cor, "#0b7a3b");
        return (
          <Lk
            key={i}
            to={x.link}
            className={cn(
              "group/m relative flex min-h-36 flex-col justify-end overflow-hidden rounded-2xl p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:min-h-44 md:p-6",
              grande(i) && "col-span-2 md:col-span-2 md:row-span-2 md:min-h-[22rem]",
              layout === "2+1" && i === 2 && "md:col-start-3 md:row-start-1",
            )}
            style={{
              background: `linear-gradient(160deg, color-mix(in srgb, ${fundo} 75%, #fff), ${fundo})`,
            }}
          >
            {x.imagem && (
              <span aria-hidden className="absolute inset-0">
                <BannerImage
                  src={x.imagem}
                  alt=""
                  className="h-full w-full object-cover opacity-40 transition group-hover/m:scale-105"
                />
              </span>
            )}
            <span className="relative">
              <span
                className={cn(
                  "block font-black leading-tight",
                  grande(i) ? "text-2xl md:text-4xl" : "text-lg md:text-xl",
                )}
              >
                {txt(x, "titulo", idioma)}
              </span>
              {txt(x, "texto", idioma) && (
                <span className="mt-1 block text-sm opacity-90">{txt(x, "texto", idioma)}</span>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
                {idioma === "pt" ? "Ver" : "Ver"}{" "}
                <ArrowRight className="h-4 w-4 transition group-hover/m:translate-x-1" />
              </span>
            </span>
          </Lk>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------- 11. Como comprar
export function ComoComprarBloco({ c }: Props) {
  const { idioma } = useT();
  const passos = lista(c.passos)
    .filter((p) => txt(p, "titulo", idioma))
    .slice(0, 4);
  const destaque = cor(c.cor_destaque, "#0b7a3b");
  if (!passos.length) return null;
  return (
    <Secao label={txt(c, "titulo", idioma)}>
      <Titulo c={c} className="mb-5 text-xl font-extrabold text-zinc-900 md:text-2xl" />
      <ol
        className={cn(
          "grid gap-4",
          passos.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {passos.map((p, i) => (
          <li
            key={i}
            className="relative flex gap-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-black/5"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"
              style={{ background: destaque }}
            >
              {i + 1}
            </span>
            <span>
              <span className="block font-extrabold text-zinc-900">{txt(p, "titulo", idioma)}</span>
              <span className="mt-0.5 block text-sm text-zinc-600">{txt(p, "texto", idioma)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Secao>
  );
}

// ---------------------------------------------------------------- 12. Perguntas frequentes (+ FAQPage)
export function FaqBloco({ c }: Props) {
  const { idioma } = useT();
  const perguntas = lista(c.perguntas).filter((q) => txt(q, "p", idioma) && txt(q, "r", idioma));
  if (!perguntas.length) return null;
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: perguntas.map((q) => ({
      "@type": "Question",
      name: txt(q, "p", idioma),
      acceptedAnswer: { "@type": "Answer", text: txt(q, "r", idioma) },
    })),
  };
  return (
    <Secao label={txt(c, "titulo", idioma)}>
      <Titulo c={c} className="mb-3 text-xl font-extrabold text-zinc-900 md:text-2xl" />
      <div className="divide-y rounded-2xl ring-1 ring-black/5">
        {perguntas.map((q, i) => (
          <details key={i} className="group/f px-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-bold text-zinc-900">
              <h3 className="text-[15px]">{txt(q, "p", idioma)}</h3>
              <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400 transition group-open/f:rotate-180" />
            </summary>
            <p className="whitespace-pre-line pb-4 text-sm leading-relaxed text-zinc-600">
              {txt(q, "r", idioma)}
            </p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }}
      />
    </Secao>
  );
}

// ---------------------------------------------------------------- 13. Texto SEO
// Marcação mínima e segura: **negrito**, [texto](link), linha em branco = parágrafo
function TextoRico({ texto }: { texto: string }) {
  const { href } = useT();
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const partes = (p: string) =>
    p
      .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
      .filter(Boolean)
      .map((s, i) => {
        const b = s.match(/^\*\*([^*]+)\*\*$/);
        if (b) return <strong key={i}>{b[1]}</strong>;
        const l = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (l) {
          const u = linkSeguro(l[2]);
          if (!u) return <span key={i}>{l[1]}</span>;
          return (
            <a
              key={i}
              href={/^https?:/i.test(u) ? u : href(u)}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {l[1]}
            </a>
          );
        }
        return <span key={i}>{s}</span>;
      });
  return (
    <>
      {paragrafos.map((p, i) => (
        <p key={i} className="mt-3 first:mt-0">
          {partes(p)}
        </p>
      ))}
    </>
  );
}
export function TextoSeoBloco({ c }: Props) {
  const { idioma } = useT();
  const [aberto, setAberto] = useState(false);
  const texto = txt(c, "texto", idioma);
  if (!texto) return null;
  const recolher = c.recolher !== false;
  return (
    <Secao label={txt(c, "titulo", idioma)}>
      <Titulo c={c} className="mb-3 text-lg font-extrabold text-zinc-900 md:text-xl" />
      <div
        className={cn(
          "relative text-sm leading-relaxed text-zinc-600",
          recolher && !aberto && "max-h-24 overflow-hidden",
        )}
      >
        <TextoRico texto={texto} />
        {recolher && !aberto && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white"
          />
        )}
      </div>
      {recolher && (
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="mt-2 text-sm font-bold text-primary hover:underline"
          aria-expanded={aberto}
        >
          {aberto
            ? idioma === "pt"
              ? "Ler menos"
              : "Leer menos"
            : idioma === "pt"
              ? "Ler mais"
              : "Leer más"}
        </button>
      )}
    </Secao>
  );
}

// ---------------------------------------------------------------- 14. Chamada para ação
export function CtaFaixaBloco({ c }: Props) {
  const { idioma } = useT();
  const fundo = cor(c.cor_fundo, "#0b7a3b");
  const texto = cor(c.cor_texto, "#ffffff");
  const destaque = cor(c.cor_destaque, "#25D366");
  const rotulo = txt(c, "botao", idioma);
  const botaoCls =
    "inline-flex shrink-0 items-center gap-2 rounded-xl px-6 py-3.5 text-base font-extrabold text-white shadow-lg transition hover:brightness-110";
  return (
    <section
      aria-label={txt(c, "titulo", idioma)}
      className="relative overflow-hidden rounded-2xl shadow-sm"
      style={{ background: fundo, color: texto }}
    >
      {c.imagem && (
        <span aria-hidden className="absolute inset-0">
          <BannerImage src={c.imagem} alt="" className="h-full w-full object-cover opacity-25" />
        </span>
      )}
      <div className="relative flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <Titulo c={c} className="text-2xl font-black md:text-3xl" />
          {txt(c, "texto", idioma) && <p className="mt-1 opacity-90">{txt(c, "texto", idioma)}</p>}
        </div>
        {rotulo &&
          (c.destino === "link" ? (
            <Lk to={c.link} className={botaoCls} style={{ background: destaque }}>
              {rotulo} <ArrowRight className="h-5 w-5" />
            </Lk>
          ) : (
            // Mesmo caminho das cotações: sem conta, o pop-up pede o cadastro antes
            <a
              href={whatsappContactUrl(txt(c, "titulo", idioma))}
              target="_blank"
              rel="noreferrer noopener"
              className={botaoCls}
              style={{ background: destaque }}
            >
              <MessageCircle className="h-5 w-5" /> {rotulo}
            </a>
          ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 15. Busca por modelo de trator
export function ModelosTratorBloco({ c }: Props) {
  const { idioma, href } = useT();
  const modelos = lista(c.modelos).filter((m) => m.rotulo);
  const destaque = cor(c.cor_destaque, "#0b7a3b");
  if (!modelos.length) return null;
  return (
    <Secao label={txt(c, "titulo", idioma)}>
      <Titulo c={c} className="mb-4 text-xl font-extrabold text-zinc-900 md:text-2xl" />
      <ul className="flex flex-wrap gap-2">
        {modelos.map((m, i) => (
          <li key={i}>
            <a
              href={`${href("/loja")}?q=${encodeURIComponent(String(m.busca || m.rotulo))}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-50 px-4 py-2.5 text-sm font-bold text-zinc-800 ring-1 ring-black/5 transition hover:bg-[var(--d)] hover:text-white"
              style={{ ["--d" as any]: destaque }}
            >
              <Wrench className="h-4 w-4" /> {m.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </Secao>
  );
}

// ---------------------------------------------------------------- despacho
export function BlocoNovo({
  tipo,
  config,
  prioridade,
}: {
  tipo: string;
  config: string | null;
  prioridade?: boolean;
}) {
  let c: C = {};
  try {
    c = config ? JSON.parse(config) : {};
  } catch {
    c = {};
  }
  const props = { c, prioridade };
  switch (tipo) {
    case "TICKER":
      return <TickerBloco {...props} />;
    case "FITA_PROMO":
      return <FitaPromoBloco {...props} />;
    case "HERO_DIVIDIDO":
      return <HeroDivididoBloco {...props} />;
    case "HERO_BUSCA":
      return <HeroBuscaBloco {...props} />;
    case "HERO_NUMEROS":
      return <HeroNumerosBloco {...props} />;
    case "SLIDE_CATEGORIAS":
      return <SlideCategoriasBloco {...props} />;
    case "SLIDE_MARCAS":
      return <SlideMarcasBloco {...props} />;
    case "OFERTA_RELAMPAGO":
      return <OfertaRelampagoBloco {...props} />;
    case "ABAS_PRODUTOS":
      return <AbasProdutosBloco {...props} />;
    case "MOSAICO":
      return <MosaicoBloco {...props} />;
    case "COMO_COMPRAR":
      return <ComoComprarBloco {...props} />;
    case "FAQ":
      return <FaqBloco {...props} />;
    case "TEXTO_SEO":
      return <TextoSeoBloco {...props} />;
    case "CTA_FAIXA":
      return <CtaFaixaBloco {...props} />;
    case "MODELOS_TRATOR":
      return <ModelosTratorBloco {...props} />;
    default:
      return null;
  }
}
