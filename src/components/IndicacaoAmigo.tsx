// Link de indicação (?amigo=AMIGOXXXXX): guarda o código no navegador (60 dias), mostra ao amigo o
// presente (X% na primeira compra) e o código vai junto no pedido pelo WhatsApp.
import { useEffect, useState } from "react";
import { Check, Copy, Gift, X } from "lucide-react";
import { abrirIndicacaoFn } from "@/lib/indicacoes";
import { useT } from "@/lib/idioma";

const CHAVE = "agro_amigo";
const DIAS = 60;
type Amigo = { codigo: string; nome: string; amigoPct: number; ate: number };

export function codigoAmigo(): Amigo | null {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || "null") as Amigo | null;
    return v && v.ate > Date.now() ? v : null;
  } catch {
    return null;
  }
}
// Linha que vai no fim da mensagem do WhatsApp quando há código de amigo
export function linhaAmigo(pt: boolean) {
  const a = codigoAmigo();
  if (!a) return "";
  return pt
    ? `\n\n🎁 Código de indicação: ${a.codigo} (${a.amigoPct}% na primeira compra)`
    : `\n\n🎁 Código de amigo: ${a.codigo} (${a.amigoPct}% en la primera compra)`;
}

export function IndicacaoAmigo() {
  const { t } = useT();
  const [amigo, setAmigo] = useState<Amigo | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const cod = url.searchParams.get("amigo") || url.searchParams.get("ref");
    if (!cod) return;
    // Tira o parâmetro do endereço (não fica em links copiados nem no Google)
    url.searchParams.delete("amigo");
    url.searchParams.delete("ref");
    window.history.replaceState(null, "", url.toString());
    const ja = codigoAmigo();
    if (ja?.codigo === cod.toUpperCase()) {
      setAmigo(ja);
      return;
    }
    abrirIndicacaoFn({ data: { codigo: cod } })
      .then((r) => {
        if (!r) return;
        const a: Amigo = { ...r, ate: Date.now() + DIAS * 86_400_000 };
        try {
          localStorage.setItem(CHAVE, JSON.stringify(a));
        } catch {
          /* navegador sem armazenamento: só mostra o aviso */
        }
        setAmigo(a);
      })
      .catch(() => {});
  }, []);

  if (!amigo) return null;
  return (
    <div className="fixed inset-x-3 bottom-20 z-[90] mx-auto max-w-md rounded-2xl bg-zinc-950 p-4 text-white shadow-2xl md:bottom-6 md:left-6 md:right-auto">
      <button
        type="button"
        onClick={() => setAmigo(null)}
        aria-label={t("Cerrar", "Fechar")}
        className="absolute right-2 top-2 rounded-full p-1 text-zinc-400 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-2 text-sm font-bold text-amber-300">
        <Gift className="h-4 w-4" />
        {amigo.nome
          ? t(`${amigo.nome} te regaló un descuento`, `${amigo.nome} te deu um desconto`)
          : t("Un amigo te regaló un descuento", "Um amigo te deu um desconto")}
      </p>
      <p className="mt-1 text-lg font-black leading-tight">
        {t(`${amigo.amigoPct}% en tu primera compra`, `${amigo.amigoPct}% na sua primeira compra`)}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-base font-bold tracking-widest">
          {amigo.codigo}
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(amigo.codigo);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            } catch {
              /* sem área de transferência */
            }
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-zinc-950"
        >
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiado ? t("Copiado", "Copiado") : t("Copiar", "Copiar")}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {t(
          "El código ya va en tu pedido por WhatsApp.",
          "O código já vai no seu pedido pelo WhatsApp.",
        )}
      </p>
    </div>
  );
}
