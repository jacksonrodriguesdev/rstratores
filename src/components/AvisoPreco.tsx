import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, Check, Loader2 } from "lucide-react";
import { getSessionFn } from "@/lib/user-auth";
import { visitanteAtual } from "@/lib/visitante";
import { useT } from "@/lib/idioma";

// «Avisame cuando baje el precio» (página da peça). Logado: um toque (avisa no e-mail da conta e no
// sininho). Sem conta: WhatsApp ou e-mail num campo só. Servidor: src/lib/aviso-preco.server.ts.
const chave = (sku: string) => `aviso_preco:${sku}`;

export function AvisoPreco({ sku }: { sku: string }) {
  const { t, idioma } = useT();
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const [aberto, setAberto] = useState(false);
  const [contato, setContato] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<null | "email" | "whatsapp">(null);

  useEffect(() => {
    setAberto(false);
    setErro(null);
    try {
      const v = localStorage.getItem(chave(sku));
      setFeito(v === "email" || v === "whatsapp" ? v : null);
    } catch {
      setFeito(null);
    }
  }, [sku]);

  const enviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const r = await fetch("/api/public/aviso-preco", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-idioma": idioma },
        body: JSON.stringify({
          sku,
          contato: sessao ? "" : contato,
          visitorId: visitanteAtual().visitorId,
          site: (document.getElementById(`aviso-site-${sku}`) as HTMLInputElement | null)?.value,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || t("Algo salió mal.", "Algo deu errado."));
      const canal = j.canal === "whatsapp" ? "whatsapp" : "email";
      try {
        localStorage.setItem(chave(sku), canal);
      } catch {
        /* modo privado */
      }
      setFeito(canal);
      setAberto(false);
    } catch (err: any) {
      setErro(err?.message ?? t("Algo salió mal.", "Algo deu errado."));
    } finally {
      setOcupado(false);
    }
  };

  if (feito)
    return (
      <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        <BellRing className="h-4 w-4 shrink-0" />
        {feito === "whatsapp"
          ? t(
              "Listo: si baja el precio, te avisamos por WhatsApp.",
              "Pronto: se o preço baixar, avisamos pelo WhatsApp.",
            )
          : t(
              "Listo: si baja el precio, te avisamos por e-mail.",
              "Pronto: se o preço baixar, avisamos por e-mail.",
            )}
      </p>
    );

  return (
    <div className="mt-3">
      {!aberto ? (
        <button
          type="button"
          onClick={() => (sessao ? void enviar() : setAberto(true))}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-primary"
        >
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {t("Avisame si baja el precio", "Me avise se o preço baixar")}
        </button>
      ) : (
        <form onSubmit={enviar} className="rounded-xl border bg-white p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
            <Bell className="h-4 w-4 text-primary" />
            {t("Te avisamos si baja el precio", "Avisamos se o preço baixar")}
          </p>
          <input
            id={`aviso-site-${sku}`}
            name="site"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
          <div className="flex gap-2">
            <input
              autoFocus
              required
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder={t("Tu WhatsApp o e-mail", "Seu WhatsApp ou e-mail")}
              aria-label={t("Tu WhatsApp o e-mail", "Seu WhatsApp ou e-mail")}
              autoComplete="tel email"
              className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
            <button
              disabled={ocupado || contato.trim().length < 6}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {ocupado ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t("Avisarme", "Me avise")}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {t(
              "Un solo aviso, sin spam. Vale por 4 meses.",
              "Um só aviso, sem spam. Vale por 4 meses.",
            )}
          </p>
          {erro && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700">
              {erro}
            </p>
          )}
        </form>
      )}
      {erro && !aberto && (
        <p role="alert" className="mt-1 text-center text-sm font-medium text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
