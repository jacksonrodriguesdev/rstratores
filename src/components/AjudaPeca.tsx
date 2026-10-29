import { useEffect, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { pedirPrecoWhatsapp } from "@/lib/pedir-cadastro";
import { registrarEvento } from "@/lib/eventos";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { useT } from "@/lib/idioma";

// Balão de ajuda na página da peça: depois de 30 s na mesma peça (com a aba visível), oferece
// confirmar se a peça serve para o trator. Abre o WhatsApp com a peça e o modelo na mensagem
// (pelo mesmo caminho do «pedir preço»: quem não deixou contato vê o pop-up do WhatsApp).
// Uma vez por peça na visita; fechou no X, não aparece mais nesta visita.
const FECHADO = "ajuda_peca_fechada";
const VISTAS = "ajuda_peca_vistas";
const ATRASO = 30_000;

const lerSessao = (k: string) => {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravarSessao = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* modo privado */
  }
};

export function AjudaPeca({ sku, nome, codigo }: { sku: string; nome: string; codigo: string }) {
  const { t, idioma } = useT();
  const [visivel, setVisivel] = useState(false);
  const [modelo, setModelo] = useState("");

  useEffect(() => {
    setVisivel(false);
    setModelo("");
    if (lerSessao(FECHADO)) return;
    const vistas: string[] = JSON.parse(lerSessao(VISTAS) || "[]");
    if (vistas.includes(sku)) return;
    let restante = ATRASO;
    let inicio = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Conta só o tempo com a aba visível (quem trocou de aba não está lendo a peça)
    const mostrar = () => {
      // Pop-up aberto ou a pessoa já pediu pelo WhatsApp nesta página: não incomoda
      if (document.querySelector('[aria-labelledby="popup-acesso-titulo"]')) return;
      // Sugestão de idioma na tela (mesmo canto): espera ela sair
      if (document.querySelector("[data-sugestao-idioma]")) {
        timer = setTimeout(mostrar, 5000);
        return;
      }
      gravarSessao(VISTAS, JSON.stringify([...vistas, sku].slice(-30)));
      setVisivel(true);
      registrarEvento("popup", "ajuda:vista");
    };
    const iniciar = () => {
      inicio = Date.now();
      timer = setTimeout(mostrar, restante);
    };
    const pausar = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      restante = Math.max(0, restante - (Date.now() - inicio));
    };
    const aoMudar = () => (document.visibilityState === "visible" ? iniciar() : pausar());
    // Clicou num WhatsApp da página: já está falando com a gente
    const aoClicar = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a,button");
      if (a && /whatsapp/i.test(a.getAttribute("href") ?? "") && timer) pausar();
    };
    if (document.visibilityState === "visible") iniciar();
    document.addEventListener("visibilitychange", aoMudar);
    document.addEventListener("click", aoClicar, true);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoMudar);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [sku]);

  if (!visivel) return null;

  const fechar = () => {
    gravarSessao(FECHADO, "1");
    setVisivel(false);
    registrarEvento("popup", "ajuda:fechada");
  };
  const abrir = (e?: React.FormEvent) => {
    e?.preventDefault();
    const m = modelo.trim().slice(0, 80);
    const texto = t(
      `¡Hola! ¿Me confirman si esta pieza sirve para mi tractor${m ? ` ${m}` : ""}?\n\n*${nome}*\nCódigo: ${codigo}`,
      `Olá! Vocês confirmam se esta peça serve no meu trator${m ? ` ${m}` : ""}?\n\n*${nome}*\nCódigo: ${codigo}`,
    );
    registrarEvento("popup", m ? "ajuda:clique_modelo" : "ajuda:clique");
    setVisivel(false);
    pedirPrecoWhatsapp(whatsappContactUrl(texto));
  };

  return (
    <div
      role="dialog"
      aria-label={t("Ayuda con la pieza", "Ajuda com a peça")}
      data-ajuda-peca
      className="fixed right-3 z-[45] w-[min(340px,calc(100vw-24px))] animate-in slide-in-from-bottom-4 fade-in duration-300 bottom-[calc(var(--barra-inferior,0px)+76px)] md:bottom-20 md:right-5"
    >
      <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl">
        <button
          onClick={fechar}
          aria-label={t("Cerrar", "Fechar")}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C4B]">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold leading-snug text-zinc-900">
              {t(
                "¿Querés que te confirmemos si sirve para tu tractor?",
                "Quer que a gente confirme se serve no seu trator?",
              )}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {t(
                "Te respondemos por WhatsApp, sin compromiso.",
                "Respondemos pelo WhatsApp, sem compromisso.",
              )}
            </p>
          </div>
        </div>
        <form onSubmit={abrir} className="mt-3 flex gap-2">
          <input
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder={t("Modelo (ej.: MF 290)", "Modelo (ex.: MF 290)")}
            aria-label={t("Modelo de tu tractor (opcional)", "Modelo do seu trator (opcional)")}
            lang={idioma}
            className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/15"
          />
          <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-bold text-white hover:bg-[#1EBE57]">
            <Send className="h-4 w-4" /> {t("Consultar", "Consultar")}
          </button>
        </form>
      </div>
    </div>
  );
}
