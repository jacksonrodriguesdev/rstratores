// «Mandá una foto de la pieza»: para quem não sabe o código. Foto + modelo do trator + nome e
// WhatsApp → fica em Admin → Cotações (com a foto) e abre o WhatsApp com a mensagem e o link da
// foto. Conta como lead (cotação) no painel e no Meta. Abre de qualquer lugar com abrirFotoPieza().
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Send, X } from "lucide-react";
import { useT } from "@/lib/idioma";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { reduzirImagem } from "@/lib/reduzir-imagem";
import { registrarEvento } from "@/lib/eventos";
import { cn } from "@/lib/utils";

const EVENTO = "abrir-foto-pieza";
export function abrirFotoPieza() {
  window.dispatchEvent(new Event(EVENTO));
}

// Botão para colocar em qualquer lugar (cabeçalho, busca sem resultado, página da peça)
export function BotaoFotoPieza({ className, texto }: { className?: string; texto?: string }) {
  const { t } = useT();
  return (
    <button type="button" onClick={abrirFotoPieza} className={className}>
      <Camera className="h-4 w-4" />{" "}
      {texto ?? t("Mandá una foto de la pieza", "Mande uma foto da peça")}
    </button>
  );
}

export function FotoPiezaModal() {
  const { t, idioma } = useT();
  const [aberto, setAberto] = useState(false);
  const [foto, setFoto] = useState<{ arq: File; url: string } | null>(null);
  const [modelo, setModelo] = useState("");
  const [nome, setNome] = useState("");
  const [zap, setZap] = useState("");
  const [obs, setObs] = useState("");
  const [site, setSite] = useState(""); // campo escondido (robôs)
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState<string | null>(null);
  const arq = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const abrir = () => {
      setAberto(true);
      setErro("");
      setFeito(null);
    };
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);
  useEffect(
    () => () => {
      if (foto) URL.revokeObjectURL(foto.url);
    },
    [foto],
  );

  if (!aberto) return null;
  const fechar = () => setAberto(false);
  const enviar = async () => {
    setErro("");
    if (!foto)
      return setErro(t("Sacá o elegí una foto de la pieza.", "Tire ou escolha uma foto da peça."));
    if (!modelo.trim())
      return setErro(t("Escribí el modelo del tractor.", "Escreva o modelo do trator."));
    if (!nome.trim()) return setErro(t("Escribí tu nombre.", "Escreva seu nome."));
    if (zap.replace(/\D/g, "").length < 8)
      return setErro(t("Escribí tu WhatsApp.", "Escreva seu WhatsApp."));
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("nome", nome.trim());
      fd.append("whatsapp", zap.trim());
      fd.append("endereco", t("Foto de pieza (sitio)", "Foto da peça (site)"));
      fd.append(
        "mensagem",
        `📷 ${t("Foto de pieza", "Foto da peça")}\n${t("Tractor", "Trator")}: ${modelo.trim()}${obs.trim() ? `\n${obs.trim()}` : ""}\n${t("Idioma", "Idioma")}: ${idioma}`,
      );
      fd.append("site", site);
      fd.append("file", foto.arq);
      const r = await fetch("/api/public/quotes", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || t("No se pudo enviar.", "Não foi possível enviar."));
      registrarEvento("cotacao", `foto|${modelo.trim()}`.slice(0, 200));
      const link = j.quote?.file_path
        ? `${window.location.origin}/uploads/${j.quote.file_path}`
        : "";
      const msg = t(
        `¡Hola! Soy ${nome.trim()}. Les mandé la foto de una pieza que necesito.\nTractor: ${modelo.trim()}${obs.trim() ? `\n${obs.trim()}` : ""}${link ? `\nFoto: ${link}` : ""}`,
        `Olá! Sou ${nome.trim()}. Enviei a foto de uma peça que preciso.\nTrator: ${modelo.trim()}${obs.trim() ? `\n${obs.trim()}` : ""}${link ? `\nFoto: ${link}` : ""}`,
      );
      const url = whatsappContactUrl(msg);
      setFeito(url);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };
  const campo =
    "w-full rounded-lg border bg-white p-3 text-base outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={fechar}
    >
      <div
        className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("Mandá una foto de la pieza", "Mande uma foto da peça")}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Camera className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-black leading-tight">
              {t("¿No sabés el código? Mandanos una foto", "Não sabe o código? Mande uma foto")}
            </h2>
            <p className="text-sm text-zinc-500">
              {t(
                "Te decimos qué pieza es, el precio y si la tenemos.",
                "A gente diz qual é a peça, o preço e se tem.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label={t("Cerrar", "Fechar")}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {feito ? (
          <div className="mt-5 space-y-3 text-center">
            <p className="text-lg font-bold text-primary">
              {t("¡Listo! Recibimos tu foto.", "Pronto! Recebemos sua foto.")}
            </p>
            <p className="text-sm text-zinc-600">
              {t("Si el WhatsApp no se abrió, tocá acá:", "Se o WhatsApp não abriu, toque aqui:")}
            </p>
            <a
              href={feito}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 font-bold text-white"
            >
              <Send className="h-4 w-4" /> {t("Abrir WhatsApp", "Abrir WhatsApp")}
            </a>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <input
              ref={arq}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const r = await reduzirImagem(f);
                setFoto({ arq: r, url: URL.createObjectURL(r) });
              }}
            />
            <button
              type="button"
              onClick={() => arq.current?.click()}
              className={cn(
                "flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-sm font-bold",
                foto ? "border-primary" : "border-zinc-300 text-zinc-600",
              )}
            >
              {foto ? (
                <img src={foto.url} alt="" className="max-h-48 rounded-lg object-contain" />
              ) : (
                <>
                  <Camera className="h-5 w-5" />{" "}
                  {t("Sacar o elegir foto", "Tirar ou escolher foto")}
                </>
              )}
            </button>
            {foto && (
              <button
                type="button"
                onClick={() => arq.current?.click()}
                className="w-full text-xs font-semibold text-primary"
              >
                {t("Cambiar foto", "Trocar foto")}
              </button>
            )}
            <input
              className={campo}
              value={modelo}
              onChange={(e) => setModelo(e.target.value.slice(0, 120))}
              placeholder={t(
                "Modelo del tractor (ej.: Massey Ferguson 290)",
                "Modelo do trator (ex.: Massey Ferguson 290)",
              )}
            />
            <input
              className={campo}
              value={nome}
              onChange={(e) => setNome(e.target.value.slice(0, 120))}
              placeholder={t("Tu nombre", "Seu nome")}
              autoComplete="name"
            />
            <input
              className={campo}
              value={zap}
              onChange={(e) => setZap(e.target.value.slice(0, 30))}
              placeholder={t("Tu WhatsApp", "Seu WhatsApp")}
              inputMode="tel"
              autoComplete="tel"
            />
            <textarea
              className={campo}
              rows={2}
              value={obs}
              onChange={(e) => setObs(e.target.value.slice(0, 600))}
              placeholder={t("¿Algo más? (opcional)", "Algo mais? (opcional)")}
            />
            {/* Campo escondido contra robôs */}
            <input
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              name="site"
            />
            {erro && <p className="text-sm font-semibold text-red-600">{erro}</p>}
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] p-4 text-base font-black text-white disabled:opacity-60"
            >
              {enviando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {t("Enviar por WhatsApp", "Enviar pelo WhatsApp")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
