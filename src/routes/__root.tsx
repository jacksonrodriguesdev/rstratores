import { SITE_URL } from "@/lib/site";
import { scriptsMarketing, metasVerificacao } from "@/lib/marketing";
import { getMarketingPublicoFn } from "@/lib/marketing-admin";
import { campanhaPublicaFn } from "@/lib/campanhas";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  idiomaDoCaminho,
  useT,
  useIdioma,
  HREFLANG,
  OG_LOCALE,
  tr,
  type Idioma,
} from "@/lib/idioma";

import appCss from "../styles.css?url";
import { FloatingContact } from "@/components/FloatingContact";
import { VisitTracker } from "@/components/VisitTracker";
import { PopupAcesso } from "@/components/PopupAcesso";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SugestaoIdioma } from "@/components/SugestaoIdioma";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  const { t } = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {t("Página no encontrada", "Página não encontrada")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "La página que buscás no existe o cambió de lugar. Probá buscar el repuesto en el catálogo.",
            "A página que você procura não existe ou mudou de lugar. Tente buscar a peça no catálogo.",
          )}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("Volver al inicio", "Voltar ao início")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t, href } = useT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("La página no cargó", "A página não carregou")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Tuvimos un problema. Probá recargar o volver al inicio.",
            "Tivemos um problema. Tente recarregar ou voltar ao início.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("Reintentar", "Tentar de novo")}
          </button>
          <a
            href={href("/")}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("Volver al inicio", "Voltar ao início")}
          </a>
        </div>
      </div>
    </div>
  );
}

const caminhoDe = (href: string) => {
  try {
    return new URL(href, "http://x").pathname;
  } catch {
    return "/";
  }
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient; idioma?: Idioma }>()({
  // Idioma da página ("/pt/..." = português), disponível para o head() de todas as rotas
  beforeLoad: ({ location }) => ({
    idioma: idiomaDoCaminho(caminhoDe(location.publicHref)) as Idioma,
  }),
  // IDs das tags de marketing (Marketing → Integrações): lidos uma vez e guardados por 5 min
  // Campanha no ar (Black Friday…): barra de contagem, tema black. ?ver_campanha=pre|black = prévia
  // (só para o admin)
  loaderDeps: ({ search }) => ({ ver: (search as Record<string, unknown>).ver_campanha }),
  loader: async ({ deps }) => {
    const ver = String(deps.ver ?? "").toUpperCase();
    const [mkt, campanha] = await Promise.all([
      getMarketingPublicoFn().catch(() => null),
      campanhaPublicaFn({
        data: { previa: ver === "PRE" || ver === "BLACK" ? ver : undefined },
      }).catch(() => null),
    ]);
    return { mkt, campanha };
  },
  staleTime: 5 * 60_000,
  head: ({ loaderData, match }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const t = (es: string, pt: string) => tr(idioma, es, pt);
    const titulo = t(
      "AGRO PARTS — Repuestos para tractores en Uruguay",
      "AGRO PARTS — Peças para tratores com envio para todo o Rio Grande do Sul",
    );
    const resumo = t(
      "Repuestos para tractores y cosechadoras. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
      "Peças para tratores e colheitadeiras. Envio para todo o Rio Grande do Sul por Correios ou transportadora. Orçamento pelo WhatsApp.",
    );
    return {
      meta: [
        { charSet: "utf-8" },
        ...metasVerificacao(loaderData?.mkt),
        // viewport-fit=cover: usa a tela inteira no iPhone (com pb-safe/pt-safe nas barras)
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        // Aparência de aplicativo: cor da barra do navegador e instalação na tela inicial
        { name: "theme-color", content: "#2e7d32" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "apple-mobile-web-app-title", content: "AGRO PARTS" },
        { title: titulo },
        {
          name: "description",
          content: t(
            "Repuestos para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New Holland, Case IH y Ford. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
            "Peças para tratores e colheitadeiras Massey Ferguson, Valtra, John Deere, New Holland, Case IH e Ford. Envio para todo o Rio Grande do Sul. Orçamento pelo WhatsApp.",
          ),
        },
        { property: "og:locale", content: OG_LOCALE[idioma] },
        { property: "og:locale:alternate", content: OG_LOCALE[idioma === "pt" ? "es" : "pt"] },
        { property: "og:site_name", content: "AGRO PARTS" },
        { name: "author", content: "AGRO PARTS" },
        { property: "og:title", content: titulo },
        { property: "og:description", content: resumo },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: titulo },
        { name: "twitter:description", content: resumo },
        { property: "og:image", content: `${SITE_URL}/icon-512.png` },
        { name: "twitter:image", content: `${SITE_URL}/icon-512.png` },
      ],
      scripts: scriptsMarketing(loaderData?.mkt),
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
        { rel: "icon", href: "/favicon-48.png", type: "image/png", sizes: "48x48" },
        // O Google mostra o ícone nos resultados (pede múltiplo de 48 px; maior fica mais nítido)
        { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        // Fonte do próprio site: o arquivo latino já começa a baixar junto com o HTML
        {
          rel: "preload",
          href: "/fonts/plus-jakarta-sans-latin.woff2",
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const idioma = useIdioma();
  // Campanha com tema black: o site inteiro troca as cores (styles.css, html[data-tema="black"])
  const tema = useRouterState({
    select: (s): string | undefined =>
      (s.matches.find((m) => m.routeId === "__root__")?.loaderData as any)?.campanha?.tema,
  }) as string | undefined;
  const admin = useRouterState({ select: (s) => s.location.pathname.startsWith("/admin") });
  return (
    <html
      lang={HREFLANG[idioma]}
      translate="no"
      data-tema={tema === "black" && !admin ? "black" : undefined}
    >
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { SegmentProvider } from "@/components/SegmentContext";
import { CartProvider } from "@/components/CartContext";
import { CartDrawer } from "@/components/CartDrawer";

// Rodapé e WhatsApp flutuante só no site público (o admin tem layout próprio).
function RodapePublico() {
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  // Admin tem layout próprio; login, cadastro e o visualizador de catálogos são telas cheias, sem rodapé
  if (
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname.startsWith("/catalogos/ver/")
  )
    return null;
  return (
    <>
      <SiteFooter />
      <FloatingContact />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  // Etiqueta de envio: página de impressão, sem nada do site em volta
  const etiqueta = /^(\/pt)?\/etiqueta\//.test(pathname);
  // Avaliação pelo QR: sem pop-up de cadastro nem sugestão de idioma por cima do formulário
  const avaliar = /^(\/pt)?\/avaliar\//.test(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <SegmentProvider>
        <CartProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          {!etiqueta && (
            <>
              <RodapePublico />
              <MobileTabBar />
              <VisitTracker />
              {!avaliar && <PopupAcesso />}
              {!avaliar && <SugestaoIdioma />}
            </>
          )}
          <CartDrawer />
          {/* Notificações (toast) usadas no admin e no site */}
          <Toaster richColors position="top-center" />
        </CartProvider>
      </SegmentProvider>
    </QueryClientProvider>
  );
}
