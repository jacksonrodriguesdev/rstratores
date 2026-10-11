import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Loader2, Send, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listarAutomacoesFn, contarEnvioAgoraFn, enviarAutomacaoAgoraFn } from "@/lib/automacoes";
import { defTipo } from "@/lib/automacoes-tipos";
import type { Cliente } from "@/lib/clientes";
import { cn } from "@/lib/utils";

// Página Clientes → "Enviar e-mail": manda uma automação (cupom, boas-vindas, cliente inativo)
// só para os clientes escolhidos.
export function EmailClientes({ aberto, aoFechar, clientes }: { aberto: boolean; aoFechar: () => void; clientes: Cliente[] }) {
  const { data: autos } = useQuery({ queryKey: ["automacoes"], queryFn: () => listarAutomacoesFn(), enabled: aberto });
  const opcoes = (autos ?? []).filter((a) => defTipo(a.tipo).enviarAgora);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [conta, setConta] = useState<{ total: number; jaReceberam: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const ids = clientes.map((c) => c.id);

  useEffect(() => {
    setConta(null);
    if (!escolhida || !aberto) return;
    contarEnvioAgoraFn({ data: { id: escolhida, ids } }).then(setConta).catch(() => {});
  }, [escolhida, aberto, clientes]); // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = async () => {
    if (!escolhida || !conta?.total) return;
    if (!window.confirm(`Enviar para ${conta.total} cliente(s)?`)) return;
    setEnviando(true);
    try {
      const r = await enviarAutomacaoAgoraFn({ data: { id: escolhida, ids } });
      toast.success(`Enviando para ${r.total} cliente(s)…`);
      aoFechar();
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Enviar e-mail para {clientes.length} cliente(s)</DialogTitle>
          <DialogDescription>Escolha um e-mail pronto das Automações (cupom, boas-vindas ou cliente inativo).</DialogDescription>
        </DialogHeader>
        {!autos ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : !opcoes.length ? (
          <div className="rounded-lg border border-dashed p-4 text-sm">
            Nenhum e-mail pronto ainda.{" "}
            <Link to="/admin/automacoes" className="inline-flex items-center gap-1 font-semibold text-primary underline"><Plus className="h-3.5 w-3.5" /> Criar um cupom ou boas-vindas</Link>
          </div>
        ) : (
          <div className="grid gap-2">
            {opcoes.map((a) => {
              const def = defTipo(a.tipo);
              return (
                <button key={a.id} onClick={() => setEscolhida(a.id)}
                  className={cn("flex items-center gap-3 rounded-lg border p-3 text-left", escolhida === a.id ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                  <span className="text-2xl">{def.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.nome}</span>
                    <span className="text-xs text-muted-foreground">{def.nome}{a.cupom ? ` · cupom ${a.cupom}` : ""}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {escolhida && (
          <p className="text-sm">
            {conta ? <><b>{conta.total}</b> vão receber{conta.jaReceberam ? ` · ${conta.jaReceberam} já receberam este e-mail` : ""}. Quem não aceita e-mails fica de fora.</> : <Loader2 className="inline h-4 w-4 animate-spin" />}
          </p>
        )}
        <button onClick={enviar} disabled={!conta?.total || enviando}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
        </button>
      </DialogContent>
    </Dialog>
  );
}
