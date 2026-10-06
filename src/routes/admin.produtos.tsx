import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import { z } from "zod";
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
import { Search, Pencil, Trash2, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listProducts, formatBRL, type Product } from "@/lib/products";
import { exportProductsCsv, downloadFile } from "@/lib/upload";
import { listCategories } from "@/lib/categories";

const searchSchema = z.object({
  linha: z.enum(["AGRICOLA", "AUTOMOTIVA"]).optional().default("AGRICOLA"),
});

export const Route = createFileRoute("/admin/produtos")({
  validateSearch: searchSchema,
  component: AdminProducts,
});

const PAGE_SIZE = 25;

function AdminProducts() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { linha } = Route.useSearch();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const q = useQuery({
    queryKey: ["admin-products", { search, page, linha }],
    queryFn: () =>
      listProducts({ search, page, pageSize: PAGE_SIZE, sort: "nome-asc", linha, contar: true }),
  });

  const catQ = useQuery({
    queryKey: ["categories", linha],
    queryFn: () => listCategories({ linha }),
  });

  const del = useMutation({
    mutationFn: async (sku: string) => {
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(sku)}?linha=${encodeURIComponent(linha)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Falha ao remover o produto");
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async (p: Partial<Product>) => {
      if (!p.sku) throw new Error("SKU é obrigatório");
      if (!p.nome) throw new Error("Nome é obrigatório");

      let uploadedImages: string[] = [];
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append("files", f));
        const upRes = await fetch("/api/admin/products/upload", { method: "POST", body: formData });
        if (upRes.ok) {
          const { paths } = await upRes.json();
          uploadedImages = paths;
        }
      }

      const payload = {
        sku: p.sku,
        nome: p.nome,
        preco_brl: p.preco_brl,
        categoria: p.categoria,
        category_id: p.category_id,
        marca: p.marca,
        estoque: p.estoque ?? 0,
        peso: p.peso,
        tamanho: p.tamanho,
        altura: p.altura,
        largura: p.largura,
        valor_compra: p.valor_compra,
        valor_promocional: p.valor_promocional,
        veiculos_compativeis: p.veiculos_compativeis,
        descricao: p.descricao,
        url: p.url,
        linha: p.linha || "AGRICOLA",
        images: uploadedImages,
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Falha ao criar o produto");
    },
    onSuccess: () => {
      toast.success("Produto criado com sucesso");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setIsCreating(false);
      setNewProduct({});
      setImageFiles([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async (p: Product) => {
      let uploadedImages: string[] = [];
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append("files", f));
        const upRes = await fetch("/api/admin/products/upload", { method: "POST", body: formData });
        if (upRes.ok) {
          const { paths } = await upRes.json();
          uploadedImages = paths;
        }
      }

      const res = await fetch(`/api/admin/products/${encodeURIComponent(p.sku)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: p.nome,
          preco_brl: p.preco_brl,
          categoria: p.categoria,
          category_id: p.category_id,
          marca: p.marca,
          estoque: p.estoque,
          peso: p.peso,
          tamanho: p.tamanho,
          altura: p.altura,
          largura: p.largura,
          valor_compra: p.valor_compra,
          valor_promocional: p.valor_promocional,
          veiculos_compativeis: p.veiculos_compativeis,
          descricao: p.descricao,
          url: p.url,
          linha: p.linha || "AGRICOLA",
          images: uploadedImages,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Falha ao salvar o produto");
    },
    onSuccess: () => {
      toast.success("Produto atualizado");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
      setImageFiles([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportAll = async () => {
    toast.info("Exportando todos os produtos…");
    try {
      const res = await fetch("/api/admin/products/export");
      if (!res.ok) throw new Error("Falha ao exportar");
      const { rows } = await res.json();
      const csv = exportProductsCsv(rows);
      downloadFile(csv, `produtos-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`${rows.length} produtos exportados`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoriasFlat = (catQ.data ?? []).flatMap((c) => [c, ...(c.children ?? [])]);

  const CategorySelect = ({
    value,
    onChange,
  }: {
    value: number | null | undefined;
    onChange: (id: number | null, name: string | null) => void;
  }) => (
    <select
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
      value={value || ""}
      onChange={(e) => {
        const id = e.target.value ? Number(e.target.value) : null;
        const name = id ? categoriasFlat.find((c) => c.id === id)?.nome || null : null;
        onChange(id, name);
      }}
    >
      <option value="">-- Selecione uma Categoria --</option>
      {(catQ.data ?? []).map((c) => (
        <optgroup key={c.id} label={c.nome}>
          <option value={c.id}>{c.nome} (Geral)</option>
          {c.children?.map((child) => (
            <option key={child.id} value={child.id}>
              {child.nome}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

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
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={() => {
              setNewProduct({ linha });
              setImageFiles([]);
              setIsCreating(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
          <Button variant="outline" onClick={exportAll}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 mt-2">
        <Tabs value={linha} onValueChange={(v) => navigate({ search: { linha: v } as any })}>
          <TabsList className={`grid w-full max-w-[400px] ${AUTOMOTIVA_ATIVA ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="AGRICOLA">Linha Agrícola</TabsTrigger>
            {/* Linha automotiva desligada — ver src/lib/linhas.ts */}
            {AUTOMOTIVA_ATIVA && <TabsTrigger value="AUTOMOTIVA">Linha Automotiva</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-32">Categoria</TableHead>
              <TableHead className="w-28">Marca</TableHead>
              <TableHead className="w-24 text-right">Preço de Venda</TableHead>
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
              q.data!.rows.map((p: any) => (
                <TableRow key={p.sku}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="max-w-md truncate">{p.nome}</TableCell>
                  <TableCell>
                    {p.categoria ? <Badge variant="secondary">{p.categoria}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{p.marca ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    {formatBRL(p.preco_brl)}
                  </TableCell>
                  <TableCell className="text-right">{p.estoque}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(p);
                        setImageFiles([]);
                      }}
                    >
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
        <span className="text-muted-foreground">{total.toLocaleString("pt-BR")} produtos</span>
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

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU * (Código do Produto)">
                <Input
                  value={newProduct.sku ?? ""}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  placeholder="EX: 123456"
                />
              </Field>
              <Field label="Título / Nome *">
                <Input
                  value={newProduct.nome ?? ""}
                  onChange={(e) => setNewProduct({ ...newProduct, nome: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Valor de Compra (Custo)">
                <Input
                  type="number"
                  step="0.01"
                  value={newProduct.valor_compra ?? ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      valor_compra: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Valor de Venda (Normal)">
                <Input
                  type="number"
                  step="0.01"
                  value={newProduct.preco_brl ?? ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      preco_brl: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Valor Promocional">
                <Input
                  type="number"
                  step="0.01"
                  value={newProduct.valor_promocional ?? ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      valor_promocional: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Linha">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={newProduct.linha || "AGRICOLA"}
                  onChange={(e) => setNewProduct({ ...newProduct, linha: e.target.value })}
                >
                  <option value="AGRICOLA">Linha Agrícola</option>
                  {AUTOMOTIVA_ATIVA && <option value="AUTOMOTIVA">Linha Automotiva</option>}
                </select>
              </Field>
              <Field label="Categoria">
                <CategorySelect
                  value={newProduct.category_id}
                  onChange={(id, name) =>
                    setNewProduct({
                      ...newProduct,
                      category_id: id ?? undefined,
                      categoria: name ?? undefined,
                    })
                  }
                />
              </Field>
              <Field label="Marca">
                <Input
                  value={newProduct.marca ?? ""}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, marca: e.target.value || undefined })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Field label="Qtd Estoque">
                <Input
                  type="number"
                  value={newProduct.estoque ?? ""}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, estoque: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="Peso (kg)">
                <Input
                  type="number"
                  step="0.001"
                  value={newProduct.peso ?? ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      peso: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Altura (cm)">
                <Input
                  type="number"
                  step="0.01"
                  value={newProduct.altura ?? ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      altura: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Largura (cm)">
                <Input
                  type="number"
                  step="0.01"
                  value={newProduct.largura ?? ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      largura: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Tamanho (Descritivo)">
              <Input
                value={newProduct.tamanho ?? ""}
                placeholder="Ex: Único, M, G, 10x10..."
                onChange={(e) =>
                  setNewProduct({ ...newProduct, tamanho: e.target.value || undefined })
                }
              />
            </Field>

            <Field label="Veículos Compatíveis">
              <Textarea
                value={newProduct.veiculos_compativeis ?? ""}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    veiculos_compativeis: e.target.value || undefined,
                  })
                }
                placeholder="Ex: Trator X 2015-2020, Trator Y..."
                rows={2}
              />
            </Field>

            <Field label="Descrição do Produto">
              <Textarea
                value={newProduct.descricao ?? ""}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, descricao: e.target.value || undefined })
                }
                rows={4}
              />
            </Field>

            <Field label="Imagens Adicionais (Até 10)">
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 10) {
                      toast.error("Máximo 10 imagens por vez.");
                      return;
                    }
                    setImageFiles(files);
                  }}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {imageFiles.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {imageFiles.length} arquivo(s) selecionado(s).
                  </div>
                )}
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate(newProduct)} disabled={create.isPending}>
              {create.isPending ? "Salvando…" : "Salvar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar produto {editing?.sku}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <Field label="Título / Nome">
                <Input
                  value={editing.nome}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Valor Compra">
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.valor_compra ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        valor_compra: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Valor Venda (Normal)">
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
                <Field label="Valor Promocional">
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.valor_promocional ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        valor_promocional: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Linha">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={editing.linha || "AGRICOLA"}
                    onChange={(e) => setEditing({ ...editing, linha: e.target.value })}
                  >
                    <option value="AGRICOLA">Linha Agrícola</option>
                    {AUTOMOTIVA_ATIVA && <option value="AUTOMOTIVA">Linha Automotiva</option>}
                  </select>
                </Field>
                <Field label="Categoria">
                  <CategorySelect
                    value={editing.category_id}
                    onChange={(id, name) =>
                      setEditing({ ...editing, category_id: id, categoria: name })
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

              <div className="grid grid-cols-4 gap-3">
                <Field label="Estoque">
                  <Input
                    type="number"
                    value={editing.estoque}
                    onChange={(e) =>
                      setEditing({ ...editing, estoque: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
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
                <Field label="Altura (cm)">
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.altura ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        altura: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Largura (cm)">
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.largura ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        largura: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>

              <Field label="Tamanho (Descritivo)">
                <Input
                  value={editing.tamanho ?? ""}
                  placeholder="Ex: Único, M, G, 10x10..."
                  onChange={(e) => setEditing({ ...editing, tamanho: e.target.value || null })}
                />
              </Field>

              <Field label="Veículos Compatíveis">
                <Textarea
                  value={editing.veiculos_compativeis ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, veiculos_compativeis: e.target.value || null })
                  }
                  rows={2}
                />
              </Field>

              <Field label="Descrição do Produto">
                <Textarea
                  value={editing.descricao ?? ""}
                  onChange={(e) => setEditing({ ...editing, descricao: e.target.value || null })}
                  rows={4}
                />
              </Field>

              <Field label="Adicionar Novas Imagens (Até 10)">
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 10) {
                        toast.error("Máximo 10 imagens por vez.");
                        return;
                      }
                      setImageFiles(files);
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {imageFiles.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {imageFiles.length} novo(s) arquivo(s) selecionado(s).
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
