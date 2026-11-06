// App instalável (PWA) no navegador: service worker, botão de instalar e notificações push.
// O service worker é public/sw.js; o servidor das notificações, src/lib/push.server.ts.
import { visitanteAtual } from "./visitante";

type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

let pedidoInstalar: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());
export const aoMudarApp = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};

export const ehIos = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPad novo se apresenta como Mac
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export const abertoComoApp = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true);

// Android/computador: o navegador avisa que dá para instalar; guardamos para o nosso botão
export const podeInstalar = () => !!pedidoInstalar;

// Como este aparelho instala o app (decide o botão e o texto da barra e da página /app)
export type Plataforma =
  | "app" // já está aberto pelo app instalado
  | "instalavel" // Android/computador com o pedido de instalação do navegador pronto
  | "ios_safari" // iPhone/iPad no Safari: Compartilhar → Adicionar à Tela de Início
  | "ios_outro" // iPhone em outro navegador (Chrome, Instagram…): abrir no Safari
  | "android" // Android sem o pedido (Instagram/Facebook por dentro, Firefox…): menu do navegador
  | "computador"; // computador sem o pedido (Firefox, Safari): QR code para o celular

export function plataforma(): Plataforma {
  if (typeof window === "undefined") return "computador";
  if (abertoComoApp()) return "app";
  if (pedidoInstalar) return "instalavel";
  const ua = navigator.userAgent;
  if (ehIos())
    return /CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|Line\//i.test(ua) ? "ios_outro" : "ios_safari";
  if (/android/i.test(ua)) return "android";
  return "computador";
}

// Navegador dentro do Instagram/Facebook: não instala; a pessoa precisa abrir no navegador
export const navegadorDeApp = () =>
  typeof navigator !== "undefined" &&
  /Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(navigator.userAgent);

// Memória do aparelho: já instalou (nunca mais oferece) e quando fechou a oferta
const INSTALADO = "ap_app_instalado";
const FECHOU = "ap_app_fechou";
const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* modo privado */
  }
};
export const jaInstalou = () => ler(INSTALADO) === "1" || abertoComoApp();
export const marcarFechou = () => gravar(FECHOU, String(Date.now()));
export const fechouHaPouco = (dias = 21) =>
  Date.now() - Number(ler(FECHOU) || 0) < dias * 86400_000;

// De onde veio a instalação (barra, página /app, rodapé): vai junto no evento "instalou"
let origemInstalar = "navegador";
export async function instalar(origem: string): Promise<"aceito" | "recusado" | "indisponivel"> {
  const p = pedidoInstalar;
  if (!p) return "indisponivel";
  origemInstalar = origem;
  pedidoInstalar = null;
  avisar();
  await p.prompt();
  const r = await p.userChoice.catch(() => ({ outcome: "dismissed" }));
  return r.outcome === "accepted" ? "aceito" : "recusado";
}

let iniciado = false;
export function iniciarApp(aoInstalar: (origem: string) => void) {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  if (abertoComoApp()) gravar(INSTALADO, "1");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // o nosso botão (barra, página /app, rodapé) mostra na hora certa
    pedidoInstalar = e as EventoInstalar;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    pedidoInstalar = null;
    gravar(INSTALADO, "1");
    aoInstalar(origemInstalar);
    avisar();
  });
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* navegador sem suporte ou bloqueado: o site segue normal */
    });
}

// ---------- Notificações ----------
export type EstadoAvisos = "indisponivel" | "instalar_ios" | "negado" | "ativo" | "pode";

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (typeof window === "undefined") return "indisponivel";
  // iPhone: notificação só no app instalado (iOS 16.4+)
  if (ehIos() && !abertoComoApp()) return "instalar_ios";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "indisponivel";
  if (Notification.permission === "denied") return "negado";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "ativo" : "pode";
}

const base64ParaBytes = (b64: string) => {
  const s = atob(
    (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"),
  );
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

const aparelho = () => {
  const ua = navigator.userAgent;
  const so = /android/i.test(ua)
    ? "Android"
    : ehIos()
      ? "iOS"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac/i.test(ua)
          ? "Mac"
          : "Outro";
  return `${so}${abertoComoApp() ? " · app" : ""}`;
};

// Pede a permissão (só depois de um toque da pessoa) e inscreve o aparelho
export async function ativarAvisos(idioma: "es" | "pt"): Promise<EstadoAvisos> {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "negado" : "pode";
  const reg = await navigator.serviceWorker.ready;
  const r = await fetch("/api/public/push");
  const { chave } = await r.json();
  if (!chave) throw new Error("sem chave");
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ParaBytes(chave),
    }));
  const res = await fetch("/api/public/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acao: "inscrever",
      inscricao: sub.toJSON(),
      idioma,
      visitorId: visitanteAtual().visitorId,
      aparelho: aparelho(),
    }),
  });
  if (!res.ok) throw new Error("falhou");
  return "ativo";
}

export async function desativarAvisos(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/public/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao: "cancelar", inscricao: sub.toJSON() }),
  }).catch(() => null);
  await sub.unsubscribe().catch(() => false);
}

// Logou depois de ativar: liga a inscrição deste aparelho à conta (o servidor lê a sessão)
export async function renovarInscricao(idioma: "es" | "pt") {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/public/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acao: "inscrever",
      inscricao: sub.toJSON(),
      idioma,
      visitorId: visitanteAtual().visitorId,
      aparelho: aparelho(),
    }),
  }).catch(() => null);
}

// ---------- Oferta do app na hora certa ----------
// Momentos em que a barra "Instale o app" pode aparecer (src/components/AppInstalavel.tsx)
export type MotivoOferta = "visita_repetida" | "whatsapp" | "aviso_preco" | "cadastro";
export const EVENTO_OFERTA = "ap:oferta-app";
export function ofertarApp(motivo: MotivoOferta) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(EVENTO_OFERTA, { detail: motivo }));
}
