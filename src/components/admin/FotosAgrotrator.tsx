import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Images, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { situacaoFotosAgrotratorFn, copiarFotosAgrotratorFn } from "@/lib/fotos-agrotrator";

// Fotos das peças importadas do agrotrator: enquanto não são copiadas, o site mostra direto de lá
export function FotosAgrotrator() {
  const [pedindo, setPedindo] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ["fotos-agrotrator"],
    queryFn: () => situacaoFotosAgrotratorFn(),
    refetchInterval: (q) => (q.state.data?.rodando ? 3000 : false),
  });
  if (!data || (!data.faltam && !data.rodando && !data.copiadas)) return null;
  const total = data.faltam + data.copiadasTotal;
  const pct = total ? Math.round((data.copiadasTotal / total) * 100) : 100;
  const iniciar = async () => {
    setPedindo(true);
    try {
      await copiarFotosAgrotratorFn();
      toast.success("Cópia iniciada no servidor. Pode sair desta página.");
      refetch();
    } finally {
      setPedindo(false);
    }
  };
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Images className="h-4 w-4 text-primary" /> Fotos do agrotrator
          </h2>
          <p className="text-sm text-muted-foreground">
            {data.faltam
              ? `${data.faltam.toLocaleString("pt-BR")} fotos ainda são mostradas direto do agrotrator. Copie para o servidor para não depender do site de lá.`
              : "Todas as fotos já estão no servidor."}
          </p>
        </div>
        {data.faltam > 0 && (
          <Button onClick={iniciar} disabled={pedindo || data.rodando}>
            {(pedindo || data.rodando) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {data.rodando ? "Copiando…" : "Copiar fotos para o servidor"}
          </Button>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {data.copiadasTotal.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} no servidor
        ({pct}%)
        {data.rodando || data.copiadas || data.falhas
          ? ` · nesta rodada: ${data.copiadas} copiadas${data.falhas ? `, ${data.falhas} falharam (tente de novo depois)` : ""}`
          : ""}
        {data.erro ? ` · erro: ${data.erro}` : ""}
      </p>
    </Card>
  );
}
