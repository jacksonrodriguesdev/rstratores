import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

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

  return null;
}
