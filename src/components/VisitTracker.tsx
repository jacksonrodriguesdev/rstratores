import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { eventoDoLinkWhatsapp } from "@/lib/eventos";

export function VisitTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip admin & login pages from analytics
    if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return;

    const controller = new AbortController();
    fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || "",
      }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});
    return () => controller.abort();
  }, [pathname]);

  // Todo clique em link do WhatsApp vira um evento de interesse (qual peça, de qual página).
  // O carrinho abre o WhatsApp por window.open e registra o próprio evento.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (a?.href.includes("api.whatsapp.com") && !window.location.pathname.startsWith("/admin")) {
        eventoDoLinkWhatsapp(a.href);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
