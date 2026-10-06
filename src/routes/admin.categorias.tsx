import { useEffect, useMemo, useState } from "react";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Tags, Pencil, Trash2, Upload, ExternalLink, AlertTriangle, Package, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  type CategoryWithChildren,
} from "@/lib/categories";
import { getStats } from "@/lib/products";
import { CATEGORIAS } from "@/lib/navegacao";

const searchSchema = z.object({
  linha: z.enum(["AGRICOLA", "AUTOMOTIVA"]).optional().default("AGRICOLA"),
});

export const Route = createFileRoute("/admin/categorias")({
  validateSearch: searchSchema,
  component: AdminCategorias,
});

const urlImagem = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);
const iconeDe = (nome: string) => CATEGORIAS.find((c) => c.nome === nome)?.icon ?? Tags;
const pecasDiretas = (c: CategoryWithChildren) => ((c as any)._count?.agricolas ?? 0) + ((c as any)._count?.products ?? 0);
const pecasTotal = (c: CategoryWithChildren) => ((c as any).totalProducts as number) ?? pecasDiretas(c);

type Form = {
  nome: string;
  parent_id: number | null;
  image_path: string | null;
  imageFile: File | null;
  linha: string;
};

function AdminCategorias() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { linha } = Route.useSearch();

  const [editando, setEditando] = useState<CategoryWithChildren | "nova" | null>(null);
  const [excluindo, setExcluindo] = useState<CategoryWithChildren | null>(null);

  const q = useQuery({ queryKey: ["categories", linha], queryFn: () => listCategories({ linha }) });
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: getStats });

  // Lista plana (categoria + subcategorias), para selects e contagens
  const raiz = q.data ?? [];
  const todas = useMemo(() => {
    const out: CategoryWithChildren[] = [];
    const visitar = (l: CategoryWithChildren[]) => l.forEach((c) => (out.push(c), visitar(c.children ?? [])));
    visitar(raiz);
    return out;
  }, [raiz]);

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["categorias_loja"] });
    qc.invalidateQueries({ queryKey: ["facets"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const totalPecas = raiz.reduce((s, c) => s + pecasTotal(c), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Tags className="h-6 w-6 text-primary" /> Categorias
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Categorias são por <strong>tipo de peça</strong> (Filtros, Vedações…). A marca do trator
            (Massey, Valtra…) é o campo <strong>Marca</strong> de cada produto e aparece em
            "Montadoras" na loja. O que você muda aqui aparece no site na hora (menu, home e filtros).
          </p>
        </div>
        <Button onClick={() => setEditando("nova")}>
          <Plus className="mr-2 h-4 w-4" /> Nova categoria
        </Button>
      </div>

      {AUTOMOTIVA_ATIVA && (
        <Tabs value={linha} onValueChange={(v) => navigate({ search: { linha: v } as any })}>
          <TabsList>
            <TabsTrigger value="AGRICOLA">Linha Agrícola</TabsTrigger>
            <TabsTrigger value="AUTOMOTIVA">Linha Automotiva</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categorias</div>
          <div className="mt-1 text-2xl font-black">{q.isLoading ? "…" : todas.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Peças categorizadas
          </div>
          <div className="mt-1 text-2xl font-black">{q.isLoading ? "…" : totalPecas.toLocaleString("pt-BR")}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sem categoria</div>
          <div className="mt-1 text-2xl font-black">
            {stats.isLoading ? "…" : (stats.data?.semCategoria ?? 0).toLocaleString("pt-BR")}
          </div>
          <p className="text-[11px] text-muted-foreground">Não aparecem ao navegar na loja (só na busca).</p>
        </Card>
      </div>

      {/* Lista */}
      {q.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : raiz.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed p-10 text-center text-muted-foreground">
          <Tags className="h-8 w-8" /> Nenhuma categoria ainda.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {raiz.map((c) => (
            <CartaoCategoria
              key={c.id}
              cat={c}
              onEditar={setEditando}
              onExcluir={setExcluindo}
            />
          ))}
        </div>
      )}

      <DialogoCategoria
        alvo={editando}
        linha={linha}
        todas={todas}
        onFechar={() => setEditando(null)}
        onSalvo={atualizar}
      />
      <DialogoExcluir
        cat={excluindo}
        todas={todas}
        onFechar={() => setExcluindo(null)}
        onExcluido={atualizar}
      />
    </div>
  );
}

function CartaoCategoria({
  cat,
  onEditar,
  onExcluir,
}: {
  cat: CategoryWithChildren;
  onEditar: (c: CategoryWithChildren) => void;
  onExcluir: (c: CategoryWithChildren) => void;
}) {
  const Icone = iconeDe(cat.nome);
  const total = pecasTotal(cat);
  return (
    <Card className="flex flex-col gap-3 p-4 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
          {cat.image_path ? (
            <img src={urlImagem(cat.image_path)} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icone className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{cat.nome}</h3>
          <p className={total ? "text-sm text-muted-foreground" : "text-sm font-medium text-amber-600"}>
            {total ? `${total.toLocaleString("pt-BR")} peças` : "Vazia — não aparece no site"}
          </p>
          {(cat.children?.length ?? 0) > 0 && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Subcategorias: {cat.children!.map((s) => s.nome).join(", ")}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-center gap-1 border-t pt-3">
        <Button size="sm" variant="ghost" onClick={() => onEditar(cat)}>
          <Pencil className="mr-1.5 h-4 w-4" /> Editar
        </Button>
        {total > 0 && (
          <Button size="sm" variant="ghost" asChild>
            <a href={`/loja?categoria=${encodeURIComponent(cat.nome)}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" /> Ver na loja
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive hover:text-destructive"
          onClick={() => onExcluir(cat)}
        >
          <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
        </Button>
      </div>
    </Card>
  );
}

function DialogoCategoria({
  alvo,
  linha,
  todas,
  onFechar,
  onSalvo,
}: {
  alvo: CategoryWithChildren | "nova" | null;
  linha: string;
  todas: CategoryWithChildren[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const editando = alvo && alvo !== "nova" ? alvo : null;
  const [form, setForm] = useState<Form>({ nome: "", parent_id: null, image_path: null, imageFile: null, linha });

  useEffect(() => {
    if (!alvo) return;
    setForm(
      editando
        ? {
            nome: editando.nome,
            parent_id: editando.parent_id,
            image_path: editando.image_path,
            imageFile: null,
            linha: (editando as any).linha || "AGRICOLA",
          }
        : { nome: "", parent_id: null, image_path: null, imageFile: null, linha },
    );
  }, [alvo]);

  // Prévia da imagem (nova escolhida ou atual)
  const [previa, setPrevia] = useState<string | null>(null);
  useEffect(() => {
    if (form.imageFile) {
      const u = URL.createObjectURL(form.imageFile);
      setPrevia(u);
      return () => URL.revokeObjectURL(u);
    }
    setPrevia(form.image_path ? urlImagem(form.image_path) : null);
  }, [form.imageFile, form.image_path]);

  // Não pode escolher como pai a própria categoria nem uma subcategoria dela
  const proibidos = useMemo(() => {
    const ids = new Set<number>();
    const marcar = (c: CategoryWithChildren) => (ids.add(c.id), (c.children ?? []).forEach(marcar));
    if (editando) marcar(editando);
    return ids;
  }, [editando]);

  const salvar = useMutation({
    mutationFn: async () => {
      let image_path = form.image_path;
      if (form.imageFile) image_path = await uploadCategoryImage(form.imageFile);
      const dados = { nome: form.nome.trim(), parent_id: form.parent_id, image_path, linha: form.linha };
      if (editando) await updateCategory(editando.id, dados);
      else await createCategory(dados);
    },
    onSuccess: () => {
      toast.success(editando ? "Categoria atualizada" : "Categoria criada");
      onSalvo();
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renomeando = editando && form.nome.trim() && form.nome.trim() !== editando.nome;
  const pecas = editando ? pecasDiretas(editando) : 0;

  return (
    <Dialog open={!!alvo} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Nome</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Ex.: Filtros"
              autoFocus
            />
            {renomeando && pecas > 0 && (
              <p className="text-xs text-muted-foreground">
                O nome também será atualizado nas {pecas.toLocaleString("pt-BR")} peças desta categoria.
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>Categoria pai (opcional)</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.parent_id ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">Nenhuma (categoria principal)</option>
              {todas
                .filter((c) => !proibidos.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </div>

          {AUTOMOTIVA_ATIVA && (
            <div className="grid gap-1.5">
              <Label>Linha</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.linha}
                onChange={(e) => setForm((p) => ({ ...p, linha: e.target.value }))}
              >
                <option value="AGRICOLA">Linha Agrícola</option>
                <option value="AUTOMOTIVA">Linha Automotiva</option>
              </select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>Imagem (opcional)</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {previa ? (
                  <img src={previa} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" /> {previa ? "Trocar imagem" : "Escolher imagem"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setForm((p) => ({ ...p, imageFile: e.target.files?.[0] || null }))}
                  />
                </label>
                {previa && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setForm((p) => ({ ...p, image_path: null, imageFile: null }))}
                  >
                    <X className="h-3 w-3" /> Remover imagem
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Aparece no círculo da categoria na página inicial. Quadrada, a partir de 200 × 200 px.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending || !form.nome.trim()}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoExcluir({
  cat,
  todas,
  onFechar,
  onExcluido,
}: {
  cat: CategoryWithChildren | null;
  todas: CategoryWithChildren[];
  onFechar: () => void;
  onExcluido: () => void;
}) {
  const [destino, setDestino] = useState<number | null>(null);
  useEffect(() => setDestino(null), [cat]);
  const pecas = cat ? pecasDiretas(cat) : 0;
  const subcats = cat?.children?.length ?? 0;

  const excluir = useMutation({
    mutationFn: () => deleteCategory(cat!.id, pecas > 0 ? destino : null),
    onSuccess: (r) => {
      toast.success(
        r.movidas > 0
          ? `Categoria excluída; ${r.movidas.toLocaleString("pt-BR")} peças movidas`
          : "Categoria excluída",
      );
      onExcluido();
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!cat} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir "{cat?.nome}"?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {pecas > 0 ? (
            <>
              <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Esta categoria tem {pecas.toLocaleString("pt-BR")} peças. Peça sem categoria some da
                navegação da loja, então escolha para onde movê-las.
              </p>
              <div className="grid gap-1.5">
                <Label>Mover as peças para</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={destino ?? ""}
                  onChange={(e) => setDestino(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Escolha uma categoria…</option>
                  {todas
                    .filter((c) => c.id !== cat?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">A categoria está vazia; nenhuma peça será afetada.</p>
          )}
          {subcats > 0 && (
            <p className="text-muted-foreground">Suas {subcats} subcategorias viram categorias principais.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => excluir.mutate()}
            disabled={excluir.isPending || (pecas > 0 && !destino)}
          >
            {excluir.isPending ? "Excluindo…" : pecas > 0 ? "Mover peças e excluir" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
