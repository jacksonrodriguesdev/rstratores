// Nova venda: resultados da busca de peças com edição rápida do preço de compra e de venda
// (em R$, como no cadastro), cadastro na hora de uma peça que não existe e o editor completo
// da peça (fotos, categoria, medidas) num diálogo, sem sair da venda.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProdutoEditor } from "@/components/admin/ProdutoEditor";
import { criarPecaRapidaFn, salvarPrecoPecaFn } from "@/lib/avaliacoes";
import { cn } from "@/lib/utils";

export type PecaBusca = {
  sku: string;
  codigo: string;
  nome: string;
  uyu: number | null;
  brl: number | null;
  custo: number | null;
  precoBrl: number | null;
};

const fmt = (v: number | null | undefined, moeda: string) =>
  v == null
    ? "sem preço"
    : moeda === "BRL"
      ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$U ${v.toLocaleString("es-UY", { maximumFractionDigits: 0 })}`;
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const margem = (custo: number | null, venda: number | null) =>
  custo && venda && custo > 0
    ? `${Math.round(((venda - custo) / custo) * 100)}% sobre a compra`
    : "";

// Campos de compra e venda (R$) com a margem
function CamposPreco({
  custo,
  venda,
  setCusto,
  setVenda,
}: {
  custo: string;
  venda: string;
  setCusto: (v: string) => void;
  setVenda: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-[11px] font-semibold text-muted-foreground">
        Compra (R$)
        <Input
          inputMode="decimal"
          className="mt-0.5 h-8"
          value={custo}
          onChange={(e) => setCusto(e.target.value)}
        />
      </label>
      <label className="text-[11px] font-semibold text-muted-foreground">
        Venda (R$)
        <Input
          inputMode="decimal"
          className="mt-0.5 h-8"
          value={venda}
          onChange={(e) => setVenda(e.target.value)}
        />
      </label>
      <p className="col-span-2 text-[11px] text-muted-foreground">
        {margem(num(custo), num(venda)) || "O preço em $U sai da cotação do dia."}
      </p>
    </div>
  );
}

export function ResultadosPecas({
  pecas,
  busca,
  moeda,
  aoAdicionar,
}: {
  pecas: PecaBusca[] | undefined;
  busca: string;
  moeda: "UYU" | "BRL";
  aoAdicionar: (p: PecaBusca) => void;
}) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<string | null>(null);
  const [custo, setCusto] = useState("");
  const [venda, setVenda] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState(false);

  if (!busca) return null;
  const abrir = (p: PecaBusca) => {
    setEditando(p.sku);
    setCusto(p.custo == null ? "" : String(p.custo));
    setVenda(p.precoBrl == null ? "" : String(p.precoBrl));
  };
  const salvar = async (p: PecaBusca, adicionar: boolean) => {
    setSalvando(true);
    try {
      const r = await salvarPrecoPecaFn({
        data: { sku: p.sku, custo: num(custo), venda: num(venda) },
      });
      toast.success(`Preço de ${r.codigo} salvo no cadastro`);
      qc.invalidateQueries({ queryKey: ["venda-pecas"] });
      setEditando(null);
      if (adicionar) aoAdicionar(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-2">
      {!!pecas?.length && (
        <div className="max-h-72 overflow-y-auto rounded-md border p-1">
          {pecas.map((p) => (
            <div key={p.sku} className={cn("rounded", editando === p.sku && "bg-muted/60 p-2")}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => aoAdicionar(p)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">
                    <b>{p.codigo}</b> · {p.nome}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmt(moeda === "BRL" ? p.brl : p.uyu, moeda)}
                  </span>
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  title="Editar preço de compra e venda"
                  onClick={() => (editando === p.sku ? setEditando(null) : abrir(p))}
                >
                  {editando === p.sku ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              {editando === p.sku && (
                <div className="mt-2 space-y-2 px-2">
                  <CamposPreco
                    custo={custo}
                    venda={venda}
                    setCusto={setCusto}
                    setVenda={setVenda}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={salvando}
                      onClick={() => salvar(p, true)}
                    >
                      {salvando ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-3.5 w-3.5" />
                      )}
                      Salvar e adicionar à venda
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={salvando}
                      onClick={() => salvar(p, false)}
                    >
                      Só salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pecas && !pecas.length && !novo && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3 text-sm">
          <span className="text-muted-foreground">Nenhuma peça com «{busca}».</span>
          <Button type="button" size="sm" onClick={() => setNovo(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Cadastrar esta peça
          </Button>
        </div>
      )}
      {pecas && !!pecas.length && !novo && (
        <button
          type="button"
          onClick={() => setNovo(true)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          + Não é nenhuma destas? Cadastrar peça nova
        </button>
      )}
      {novo && (
        <CadastroRapido
          codigoInicial={busca}
          fechar={() => setNovo(false)}
          aoCriar={(p) => {
            qc.invalidateQueries({ queryKey: ["venda-pecas"] });
            setNovo(false);
            aoAdicionar(p);
          }}
        />
      )}
    </div>
  );
}

function CadastroRapido({
  codigoInicial,
  fechar,
  aoCriar,
}: {
  codigoInicial: string;
  fechar: () => void;
  aoCriar: (p: PecaBusca) => void;
}) {
  // Busca que parece código (sem espaço) já vira o código; senão vira o nome
  const pareceCodigo = !/\s/.test(codigoInicial.trim());
  const [codigo, setCodigo] = useState(pareceCodigo ? codigoInicial.trim().toUpperCase() : "");
  const [nome, setNome] = useState(pareceCodigo ? "" : codigoInicial.trim());
  const [marca, setMarca] = useState("");
  const [custo, setCusto] = useState("");
  const [venda, setVenda] = useState("");
  const [salvando, setSalvando] = useState(false);
  const criar = async () => {
    setSalvando(true);
    try {
      const p = await criarPecaRapidaFn({
        data: { codigo, nome, marca, custo: num(custo), venda: num(venda) },
      });
      toast.success(`Peça ${p.codigo} cadastrada e adicionada à venda`);
      aoCriar(p);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <div className="space-y-2 rounded-md border bg-muted/40 p-3">
      <p className="text-sm font-bold">Cadastrar peça nova</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] font-semibold text-muted-foreground">
          Código *
          <Input
            className="mt-0.5 h-8 font-mono"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          Marca (opcional)
          <Input
            className="mt-0.5 h-8"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Massey Ferguson…"
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground sm:col-span-2">
          Nome da peça *
          <Input
            className="mt-0.5 h-8"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Rolamento da embreagem MF 290"
          />
        </label>
      </div>
      <CamposPreco custo={custo} venda={venda} setCusto={setCusto} setVenda={setVenda} />
      <p className="text-[11px] text-muted-foreground">
        Fotos, categoria e descrição você completa depois no botão «Fotos e cadastro» da peça.
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={salvando} onClick={criar}>
          {salvando ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3.5 w-3.5" />
          )}
          Cadastrar e adicionar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={fechar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// Botão da linha da venda: abre o editor completo da peça (fotos, preço, categoria)
export function BotaoCadastroPeca({ sku }: { sku: string }) {
  const [aberto, setAberto] = useState(false);
  const qc = useQueryClient();
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
      >
        <ImagePlus className="h-3 w-3" /> Fotos e cadastro
      </button>
      {aberto && (
        <Dialog open onOpenChange={(o) => !o && setAberto(false)}>
          <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Peça {sku}</DialogTitle>
            </DialogHeader>
            <ProdutoEditor
              sku={sku}
              aoSalvar={() => {
                qc.invalidateQueries({ queryKey: ["venda-pecas"] });
                setAberto(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
