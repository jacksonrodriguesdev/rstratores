import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calculator, Check, ChevronLeft, ChevronRight, Images, Loader2, Pencil, RefreshCw, Search, Settings2, Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProdutoEditor } from "@/components/admin/ProdutoEditor";
import {
  FILTROS, listarProdutosAdminFn, resumoProdutosFn, opcoesFiltroFn, salvarProdutoAdminFn, precosAdminFn,
  atualizarCotacaoFn, salvarConfigPrecosFn, type LinhaAdmin, type ParamsLista,
} from "@/lib/produtos-admin";
import { fmtBRL, fmtUYU, margemDe, uyuDeBrl, vendaDeCusto, type ConfigPrecos } from "@/lib/precos";
import { nomeEs } from "@/lib/pecas-es";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/precificacao")({
  component: Central,
});

const url = (p: string) => (/^(https?:)?\//.test(p) ? p : `/uploads/${p}`);
const temFoto = (p: LinhaAdmin) => !!p.imagem_principal && !/redeparts/i.test(p.imagem_principal);
const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const s = (v: number | null | undefined) => (v == null ? "" : String(v));

function Central() {
  const qc = useQueryClient();
  const [p, setP] = useState<ParamsLista>({ filtro: "com_foto", busca: "", categoria: null, marca: "", pagina: 1, porPagina: 50, ordem: "nome" });
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setP((o) => ({ ...o, busca, pagina: 1 })), 400);
    return () => clearTimeout(t);
  }, [busca]);
  const { data: resumo } = useQuery({ queryKey: ["resumo-produtos"], queryFn: () => resumoProdutosFn() });
  const { data: opc } = useQuery({ queryKey: ["opcoes-filtro"], queryFn: () => opcoesFiltroFn(), staleTime: 300_000 });
  const { data: precos } = useQuery({ queryKey: ["precos-admin"], queryFn: () => precosAdminFn() });
  const { data, isFetching } = useQuery({ queryKey: ["produtos-admin", p], queryFn: () => listarProdutosAdminFn({ data: p }), placeholderData: (a) => a });
  const paginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["produtos-admin"] });
    qc.invalidateQueries({ queryKey: ["resumo-produtos"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Calculator className="h-6 w-6 text-primary" /> Produtos e preços</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize o catálogo, precifique em R$ e $U (cotação do dia), cadastre peso, medidas e fotos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/admin/fotos-lote"><Images className="mr-2 h-4 w-4" /> Fotos em lote</Link></Button>
          <Button asChild><Link to="/admin/precificar"><Zap className="mr-2 h-4 w-4" /> Precificar uma a uma</Link></Button>
        </div>
      </div>

      <PainelCotacao dados={precos} aoMudar={() => { qc.invalidateQueries({ queryKey: ["precos-admin"] }); qc.invalidateQueries({ queryKey: ["precos-config"] }); }} />

      {/* Listas */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {FILTROS.map(([k, rot]) => (
          <button key={k} onClick={() => setP({ ...p, filtro: k, pagina: 1 })}
            className={cn("rounded-xl border p-3 text-left transition", p.filtro === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:border-primary/40")}>
            <p className="text-xs font-semibold text-muted-foreground">{rot}</p>
            <p className="text-2xl font-bold">{resumo ? (resumo[k] ?? 0).toLocaleString("pt-BR") : "…"}</p>
          </button>
        ))}
      </div>
      {resumo && <p className="text-sm text-muted-foreground">Prioridade: <b className="text-foreground">{resumo.comFotoSemPreco.toLocaleString("pt-BR")}</b> peças com foto ainda sem preço — são as que aparecem primeiro na loja.</p>}

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
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Produto</th><th className="p-2 w-28">Custo R$</th><th className="p-2 w-24">Margem %</th><th className="p-2 w-28">Venda R$</th>
                <th className="p-2 w-28">$U</th><th className="p-2 w-24">Peso kg</th><th className="p-2 w-44">A × L × C (cm)</th><th className="p-2 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => <LinhaProduto key={r.sku} r={r} cfg={precos?.cfg} aoEditar={() => setEditando(r.sku)} aoSalvar={recarregar} />)}
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

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>Editar produto</DialogTitle></DialogHeader>
          {editando && <ProdutoEditor sku={editando} aoSalvar={recarregar} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Linha com edição rápida de preço, peso e medidas
function LinhaProduto({ r, cfg, aoEditar, aoSalvar }: { r: LinhaAdmin; cfg?: ConfigPrecos; aoEditar: () => void; aoSalvar: () => void }) {
  const ini = { valor_compra: s(r.valor_compra), margem: s(r.margem), preco_brl: s(r.preco_brl), peso: s(r.peso), altura: s(r.altura), largura: s(r.largura), profundidade: s(r.profundidade) };
  const [f, setF] = useState(ini);
  const [salvando, setSalvando] = useState(false);
  const sujo = JSON.stringify(f) !== JSON.stringify(ini);
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
  const uyu = r.preco_modo === "FIXO" && r.preco_uyu ? r.preco_uyu : num(f.preco_brl) && cfg ? uyuDeBrl(num(f.preco_brl)!, cfg) : null;
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarProdutoAdminFn({ data: { sku: r.sku, ...f } });
      toast.success("Salvo");
      aoSalvar();
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setSalvando(false);
    }
  };
  const inp = "h-9 w-full rounded-md border bg-background px-2 text-sm";
  const tecla = (e: React.KeyboardEvent) => e.key === "Enter" && sujo && salvar();
  return (
    <tr className={cn("border-t align-middle", sujo && "bg-amber-50/60")}>
      <td className="p-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-white">{temFoto(r) && <img src={url(r.imagem_principal!)} alt="" loading="lazy" className="h-full w-full object-contain" />}</div>
          <div className="min-w-0">
            <button onClick={aoEditar} className="line-clamp-1 text-left font-medium hover:text-primary">{r.nome_es || nomeEs(r.nome)}</button>
            <p className="truncate text-xs text-muted-foreground">Cód. {r.codigo_fabricante || r.sku}{r.marca ? ` · ${r.marca}` : ""}{r.categoria ? ` · ${r.categoria}` : ""}</p>
          </div>
        </div>
      </td>
      <td className="p-2"><input className={inp} inputMode="decimal" value={f.valor_compra} onChange={(e) => custo(e.target.value)} onKeyDown={tecla} placeholder="—" /></td>
      <td className="p-2"><input className={inp} inputMode="decimal" value={f.margem} onChange={(e) => margem(e.target.value)} onKeyDown={tecla} placeholder={String(cfg?.margemPadrao ?? "")} /></td>
      <td className="p-2"><input className={cn(inp, "font-semibold")} inputMode="decimal" value={f.preco_brl} onChange={(e) => venda(e.target.value)} onKeyDown={tecla} placeholder="—" /></td>
      <td className="p-2 font-semibold">{uyu ? fmtUYU(uyu) : <span className="text-muted-foreground">—</span>}{r.preco_modo === "FIXO" && <span className="ml-1 text-[10px] text-amber-700">fixo</span>}</td>
      <td className="p-2"><input className={inp} inputMode="decimal" value={f.peso} onChange={(e) => setF({ ...f, peso: e.target.value })} onKeyDown={tecla} placeholder="—" /></td>
      <td className="p-2">
        <div className="flex gap-1">
          {(["altura", "largura", "profundidade"] as const).map((k) => <input key={k} className={inp} inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} onKeyDown={tecla} placeholder={k[0].toUpperCase()} />)}
        </div>
      </td>
      <td className="p-2">
        <div className="flex justify-end gap-1">
          {sujo && <Button size="sm" onClick={salvar} disabled={salvando} title="Salvar (Enter)">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>}
          <Button size="sm" variant="ghost" onClick={aoEditar} title="Editar completo"><Pencil className="h-4 w-4" /></Button>
        </div>
      </td>
    </tr>
  );
}

function PainelCotacao({ dados, aoMudar }: { dados?: Awaited<ReturnType<typeof precosAdminFn>>; aoMudar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (dados) setV(dados.valores); }, [dados]);
  if (!dados) return <Card className="h-24 animate-pulse" />;
  const c = dados.cfg;
  const atualizar = async () => {
    setOcupado(true);
    try {
      const r = await atualizarCotacaoFn();
      toast.success(r.cotacao ? `Cotação: 1 R$ = $U ${r.cotacao.toFixed(2)}` : "Não foi possível buscar a cotação");
      aoMudar();
    } finally {
      setOcupado(false);
    }
  };
  const salvar = async () => {
    setOcupado(true);
    try {
      await salvarConfigPrecosFn({ data: v });
      toast.success("Configuração salva");
      aoMudar();
    } finally {
      setOcupado(false);
    }
  };
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Cotação do dia</p>
          <p className="text-2xl font-bold">{c.cotacao ? <>1 R$ = <span className="text-primary">$U {c.cotacao.toFixed(2)}</span></> : "sem cotação"}</p>
          <p className="text-xs text-muted-foreground">{c.manual ? "Cotação manual (definida abaixo)" : c.cotacaoEm ? `${c.fonte} · ${new Date(c.cotacaoEm).toLocaleString("pt-BR")} · atualiza sozinha a cada 6 h` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Margem padrão: <b>{c.margemPadrao}%</b></span>
          <span>Arredondar $U: <b>{c.arredondar || "não"}</b></span>
          {c.ajuste ? <span>Ajuste câmbio: <b>+{c.ajuste}%</b></span> : null}
          <span>Preços no site: <b className={c.mostrar ? "text-emerald-700" : "text-amber-700"}>{c.mostrar ? "visíveis" : "ocultos"}</b></span>
          {c.cotacao && <span className="text-muted-foreground">Ex.: R$ 100 → {fmtUYU(uyuDeBrl(100, c)!)} · {fmtBRL(100)}</span>}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={atualizar} disabled={ocupado || c.manual}><RefreshCw className={cn("mr-2 h-4 w-4", ocupado && "animate-spin")} /> Atualizar agora</Button>
          <Button variant="ghost" size="sm" onClick={() => setAberto(!aberto)}><Settings2 className="mr-2 h-4 w-4" /> Configurar</Button>
        </div>
      </div>
      {aberto && (
        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
          {[["margem_padrao", "Margem padrão (%)"], ["arredondar_uyu", "Arredondar $U para cima de"], ["ajuste_cambio", "Ajuste na cotação (%)"], ["cotacao_manual", "Cotação manual (vazio = automática)"]].map(([k, l]) => (
            <div key={k}><label className="text-xs font-semibold text-muted-foreground">{l}</label><Input inputMode="decimal" value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
          ))}
          <label className="flex items-center justify-between gap-2 rounded-md border px-3 text-sm">Mostrar preços no site<Switch checked={v.mostrar_precos === "1"} onCheckedChange={(x) => setV({ ...v, mostrar_precos: x ? "1" : "0" })} /></label>
          <div className="lg:col-span-5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Histórico: {dados.historico.slice(0, 6).map((h) => `${new Date(h.em).toLocaleDateString("pt-BR")} ${h.valor.toFixed(2)}`).join(" · ") || "—"}</p>
            <Button size="sm" onClick={salvar} disabled={ocupado}>Salvar configuração</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
