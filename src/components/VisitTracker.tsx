import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { eventoDoLinkWhatsapp, PREFIXO_EVENTO } from "@/lib/eventos";
import { dadosVisitante, visitanteAtual } from "@/lib/visitante";
import { paginaVista } from "@/lib/marketing";
import { useIdioma } from "@/lib/idioma";

// Mapa de cliques e rolagem (Admin → Análises): poucos dados, sem nada pessoal
const MAX_CLIQUES = 25; // por página vista
const enviar = (corpo: object) => {
  const dados = JSON.stringify(corpo);
  // sendBeacon sobrevive à troca de página/fechamento da aba
  if (navigator.sendBeacon?.("/api/public/track", new Blob([dados], { type: "application/json" })))
    return;
  fetch("/api/public/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: dados,
    keepalive: true,
  }).catch(() => {});
};
const evento = (tipo: "clique" | "rolagem", dado: string, pagina: string) =>
  enviar({
    path: `${PREFIXO_EVENTO}${tipo}/${encodeURIComponent(dado).slice(0, 170)}`,
    pagina,
    ...visitanteAtual(),
    entrada: false,
  });

// Rótulo curto do que foi clicado: "a:Ver catálogo", "button:Comprar pelo WhatsApp"
function rotulo(alvo: HTMLElement | null) {
  const el = alvo?.closest?.(
    "a,button,[role=button],input,select,textarea,summary,label",
  ) as HTMLElement | null;
  if (!el) return alvo?.tagName?.toLowerCase() ?? "?";
  const texto = (
    el.getAttribute("aria-label") ||
    el.innerText ||
    (el as HTMLInputElement).placeholder ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
  return `${el.tagName.toLowerCase()}:${texto.slice(0, 28)}`;
}

export function VisitTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const idioma = useIdioma();
  const primeira = useRef(true);
  const cliques = useRef(0);
  const rolagem = useRef(0);

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
      // language: "es:es-UY" / "pt:pt-BR" = idioma do site + idioma do navegador (Admin → Análises)
      body: JSON.stringify({
        path: pathname,
        ...v,
        language: `${idioma}:${v.language}`.slice(0, 20),
      }),
      keepalive: true,
    }).catch(() => {});

    // Rolagem: a maior profundidade (%) alcançada nesta página, enviada ao sair dela
    cliques.current = 0;
    rolagem.current = 0;
    const medir = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      const pct = alto <= 0 ? 100 : Math.min(100, Math.round(((window.scrollY + 1) / alto) * 100));
      if (pct > rolagem.current) rolagem.current = pct;
    };
    const t = setTimeout(medir, 800);
    let pendente = false;
    const onScroll = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        pendente = false;
        medir();
      });
    };
    const pagina = pathname;
    let enviado = false;
    const sair = () => {
      if (enviado) return;
      enviado = true;
      evento("rolagem", `${pagina}|${rolagem.current}`, pagina);
    };
    const onVis = () => document.visibilityState === "hidden" && sair();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", sair);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", sair);
      document.removeEventListener("visibilitychange", onVis);
      sair(); // trocou de página dentro do site
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Todo clique em link do WhatsApp vira um evento de interesse (qual peça, de qual página).
  // O carrinho abre o WhatsApp por window.open e registra o próprio evento.
  // Também: posição de cada clique (% da largura e da altura da página) para o mapa de cliques.
  const caminho = useRef(pathname);
  caminho.current = pathname;
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      const p = caminho.current;
      if (p.startsWith("/admin") || p.startsWith("/login")) return;
      // Botões que exigem cadastro (data-cadastro) registram o pedido só quando o WhatsApp abre
      if (a?.href.includes("api.whatsapp.com") && !a.dataset.cadastro) eventoDoLinkWhatsapp(a.href);
      if (cliques.current >= MAX_CLIQUES) return;
      cliques.current++;
      const x = Math.round((e.clientX / Math.max(1, window.innerWidth)) * 100);
      const y = Math.round(
        ((e.clientY + window.scrollY) / Math.max(1, document.documentElement.scrollHeight)) * 100,
      );
      const tela = window.innerWidth < 768 ? "m" : "d"; // celular ou computador
      evento("clique", `${p}|${x}|${y}|${tela}|${rotulo(e.target as HTMLElement)}`, p);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
