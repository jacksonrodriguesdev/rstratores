import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Flame, Bell, Users, MessageCircle, LifeBuoy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AvisosPreco } from "@/components/admin/AvisosPreco";
import { VisitantesQuentes } from "@/components/admin/VisitantesQuentes";
import { resumoCapturaFn } from "@/lib/captura";
import { cn } from "@/lib/utils";

type Busca = { aba?: "quentes" | "avisos" };
export const Route = createFileRoute("/admin/captura")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    aba: s.aba === "avisos" ? "avisos" : undefined,
  }),
  component: Captura,
});

const n = (v: number) => v.toLocaleString("pt-BR");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

// Captação de visitantes: quem chega, se interessa e não deixa contato. Junta os visitantes
// quentes (anônimos que viram várias peças), os avisos de preço da página da peça e os números do
// pop-up do WhatsApp e do balão de ajuda.
function Captura() {
  const busca = Route.useSearch();
  const [aba, setAba] = useState<"quentes" | "avisos">(busca.aba ?? "quentes");
  const { data: r } = useQuery({ queryKey: ["resumo-captura"], queryFn: () => resumoCapturaFn() });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Flame className="h-6 w-6 text-primary" /> Captação de visitantes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quem se interessa e ainda não deixou contato: de onde vem, o que olha e quantos viram
          contato pelo pop-up do WhatsApp, pelo balão de ajuda e pelo aviso de preço.
        </p>
      </div>

      {r && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              [
                MessageCircle,
                "Deixaram o WhatsApp (pop-up)",
                r.popupWhatsapp,
                `${pct(r.popupWhatsapp, r.popupVisto)} de quem viu o pop-up`,
                "/admin/popup",
              ],
              [
                LifeBuoy,
                "Balão de ajuda: viram",
                r.ajudaVista,
                `${n(r.ajudaFechada)} fecharam`,
                null,
              ],
              [
                MessageCircle,
                "Balão: foram ao WhatsApp",
                r.ajudaClique,
                `${pct(r.ajudaClique, r.ajudaVista)} · ${n(r.ajudaModelo)} com o modelo`,
                null,
              ],
              [Users, "Viram o pop-up", r.popupVisto, "por interesse ou por tempo", "/admin/popup"],
            ] as const
          ).map(([I, rotulo, v, sub, link]) => (
            <Card key={rotulo} className="p-4">
              <I className="h-4 w-4 text-primary" />
              <p className="mt-1 text-2xl font-bold">{v == null ? "—" : n(v)}</p>
              <p className="text-xs text-muted-foreground">{rotulo}</p>
              <p className="text-[11px] text-muted-foreground/80">
                {link ? (
                  <Link to={link} className="underline">
                    {sub}
                  </Link>
                ) : (
                  sub
                )}
              </p>
            </Card>
          ))}
        </div>
      )}
      <p className="-mt-3 text-xs text-muted-foreground">Últimos 30 dias.</p>

      <div className="flex flex-wrap gap-1 rounded-xl border bg-muted/40 p-1">
        {(
          [
            ["quentes", "Visitantes quentes", Flame],
            ["avisos", "Avisos de preço", Bell],
          ] as const
        ).map(([k, rotulo, I]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold",
              aba === k
                ? "bg-background text-primary shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <I className="h-4 w-4" /> {rotulo}
          </button>
        ))}
      </div>
      {aba === "quentes" ? <VisitantesQuentes /> : <AvisosPreco />}
    </div>
  );
}
