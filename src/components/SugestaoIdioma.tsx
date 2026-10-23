import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { BandeiraBrasil, BandeiraUruguay } from "@/components/Bandeiras";
import { useIdioma } from "@/lib/idioma";
import { trocarIdioma } from "@/components/SeletorIdioma";

// Convite para trocar de idioma (sem redirecionar sozinho, que atrapalha o Google e quem
// escolheu de propósito): na versão em espanhol, para quem parece estar no Brasil (navegador
// em português ou fuso horário do Brasil); na versão /pt, para navegador em espanhol.
// Some para sempre depois de escolher um idioma ou fechar.
const ESCOLHIDO = "idioma_escolhido";
const FECHADO = "idioma_sugestao_fechada";
const FUSOS_BR =
  /^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Santarem|Noronha)$/;

const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return "x"; // sem acesso ao armazenamento: não incomoda
  }
};

function pareceBrasil() {
  const linguas = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (linguas.some((l) => /^pt/i.test(l))) return true;
  try {
    return FUSOS_BR.test(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return false;
  }
}
const navegadorEmEspanhol = () => /^es/i.test(navigator.language || "");

export function SugestaoIdioma() {
  const idioma = useIdioma();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (ler(ESCOLHIDO) || ler(FECHADO)) return;
    // Site para o Uruguai: na versão em espanhol não oferece mais o português; na versão /pt,
    // sugere o espanhol para quem tem o navegador em espanhol
    const sugerir = idioma === "pt" && navegadorEmEspanhol();
    // Espera um pouco: não aparece junto com o carregamento da página
    const t = sugerir ? setTimeout(() => setMostrar(true), 2500) : undefined;
    return () => clearTimeout(t);
  }, [idioma]);

  if (!mostrar || pathname.startsWith("/admin") || pathname.startsWith("/catalogos/ver/"))
    return null;

  const fechar = () => {
    try {
      localStorage.setItem(FECHADO, "1");
    } catch {
      /* modo privado */
    }
    setMostrar(false);
  };
  const paraPt = idioma === "es";

  return (
    <div
      role="dialog"
      aria-label={paraPt ? "Ver o site em português" : "Ver el sitio en español"}
      className="fixed inset-x-3 bottom-[calc(var(--barra-inferior,0px)+0.75rem)] z-[90] mx-auto flex max-w-md animate-in slide-in-from-bottom-4 items-center gap-3 rounded-2xl bg-white p-3 pr-2 shadow-2xl ring-1 ring-black/10 md:bottom-5 md:left-5 md:right-auto"
    >
      {paraPt ? (
        <BandeiraBrasil className="h-6 w-9 shrink-0 rounded" />
      ) : (
        <BandeiraUruguay className="h-6 w-9 shrink-0 rounded" />
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold text-zinc-900">
          {paraPt ? "Está no Brasil?" : "¿Estás en Uruguay?"}
        </p>
        <p className="text-xs text-zinc-600">
          {paraPt
            ? "Veja o site em português, com preços em R$ e envio para o Uruguai."
            : "Mirá el sitio en español, con precios en $U y envíos por DAC."}
        </p>
      </div>
      <button
        onClick={() => trocarIdioma(paraPt ? "pt" : "es")}
        className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary/90"
      >
        {paraPt ? "Ver em português" : "Ver en español"}
      </button>
      <button
        onClick={fechar}
        aria-label={paraPt ? "Fechar" : "Cerrar"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
