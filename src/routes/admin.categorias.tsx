import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Tags, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listCategories, createCategory, updateCategory, deleteCategory, uploadCategoryImage, type CategoryWithChildren } from "@/lib/categories";

const searchSchema = z.object({
  linha: z.enum(["AGRICOLA", "AUTOMOTIVA"]).optional().default("AGRICOLA")
});

export const Route = createFileRoute("/admin/categorias")({
  validateSearch: searchSchema,
  component: AdminCategorias,
});

function AdminCategorias() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { linha } = Route.useSearch();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<CategoryWithChildren | null>(null);
  
  const [formData, setFormData] = useState<{ nome: string; parent_id: number | null; image_path: string | null; imageFile: File | null; linha: string }>({
    nome: "",
    parent_id: null,
    image_path: null,
    imageFile: null,
    linha: "AGRICOLA",
  });

  const q = useQuery({
    queryKey: ["categories", linha],
    queryFn: () => listCategories({ linha }),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      let image_path = formData.image_path;
      if (formData.imageFile) {
         image_path = await uploadCategoryImage(formData.imageFile);
      }
      await createCategory({
         nome: formData.nome,
         parent_id: formData.parent_id,
         image_path,
         linha: formData.linha
      });
    },
    onSuccess: () => {
      toast.success("Categoria criada");
      setIsCreating(false);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      let image_path = formData.image_path;
      if (formData.imageFile) {
         image_path = await uploadCategoryImage(formData.imageFile);
      }
      await updateCategory(editing.id, {
         nome: formData.nome,
         parent_id: formData.parent_id,
         image_path,
         linha: formData.linha
      });
    },
    onSuccess: () => {
      toast.success("Categoria atualizada");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await deleteCategory(id);
    },
    onSuccess: () => {
      toast.success("Categoria excluída");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleOpenCreate = () => {
    setFormData({ nome: "", parent_id: null, image_path: null, imageFile: null, linha });
    setIsCreating(true);
  };

  const handleOpenEdit = (cat: CategoryWithChildren) => {
    setEditing(cat);
    setFormData({ nome: cat.nome, parent_id: cat.parent_id, image_path: cat.image_path, imageFile: null, linha: (cat as any).linha || "AGRICOLA" });
  };

  const categorias = q.data ?? [];
  const renderRow = (cat: CategoryWithChildren, level: number = 0) => {
    return (
      <React.Fragment key={cat.id}>
        <TableRow>
          <TableCell>
            <div style={{ paddingLeft: `${level * 1.5}rem` }} className="flex items-center gap-3">
              {cat.image_path ? (
                <img src={cat.image_path.startsWith('/') ? cat.image_path : `/uploads/${cat.image_path}`} alt="" className="w-8 h-8 rounded-md object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                  <Tags className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <span className="font-medium">{level > 0 && "└ "}{cat.nome}</span>
              <Badge variant="outline" className="ml-2 text-[10px]">{(cat as any).linha || "AGRICOLA"}</Badge>
            </div>
          </TableCell>
          <TableCell className="text-right">
            <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(cat)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(cat.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
        {cat.children?.map(child => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <Card className="p-4 border shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            Categorias do Sistema
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as categorias principais, subcategorias e imagens.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <div className="mb-6">
        <Tabs value={linha} onValueChange={(v) => navigate({ search: { linha: v } as any })}>
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="AGRICOLA">Linha Agrícola</TabsTrigger>
            <TabsTrigger value="AUTOMOTIVA">Linha Automotiva</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">Nenhuma categoria encontrada.</TableCell>
              </TableRow>
            ) : (
              categorias.map(c => renderRow(c, 0))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreating || !!editing} onOpenChange={(o) => { if (!o) { setIsCreating(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Motor"
              />
            </div>
            
            <div className="grid gap-1.5">
              <Label>Categoria Pai (Opcional)</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.parent_id || ""}
                onChange={(e) => setFormData(p => ({ ...p, parent_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">-- Nenhuma (Raiz) --</option>
                {(() => {
                  const renderOptions = (list: CategoryWithChildren[], prefix = ""): React.ReactNode[] => {
                    return list.flatMap(c => [
                      <option key={c.id} value={c.id} disabled={editing?.id === c.id}>{prefix}{c.nome}</option>,
                      ...renderOptions(c.children || [], prefix + c.nome + " > ")
                    ]);
                  };
                  return renderOptions(categorias);
                })()}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label>Linha</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.linha}
                onChange={(e) => setFormData(p => ({ ...p, linha: e.target.value }))}
              >
                <option value="AGRICOLA">Linha Agrícola</option>
                <option value="AUTOMOTIVA">Linha Automotiva</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label>Imagem (Opcional)</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 hover:bg-muted/50">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">
                  {formData.imageFile ? formData.imageFile.name : formData.image_path ? "Imagem atual (clique para trocar)" : "Selecionar foto"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFormData(p => ({ ...p, imageFile: e.target.files?.[0] || null }))}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditing(null); }}>
              Cancelar
            </Button>
            <Button onClick={() => editing ? updateMut.mutate() : createMut.mutate()} disabled={createMut.isPending || updateMut.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
