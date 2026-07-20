import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listProducts, formatBRL, type Product } from "@/lib/products";
import { exportProductsCsv, downloadFile } from "@/lib/upload";

export const Route = createFileRoute("/admin/produtos")({
  component: AdminProducts,
});

const PAGE_SIZE = 25;

function AdminProducts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const q = useQuery({
    queryKey: ["admin-products", { search, page }],
    queryFn: () => listProducts({ search, page, pageSize: PAGE_SIZE, sort: "nome-asc" }),
  });

  const del = useMutation({
    mutationFn: async (sku: string) => {
      const { error } = await supabase.from("products").delete().eq("sku", sku);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase
        .from("products")
        .update({
          nome: p.nome,
          preco_brl: p.preco_brl,
          categoria: p.categoria,
          marca: p.marca,
          estoque: p.estoque,
          peso: p.peso,
          descricao: p.descricao,
          url: p.url,
        })
        .eq("sku", p.sku);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto atualizado");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportAll = async () => {
    toast.info("Exportando todos os produtos…");
    const { data, error } = await supabase.from("products").select("*").limit(50000);
    if (error) {
      toast.error(error.message);
      return;
    }
    const csv = exportProductsCsv(data ?? []);
    downloadFile(csv, `produtos-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`${data?.length ?? 0} produtos exportados`);
  };

  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por SKU ou nome"
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={exportAll}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-32">Categoria</TableHead>
              <TableHead className="w-28">Marca</TableHead>
              <TableHead className="w-24 text-right">Preço</TableHead>
              <TableHead className="w-20 text-right">Estoque</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : (q.data?.rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              q.data!.rows.map((p) => (
                <TableRow key={p.sku}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="max-w-md truncate">{p.nome}</TableCell>
                  <TableCell>
                    {p.categoria ? <Badge variant="secondary">{p.categoria}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{p.marca ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatBRL(p.preco_brl)}
                  </TableCell>
                  <TableCell className="text-right">{p.estoque}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleting(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total.toLocaleString("pt-BR")} produtos
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar produto {editing?.sku}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <Field label="Nome">
                <Input
                  value={editing.nome}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço (BRL)">
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.preco_brl ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        preco_brl: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Estoque">
                  <Input
                    type="number"
                    value={editing.estoque}
                    onChange={(e) =>
                      setEditing({ ...editing, estoque: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoria">
                  <Input
                    value={editing.categoria ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, categoria: e.target.value || null })
                    }
                  />
                </Field>
                <Field label="Marca">
                  <Input
                    value={editing.marca ?? ""}
                    onChange={(e) => setEditing({ ...editing, marca: e.target.value || null })}
                  />
                </Field>
              </div>
              <Field label="Peso (kg)">
                <Input
                  type="number"
                  step="0.001"
                  value={editing.peso ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      peso: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="URL original">
                <Input
                  value={editing.url ?? ""}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value || null })}
                />
              </Field>
              <Field label="Descrição">
                <Textarea
                  value={editing.descricao ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, descricao: e.target.value || null })
                  }
                  rows={4}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => editing && save.mutate(editing)}
              disabled={save.isPending}
            >
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto <strong>{deleting?.nome}</strong> (SKU {deleting?.sku}) será removido
              permanentemente, junto com todas as imagens associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && del.mutate(deleting.sku)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
