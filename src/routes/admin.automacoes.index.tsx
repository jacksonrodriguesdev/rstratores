import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Zap, Plus, Copy, Trash2, Play, Loader2, AlertTriangle, Eye, Send, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmailAbas } from "@/components/admin/EmailAbas";
import {
  listarAutomacoesFn, criarAutomacaoFn, excluirAutomacaoFn, ativarAutomacaoFn, executarAutomacoesFn,
} from "@/lib/automacoes";
import { TIPOS, defTipo, type TipoAutomacao } from "@/lib/automacoes-tipos";
import { statusEmailFn } from "@/lib/emails";
import { urlAbsoluta } from "@/lib/email-template";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/automacoes/")({
  component: AutomacoesPage,
});

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Montevideo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";

// E-mail marketing → Automações: e-mails que saem sozinhos (boas-vindas, cupom, promoção,
// preço baixou, carrinho...). Cada uma é personalizável e pode ser limitada a um grupo.
function AutomacoesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [rodando, setRodando] = useState(false);
  const { data: st } = useQuery({ queryKey: ["email-status"], queryFn: () => statusEmailFn() });
  const { data: autos, isLoading } = useQuery({ queryKey: ["automacoes"], queryFn: () => listarAutomacoesFn() });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["automacoes"] });

  const criar = async (tipo: TipoAutomacao, copiarDe?: number) => {
    try {
      const r = await criarAutomacaoFn({ data: { tipo, copiarDe } });
      navigate({ to: "/admin/automacoes/$id", params: { id: String(r.id) } });
    } catch (e: any) {
      toast.error(e?.message);
    }
  };
  const ativar = async (id: number, ativo: boolean) => {
    try {
      await ativarAutomacaoFn({ data: { id, ativo } });
      toast.success(ativo ? "Automação ligada" : "Automação desligada");
      recarregar();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };
  const excluir = async (id: number, nome: string) => {
    if (!window.confirm(`Excluir a automação "${nome}" e o histórico de envios dela?`)) return;
    await excluirAutomacaoFn({ data: { id } });
    toast.success("Automação excluída");
    recarregar();
  };
  const executar = async () => {
    setRodando(true);
    try {
      const r = await executarAutomacoesFn({ data: {} });
      if (r.ocupado) toast.info("As automações já estão rodando agora.");
      else {
        const total = r.resultados.reduce((t, x) => t + x.enviados, 0);
        const erros = r.resultados.filter((x) => x.erro);
        toast.success(`${total} e-mail(s) enviados${erros.length ? ` · ${erros.length} com erro` : ""}`);
      }
      recarregar();
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setRodando(false);
    }
  };

  const ativas = autos?.filter((a) => a.ativo).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Zap className="h-6 w-6 text-primary" /> Automações</h1>
          <p className="mt-1 text-sm text-muted-foreground">E-mails que saem sozinhos na hora certa. O sistema verifica a cada 10 minutos.</p>
        </div>
        <EmailAbas atual="automacoes" />
      </div>

      {st && !st.configurado && (
        <Card className="flex gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>O Resend não está configurado neste servidor: dá para criar e editar as automações, mas elas só enviam com <code>RESEND_API_KEY</code> e <code>EMAIL_REMETENTE</code> definidos.</p>
        </Card>
      )}

      {/* Modelos */}
      <section>
        <h2 className="mb-3 font-semibold">Criar automação</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIPOS.map((t) => (
            <button key={t.tipo} onClick={() => criar(t.tipo)}
              className="group flex flex-col rounded-xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: `${t.cor}18` }}>{t.emoji}</span>
              <span className="mt-3 font-semibold">{t.nome}</span>
              <span className="mt-1 text-xs text-muted-foreground">{t.descricao}</span>
              <span className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100"><Plus className="h-3.5 w-3.5" /> Criar</span>
            </button>
          ))}
        </div>
      </section>

      {/* Minhas automações */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Minhas automações <span className="font-normal text-muted-foreground">({ativas} ligada{ativas === 1 ? "" : "s"})</span></h2>
          <Button variant="outline" size="sm" onClick={executar} disabled={rodando || !ativas || !st?.configurado}>
            {rodando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Executar agora
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !autos?.length ? (
          <Card className="flex flex-col items-center p-10 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-semibold">Nenhuma automação ainda</p>
            <p className="text-sm text-muted-foreground">Escolha um modelo acima. Comece pela de boas-vindas.</p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {autos.map((a) => {
              const def = defTipo(a.tipo);
              return (
                <Card key={a.id} className={cn("flex flex-col overflow-hidden", !a.ativo && "opacity-80")}>
                  <Link to="/admin/automacoes/$id" params={{ id: String(a.id) }} className="relative block aspect-[3/1]" style={{ background: `linear-gradient(135deg, #06321b, ${def.cor})` }}>
                    {a.cabecalho ? <img src={urlAbsoluta(a.cabecalho, "")} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-4xl">{def.emoji}</span>}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">{def.nome}</span>
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start gap-2">
                      <Link to="/admin/automacoes/$id" params={{ id: String(a.id) }} className="min-w-0 flex-1 font-semibold leading-snug hover:text-primary">{a.nome}</Link>
                      <Switch checked={a.ativo} onCheckedChange={(v) => ativar(a.id, v)} aria-label="Ligar automação" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{def.gatilho}</p>
                    {a.cupom && <p className="mt-1 text-xs">Cupom: <code className="rounded bg-amber-100 px-1.5 font-bold text-amber-900">{a.cupom}</code></p>}
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2 text-center text-xs">
                      <div><p className="text-base font-bold">{a.enviados}</p><p className="text-muted-foreground">enviados</p></div>
                      <div><p className="flex items-center justify-center gap-1 text-base font-bold"><Send className="h-3.5 w-3.5" />{a.enviados30}</p><p className="text-muted-foreground">em 30 dias</p></div>
                      <div><p className="flex items-center justify-center gap-1 text-base font-bold"><Eye className="h-3.5 w-3.5" />{pct(a.abertos30, a.enviados30)}</p><p className="text-muted-foreground">abriram</p></div>
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> Última verificação: {quando(a.rodou_em)}</p>
                    {a.ultimo_erro && <p className="mt-1 line-clamp-2 rounded bg-red-50 p-1.5 text-[11px] text-red-700">{a.ultimo_erro}</p>}
                    <div className="mt-auto flex gap-1 pt-3">
                      <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/admin/automacoes/$id" params={{ id: String(a.id) }}>Editar</Link></Button>
                      <Button size="sm" variant="ghost" onClick={() => criar(a.tipo, a.id)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => excluir(a.id, a.nome)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
