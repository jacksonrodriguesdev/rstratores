// Minha conta → «Recomendá y ganá»: link e código de indicação, compartilhar no WhatsApp,
// cliques, amigos que compraram e os cupons de prêmio.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Gift, Loader2, MessageCircle } from "lucide-react";
import { minhaIndicacaoFn } from "@/lib/indicacoes";
import { useT } from "@/lib/idioma";

export function IndicarAmigo() {
  const { t, idioma } = useT();
  const [copiado, setCopiado] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["minha-indicacao", idioma],
    queryFn: () => minhaIndicacaoFn({ data: { idioma } }),
  });
  if (isLoading)
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Cargando…", "Carregando…")}
      </p>
    );
  if (!data) return null;
  if (!data.ativo)
    return (
      <p className="text-sm text-zinc-600">
        {t("Las recomendaciones están pausadas.", "As indicações estão pausadas.")}
      </p>
    );
  const texto = t(
    `Te recomiendo AGRO PARTS para repuestos de tractor. Con mi código ${data.codigo} tenés ${data.amigoPct}% en tu primera compra: ${data.link}`,
    `Recomendo a AGRO PARTS para peças de trator. Com meu código ${data.codigo} você ganha ${data.amigoPct}% na primeira compra: ${data.link}`,
  );
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-zinc-900">
          <Gift className="h-5 w-5 text-primary" /> {t("Recomendá y ganá", "Indique e ganhe")}
        </h2>
        <p className="text-sm text-zinc-500">
          {t(
            `Tu amigo gana ${data.amigoPct}% en la primera compra y vos ganás un cupón de ${data.premioPct}% cuando él compra.`,
            `Seu amigo ganha ${data.amigoPct}% na primeira compra e você ganha um cupom de ${data.premioPct}% quando ele compra.`,
          )}
        </p>
      </div>
      <div className="rounded-2xl bg-zinc-950 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
          {t("Tu código", "Seu código")}
        </p>
        <p className="font-mono text-3xl font-black tracking-[0.15em]">{data.codigo}</p>
        <p className="mt-2 break-all text-xs text-zinc-400">{data.link}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white"
          >
            <MessageCircle className="h-4 w-4" />{" "}
            {t("Compartir por WhatsApp", "Compartilhar no WhatsApp")}
          </a>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(data.link);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1500);
              } catch {
                /* sem área de transferência */
              }
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold"
          >
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? t("Copiado", "Copiado") : t("Copiar link", "Copiar link")}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 ring-1 ring-black/5">
          <p className="text-2xl font-black">{data.cliques}</p>
          <p className="text-xs text-zinc-500">
            {t("visitas con tu link", "visitas pelo seu link")}
          </p>
        </div>
        <div className="rounded-2xl p-4 ring-1 ring-black/5">
          <p className="text-2xl font-black">{data.premios.length}</p>
          <p className="text-xs text-zinc-500">
            {t("amigos que compraron", "amigos que compraram")}
          </p>
        </div>
      </div>
      {!!data.premios.length && (
        <ul className="space-y-2">
          {data.premios.map((p) => (
            <li
              key={p.cupom}
              className="flex items-center justify-between rounded-xl p-3 ring-1 ring-black/5"
            >
              <span className="font-mono font-bold">{p.cupom}</span>
              <span className="text-xs text-zinc-500">
                {p.usado
                  ? t("usado", "usado")
                  : p.vence
                    ? `${t("vence", "vence")} ${new Date(p.vence).toLocaleDateString(idioma === "pt" ? "pt-BR" : "es-UY")}`
                    : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
