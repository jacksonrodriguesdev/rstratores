import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, PartyPopper, SkipForward, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ProdutoEditor } from "@/components/admin/ProdutoEditor";
import { proximaSemPrecoFn, opcoesFiltroFn } from "@/lib/produtos-admin";

// Fila de precificação: uma peça por vez (as com foto primeiro). "Salvar e próxima" ou "Pular".
export const Route = createFileRoute("/admin/precificar")({
  component: Fila,
});

function Fila() {
  const [comFoto, setComFoto] = useState(true);
  const [categoria, setCategoria] = useState<number | null>(null);
  const [pular, setPular] = useState<string[]>([]);
  const [feitos, setFeitos] = useState(0);
  const { data: opc } = useQuery({ queryKey: ["opcoes-filtro"], queryFn: () => opcoesFiltroFn(), staleTime: 300_000 });
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["fila-preco", comFoto, categoria, pular],
    queryFn: () => proximaSemPrecoFn({ data: { comFoto, pular, categoria } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/precificacao" className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="mr-auto">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Zap className="h-6 w-6 text-primary" /> Precificar uma a uma</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.restantes.toLocaleString("pt-BR")} peças sem preço nesta fila` : "…"}{feitos ? ` · ${feitos} feitas agora` : ""}
          </p>
        </div>
        <select value={categoria ?? ""} onChange={(e) => { setCategoria(e.target.value ? Number(e.target.value) : null); setPular([]); }} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">Todas as categorias</option>
          {opc?.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">Só com foto <Switch checked={comFoto} onCheckedChange={(v) => { setComFoto(v); setPular([]); }} /></label>
      </div>

      {isFetching && !data ? (
        <Card className="flex h-60 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Card>
      ) : !data?.sku ? (
        <Card className="flex flex-col items-center p-12 text-center">
          <PartyPopper className="h-12 w-12 text-primary" />
          <p className="mt-3 text-lg font-semibold">Nenhuma peça sem preço nesta fila!</p>
          <p className="text-sm text-muted-foreground">{comFoto ? "Desligue “Só com foto” para continuar com as peças sem foto." : "Todas as peças desta seleção já têm preço."}</p>
        </Card>
      ) : (
        <Card className="p-4">
          <ProdutoEditor
            key={data.sku}
            sku={data.sku}
            focoPreco
            rotuloSalvar="Salvar e próxima"
            aoSalvar={() => { setFeitos((n) => n + 1); refetch(); }}
            extraAcoes={<Button variant="outline" onClick={() => setPular((l) => [...l, data.sku!])}><SkipForward className="mr-2 h-4 w-4" /> Pular</Button>}
          />
        </Card>
      )}
      <p className="text-xs text-muted-foreground">Dica: digite o custo e a margem; a venda em R$ e o preço em $U são calculados. Peças puladas voltam na próxima vez que abrir esta tela.</p>
    </div>
  );
}
