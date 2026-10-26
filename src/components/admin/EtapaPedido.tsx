// Admin → Vendas: etapa do pedido. Trocar a etapa avisa o cliente por e-mail e no sininho do site
// (se ele tiver conta). Mostra também o histórico de etapas da venda.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Loader2, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { historicoVendaFn, mudarEtapaFn } from "@/lib/pedidos";
import { ETAPAS, etapaDe, indiceEtapa, type Etapa } from "@/lib/pedidos-comum";
import { cn } from "@/lib/utils";

type VendaMin = {
  id: number;
  codigo: string;
  etapa?: string | null;
  status: string;
  cliente_email?: string | null;
  pais: string;
};

export function EtapaPedido({ v }: { v: VendaMin }) {
  const [aberto, setAberto] = useState(false);
  const n = indiceEtapa(v.etapa);
  if (v.status === "CANCELADA")
    return (
      <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-600">
        CANCELADA
      </span>
    );
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="group text-left"
        title="Trocar a etapa do pedido"
      >
        <span
          className={cn(
            "inline-block rounded px-2 py-0.5 text-xs font-semibold",
            v.etapa === "ENTREGUE"
              ? "bg-emerald-100 text-emerald-800"
              : n >= 4
                ? "bg-sky-100 text-sky-800"
                : "bg-amber-100 text-amber-900",
          )}
        >
          {etapaDe(v.etapa).admin}
        </span>
        <span className="mt-1 flex gap-0.5">
          {ETAPAS.map((e, i) => (
            <span
              key={e.id}
              className={cn("h-1 w-4 rounded", i <= n ? "bg-primary" : "bg-zinc-200")}
            />
          ))}
        </span>
        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100">
          trocar etapa
        </span>
      </button>
      {aberto && <DialogoEtapa v={v} fechar={() => setAberto(false)} />}
    </>
  );
}

function DialogoEtapa({ v, fechar }: { v: VendaMin; fechar: () => void }) {
  const qc = useQueryClient();
  const [etapa, setEtapa] = useState<Etapa>(() => {
    const i = indiceEtapa(v.etapa);
    return ETAPAS[Math.min(i + 1, ETAPAS.length - 1)].id; // sugere a próxima
  });
  const [nota, setNota] = useState("");
  const [email, setEmail] = useState(!!v.cliente_email);
  const [salvando, setSalvando] = useState(false);
  const { data: hist } = useQuery({
    queryKey: ["historico-venda", v.id],
    queryFn: () => historicoVendaFn({ data: { id: v.id } }),
  });
  const salvar = async () => {
    setSalvando(true);
    try {
      const r = await mudarEtapaFn({ data: { id: v.id, etapa, nota: nota || null, email } });
      toast.success(
        r.email
          ? "Etapa salva e cliente avisado por e-mail"
          : "Etapa salva (aviso no site, sem e-mail)",
      );
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["historico-venda", v.id] });
      fechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Etapa do pedido {v.codigo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {ETAPAS.map((e, i) => (
            <label
              key={e.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm",
                etapa === e.id ? "border-primary bg-primary/5" : "hover:bg-muted",
              )}
            >
              <input type="radio" checked={etapa === e.id} onChange={() => setEtapa(e.id)} />
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {i + 1}
              </span>
              <span className="flex-1 font-semibold">{e.admin}</span>
              {e.id === v.etapa && <span className="text-[11px] text-muted-foreground">atual</span>}
            </label>
          ))}
        </div>
        {etapa === "DESPACHADO" && (
          <p className="rounded-md bg-sky-50 p-2 text-xs text-sky-900">
            Dica: salvar o código de rastreio na lista já marca esta etapa e manda o código ao
            cliente.
          </p>
        )}
        <Textarea
          rows={2}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Observação para o cliente (opcional). Ex.: chega na quinta-feira."
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={email}
            disabled={!v.cliente_email}
            onChange={(e) => setEmail(e.target.checked)}
          />
          <Mail className="h-4 w-4" /> Avisar por e-mail
          {!v.cliente_email && (
            <span className="text-xs text-muted-foreground">(venda sem e-mail)</span>
          )}
        </label>
        <p className="text-xs text-muted-foreground">
          Se o cliente tiver conta no site, o aviso aparece também no sininho dele.
        </p>
        <div className="flex items-center justify-between gap-2">
          <a
            href={`${v.pais === "BR" ? "/pt" : ""}/pedido/${v.codigo}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Página do cliente
          </a>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Salvar etapa
            </Button>
          </div>
        </div>
        {!!hist?.length && (
          <div className="border-t pt-3">
            <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Histórico</p>
            <ul className="space-y-1 text-xs">
              {[...hist].reverse().map((h, k) => (
                <li key={k} className="flex justify-between gap-2">
                  <span>
                    <b>{etapaDe(h.etapa).admin}</b>
                    {h.nota ? ` · ${h.nota}` : ""}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(h.quando).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {h.email ? " · ✉️" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
