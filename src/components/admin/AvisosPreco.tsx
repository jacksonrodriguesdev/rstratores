import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Mail, MessageCircle, TrendingDown, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { avisosPrecoFn, marcarAvisoFn } from "@/lib/captura";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";

const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
const STATUS: Record<string, [string, string]> = {
  ATIVO: ["Esperando baixar", "bg-sky-100 text-sky-800"],
  WHATSAPP: ["Baixou · avisar no WhatsApp", "bg-[#e9f9ef] text-[#128C4B]"],
  AVISADO: ["Avisado", "bg-emerald-100 text-emerald-800"],
  VENCIDO: ["Vencido (4 meses)", "bg-zinc-100 text-zinc-600"],
};

// Mensagem pronta para quem deixou só o WhatsApp
function mensagem(a: { idioma: string; nome: string; sku: string }) {
  const url = `${SITE_URL}${a.idioma === "pt" ? "/pt" : ""}/produto/${encodeURIComponent(a.sku)}`;
  return a.idioma === "pt"
    ? `Olá! Aqui é da AGRO PARTS. Você pediu para avisar: baixou o preço de *${a.nome}* (código ${a.sku}).\n${url}\n\nQuer que a gente separe para você?`
    : `¡Hola! Te escribimos de AGRO PARTS. Nos pediste que te avisáramos: bajó el precio de *${a.nome}* (código ${a.sku}).\n${url}\n\n¿Querés que te la reservemos?`;
}

// Captação → Avisos de preço: quem pediu aviso na página da peça. Os de e-mail são avisados
// sozinhos; os de WhatsApp aparecem no topo quando o preço baixa, com a mensagem pronta.
export function AvisosPreco() {
  const qc = useQueryClient();
  const { data: d } = useQuery({ queryKey: ["avisos-preco"], queryFn: () => avisosPrecoFn() });
  const marcar = async (id: number) => {
    await marcarAvisoFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["avisos-preco"] });
  };
  if (!d) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const r = d.resumo;
  const cards = [
    [Bell, "Esperando baixar", r.ATIVO ?? 0, "text-sky-700 bg-sky-50"],
    [MessageCircle, "Avisar no WhatsApp", r.WHATSAPP ?? 0, "text-[#128C4B] bg-[#e9f9ef]"],
    [BellRing, "Já avisados", r.AVISADO ?? 0, "text-emerald-700 bg-emerald-50"],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(([I, rotulo, v, cor]) => (
          <Card key={rotulo} className="flex items-center gap-3 p-4">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", cor)}>
              <I className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-2xl font-bold">{v.toLocaleString("pt-BR")}</span>
              <span className="text-xs text-muted-foreground">{rotulo}</span>
            </span>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          <p className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            O sistema confere os preços a cada 10 minutos. Baixou 1% ou mais: quem deixou e-mail
            recebe o aviso na hora (no idioma dele); quem deixou WhatsApp aparece aqui no topo.
            Preços em R$ (base do cálculo; o cliente do Uruguai vê em pesos).
          </p>
          <div className="max-h-[640px] divide-y overflow-y-auto">
            {d.avisos.map((a) => {
              const [rotulo, cor] = STATUS[a.status] ?? [a.status, "bg-muted"];
              const queda =
                a.avisoBrl != null ? Math.round((1 - a.avisoBrl / a.refBrl) * 100) : null;
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/produto/${encodeURIComponent(a.sku)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium hover:text-primary"
                    >
                      {a.nome}
                    </a>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span className="font-mono">{a.sku}</span>
                      <span className="inline-flex items-center gap-1">
                        {a.email ? (
                          <Mail className="h-3 w-3" />
                        ) : (
                          <MessageCircle className="h-3 w-3" />
                        )}
                        {a.email ?? a.telefone}
                      </span>
                      <span>{a.idioma === "pt" ? "PT" : "ES"}</span>
                      <span>pediu {data(a.criado)}</span>
                      <span>
                        {brl(a.refBrl)}
                        {a.avisoBrl != null ? (
                          <>
                            {" "}
                            → <b className="text-emerald-700">{brl(a.avisoBrl)}</b>
                            {queda ? (
                              <span className="ml-1 inline-flex items-center text-emerald-700">
                                <TrendingDown className="h-3 w-3" /> {queda}%
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <> · agora {brl(a.atualBrl)}</>
                        )}
                      </span>
                    </p>
                  </div>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", cor)}>
                    {rotulo}
                  </span>
                  {a.status === "WHATSAPP" && a.telefone && (
                    <>
                      <a
                        href={`https://api.whatsapp.com/send?phone=${a.telefone.replace(/\D/g, "")}&text=${encodeURIComponent(mensagem(a))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#25D366] px-2.5 text-xs font-bold text-white hover:bg-[#1EBE57]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Avisar
                      </a>
                      <button
                        onClick={() => marcar(a.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold hover:bg-muted"
                      >
                        <Check className="h-3.5 w-3.5" /> Já avisei
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {!d.avisos.length && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum aviso ainda: aparecem quando alguém toca em «Avisame si baja el precio» na
                página de uma peça.
              </p>
            )}
          </div>
        </Card>
        <Card className="h-fit overflow-hidden p-0">
          <h3 className="border-b p-4 text-sm font-semibold">Peças mais acompanhadas</h3>
          <ul className="divide-y text-sm">
            {d.pecas.map((p) => (
              <li key={p.sku} className="flex items-center gap-2 px-4 py-2">
                <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                <b>{p.pessoas}</b>
              </li>
            ))}
            {!d.pecas.length && <li className="p-4 text-muted-foreground">—</li>}
          </ul>
          <p className="border-t p-3 text-xs text-muted-foreground">
            Muita gente esperando a mesma peça baixar: bom sinal para uma oferta.
          </p>
        </Card>
      </div>
    </div>
  );
}
