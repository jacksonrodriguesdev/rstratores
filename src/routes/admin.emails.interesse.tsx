// Admin → E-mail marketing → Peças vistas: controle da automação «peças vistas sem orçamento».
// Números do período (enviados, abertos, cliques, WhatsApp, cupons usados, compras e faturamento),
// cada e-mail com as peças, o cupom e a resposta do cliente, as peças mais enviadas e quem recebe
// na próxima rodada. Daqui dá para criar, ligar, editar e rodar a automação.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  MousePointerClick,
  Pencil,
  Play,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ativarAutomacaoFn,
  criarAutomacaoFn,
  executarAutomacoesFn,
  painelInteresseFn,
} from "@/lib/automacoes";
import { BotaoFichaCliente } from "@/components/admin/FichaCliente";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/emails/interesse")({ component: PaginaInteresse });

const foto = (u: string | null) =>
  !u ? null : /^(https?:)?\//.test(u) ? u : `/uploads/${u.replace(/^\/?(uploads\/)?/, "")}`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const quando = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const dinheiro = (v: number, m: string) =>
  `${m === "BRL" ? "R$" : "$U"} ${v.toLocaleString("pt-BR", { maximumFractionDigits: m === "BRL" ? 2 : 0 })}`;
const numeroZap = (t: string | null) => {
  const d = (t ?? "").replace(/\D/g, "");
  if (d.length < 8) return null;
  if (d.startsWith("598") || d.startsWith("55")) return d;
  if (d.startsWith("09")) return `598${d.slice(1)}`;
  return d.length === 8 ? `598${d}` : d;
};

function PaginaInteresse() {
  const qc = useQueryClient();
  const [dias, setDias] = useState(30);
  const [rodando, setRodando] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["painel-interesse", dias],
    queryFn: () => painelInteresseFn({ data: { dias } }),
  });
  const atualizar = () => qc.invalidateQueries({ queryKey: ["painel-interesse"] });
  const a = data?.automacao;
  const r = data?.resumo;

  const criar = async () => {
    try {
      await criarAutomacaoFn({ data: { tipo: "interesse_sem_pedido" } });
      toast.success("Automação criada: revise o e-mail e ligue");
      atualizar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const ligar = async (ativo: boolean) => {
    try {
      await ativarAutomacaoFn({ data: { id: a!.id, ativo } });
      toast.success(
        ativo ? "Automação ligada: roda sozinha a cada 10 minutos" : "Automação desligada",
      );
      atualizar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const rodar = async () => {
    setRodando(true);
    try {
      const res = await executarAutomacoesFn({ data: { id: a!.id } });
      const n = res.resultados.reduce((s, x) => s + x.enviados, 0);
      toast.success(res.ocupado ? "Já está rodando, tente em 1 minuto" : `${n} e-mail(s) enviados`);
      atualizar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRodando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Eye className="h-6 w-6 text-primary" /> Peças vistas sem orçamento
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Cliente cadastrado que viu peças e não pediu preço recebe um e-mail com essas peças, as
            fotos, um cupom exclusivo e o WhatsApp pronto para negociar. Aqui você acompanha cada
            envio e a resposta do cliente.
          </p>
        </div>
        {!isLoading && !a && <Button onClick={criar}>Criar a automação</Button>}
        {a && (
          <div className="flex flex-wrap gap-2">
            <Button variant={a.ativo ? "outline" : "default"} onClick={() => ligar(!a.ativo)}>
              {a.ativo ? "Desligar" : "Ligar"}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/automacoes/$id" params={{ id: String(a.id) }}>
                <Pencil className="mr-1.5 h-4 w-4" /> Editar e-mail e regras
              </Link>
            </Button>
            <Button variant="outline" disabled={rodando} onClick={rodar}>
              {rodando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Rodar agora
            </Button>
          </div>
        )}
      </div>

      {a && (
        <Card
          className={cn(
            "flex flex-wrap items-center gap-x-6 gap-y-1 p-3 text-sm",
            a.ativo ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50",
          )}
        >
          <b>{a.ativo ? "● Ligada" : "○ Desligada"}</b>
          <span>
            Espera <b>{a.config.horas ?? 24} h</b> após a última visita · peças dos últimos{" "}
            <b>{a.config.dias ?? 7} dias</b> · no máximo 1 e-mail a cada{" "}
            <b>{a.config.intervaloDias ?? 14} dias</b>
          </span>
          <span>
            Cupom:{" "}
            <b>
              {a.config.descontoPct
                ? `${a.config.descontoPct}% por ${a.config.validadeDias ?? 7} dias`
                : "sem cupom"}
            </b>
          </span>
          {a.rodouEm && <span className="text-muted-foreground">Rodou {quando(a.rodouEm)}</span>}
          {a.erro && <span className="text-destructive">Erro: {a.erro}</span>}
        </Card>
      )}

      <div className="flex gap-1">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDias(d)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold",
              dias === d ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {d} dias
          </button>
        ))}
        {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {r && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Numero
            icone={Mail}
            titulo="E-mails enviados"
            valor={r.enviados}
            sub={`${r.pecas} peças enviadas${r.falhas ? ` · ${r.falhas} falharam` : ""}`}
          />
          <Numero icone={Eye} titulo="Abriram" valor={r.abertos} sub={pct(r.abertos, r.enviados)} />
          <Numero
            icone={MousePointerClick}
            titulo="Clicaram"
            valor={r.clicados}
            sub={pct(r.clicados, r.enviados)}
          />
          <Numero
            icone={MessageCircle}
            titulo="Chamaram no WhatsApp"
            valor={r.whatsapp}
            sub="até 14 dias depois"
          />
          <Numero
            icone={Ticket}
            titulo="Usaram o cupom"
            valor={r.cupons}
            sub="em link de pagamento"
          />
          <Numero
            icone={ShoppingBag}
            titulo="Compraram"
            valor={r.compras}
            sub={
              Object.entries(r.faturamento)
                .map(([m, v]) => dinheiro(v, m))
                .join(" · ") || "até 30 dias depois"
            }
            destaque
          />
        </div>
      )}

      {data && (
        <Card className="overflow-hidden p-0">
          <div className="border-b p-3">
            <h2 className="font-semibold">E-mails enviados ({data.linhas.length})</h2>
            <p className="text-xs text-muted-foreground">
              Respondeu = chamou no WhatsApp, usou o cupom ou comprou depois do e-mail (
              {r?.responderam ?? 0} de {r?.enviados ?? 0}).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Enviado</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Peças do e-mail</th>
                  <th className="p-2">Cupom</th>
                  <th className="p-2">E-mail</th>
                  <th className="p-2">Resposta</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {!data.linhas.length && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Nenhum e-mail enviado no período.
                    </td>
                  </tr>
                )}
                {data.linhas.map((l) => {
                  const zap = numeroZap(l.cliente.telefone);
                  return (
                    <tr key={l.id} className="border-t align-top">
                      <td className="whitespace-nowrap p-2 text-xs">{quando(l.quando)}</td>
                      <td className="p-2">
                        <p className="font-semibold">{l.cliente.nome}</p>
                        <p className="text-xs text-muted-foreground">{l.cliente.email}</p>
                        {l.cliente.local && (
                          <p className="text-xs text-muted-foreground">{l.cliente.local}</p>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex max-w-[280px] flex-wrap gap-1">
                          {l.produtos.map((p) => (
                            <span key={p.sku} title={`${p.nome} · ${p.codigo}`}>
                              {foto(p.foto) ? (
                                <img
                                  src={foto(p.foto)!}
                                  alt=""
                                  className="h-10 w-10 rounded border bg-white object-contain"
                                />
                              ) : (
                                <span className="flex h-10 w-10 items-center justify-center rounded border bg-muted text-[9px]">
                                  {p.codigo}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">{l.cupom ?? "—"}</td>
                      <td className="p-2">
                        {l.status === "FALHA" ? (
                          <Chip cor="red" title={l.erro ?? ""}>
                            Falhou
                          </Chip>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Chip cor="zinc">Enviado</Chip>
                            {l.abriu && <Chip cor="sky">Abriu</Chip>}
                            {l.clicou && <Chip cor="violet">Clicou</Chip>}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col gap-1">
                          {l.whatsapp && <Chip cor="green">WhatsApp {quando(l.whatsapp)}</Chip>}
                          {l.cupomUsado && (
                            <Chip cor="amber">
                              Cupom no link #{l.cupomUsado.id} ({l.cupomUsado.status})
                            </Chip>
                          )}
                          {l.compra && (
                            <Chip cor="emerald">
                              Comprou {dinheiro(l.compra.total, l.compra.moeda)}
                              {l.compra.pecaEnviada ? " · peça do e-mail" : ""}
                            </Chip>
                          )}
                          {!l.whatsapp && !l.cupomUsado && !l.compra && l.status !== "FALHA" && (
                            <span className="text-xs text-muted-foreground">Sem resposta</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap p-2">
                        <div className="flex items-center gap-1">
                          {l.cliente.id && (
                            <BotaoFichaCliente
                              id={l.cliente.id}
                              nome={l.cliente.nome}
                              numero={zap}
                            />
                          )}
                          {zap && !l.compra && (
                            <a
                              href={`https://api.whatsapp.com/send?phone=${zap}&text=${encodeURIComponent(
                                `¡Hola ${l.cliente.nome.split(" ")[0]}! Te escribimos de AGRO PARTS por los repuestos que te enviamos por e-mail${l.cupom ? ` (tu cupón ${l.cupom})` : ""}. ¿Te ayudamos a cerrar el pedido?`,
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chamar no WhatsApp"
                              className="rounded-md p-1.5 text-[#128C4B] hover:bg-muted"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="mb-2 font-semibold">Peças que mais foram nos e-mails</h2>
            {!data.maisEnviadas.length ? (
              <p className="text-sm text-muted-foreground">Ainda nenhuma.</p>
            ) : (
              <ul className="space-y-2">
                {data.maisEnviadas.map((p) => (
                  <li key={p.sku} className="flex items-center gap-3 text-sm">
                    {foto(p.foto) ? (
                      <img
                        src={foto(p.foto)!}
                        alt=""
                        className="h-9 w-9 rounded border bg-white object-contain"
                      />
                    ) : (
                      <span className="h-9 w-9 rounded border bg-muted" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1">{p.nome}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {p.codigo}
                      </span>
                    </span>
                    <b>{p.vezes}×</b>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-4">
            <h2 className="mb-1 font-semibold">Próxima rodada ({data.proximos.length})</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Quem receberia o e-mail se a automação rodasse agora (nada é enviado por aqui).
            </p>
            {!data.proximos.length ? (
              <p className="text-sm text-muted-foreground">Ninguém no momento.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {data.proximos.map((p) => (
                  <li key={p.id} className="text-sm">
                    <p className="flex items-center gap-1 font-semibold">
                      <Check className="h-3.5 w-3.5 text-primary" /> {p.nome}
                      <span className="font-normal text-muted-foreground">· {p.email}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{p.produtos.join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Numero({
  icone: Icone,
  titulo,
  valor,
  sub,
  destaque,
}: {
  icone: any;
  titulo: string;
  valor: number;
  sub: string;
  destaque?: boolean;
}) {
  return (
    <Card className={cn("p-3", destaque && "border-primary/40 bg-primary/5")}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icone className="h-3.5 w-3.5" /> {titulo}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}

const CORES: Record<string, string> = {
  zinc: "bg-zinc-100 text-zinc-700",
  sky: "bg-sky-100 text-sky-800",
  violet: "bg-violet-100 text-violet-800",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-900",
  emerald: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-700",
};
function Chip({
  cor,
  children,
  title,
}: {
  cor: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-block w-fit rounded px-1.5 py-0.5 text-[11px] font-semibold",
        CORES[cor],
      )}
    >
      {children}
    </span>
  );
}
