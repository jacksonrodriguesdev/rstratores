import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Images, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { situacaoFotosAgrotratorFn, copiarFotosAgrotratorFn } from "@/lib/fotos-agrotrator";

// Fotos das peças importadas do agrotrator: copiar para o servidor e recuperar as que sumiram da pasta
export function FotosAgrotrator() {
  const [pedindo, setPedindo] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ["fotos-agrotrator"],
    queryFn: () => situacaoFotosAgrotratorFn(),
    refetchInterval: (q) => (q.state.data?.rodando ? 3000 : false),
  });
  const sumidas = data?.sumidas ?? 0;
  if (!data || (!data.faltam && !sumidas && !data.rodando && !data.copiadas && !data.recuperadas))
    return null;
  const total = data.faltam + data.copiadasTotal;
  const noServidor = Math.max(0, data.copiadasTotal - sumidas);
  const pct = total ? Math.round((noServidor / total) * 100) : 100;
  const iniciar = async () => {
    setPedindo(true);
    try {
      await copiarFotosAgrotratorFn();
      toast.success("Iniciado no servidor. Pode sair desta página.");
      refetch();
    } finally {
      setPedindo(false);
    }
  };
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Images className="h-4 w-4 text-primary" /> Fotos das peças
          </h2>
          <p className="text-sm text-muted-foreground">
            {sumidas > 0
              ? `${fmt(sumidas)} fotos sumiram da pasta do servidor (as peças aparecem sem foto).`
              : data.faltam
                ? `${fmt(data.faltam)} fotos ainda não foram copiadas para o servidor.`
                : "Todas as fotos estão no servidor."}
          </p>
        </div>
        {(data.faltam > 0 || sumidas > 0 || data.rodando) && (
          <Button onClick={iniciar} disabled={pedindo || data.rodando}>
            {(pedindo || data.rodando) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {data.rodando
              ? "Baixando…"
              : sumidas > 0
                ? "Recuperar fotos"
                : "Copiar fotos para o servidor"}
          </Button>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {fmt(noServidor)} de {fmt(total)} no servidor ({pct}%)
        {data.rodando || data.copiadas || data.recuperadas || data.falhas
          ? ` · nesta rodada: ${fmt(data.recuperadas)} recuperadas, ${fmt(data.copiadas)} copiadas${data.falhas ? `, ${fmt(data.falhas)} não baixadas` : ""}`
          : ""}
        {data.erro ? ` · erro: ${data.erro}` : ""}
      </p>
    </Card>
  );
}
