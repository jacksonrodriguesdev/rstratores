import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { eventoDoLinkWhatsapp } from "@/lib/eventos";
import { dadosVisitante } from "@/lib/visitante";
import { paginaVista } from "@/lib/marketing";

export function VisitTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const primeira = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip admin & login pages from analytics
    if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return;

    // A primeira página já conta no próprio Pixel; as seguintes (sem recarregar), aqui
    if (primeira.current) primeira.current = false;
    else paginaVista();

    const v = dadosVisitante(true);
    fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, ...v }),
      keepalive: true,
    }).catch(() => {});
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
