import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/cotacoes")({
  component: AdminCotacoes,
});

type Quote = {
  id: number;
  nome: string;
  endereco: string;
  whatsapp: string;
  mensagem: string | null;
  file_path: string | null;
  status: string;
  created_at: string;
};

function AdminCotacoes() {
  const qc = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const q = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/quotes");
      if (!res.ok) throw new Error("Erro ao buscar cotações");
      const json = await res.json();
      return json.rows as Quote[];
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Falha ao atualizar");
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const getStatusColor = (s: string) => {
    switch (s) {
      case "NOVA": return "bg-blue-100 text-blue-800 border-blue-200";
      case "RESPONDIDA": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CONCLUIDA": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const rows = q.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cotações (Cobrimos a Oferta)</h2>
        <p className="text-muted-foreground">
          Gerencie as cotações recebidas dos clientes.
        </p>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma cotação recebida ainda.</TableCell>
                </TableRow>
              ) : (
                rows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.nome}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{row.endereco}</div>
                    </TableCell>
                    <TableCell>{row.whatsapp}</TableCell>
                    <TableCell>
                      <Select 
                        value={row.status} 
                        onValueChange={(v) => updateStatus.mutate({ id: row.id, status: v })}
                      >
                        <SelectTrigger className={`w-[140px] h-8 text-xs font-semibold ${getStatusColor(row.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOVA">NOVA</SelectItem>
                          <SelectItem value="RESPONDIDA">RESPONDIDA</SelectItem>
                          <SelectItem value="CONCLUIDA">CONCLUÍDA</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedQuote(row)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Cotação #{selectedQuote?.id}</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Cliente</div>
                  <div className="font-semibold">{selectedQuote.nome}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">WhatsApp</div>
                  <div className="font-semibold">{selectedQuote.whatsapp}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm font-medium text-muted-foreground">Endereço / Cidade</div>
                  <div>{selectedQuote.endereco}</div>
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Mensagem:</div>
                <p className="whitespace-pre-wrap text-sm">
                  {selectedQuote.mensagem || <span className="italic text-muted-foreground">Nenhuma mensagem enviada.</span>}
                </p>
              </div>

              {selectedQuote.file_path && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/20">
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium">Anexo Enviado</span>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/uploads/${selectedQuote.file_path}`} target="_blank" rel="noopener noreferrer" download>
                      Baixar Arquivo
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
