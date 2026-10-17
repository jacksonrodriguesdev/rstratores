import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail,
  Plus,
  Copy,
  Trash2,
  Send,
  Eye,
  MousePointerClick,
  AlertTriangle,
  CheckCircle2,
  Users,
  Loader2,
  ImageIcon,
  CalendarClock,
  LayoutTemplate,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MODELOS_EMAIL } from "@/lib/email-modelos";
import { TEMAS } from "@/lib/email-blocos";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listarCampanhasFn, criarCampanhaFn, excluirCampanhaFn, statusEmailFn } from "@/lib/emails";
import { urlAbsoluta } from "@/lib/email-template";
import { cn } from "@/lib/utils";
import { COR_STATUS, ROTULO_STATUS } from "@/components/admin/email-status";
import { EmailAbas } from "@/components/admin/EmailAbas";

export const Route = createFileRoute("/admin/emails/")({
  component: EmailsPage,
});

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

function EmailsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: st } = useQuery({ queryKey: ["email-status"], queryFn: () => statusEmailFn() });
  const { data: campanhas, isLoading } = useQuery({
    queryKey: ["email-campanhas"],
    queryFn: () => listarCampanhasFn(),
    refetchInterval: (q) => (q.state.data?.some((c) => c.status === "ENVIANDO") ? 3000 : false),
  });

  const [galeria, setGaleria] = useState(false);
  const nova = async (copiarDe?: number, modelo?: string) => {
    try {
      const r = await criarCampanhaFn({ data: { copiarDe, modelo } });
      navigate({ to: "/admin/emails/$id", params: { id: String(r.id) } });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao criar");
    }
  };
  const excluir = async (id: number, nome: string) => {
    if (!window.confirm(`Excluir a campanha "${nome}" e o histórico de envios dela?`)) return;
    try {
      await excluirCampanhaFn({ data: { id } });
      toast.success("Campanha excluída");
      qc.invalidateQueries({ queryKey: ["email-campanhas"] });
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Mail className="h-6 w-6 text-primary" /> E-mail marketing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie campanhas com imagem, texto e produtos do site e envie para os clientes
            cadastrados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EmailAbas atual="campanhas" />
          <Button onClick={() => setGaleria(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" /> Nova campanha
          </Button>
        </div>
      </div>

      {st && !st.configurado && (
        <Card className="flex gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              O Resend ainda não está configurado. Dá para criar e ver as campanhas, mas não enviar.
            </p>
            <p className="mt-1">
              Na Hostinger, defina{" "}
              {!st.chave && <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code>}{" "}
              {!st.remetente && <code className="rounded bg-amber-100 px-1">EMAIL_REMETENTE</code>}{" "}
              (ex.: <code>AGRO PARTS &lt;novedades@agropartsuy.com&gt;</code>) e verifique o domínio
              no Resend.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Users className="h-4 w-4" /> Clientes cadastrados
          </p>
          <p className="mt-1 text-3xl font-bold">{st?.clientes ?? "…"}</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" /> Aceitam e-mails
          </p>
          <p className="mt-1 text-3xl font-bold text-primary">{st?.recebem ?? "…"}</p>
          {st && st.clientes > st.recebem && (
            <p className="text-xs text-muted-foreground">
              {st.clientes - st.recebem} se descadastraram ou tiveram rebote
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Send className="h-4 w-4" /> Remetente
          </p>
          <p className="mt-1 truncate font-semibold">{st?.remetente ?? "não configurado"}</p>
          <p className="text-xs text-muted-foreground">
            {st?.webhook
              ? "Aberturas e cliques: ativos"
              : "Aberturas e cliques: configure o webhook"}
          </p>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !campanhas?.length ? (
        <Card className="flex flex-col items-center p-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 font-semibold">Nenhuma campanha ainda</p>
          <p className="text-sm text-muted-foreground">
            Comece com um dos modelos prontos (Black Friday, ofertas, boas-vindas…).
          </p>
          <Button className="mt-4" onClick={() => setGaleria(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar a primeira
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {campanhas.map((c) => (
            <Card key={c.id} className="flex flex-col overflow-hidden">
              <Link
                to="/admin/emails/$id"
                params={{ id: String(c.id) }}
                className="block aspect-[2/1] bg-gradient-to-br from-[#06321b] to-[#0b7a3b]"
                style={c.fundo ? { background: c.fundo } : undefined}
              >
                {c.cabecalho ? (
                  <img
                    src={urlAbsoluta(c.cabecalho, "")}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : c.chamada ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
                    <span
                      className="h-1.5 w-12 rounded-full"
                      style={{ background: c.destaque ?? "#fbbf24" }}
                    />
                    <span
                      className="line-clamp-3 text-lg font-black leading-tight"
                      style={{
                        color: c.destaque && c.fundo === "#000000" ? c.destaque : "#ffffff",
                      }}
                    >
                      {c.chamada}
                    </span>
                    <span className="text-[11px] font-semibold text-white/60">
                      {c.blocos} blocos
                    </span>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-white/40">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      COR_STATUS[c.status],
                    )}
                  >
                    {c.status === "ENVIANDO" && (
                      <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                    )}
                    {ROTULO_STATUS[c.status] ?? c.status}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(c.enviado_em ?? c.updated_at).toLocaleDateString("pt-BR", {
                      timeZone: "America/Montevideo",
                    })}
                  </span>
                </div>
                <Link
                  to="/admin/emails/$id"
                  params={{ id: String(c.id) }}
                  className="mt-2 font-semibold leading-snug hover:text-primary"
                >
                  {c.nome}
                </Link>
                <p className="line-clamp-1 text-sm text-muted-foreground">{c.assunto}</p>
                {c.status === "AGENDADA" && c.agendado_para && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800">
                    <CalendarClock className="h-3.5 w-3.5" /> Sai em{" "}
                    {new Date(c.agendado_para).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
                {c.status !== "RASCUNHO" && (
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2 text-center text-xs">
                    <div>
                      <p className="text-base font-bold">{c.enviados}</p>
                      <p className="text-muted-foreground">enviados</p>
                    </div>
                    <div>
                      <p className="flex items-center justify-center gap-1 text-base font-bold">
                        <Eye className="h-3.5 w-3.5" />
                        {pct(c.abertos, c.enviados)}
                      </p>
                      <p className="text-muted-foreground">abriram</p>
                    </div>
                    <div>
                      <p className="flex items-center justify-center gap-1 text-base font-bold">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        {pct(c.clicados, c.enviados)}
                      </p>
                      <p className="text-muted-foreground">clicaram</p>
                    </div>
                  </div>
                )}
                {c.status === "ENVIANDO" && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: pct(c.enviados + c.falhas, c.total) }}
                    />
                  </div>
                )}
                <div className="mt-auto flex gap-1 pt-3">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/admin/emails/$id" params={{ id: String(c.id) }}>
                      {c.status === "RASCUNHO" || c.status === "AGENDADA" ? "Editar" : "Abrir"}
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => nova(c.id)} title="Duplicar">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => excluir(c.id, c.nome)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={galeria} onOpenChange={setGaleria}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" /> Escolha um modelo
            </DialogTitle>
            <DialogDescription>
              Tudo pode ser mudado depois: cores, textos, blocos, ordem e público.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
            {MODELOS_EMAIL.map((m) => {
              const t = TEMAS.find((x) => x.id === m.tema) ?? TEMAS[0];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setGaleria(false);
                    nova(undefined, m.id);
                  }}
                  className="group flex flex-col overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <span
                    className="flex h-24 flex-col items-center justify-center gap-1"
                    style={{ background: t.tema.topo }}
                  >
                    <span className="text-3xl">{m.emoji}</span>
                    <span
                      className="h-1.5 w-10 rounded-full"
                      style={{ background: t.tema.destaque }}
                    />
                  </span>
                  <span className="flex flex-1 flex-col p-3">
                    <span className="font-semibold group-hover:text-primary">{m.nome}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">{m.desc}</span>
                    <span className="mt-2 line-clamp-1 text-[11px] italic text-muted-foreground">
                      “{m.assunto.replace(/\{\{\s*nombre\s*\}\}[, ]*/gi, "")}”
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
