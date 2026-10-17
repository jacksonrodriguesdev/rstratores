// Cartões de cupom (página /cupones e página da campanha). Cupom "mistério": aparece bloqueado,
// com a contagem até ser revelado (ideia do Repuestos Avenida, que mostrava "MISTERIO").
import { useState } from "react";
import { Copy, Check, Lock, MessageCircle, Truck } from "lucide-react";
import type { CupomPagina } from "@/lib/campanhas";
import { Contagem } from "@/components/campanha/Campanha";
import { useT } from "@/lib/idioma";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const moedaFmt = (v: number, m: string) =>
  m === "BRL"
    ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
    : `$U ${v.toLocaleString("es-UY")}`;

export function CuponsLista({ cupons, escuro }: { cupons: CupomPagina[]; escuro?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cupons.map((c, i) => (
        <CartaoCupom key={c.codigo ?? `m${i}`} c={c} escuro={escuro} />
      ))}
    </div>
  );
}

function CartaoCupom({ c, escuro }: { c: CupomPagina; escuro?: boolean }) {
  const { t, idioma } = useT();
  const [copiado, setCopiado] = useState(false);
  const misterio = !c.codigo;
  const desc = (idioma === "pt" ? c.descricao_pt || c.descricao : c.descricao) ?? "";
  const valor =
    c.tipo === "PERCENT"
      ? `-${c.valor}%`
      : c.tipo === "FRETE"
        ? t("Envío gratis", "Frete grátis")
        : c.valor
          ? `-${moedaFmt(c.valor, c.moeda)}`
          : "";
  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-2xl ring-1",
        escuro
          ? "bg-zinc-900 text-white ring-[#f2c94c]/30"
          : "bg-white text-zinc-900 ring-black/10",
        c.esgotado && "opacity-50",
      )}
    >
      {/* lado do valor, com os "furos" de ticket */}
      <div
        className={cn(
          "relative flex w-28 shrink-0 flex-col items-center justify-center p-3 text-center",
          misterio ? "bg-black" : "bg-[#f2c94c] text-black",
        )}
      >
        {misterio ? (
          <Lock className="h-8 w-8 text-[#f2c94c]" />
        ) : c.tipo === "FRETE" ? (
          <Truck className="h-8 w-8" />
        ) : (
          <span className="text-2xl font-black leading-none">{valor}</span>
        )}
        <span
          aria-hidden
          className={cn(
            "absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full",
            escuro ? "bg-zinc-950" : "bg-zinc-100",
          )}
        />
      </div>
      <div className="min-w-0 flex-1 border-l-2 border-dashed border-current/20 p-4">
        {misterio ? (
          <>
            <p className="font-black uppercase tracking-wide text-[#f2c94c]">
              {t("Cupón misterioso", "Cupom misterioso")}
            </p>
            <p className="mt-1 text-sm opacity-80">{desc || t("Se revela en:", "Revelado em:")}</p>
            {c.revelar_em && (
              // Fundo preto: a contagem é dourada e some em cartão branco
              <div className="mt-2 inline-block rounded-xl bg-black p-1.5">
                <Contagem alvo={c.revelar_em} />
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-bold">
              {valor}
              {desc ? ` · ${desc}` : ""}
            </p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(c.codigo!).catch(() => {});
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className={cn(
                "mt-2 flex w-full items-center justify-between rounded-lg border-2 border-dashed px-3 py-2 font-mono text-lg font-black tracking-widest",
                escuro ? "border-[#f2c94c]/50" : "border-zinc-300",
              )}
              aria-label={t("Copiar código", "Copiar código")}
            >
              {c.codigo}
              {copiado ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 opacity-60" />
              )}
            </button>
            <p className="mt-2 text-xs opacity-70">
              {[
                c.minimo > 0 &&
                  `${t("Compra mínima", "Compra mínima")} ${moedaFmt(c.minimo, c.moeda)}`,
                c.fim &&
                  `${t("Vence", "Vence")} ${new Date(c.fim).toLocaleDateString(idioma === "pt" ? "pt-BR" : "es-UY")}`,
                c.esgotado && t("Agotado", "Esgotado"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {!c.esgotado && (
              <a
                href={whatsappContactUrl(
                  t(
                    `¡Hola! Quiero usar el cupón ${c.codigo} en mi pedido.`,
                    `Olá! Quero usar o cupom ${c.codigo} no meu pedido.`,
                  ),
                )}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#25D366] hover:underline"
              >
                <MessageCircle className="h-4 w-4" /> {t("Usar por WhatsApp", "Usar pelo WhatsApp")}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
