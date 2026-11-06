import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  Download,
  Loader2,
  Share,
  Smartphone,
  SquarePlus,
  X,
} from "lucide-react";
import { getSessionFn } from "@/lib/user-auth";
import { useT } from "@/lib/idioma";
import { registrarEvento } from "@/lib/eventos";
import {
  abertoComoApp,
  aoMudarApp,
  ativarAvisos,
  estadoAvisos,
  EVENTO_OFERTA,
  fechouHaPouco,
  iniciarApp,
  instalar,
  jaInstalou,
  marcarFechou,
  plataforma,
  renovarInscricao,
  type EstadoAvisos,
  type MotivoOferta,
  type Plataforma,
} from "@/lib/app-pwa";

// App instalável (PWA) no site. Tudo no idioma da página: em /pt o app instalado é o português
// (manifest-pt, abre em /pt); no resto, o espanhol. Métricas: eventos "app" em Admin → App e
// notificações (src/lib/push.ts).

// Estado do aparelho, atualizado quando o navegador libera ou consome o pedido de instalação
export function useApp() {
  const [, setN] = useState(0);
  const [avisos, setAvisos] = useState<EstadoAvisos>("indisponivel");
  const [plat, setPlat] = useState<Plataforma>("computador");
  useEffect(() => {
    const atualizar = () => {
      setN((n) => n + 1);
      setPlat(plataforma());
      void estadoAvisos().then(setAvisos);
    };
    atualizar();
    return aoMudarApp(atualizar);
  }, []);
  return { avisos, setAvisos, plat };
}

// ---------- Montado em todas as páginas ----------
// Registra o service worker, mede instalação e abertura pelo app, liga a inscrição de avisos à
// conta e decide quando mostrar a barra "Instale o app".
const SEM_OFERTA = [
  /^\/(pt\/)?(admin|login|cadastro|cuenta|conta|baja|avaliar|pedido|pagar|etiqueta|app)(\/|$)/,
];
const VISITAS = "ap_app_visitas";
const SESSAO = "ap_app_sessao"; // sessionStorage: esta visita já foi contada / já ofereceu

export function AppPwa() {
  const { idioma } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const caminho = useRef(pathname);
  caminho.current = pathname;
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const [motivo, setMotivo] = useState<MotivoOferta | null>(null);

  useEffect(() => {
    iniciarApp((origem) => registrarEvento("app", `instalou:${origem}`));
    let s: string | null = null;
    try {
      s = sessionStorage.getItem(SESSAO);
    } catch {
      /* modo privado */
    }
    if (abertoComoApp() && !s) registrarEvento("app", "abriu_app");
    // Conta as visitas (uma por sessão do navegador)
    let visitas = 0;
    try {
      visitas = Number(localStorage.getItem(VISITAS) || 0);
      if (!s) {
        visitas++;
        localStorage.setItem(VISITAS, String(visitas));
        sessionStorage.setItem(SESSAO, "contada");
      }
    } catch {
      /* modo privado */
    }
    // Voltou ao site (2ª visita em diante): oferece depois de 25 s navegando
    const t = visitas >= 2 ? setTimeout(() => oferecer("visita_repetida"), 25_000) : null;

    // Momentos de interesse: chamou no WhatsApp, pediu aviso de preço, criou a conta
    const aoEvento = (e: Event) => {
      const { tipo, dado } = (e as CustomEvent).detail ?? {};
      if (tipo === "whatsapp" || tipo === "cotacao") setTimeout(() => oferecer("whatsapp"), 4000);
      if (tipo === "popup" && (dado === "cadastro" || dado === "celular"))
        setTimeout(() => oferecer("cadastro"), 8000);
    };
    const aoOferta = (e: Event) => setTimeout(() => oferecer((e as CustomEvent).detail), 1500);
    window.addEventListener("ap:evento", aoEvento);
    window.addEventListener(EVENTO_OFERTA, aoOferta);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("ap:evento", aoEvento);
      window.removeEventListener(EVENTO_OFERTA, aoOferta);
    };
  }, []);

  function oferecer(m: MotivoOferta, tentativa = 0) {
    if (jaInstalou() || fechouHaPouco()) return;
    if (SEM_OFERTA.some((r) => r.test(caminho.current))) return;
    // Computador sem o pedido do navegador: não tem como instalar ali, não incomoda
    if (plataforma() === "computador" || plataforma() === "app") return;
    // Outra janela na tela (sugestão de idioma, pop-up de cadastro…): espera ela sair
    const outra = [...document.querySelectorAll('[role="dialog"], [data-sugestao-idioma]')].some(
      (el) => !el.closest("[data-barra-app]") && el.getBoundingClientRect().height > 0,
    );
    if (outra) {
      if (tentativa < 8) setTimeout(() => oferecer(m, tentativa + 1), 15_000);
      return;
    }
    try {
      if (sessionStorage.getItem(SESSAO) === "ofereceu") return;
      sessionStorage.setItem(SESSAO, "ofereceu");
    } catch {
      /* modo privado */
    }
    setMotivo(m);
    registrarEvento("app", `barra_vista:${m}`);
  }

  const uid = (sessao as any)?.id;
  useEffect(() => {
    if (uid) void renovarInscricao(idioma);
  }, [uid, idioma]);

  return motivo ? <BarraApp motivo={motivo} fechar={() => setMotivo(null)} /> : null;
}

// ---------- Barra "Instale o app" ----------
function BarraApp({ motivo, fechar }: { motivo: MotivoOferta; fechar: () => void }) {
  const { t } = useT();
  const { plat } = useApp();
  const [passos, setPassos] = useState(false);

  const textos: Record<MotivoOferta, [string, string, string, string]> = {
    visita_repetida: [
      "¿Volvés seguido? Tené la tienda a un toque",
      "Volta sempre aqui? Tenha a loja a um toque",
      "Instalá el app gratis y te avisamos cuando baja el precio.",
      "Instale o app grátis e avisamos quando o preço baixar.",
    ],
    whatsapp: [
      "Seguí tus repuestos desde el celular",
      "Acompanhe suas peças pelo celular",
      "Con el app abrís la tienda con un toque y recibís ofertas.",
      "Com o app você abre a loja com um toque e recebe ofertas.",
    ],
    aviso_preco: [
      "Recibí el aviso de precio en el celular",
      "Receba o aviso de preço no celular",
      "Instalá el app y te llega la notificación cuando baje.",
      "Instale o app e a notificação chega quando baixar.",
    ],
    cadastro: [
      "Tu cuenta, ahora en el celular",
      "Sua conta, agora no celular",
      "Instalá el app: entrás con un toque y no perdés tu cupón.",
      "Instale o app: você entra com um toque e não perde seu cupom.",
    ],
  };
  const [tEs, tPt, sEs, sPt] = textos[motivo];
  const sair = (como: "fechou" | "clique") => {
    if (como === "fechou") {
      marcarFechou();
      registrarEvento("app", `barra_fechou:${motivo}`);
    }
    fechar();
  };

  return (
    <div
      role="dialog"
      data-barra-app
      aria-label={t("Instalar el app", "Instalar o app")}
      className="fixed inset-x-3 bottom-[calc(var(--barra-inferior)+0.75rem)] z-[60] mx-auto max-w-md animate-in slide-in-from-bottom-4 rounded-2xl bg-zinc-900 p-4 text-white shadow-2xl ring-1 ring-white/10 md:inset-x-auto md:bottom-6 md:left-6"
    >
      <button
        type="button"
        onClick={() => sair("fechou")}
        aria-label={t("Cerrar", "Fechar")}
        className="absolute right-2 top-2 rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <img
          src="/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl bg-white"
        />
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug">{t(tEs, tPt)}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-300">{t(sEs, sPt)}</p>
        </div>
      </div>
      {passos ? (
        <PassosIos className="mt-3" />
      ) : (
        <div className="mt-3 flex gap-2">
          {plat === "instalavel" ? (
            <BotaoInstalar origem="barra" aoTerminar={() => sair("clique")} className="flex-1" />
          ) : plat === "ios_safari" ? (
            <button
              type="button"
              onClick={() => {
                setPassos(true);
                registrarEvento("app", "barra_clique:" + motivo);
                registrarEvento("app", "instrucoes_ios:barra");
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold"
            >
              <Download className="h-4 w-4" /> {t("Ver cómo instalar", "Ver como instalar")}
            </button>
          ) : (
            <Link
              to="/app"
              onClick={() => {
                registrarEvento("app", "barra_clique:" + motivo);
                fechar();
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold"
            >
              <Download className="h-4 w-4" /> {t("Ver cómo instalar", "Ver como instalar")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => sair("fechou")}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/10"
          >
            {t("Ahora no", "Agora não")}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Peças reaproveitadas (barra, página /app, rodapé) ----------
export function BotaoInstalar({
  origem,
  aoTerminar,
  className = "",
  grande = false,
}: {
  origem: string;
  aoTerminar?: (r: "aceito" | "recusado" | "indisponivel") => void;
  className?: string;
  grande?: boolean;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={async () => {
        registrarEvento("app", `clique_instalar:${origem}`);
        const r = await instalar(origem);
        registrarEvento("app", `instalar:${origem}:${r}`);
        aoTerminar?.(r);
      }}
      className={`flex items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white hover:bg-primary/90 ${grande ? "px-6 py-4 text-base" : "px-3 py-2.5 text-sm"} ${className}`}
    >
      <Download className={grande ? "h-5 w-5" : "h-4 w-4"} />{" "}
      {t("Instalar el app", "Instalar o app")}
    </button>
  );
}

export function PassosIos({
  className = "",
  claro = false,
}: {
  className?: string;
  claro?: boolean;
}) {
  const { t } = useT();
  const cor = claro ? "text-zinc-700" : "text-zinc-200";
  const forte = claro ? "text-zinc-900" : "text-white";
  const passos = [
    [
      <>
        {t("Tocá", "Toque em")} <Share className={`inline h-4 w-4 ${forte}`} />{" "}
        <b className={forte}>{t("Compartir", "Compartilhar")}</b>{" "}
        {t("(abajo, en la barra de Safari)", "(embaixo, na barra do Safari)")}
      </>,
    ],
    [
      <>
        {t("Bajá y elegí", "Role e escolha")} <SquarePlus className={`inline h-4 w-4 ${forte}`} />{" "}
        <b className={forte}>{t("Agregar a inicio", "Adicionar à Tela de Início")}</b>
      </>,
    ],
    [
      <>
        {t("Tocá", "Toque em")} <b className={forte}>{t("Agregar", "Adicionar")}</b>.{" "}
        {t(
          "Listo: el ícono de AGRO PARTS queda en tu pantalla.",
          "Pronto: o ícone da AGRO PARTS fica na sua tela.",
        )}
      </>,
    ],
  ];
  return (
    <ol className={`space-y-2 text-sm leading-relaxed ${cor} ${className}`}>
      {passos.map(([p], i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {i + 1}
          </span>
          <span>{p}</span>
        </li>
      ))}
    </ol>
  );
}

// Botão "Avisar no celular" (aviso de preço…): some quando não dá para usar
export function BotaoAvisos({ origem, className = "" }: { origem: string; className?: string }) {
  const { t, idioma } = useT();
  const { avisos, setAvisos } = useApp();
  const [ocupado, setOcupado] = useState(false);
  if (avisos === "indisponivel" || avisos === "negado" || avisos === "instalar_ios") return null;
  if (avisos === "ativo")
    return (
      <p className={`flex items-center gap-1.5 text-xs font-medium text-emerald-700 ${className}`}>
        <Check className="h-3.5 w-3.5" />
        {t("Avisos activados en este celular.", "Avisos ativados neste celular.")}
      </p>
    );
  return (
    <button
      type="button"
      disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        try {
          const r = await ativarAvisos(idioma);
          setAvisos(r);
          registrarEvento("app", r === "ativo" ? `avisos:${origem}` : `avisos_recusou:${origem}`);
        } catch {
          setAvisos("pode");
        } finally {
          setOcupado(false);
        }
      }}
      className={`flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60 ${className}`}
    >
      {ocupado ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Bell className="h-3.5 w-3.5" />
      )}
      {t("Avisarme también en el celular", "Avisar também no celular")}
    </button>
  );
}

// Botão grande de avisos (página /app, app recém-instalado)
export function AtivarAvisosGrande({ origem }: { origem: string }) {
  const { t, idioma } = useT();
  const { avisos, setAvisos } = useApp();
  const [ocupado, setOcupado] = useState(false);
  if (avisos === "ativo")
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <Check className="h-4 w-4" />{" "}
        {t("Avisos activados en este celular", "Avisos ativados neste celular")}
      </p>
    );
  if (avisos === "negado")
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
        <BellOff className="h-4 w-4" />
        {t(
          "Los avisos están bloqueados. Activalos en los ajustes del celular para AGRO PARTS.",
          "Os avisos estão bloqueados. Ative nos ajustes do celular para a AGRO PARTS.",
        )}
      </p>
    );
  if (avisos !== "pode") return null;
  return (
    <button
      type="button"
      disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        try {
          const r = await ativarAvisos(idioma);
          setAvisos(r);
          registrarEvento("app", r === "ativo" ? `avisos:${origem}` : `avisos_recusou:${origem}`);
        } catch {
          setAvisos("pode");
        } finally {
          setOcupado(false);
        }
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary px-6 py-3.5 text-base font-bold text-primary hover:bg-primary/5 disabled:opacity-60"
    >
      {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <BellRing className="h-5 w-5" />}
      {t("Activar avisos de precio y ofertas", "Ativar avisos de preço e ofertas")}
    </button>
  );
}

// ---------- Rodapé: "Tené AGRO PARTS en tu celular" ----------
export function CartaoApp() {
  const { t, idioma } = useT();
  const { avisos, setAvisos, plat } = useApp();
  const [ocupado, setOcupado] = useState(false);
  const comoApp = plat === "app";
  const podeAvisos = avisos === "pode";
  // Já é app com avisos ligados: nada a oferecer
  if (comoApp && !podeAvisos) return null;

  return (
    <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-white">
        <Smartphone className="h-4 w-4 text-accent" />
        {comoApp
          ? t("Recibí avisos de ofertas", "Receba avisos de ofertas")
          : t("Tené AGRO PARTS en tu celular", "Tenha a AGRO PARTS no celular")}
      </p>
      <p className="mt-1 text-xs leading-relaxed">
        {t(
          "Abrí la tienda con un toque y enterate cuando baja el precio de un repuesto.",
          "Abra a loja com um toque e saiba quando o preço de uma peça baixar.",
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {plat === "instalavel" && <BotaoInstalar origem="rodape" className="text-xs" />}
        {!comoApp && plat !== "instalavel" && (
          <Link
            to="/app"
            onClick={() => registrarEvento("app", "clique_pagina:rodape")}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" /> {t("Descargar el app", "Baixar o app")}
          </Link>
        )}
        {podeAvisos && (
          <button
            type="button"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              try {
                const r = await ativarAvisos(idioma);
                setAvisos(r);
                registrarEvento("app", r === "ativo" ? "avisos:rodape" : "avisos_recusou:rodape");
              } catch {
                setAvisos("pode");
              } finally {
                setOcupado(false);
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {ocupado ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BellRing className="h-3.5 w-3.5" />
            )}
            {t("Activar avisos", "Ativar avisos")}
          </button>
        )}
        {avisos === "ativo" && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <Check className="h-3.5 w-3.5" /> {t("Avisos activados", "Avisos ativados")}
          </span>
        )}
      </div>
    </div>
  );
}
