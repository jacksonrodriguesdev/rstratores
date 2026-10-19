import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Filter, Loader2, Repeat, Send, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmailAbas } from "@/components/admin/EmailAbas";
import { criarRemarketingFn, funilEmailsFn, origensFunilFn } from "@/lib/email-marketing";

type Busca = { campanha?: number; automacao?: number };
export const Route = createFileRoute("/admin/emails/funil")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    ...(Number(s.campanha) ? { campanha: Number(s.campanha) } : {}),
    ...(Number(s.automacao) ? { automacao: Number(s.automacao) } : {}),
  }),
  component: Funil,
});

const ETAPAS: Record<string, [string, string]> = {
  enviados: ["Enviados", "e-mails que saíram"],
  entregues: ["Entregues", "chegaram na caixa (sem rebote)"],
  abertos: ["Abriram", "abriram o e-mail"],
  clicados: ["Clicaram", "clicaram em algum link"],
  visitaram: ["Visitaram o site", "entraram pelo e-mail em até 7 dias"],
  whatsapp: ["Chamaram no WhatsApp", "clicaram no WhatsApp do site em até 7 dias"],
  compraram: ["Compraram", "pagaram um link de pagamento em até 14 dias"],
};
const SEGMENTOS = [
  {
    k: "nao_abriu" as const,
    titulo: "Não abriram",
    dica: "Reenvie com outro assunto (o rascunho já vem com «¿Lo viste?»).",
  },
  {
    k: "abriu_nao_clicou" as const,
    titulo: "Abriram e não clicaram",
    dica: "Mude a oferta ou o botão: o assunto chamou, o conteúdo não.",
  },
  {
    k: "clicou_nao_comprou" as const,
    titulo: "Clicaram e não compraram",
    dica: "Os mais quentes: ofereça ajuda pelo WhatsApp ou um cupom.",
  },
];
const n = (v: number) => v.toLocaleString("pt-BR");
const pct = (a: number, b: number) =>
  b ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—";

function Funil() {
  const busca = Route.useSearch();
  const navigate = useNavigate();
  const [dias, setDias] = useState<number | undefined>(
    busca.campanha || busca.automacao ? undefined : 30,
  );
  const [criando, setCriando] = useState<string | null>(null);
  const { data: origens } = useQuery({
    queryKey: ["email-origens"],
    queryFn: () => origensFunilFn(),
  });
  const { data: f, isLoading } = useQuery({
    queryKey: ["email-funil", busca.campanha, busca.automacao, dias],
    queryFn: () =>
      funilEmailsFn({ data: { campanha: busca.campanha, automacao: busca.automacao, dias } }),
  });
  const valor = busca.campanha
    ? `c${busca.campanha}`
    : busca.automacao
      ? `a${busca.automacao}`
      : "";
  const escolhido = !!valor;

  const criar = async (etapa: (typeof SEGMENTOS)[number]["k"]) => {
    setCriando(etapa);
    try {
      const r = await criarRemarketingFn({
        data: { campanha: busca.campanha, automacao: busca.automacao, etapa },
      });
      toast.success("Rascunho de remarketing criado: confira e envie");
      navigate({ to: "/admin/emails/$id", params: { id: String(r.id) } });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao criar");
    } finally {
      setCriando(null);
    }
  };

  const max = f?.etapas[0]?.v || 1;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Filter className="h-6 w-6 text-primary" /> Funil e remarketing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Do envio até a compra. Escolha uma campanha ou automação para criar o reenvio para cada
            grupo de clientes.
          </p>
        </div>
        <EmailAbas atual="funil" />
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <select
          value={valor}
          onChange={(e) => {
            const v = e.target.value;
            setDias(v ? undefined : 30);
            navigate({
              to: "/admin/emails/funil",
              search: v.startsWith("c")
                ? { campanha: Number(v.slice(1)) }
                : v.startsWith("a")
                  ? { automacao: Number(v.slice(1)) }
                  : {},
            });
          }}
          className="h-10 min-w-72 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todos os e-mails</option>
          {!!origens?.campanhas.length && (
            <optgroup label="Campanhas">
              {origens.campanhas.map((c) => (
                <option key={c.id} value={`c${c.id}`}>
                  {c.nome}
                </option>
              ))}
            </optgroup>
          )}
          {!!origens?.automacoes.length && (
            <optgroup label="Automações">
              {origens.automacoes.map((a) => (
                <option key={a.id} value={`a${a.id}`}>
                  {a.nome}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {!escolhido && (
          <div className="flex gap-1.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${dias === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {d} dias
              </button>
            ))}
          </div>
        )}
        {escolhido && (
          <span className="text-xs text-muted-foreground">Todos os envios desse e-mail</span>
        )}
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </Card>

      {f && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="p-5">
            <div className="space-y-1">
              {f.etapas.map((e, i) => {
                const ant = i ? f.etapas[i - 1].v : e.v;
                return (
                  <div key={e.k}>
                    {i > 0 && (
                      <p className="flex items-center gap-1 py-1 pl-2 text-[11px] font-semibold text-muted-foreground">
                        <ArrowDown className="h-3 w-3" /> {pct(e.v, ant)} da etapa anterior
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-40 shrink-0">
                        <p className="text-sm font-semibold">{ETAPAS[e.k][0]}</p>
                        <p className="text-[11px] text-muted-foreground">{ETAPAS[e.k][1]}</p>
                      </div>
                      <div
                        className="relative h-9 flex-1 overflow-hidden rounded-md bg-muted/50"
                        title={`${n(e.v)} · ${pct(e.v, max)} dos enviados`}
                      >
                        <div
                          className="h-full rounded-md bg-primary transition-all"
                          style={{
                            width: `${Math.max(e.v ? 1.5 : 0, (e.v / max) * 100)}%`,
                            opacity: 1 - i * 0.09,
                          }}
                        />
                        <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-foreground mix-blend-normal">
                          <span className="rounded bg-background/85 px-1.5">{n(e.v)}</span>
                        </span>
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                        {pct(e.v, max)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm">
              Vendas atribuídas:{" "}
              <b>
                {Object.entries(f.receita)
                  .map(
                    ([m, v]) =>
                      `${m === "BRL" ? "R$" : "$U"} ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
                  )
                  .join(" + ") || "—"}
              </b>
              {f.rebotes > 0 && (
                <span className="ml-3 text-xs text-muted-foreground">
                  {n(f.rebotes)} rebotes/spam
                </span>
              )}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Repeat className="h-4 w-4 text-primary" /> Remarketing
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Cria um rascunho com o mesmo conteúdo, só para esse grupo. Quem se descadastrou nunca
              recebe.
            </p>
            <div className="mt-4 space-y-3">
              {SEGMENTOS.map((s) => (
                <div key={s.k} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{s.titulo}</p>
                      <p className="text-xs text-muted-foreground">{s.dica}</p>
                    </div>
                    <span className="text-2xl font-bold">{n(f.segmentos[s.k] ?? 0)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    disabled={!escolhido || !f.segmentos[s.k] || criando !== null}
                    onClick={() => criar(s.k)}
                  >
                    {criando === s.k ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-4 w-4" />
                    )}
                    Criar campanha para esse grupo
                  </Button>
                </div>
              ))}
              {!escolhido && (
                <p className="text-xs text-amber-700">
                  Escolha uma campanha ou automação acima para criar o remarketing.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
