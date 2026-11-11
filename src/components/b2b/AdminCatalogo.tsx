// Admin → Empresas (atacado) → Catálogo de exportação: categorias e produtos só do atacado do
// Uruguai, com todos os dados da exportação (NCM, origem e prova, peso/medidas, embalagem, preço USD).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  Check,
  FolderPlus,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Selo } from "@/components/b2b/B2bLayout";
import {
  apagarCategoriaFn,
  apagarProdutoFn,
  catalogoAdminFn,
  dadosDaLojaFn,
  salvarCategoriaFn,
  salvarProdutoFn,
} from "@/lib/exportacao/catalogo";
import {
  acordoDaNcm,
  formatarNcm,
  PROVAS,
  STATUS_ORIGEM_PT,
  type StatusOrigem,
} from "@/lib/aduana/aduana-comum";
import { usd } from "@/lib/b2b-comum";
import { cn } from "@/lib/utils";

type Dados = Awaited<ReturnType<typeof catalogoAdminFn>>;
type Prod = Dados["produtos"][number];
type Cat = Dados["categorias"][number];

const UNIDADES: Record<string, string> = {
  UN: "Unidade",
  PAR: "Par",
  JG: "Jogo",
  KIT: "Kit",
  CX: "Caixa",
  M: "Metro",
  KG: "Quilo",
};

export function AdminCatalogo() {
  const qc = useQueryClient();
  const [categoria, setCategoria] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [pendencia, setPendencia] = useState("");
  const [editando, setEditando] = useState<Partial<Prod> | null>(null);
  const [cat, setCat] = useState<Partial<Cat> | null>(null);
  const { data, isFetching } = useQuery({
    queryKey: ["exp-catalogo", categoria, busca, pendencia],
    queryFn: () => catalogoAdminFn({ data: { categoria, q: busca, pendencia } }),
  });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["exp-catalogo"] });
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold">Categorias</p>
          <Button size="sm" variant="ghost" onClick={() => setCat({ ativa: true, ordem: 0 })}>
            <FolderPlus className="mr-1 h-4 w-4" /> Nova
          </Button>
        </div>
        <ul className="space-y-0.5 text-sm">
          <li>
            <button
              onClick={() => setCategoria(null)}
              className={cn(
                "w-full rounded-md px-2 py-1.5 text-left",
                categoria === null && "bg-primary/10 font-semibold text-primary",
              )}
            >
              Todos os produtos
            </button>
          </li>
          {data?.categorias.map((c) => (
            <li key={c.id} className="group flex items-center">
              <button
                onClick={() => setCategoria(c.id)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-left",
                  categoria === c.id && "bg-primary/10 font-semibold text-primary",
                  !c.ativa && "text-muted-foreground line-through",
                )}
              >
                {c.nome_es} <span className="text-xs text-muted-foreground">({c.produtos})</span>
              </button>
              <button
                aria-label="Editar categoria"
                className="p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                onClick={() => setCat(c)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => setCategoria(0)}
              className={cn(
                "w-full rounded-md px-2 py-1.5 text-left text-muted-foreground",
                categoria === 0 && "bg-primary/10 font-semibold text-primary",
              )}
            >
              Sem categoria
            </button>
          </li>
        </ul>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setBusca(q.trim());
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Código, nome, aplicação, NCM…"
              className="w-64"
            />
            <Button type="submit" size="icon" variant="secondary" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <select
            className="h-10 rounded-md border bg-background px-2 text-sm"
            value={pendencia}
            onChange={(e) => setPendencia(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="SEM_NCM">Sem NCM</option>
            <option value="SEM_ORIGEM">Origem não comprovada</option>
            <option value="SEM_PRECO">Sem preço USD</option>
            <option value="SEM_PESO">Sem peso</option>
          </select>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button
            className="ml-auto"
            onClick={() =>
              setEditando({
                ativo: true,
                unidade: "UN",
                categoria_id: categoria || null,
                origem_status: "A_VERIFICAR",
              })
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Novo produto
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3">NCM / acordo</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Logística</th>
                <th className="p-3 text-right">Preço USD</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data?.produtos.map((p) => {
                const a = acordoDaNcm(p.ncm);
                return (
                  <tr key={p.id} className={cn("border-t align-top", !p.ativo && "opacity-50")}>
                    <td className="p-3">
                      <div className="flex gap-3">
                        {p.foto ? (
                          <img
                            src={p.foto}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-md border bg-white object-contain"
                          />
                        ) : (
                          <span className="h-12 w-12 shrink-0 rounded-md bg-muted" />
                        )}
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-semibold">{p.nome_es}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {p.codigo}
                            {p.marca && ` · ${p.marca}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.categoria ?? "sem categoria"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      <p className="font-mono">{formatarNcm(p.ncm)}</p>
                      <p className="text-muted-foreground">
                        {a
                          ? a.acordo === "ACE02"
                            ? "ACE 02 · 76º PA"
                            : "ACE 18 · ROM"
                          : "falta NCM"}
                      </p>
                    </td>
                    <td className="p-3">
                      <Selo
                        tom={
                          p.origem_status === "COMPROVADA"
                            ? "verde"
                            : p.origem_status === "EXTRAZONA"
                              ? "vermelho"
                              : "ambar"
                        }
                      >
                        {STATUS_ORIGEM_PT[p.origem_status].split(" (")[0]}
                      </Selo>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {p.peso_liquido ? `${p.peso_liquido} kg` : "sem peso"}
                      {p.embalagem ? ` · cx ${p.embalagem} ${p.unidade}` : ""}
                      {p.minimo ? ` · mín. ${p.minimo}` : ""}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {p.preco_usd != null ? usd(p.preco_usd) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditando(p)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {data && !data.produtos.length && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">
                    Nenhum produto aqui. Clique em <b>Novo produto</b> (dá para puxar os dados de
                    uma peça da loja).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editando && (
        <EditorProduto
          inicial={editando}
          categorias={data?.categorias ?? []}
          fechar={() => setEditando(null)}
          salvo={recarregar}
        />
      )}
      {cat && <EditorCategoria inicial={cat} fechar={() => setCat(null)} salvo={recarregar} />}
    </div>
  );
}

function EditorCategoria({
  inicial,
  fechar,
  salvo,
}: {
  inicial: Partial<Cat>;
  fechar: () => void;
  salvo: () => void;
}) {
  const [f, setF] = useState(inicial);
  const salvar = async () => {
    try {
      await salvarCategoriaFn({ data: f });
      toast.success("Categoria salva");
      salvo();
      fechar();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{f.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Rot r="Nome em espanhol (o cliente vê)">
            <Input
              value={f.nome_es ?? ""}
              onChange={(e) => setF({ ...f, nome_es: e.target.value })}
              placeholder="Ej.: Filtros"
            />
          </Rot>
          <Rot r="Nome em português (interno)">
            <Input
              value={f.nome_pt ?? ""}
              onChange={(e) => setF({ ...f, nome_pt: e.target.value })}
            />
          </Rot>
          <Rot r="Descrição curta (espanhol)">
            <Input
              value={f.descricao ?? ""}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
            />
          </Rot>
          <div className="grid grid-cols-2 gap-3">
            <Rot r="Ordem">
              <Input
                type="number"
                value={f.ordem ?? 0}
                onChange={(e) => setF({ ...f, ordem: Number(e.target.value) })}
              />
            </Rot>
            <label className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={f.ativa !== false}
                onChange={(e) => setF({ ...f, ativa: e.target.checked })}
              />
              Ativa
            </label>
          </div>
          <div className="flex justify-between border-t pt-3">
            {f.id ? (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  await apagarCategoriaFn({ data: { id: f.id! } });
                  toast.success("Categoria apagada (produtos ficaram sem categoria)");
                  salvo();
                  fechar();
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Apagar
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={salvar}>
              <Save className="mr-1.5 h-4 w-4" /> Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditorProduto({
  inicial,
  categorias,
  fechar,
  salvo,
}: {
  inicial: Partial<Prod>;
  categorias: Cat[];
  fechar: () => void;
  salvo: () => void;
}) {
  const [f, setF] = useState<Partial<Prod>>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [qLoja, setQLoja] = useState("");
  const [buscandoLoja, setBuscandoLoja] = useState(false);
  const [loja, setLoja] = useState<Awaited<ReturnType<typeof dadosDaLojaFn>>>([]);
  const [enviando, setEnviando] = useState(false);
  const foto = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Prod>) => setF((x) => ({ ...x, ...p }));
  const a = acordoDaNcm(f.ncm);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarProdutoFn({ data: f as any });
      toast.success("Produto salvo");
      salvo();
      fechar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const enviarFoto = async (file: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/exportacao/foto", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      set({ foto: j.url });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };
  const n = (k: keyof Prod) => ({
    value: (f[k] as any) ?? "",
    inputMode: "decimal" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set({ [k]: e.target.value === "" ? null : e.target.value } as any),
  });
  const sel = "h-10 w-full rounded-md border bg-background px-2 text-sm";
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f.id ? `Editar ${f.codigo}` : "Novo produto de exportação"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          {!f.id && (
            <Card className="space-y-2 p-3">
              <p className="text-xs font-semibold">Puxar dados de uma peça da loja (opcional)</p>
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBuscandoLoja(true);
                  try {
                    setLoja(await dadosDaLojaFn({ data: { q: qLoja } }));
                  } finally {
                    setBuscandoLoja(false);
                  }
                }}
              >
                <Input
                  value={qLoja}
                  onChange={(e) => setQLoja(e.target.value)}
                  placeholder="Código ou nome da peça na loja"
                />
                <Button type="submit" variant="secondary" disabled={buscandoLoja}>
                  {buscandoLoja ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
              {loja.length > 0 && (
                <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
                  {loja.map((l) => (
                    <li key={l.sku_loja}>
                      <button
                        className="flex w-full items-center gap-2 p-2 text-left hover:bg-muted"
                        onClick={() => {
                          set({ ...l, nome_es: l.nome_es || l.nome_pt } as any);
                          setLoja([]);
                          toast.success("Dados puxados. Confira antes de salvar.");
                        }}
                      >
                        {l.foto && (
                          <img src={l.foto} alt="" className="h-8 w-8 rounded object-contain" />
                        )}
                        <span className="flex-1 truncate text-xs">
                          <b className="font-mono">{l.codigo}</b> · {l.nome_pt}
                        </span>
                        <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Secao t="Identificação">
            <Rot r="Código (part number) *">
              <Input
                className="font-mono"
                value={f.codigo ?? ""}
                onChange={(e) => set({ codigo: e.target.value })}
              />
            </Rot>
            <Rot r="Códigos alternativos / equivalentes">
              <Input
                value={f.codigos_alt ?? ""}
                onChange={(e) => set({ codigos_alt: e.target.value })}
                placeholder="separados por vírgula"
              />
            </Rot>
            <Rot r="Categoria">
              <select
                className={sel}
                value={f.categoria_id ?? ""}
                onChange={(e) =>
                  set({ categoria_id: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_es}
                  </option>
                ))}
              </select>
            </Rot>
            <Rot r="Nome em espanhol (o cliente vê) *" className="md:col-span-2">
              <Input value={f.nome_es ?? ""} onChange={(e) => set({ nome_es: e.target.value })} />
            </Rot>
            <Rot r="Nome em português (NF-e)">
              <Input value={f.nome_pt ?? ""} onChange={(e) => set({ nome_pt: e.target.value })} />
            </Rot>
            <Rot r="Marca / máquina">
              <Input
                value={f.marca ?? ""}
                onChange={(e) => set({ marca: e.target.value })}
                placeholder="John Deere, Valtra…"
              />
            </Rot>
            <Rot r="Aplicação (modelos)" className="md:col-span-2">
              <Input
                value={f.aplicacao ?? ""}
                onChange={(e) => set({ aplicacao: e.target.value })}
              />
            </Rot>
            <Rot r="Descrição (espanhol)" className="md:col-span-3">
              <Textarea
                rows={2}
                value={f.descricao_es ?? ""}
                onChange={(e) => set({ descricao_es: e.target.value })}
              />
            </Rot>
          </Secao>

          <Secao t="Classificação fiscal e origem (base para a preferência Mercosul)">
            <Rot r="NCM (8 dígitos)">
              <Input
                className="font-mono"
                value={f.ncm ?? ""}
                onChange={(e) => set({ ncm: e.target.value })}
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {a ? a.rotulo : "A NCM define o acordo e a regra de origem"}
              </span>
            </Rot>
            <Rot r="Fabricante">
              <Input
                value={f.fabricante ?? ""}
                onChange={(e) => set({ fabricante: e.target.value })}
              />
            </Rot>
            <Rot r="País de fabricação">
              <select
                className={sel}
                value={f.pais_origem ?? ""}
                onChange={(e) => set({ pais_origem: e.target.value || null })}
              >
                <option value="">—</option>
                <option value="BR">Brasil</option>
                <option value="AR">Argentina</option>
                <option value="UY">Uruguai</option>
                <option value="PY">Paraguai</option>
                <option value="XX">Fora do Mercosul</option>
              </select>
            </Rot>
            <Rot r="Situação da origem">
              <select
                className={sel}
                value={f.origem_status ?? "A_VERIFICAR"}
                onChange={(e) => set({ origem_status: e.target.value as StatusOrigem })}
              >
                {Object.entries(STATUS_ORIGEM_PT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Rot>
            <Rot r="Prova de origem">
              <select
                className={sel}
                value={f.prova ?? ""}
                onChange={(e) => set({ prova: e.target.value || null })}
              >
                <option value="">—</option>
                {Object.entries(PROVAS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Rot>
            <Rot r="Data do documento (vale 12 meses)">
              <Input
                type="date"
                value={f.prova_data ?? ""}
                onChange={(e) => set({ prova_data: e.target.value || null })}
              />
            </Rot>
            <Rot r="Nº / referência da prova">
              <Input
                value={f.prova_ref ?? ""}
                onChange={(e) => set({ prova_ref: e.target.value })}
              />
            </Rot>
            <Rot r="TEC no Uruguai sem preferência (%)">
              <Input {...n("aec")} />
            </Rot>
          </Secao>

          <Secao t="Logística">
            <Rot r="Unidade">
              <select
                className={sel}
                value={f.unidade ?? "UN"}
                onChange={(e) => set({ unidade: e.target.value as any })}
              >
                {Object.entries(UNIDADES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Rot>
            <Rot r="Unidades por caixa">
              <Input {...n("embalagem")} />
            </Rot>
            <Rot r="Mínimo por pedido (vazio = padrão)">
              <Input {...n("minimo")} />
            </Rot>
            <Rot r="Peso líquido (kg/un)">
              <Input {...n("peso_liquido")} />
            </Rot>
            <Rot r="Peso bruto (kg/un)">
              <Input {...n("peso_bruto")} />
            </Rot>
            <Rot r="Medidas C × L × A (cm)">
              <div className="flex gap-1">
                <Input {...n("comprimento")} placeholder="C" />
                <Input {...n("largura")} placeholder="L" />
                <Input {...n("altura")} placeholder="A" />
              </div>
            </Rot>
          </Secao>

          <Secao t="Comercial">
            <Rot r="Preço base USD (antes do desconto da empresa)">
              <Input {...n("preco_usd")} />
            </Rot>
            <Rot r="Custo R$ (interno; sem preço USD, o sugerido sai do custo + margem)">
              <Input {...n("custo_brl")} />
            </Rot>
            <Rot r="Estoque (unidades)">
              <Input {...n("estoque")} />
            </Rot>
            <Rot r="Prazo próprio (espanhol)">
              <Input
                value={f.prazo ?? ""}
                onChange={(e) => set({ prazo: e.target.value })}
                placeholder="Ej.: 30 días"
              />
            </Rot>
            <Rot r="Nota interna" className="md:col-span-2">
              <Input value={f.nota ?? ""} onChange={(e) => set({ nota: e.target.value })} />
            </Rot>
          </Secao>

          <div className="flex flex-wrap items-center gap-4">
            {f.foto ? (
              <img
                src={f.foto}
                alt=""
                className="h-20 w-20 rounded-lg border bg-white object-contain"
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-lg bg-muted text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
              </span>
            )}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => foto.current?.click()}
                disabled={enviando}
              >
                {enviando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-1.5 h-4 w-4" />
                )}
                Enviar foto
              </Button>
              <Input
                className="h-8 w-80 text-xs"
                value={f.foto ?? ""}
                onChange={(e) => set({ foto: e.target.value })}
                placeholder="ou link da foto"
              />
            </div>
            <input
              ref={foto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) enviarFoto(file);
                e.target.value = "";
              }}
            />
            <label className="ml-auto flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={f.ativo !== false}
                onChange={(e) => set({ ativo: e.target.checked })}
              />
              Ativo (aparece para as empresas)
            </label>
          </div>

          <div className="flex justify-between border-t pt-4">
            {f.id ? (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  if (!confirm("Apagar este produto do catálogo de exportação?")) return;
                  await apagarProdutoFn({ data: { id: f.id! } });
                  toast.success("Produto apagado");
                  salvo();
                  fechar();
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Apagar
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Salvar produto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Secao({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t}
      </legend>
      <div className="grid gap-3 md:grid-cols-3">{children}</div>
    </fieldset>
  );
}
function Rot({
  r,
  children,
  className,
}: {
  r: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium">{r}</span>
      {children}
    </label>
  );
}
