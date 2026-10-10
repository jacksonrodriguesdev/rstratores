import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check, ChevronLeft, ChevronRight, Download, Images, Loader2, Package, Pencil, Plus, Search, Trash2, Zap, CircleCheck, Circle, EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProdutoEditor } from "@/components/admin/ProdutoEditor";
import { PainelCotacao } from "@/components/admin/PainelCotacao";
import {
  FILTROS, listarProdutosAdminFn, resumoProdutosFn, opcoesFiltroFn, salvarProdutoAdminFn, precosAdminFn, avisosVisibilidade,
  type LinhaAdmin, type ParamsLista,
} from "@/lib/produtos-admin";
import { fmtUYU, margemDe, uyuDeBrl, vendaDeCusto, precoVenda, type ConfigPrecos } from "@/lib/precos";
import { exportProductsCsv, downloadFile } from "@/lib/upload";
import { nomeEs } from "@/lib/pecas-es";
import { MONTADORAS } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

// Página única de produtos do admin: listas (com/sem foto, sem preço...), edição rápida na linha
// (salva ao sair da linha ou com Enter), editor completo, criar, excluir e exportar.
export const Route = createFileRoute("/admin/produtos")({
  validateSearch: z.object({ linha: z.string().optional() }),
  component: Produtos,
});

const url = (p: string) => (/^(https?:)?\//.test(p) ? p : `/uploads/${p}`);
const temFoto = (p: LinhaAdmin) => !!p.imagem_principal && !/redeparts/i.test(p.imagem_principal);
const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const s = (v: number | null | undefined) => (v == null ? "" : String(v));
const temPreco = (r: Pick<LinhaAdmin, "preco_brl" | "preco_modo" | "preco_uyu">) => (r.preco_brl ?? 0) > 0 || (r.preco_modo === "FIXO" && (r.preco_uyu ?? 0) > 0);

function Produtos() {
  const qc = useQueryClient();
  const [p, setP] = useState<ParamsLista>({ filtro: "com_foto", busca: "", categoria: null, marca: "", pagina: 1, porPagina: 50, ordem: "nome" });
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setP((o) => ({ ...o, busca, pagina: 1 })), 400);
    return () => clearTimeout(t);
  }, [busca]);
  const { data: resumo } = useQuery({ queryKey: ["resumo-produtos"], queryFn: () => resumoProdutosFn() });
  const { data: opc } = useQuery({ queryKey: ["opcoes-filtro"], queryFn: () => opcoesFiltroFn(), staleTime: 300_000 });
  const { data: precos } = useQuery({ queryKey: ["precos-admin"], queryFn: () => precosAdminFn() });
  const chave = ["produtos-admin", p] as const;
  const { data, isFetching } = useQuery({ queryKey: chave, queryFn: () => listarProdutosAdminFn({ data: p }), placeholderData: (a) => a });
  const paginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  // Linha salva: atualiza só ela na lista (não some da lista "Sem preço" enquanto você trabalha)
  const linhaSalva = (nova: LinhaAdmin) => {
    qc.setQueryData(chave, (old: typeof data) => (old ? { ...old, rows: old.rows.map((r) => (r.sku === nova.sku ? nova : r)) } : old));
    qc.invalidateQueries({ queryKey: ["resumo-produtos"] });
  };
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["produtos-admin"] });
    qc.invalidateQueries({ queryKey: ["resumo-produtos"] });
  };
  const exportar = async () => {
    toast.info("Exportando todos os produtos…");
    try {
      const res = await fetch("/api/admin/products/export");
      if (!res.ok) throw new Error("Falha ao exportar");
      const { rows } = await res.json();
      downloadFile(exportProductsCsv(rows), `produtos-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`${rows.length} produtos exportados`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const excluir = async (sku: string) => {
    if (!window.confirm(`Excluir o produto ${sku}? Isso não pode ser desfeito.`)) return;
    const r = await fetch(`/api/admin/products/${encodeURIComponent(sku)}`, { method: "DELETE" });
    if (!r.ok) return toast.error((await r.json().catch(() => ({}))).error || "Falha ao excluir");
    toast.success("Produto excluído");
    setEditando(null);
    recarregar();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Package className="h-6 w-6 text-primary" /> Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catálogo completo: preço em R$ e $U (cotação do dia), peso, medidas e fotos. As alterações na linha salvam ao sair dela.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportar}><Download className="mr-2 h-4 w-4" /> Exportar</Button>
          <Button asChild variant="outline"><Link to="/admin/fotos-lote"><Images className="mr-2 h-4 w-4" /> Fotos em lote</Link></Button>
          <Button variant="outline" onClick={() => setCriando(true)}><Plus className="mr-2 h-4 w-4" /> Novo produto</Button>
          <Button asChild><Link to="/admin/precificar"><Zap className="mr-2 h-4 w-4" /> Precificar uma a uma</Link></Button>
        </div>
      </div>

      <PainelCotacao dados={precos} aoMudar={() => { qc.invalidateQueries({ queryKey: ["precos-admin"] }); qc.invalidateQueries({ queryKey: ["precos-config"] }); }} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {FILTROS.map(([k, rot]) => (
          <button key={k} onClick={() => setP({ ...p, filtro: k, pagina: 1 })}
            className={cn("rounded-xl border p-3 text-left transition", p.filtro === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:border-primary/40")}>
            <p className="text-xs font-semibold text-muted-foreground">{rot}</p>
            <p className="text-2xl font-bold">{resumo ? (resumo[k] ?? 0).toLocaleString("pt-BR") : "…"}</p>
          </button>
        ))}
      </div>
      {resumo && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 text-sm">
          <span>Progresso da vitrine com foto:</span>
          <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${resumo.com_foto ? ((resumo.com_foto - resumo.comFotoSemPreco) / resumo.com_foto) * 100 : 0}%` }} />
          </div>
          <b>{(resumo.com_foto - resumo.comFotoSemPreco).toLocaleString("pt-BR")} de {resumo.com_foto.toLocaleString("pt-BR")} precificados</b>
        </div>
      )}

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, código ou SKU…" className="pl-9" />
        </div>
        <select value={p.categoria ?? ""} onChange={(e) => setP({ ...p, categoria: e.target.value ? Number(e.target.value) : null, pagina: 1 })} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">Todas as categorias</option>
          {opc?.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={p.marca} onChange={(e) => setP({ ...p, marca: e.target.value, pagina: 1 })} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">Todas as marcas</option>
          {opc?.marcas.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={p.ordem} onChange={(e) => setP({ ...p, ordem: e.target.value as ParamsLista["ordem"] })} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="nome">Nome A–Z</option>
          <option value="recentes">Alterados recentemente</option>
          <option value="foto">Com foto primeiro</option>
        </select>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10 p-3"></th><th className="p-3">Produto</th><th className="w-28 p-2">Custo R$</th><th className="w-24 p-2">Margem %</th><th className="w-28 p-2">Venda R$</th>
                <th className="w-28 p-2">$U</th><th className="w-24 p-2">Peso kg</th><th className="w-44 p-2">A × L × C (cm)</th><th className="w-24 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => <LinhaProduto key={r.sku} r={r} cfg={precos?.cfg} aoEditar={() => setEditando(r.sku)} aoSalvar={linhaSalva} />)}
            </tbody>
          </table>
          {data && !data.rows.length && <p className="p-10 text-center text-sm text-muted-foreground">Nenhum produto nesta lista.</p>}
        </div>
        <div className="flex items-center justify-between border-t p-3 text-sm">
          <span className="text-muted-foreground">{data ? `${data.total.toLocaleString("pt-BR")} produtos · página ${p.pagina} de ${paginas}` : "…"}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={(p.pagina ?? 1) <= 1} onClick={() => setP({ ...p, pagina: (p.pagina ?? 1) - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" disabled={(p.pagina ?? 1) >= paginas} onClick={() => setP({ ...p, pagina: (p.pagina ?? 1) + 1 })}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!editando} onOpenChange={(o) => { if (!o) { setEditando(null); recarregar(); } }}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>Editar produto</DialogTitle></DialogHeader>
          {editando && (
            <ProdutoEditor sku={editando} aoSalvar={recarregar}
              extraAcoes={<Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => excluir(editando)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>} />
          )}
        </DialogContent>
      </Dialog>

      <NovoProduto aberto={criando} fechar={() => setCriando(false)} categorias={opc?.categorias ?? []} aoCriar={(sku) => { setCriando(false); recarregar(); setEditando(sku); }} />
    </div>
  );
}

// Linha com edição rápida: salva sozinha ao sair da linha (ou Enter) e mostra o resultado na hora
function LinhaProduto({ r, cfg, aoEditar, aoSalvar }: { r: LinhaAdmin; cfg?: ConfigPrecos; aoEditar: () => void; aoSalvar: (r: LinhaAdmin) => void }) {
  const doServidor = { valor_compra: s(r.valor_compra), margem: s(r.margem), preco_brl: s(r.preco_brl), peso: s(r.peso), altura: s(r.altura), largura: s(r.largura), profundidade: s(r.profundidade) };
  const [f, setF] = useState(doServidor);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const sujo = JSON.stringify(f) !== JSON.stringify(doServidor);
  const linhaRef = useRef<HTMLTableRowElement>(null);
  // Mudou no servidor (ex.: pelo editor completo) e não há digitação pendente: mostra o novo valor
  useEffect(() => { if (!sujo) setF(doServidor); }, [JSON.stringify(doServidor)]); // eslint-disable-line react-hooks/exhaustive-deps

  const custo = (v: string) => {
    const c = num(v), m = num(f.margem) ?? cfg?.margemPadrao ?? null;
    setF({ ...f, valor_compra: v, ...(c && m != null ? { margem: String(m), preco_brl: String(vendaDeCusto(c, m)) } : {}) });
  };
  const margem = (v: string) => {
    const c = num(f.valor_compra), m = num(v);
    setF({ ...f, margem: v, ...(c && m != null ? { preco_brl: String(vendaDeCusto(c, m)) } : {}) });
  };
  const venda = (v: string) => {
    const c = num(f.valor_compra), vd = num(v);
    setF({ ...f, preco_brl: v, ...(c && vd ? { margem: String(margemDe(c, vd) ?? "") } : {}) });
  };
  const brl = num(f.preco_brl);
  const uyu = r.preco_modo === "FIXO" && r.preco_uyu ? r.preco_uyu : brl && cfg ? uyuDeBrl(brl, cfg) : null;
  const precificado = temPreco({ preco_brl: brl, preco_modo: r.preco_modo, preco_uyu: r.preco_uyu });
  const oculto = avisosVisibilidade(r).find((a) => a.tipo === "oculto")?.texto;
  const promo = cfg ? precoVenda({ preco_brl: brl, preco_modo: r.preco_modo, preco_uyu: r.preco_uyu, valor_promocional: r.valor_promocional }, cfg) : null;

  const salvar = async () => {
    if (!sujo || estado === "salvando") return;
    setEstado("salvando");
    try {
      await salvarProdutoAdminFn({ data: { sku: r.sku, ...f } });
      const n = (k: keyof typeof f) => num(f[k]);
      aoSalvar({ ...r, valor_compra: n("valor_compra"), margem: n("margem"), preco_brl: n("preco_brl"), peso: n("peso"), altura: n("altura"), largura: n("largura"), profundidade: n("profundidade"), precificado_em: precificado ? r.precificado_em ?? new Date().toISOString() : null });
      setEstado("salvo");
      setTimeout(() => setEstado((e) => (e === "salvo" ? "" : e)), 2500);
    } catch (e: any) {
      setEstado("erro");
      toast.error(e?.message || "Falha ao salvar");
    }
  };
  // Saiu da linha (clique fora ou Tab para outra linha): salva
  const aoSairDaLinha = (e: React.FocusEvent) => {
    if (!linhaRef.current?.contains(e.relatedTarget as Node)) salvar();
  };
  const inp = "h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const tecla = (e: React.KeyboardEvent) => e.key === "Enter" && salvar();

  return (
    <tr ref={linhaRef} onBlur={aoSairDaLinha}
      className={cn("border-t align-middle transition-colors", sujo && "bg-amber-50/70", estado === "salvo" && "bg-emerald-50/70", estado === "erro" && "bg-red-50")}>
      <td className="p-2 text-center" title={precificado ? "Com preço" : "Sem preço"}>
        {estado === "salvando" ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /> : precificado ? <CircleCheck className="mx-auto h-5 w-5 text-emerald-600" /> : <Circle className="mx-auto h-5 w-5 text-zinc-300" />}
      </td>
      <td className="p-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-white">{temFoto(r) && <img src={url(r.imagem_principal!)} alt="" loading="lazy" className="h-full w-full object-contain" />}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {oculto && <span title={oculto}><EyeOff className="h-4 w-4 shrink-0 text-red-600" /></span>}
              <button onClick={aoEditar} className="line-clamp-1 text-left font-medium hover:text-primary">{r.nome_es || nomeEs(r.nome)}</button>
            </div>
            <p className="truncate text-xs text-muted-foreground">Cód. {r.codigo_fabricante || r.sku}{r.marca ? ` · ${r.marca}` : ""}{r.categoria ? ` · ${r.categoria}` : ""}{r.fotos ? ` · ${r.fotos} foto(s)` : ""}</p>
          </div>
        </div>
      </td>
      <td className="p-2"><input className={inp} inputMode="decimal" value={f.valor_compra} onChange={(e) => custo(e.target.value)} onKeyDown={tecla} placeholder="—" /></td>
      <td className="p-2"><input className={inp} inputMode="decimal" value={f.margem} onChange={(e) => margem(e.target.value)} onKeyDown={tecla} placeholder={String(cfg?.margemPadrao ?? "")} /></td>
      <td className="p-2"><input className={cn(inp, "font-semibold")} inputMode="decimal" value={f.preco_brl} onChange={(e) => venda(e.target.value)} onKeyDown={tecla} placeholder="—" /></td>
      <td className="p-2 font-semibold">{uyu ? fmtUYU(uyu) : <span className="text-muted-foreground">—</span>}{r.preco_modo === "FIXO" && <span className="ml-1 text-[10px] text-amber-700">fixo</span>}{promo?.desconto ? <span className="mt-0.5 block text-[11px] font-bold text-red-600">oferta {promo.uyu ? fmtUYU(promo.uyu) : ""} (-{promo.desconto}%)</span> : null}</td>
      <td className="p-2"><input className={inp} inputMode="decimal" value={f.peso} onChange={(e) => setF({ ...f, peso: e.target.value })} onKeyDown={tecla} placeholder="—" /></td>
      <td className="p-2">
        <div className="flex gap-1">
          {(["altura", "largura", "profundidade"] as const).map((k) => <input key={k} className={inp} inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} onKeyDown={tecla} placeholder={k === "profundidade" ? "C" : k[0].toUpperCase()} />)}
        </div>
      </td>
      <td className="p-2">
        <div className="flex items-center justify-end gap-1">
          {estado === "salvo" && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" /> Salvo</span>}
          {sujo && estado !== "salvando" && <Button size="sm" onClick={salvar} title="Salvar (Enter)"><Check className="h-4 w-4" /></Button>}
          <Button size="sm" variant="ghost" onClick={aoEditar} title="Editar completo"><Pencil className="h-4 w-4" /></Button>
        </div>
      </td>
    </tr>
  );
}

function NovoProduto({ aberto, fechar, categorias, aoCriar }: { aberto: boolean; fechar: () => void; categorias: Array<{ id: number; nome: string }>; aoCriar: (sku: string) => void }) {
  const [f, setF] = useState({ sku: "", nome: "", codigo_fabricante: "", marca: "", category_id: "" });
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (aberto) setF({ sku: "", nome: "", codigo_fabricante: "", marca: "", category_id: "" }); }, [aberto]);
  const criar = async () => {
    if (!f.sku.trim() || !f.nome.trim()) return toast.error("SKU e nome são obrigatórios");
    if (!f.category_id) return toast.error("Escolha a categoria: sem ela o produto não aparece na loja");
    setOcupado(true);
    try {
      const cat = categorias.find((c) => String(c.id) === f.category_id);
      const r = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: f.sku.trim(), nome: f.nome.trim(), codigo_fabricante: f.codigo_fabricante.trim() || null, marca: f.marca || null, category_id: cat?.id ?? null, categoria: cat?.nome ?? null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Falha ao criar");
      toast.success("Produto criado: complete preço, medidas e fotos");
      aoCriar(f.sku.trim());
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setOcupado(false);
    }
  };
  const lbl = "text-xs font-semibold text-muted-foreground";
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
          <DialogDescription>O básico para cadastrar. Depois abre o editor completo para preço, medidas e fotos.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>SKU (código interno) *</label><Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} placeholder="Ex.: 3136019FIL" /></div>
          <div><label className={lbl}>Código original</label><Input value={f.codigo_fabricante} onChange={(e) => setF({ ...f, codigo_fabricante: e.target.value })} placeholder="Ex.: 3136019" /></div>
          <div className="sm:col-span-2"><label className={lbl}>Nome (português) *</label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Filtro de Óleo Motor Trator Massey 3136019" /></div>
          <div><label className={lbl}>Marca do trator</label>
            <select value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">—</option>{MONTADORAS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Categoria * (sem ela não aparece na loja)</label>
            <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Escolha…</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button onClick={criar} disabled={ocupado}>{ocupado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Criar e editar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
