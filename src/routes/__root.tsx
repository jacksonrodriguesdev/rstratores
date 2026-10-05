import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { FloatingContact } from "@/components/FloatingContact";
import { VisitTracker } from "@/components/VisitTracker";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileTabBar } from "@/components/MobileTabBar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { name: "apple-mobile-web-app-title", content: "RS Trator" },
      { title: "RS Trator Peças — Catálogo de Peças para Tratores" },
      {
        name: "description",
        content:
          "Catálogo completo de peças para tratores Ford, Valmet, Massey Ferguson e outras marcas. Faça sua cotação pelo WhatsApp.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "RS Trator Peças — Catálogo de Peças para Tratores" },
      {
        property: "og:description",
        content:
          "Catálogo completo de peças para tratores Ford, Valmet, Massey Ferguson e outras marcas. Faça sua cotação pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "RS Trator Peças — Catálogo de Peças para Tratores" },
      {
        name: "twitter:description",
        content:
          "Catálogo completo de peças para tratores Ford, Valmet, Massey Ferguson e outras marcas. Faça sua cotação pelo WhatsApp.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8bcfbd86-0bc1-4e3a-8f4e-68ffb7143950/id-preview-ddc31343--76a40171-f760-4a4e-8d75-3af114834768.lovable.app-1784509297468.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8bcfbd86-0bc1-4e3a-8f4e-68ffb7143950/id-preview-ddc31343--76a40171-f760-4a4e-8d75-3af114834768.lovable.app-1784509297468.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
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
    <html lang="pt-BR" translate="no">
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SegmentProvider>
          <CartProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <SiteFooter />
            <MobileTabBar />
            <FloatingContact />
            <VisitTracker />
            <CartDrawer />
          </CartProvider>
        </SegmentProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
