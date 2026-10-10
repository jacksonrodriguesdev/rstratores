import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { precosAdminFn, atualizarCotacaoFn, salvarConfigPrecosFn } from "@/lib/produtos-admin";
import { fmtBRL, fmtUYU, uyuDeBrl } from "@/lib/precos";
import { cn } from "@/lib/utils";

// Cotação do dia (R$ → $U) e configurações de preço, no topo da página de produtos.
export function PainelCotacao({ dados, aoMudar }: { dados?: Awaited<ReturnType<typeof precosAdminFn>>; aoMudar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (dados) setV(dados.valores); }, [dados]);
  if (!dados) return <Card className="h-24 animate-pulse" />;
  const c = dados.cfg;
  const atualizar = async () => {
    setOcupado(true);
    try {
      const r = await atualizarCotacaoFn();
      toast.success(r.cotacao ? `Cotação: 1 R$ = $U ${r.cotacao.toFixed(2)}` : "Não foi possível buscar a cotação");
      aoMudar();
    } finally {
      setOcupado(false);
    }
  };
  const salvar = async () => {
    setOcupado(true);
    try {
      await salvarConfigPrecosFn({ data: v });
      toast.success("Configuração salva");
      aoMudar();
    } finally {
      setOcupado(false);
    }
  };
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Cotação do dia</p>
          <p className="text-2xl font-bold">{c.cotacao ? <>1 R$ = <span className="text-primary">$U {c.cotacao.toFixed(2)}</span></> : "sem cotação"}</p>
          <p className="text-xs text-muted-foreground">{c.manual ? "Cotação manual (definida abaixo)" : c.cotacaoEm ? `${c.fonte} · ${new Date(c.cotacaoEm).toLocaleString("pt-BR")} · atualiza sozinha a cada 6 h` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Margem padrão: <b>{c.margemPadrao}%</b></span>
          <span>Arredondar $U: <b>{c.arredondar || "não"}</b></span>
          {c.ajuste ? <span>Ajuste câmbio: <b>+{c.ajuste}%</b></span> : null}
          <span>Preços no site: <b className={c.mostrar ? "text-emerald-700" : "text-amber-700"}>{c.mostrar ? "visíveis" : "ocultos"}</b></span>
          {c.cotacao && <span className="text-muted-foreground">Ex.: R$ 100 → {fmtUYU(uyuDeBrl(100, c)!)} · {fmtBRL(100)}</span>}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={atualizar} disabled={ocupado || c.manual}><RefreshCw className={cn("mr-2 h-4 w-4", ocupado && "animate-spin")} /> Atualizar agora</Button>
          <Button variant="ghost" size="sm" onClick={() => setAberto(!aberto)}><Settings2 className="mr-2 h-4 w-4" /> Configurar</Button>
        </div>
      </div>
      {aberto && (
        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
          {[["margem_padrao", "Margem padrão (%)"], ["arredondar_uyu", "Arredondar $U para cima de"], ["ajuste_cambio", "Ajuste na cotação (%)"], ["cotacao_manual", "Cotação manual (vazio = automática)"]].map(([k, l]) => (
            <div key={k}><label className="text-xs font-semibold text-muted-foreground">{l}</label><Input inputMode="decimal" value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
          ))}
          <label className="flex items-center justify-between gap-2 rounded-md border px-3 text-sm">Mostrar preços no site<Switch checked={v.mostrar_precos === "1"} onCheckedChange={(x) => setV({ ...v, mostrar_precos: x ? "1" : "0" })} /></label>
          <div className="lg:col-span-5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Histórico: {dados.historico.slice(0, 6).map((h) => `${new Date(h.em).toLocaleDateString("pt-BR")} ${h.valor.toFixed(2)}`).join(" · ") || "—"}</p>
            <Button size="sm" onClick={salvar} disabled={ocupado}>Salvar configuração</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
