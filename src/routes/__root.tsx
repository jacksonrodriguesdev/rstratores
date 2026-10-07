import { SITE_URL } from "@/lib/site";
import { scriptsMarketing } from "@/lib/marketing";
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

import appCss from "../styles.css?url";
import { FloatingContact } from "@/components/FloatingContact";
import { VisitTracker } from "@/components/VisitTracker";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscás no existe o cambió de lugar. Probá buscar el repuesto en el catálogo.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          La página no cargó
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tuvimos un problema. Probá recargar o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // viewport-fit=cover: usa a tela inteira no iPhone (com pb-safe/pt-safe nas barras)
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      // Aparência de aplicativo: cor da barra do navegador e instalação na tela inicial
      { name: "theme-color", content: "#2e7d32" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AGRO PARTS" },
      { title: "AGRO PARTS — Repuestos para tractores en Uruguay" },
      {
        name: "description",
        content:
          "Repuestos para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New Holland, Case IH y Ford. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
      },
      { property: "og:locale", content: "es_UY" },
      { property: "og:site_name", content: "AGRO PARTS" },
      { name: "author", content: "AGRO PARTS" },
      { property: "og:title", content: "AGRO PARTS — Repuestos para tractores en Uruguay" },
      {
        property: "og:description",
        content:
          "Repuestos para tractores y cosechadoras. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AGRO PARTS — Repuestos para tractores en Uruguay" },
      {
        name: "twitter:description",
        content:
          "Repuestos para tractores y cosechadoras. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp.",
      },
      { property: "og:image", content: `${SITE_URL}/icon-512.png` },
      { name: "twitter:image", content: `${SITE_URL}/icon-512.png` },
    ],
    scripts: scriptsMarketing(),
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es-UY" translate="no">
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
import { LanguageProvider } from "@/components/LanguageContext";
import { CartProvider } from "@/components/CartContext";
import { CartDrawer } from "@/components/CartDrawer";

// Rodapé e WhatsApp flutuante só no site público (o admin tem layout próprio).
function RodapePublico() {
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <SiteFooter />
      <FloatingContact />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SegmentProvider>
          <CartProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <RodapePublico />
            <MobileTabBar />
            <VisitTracker />
            <CartDrawer />
            {/* Notificações (toast) usadas no admin e no site */}
            <Toaster richColors position="top-center" />
          </CartProvider>
        </SegmentProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
