import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Calculator, CheckCircle2, EyeOff, ExternalLink, ImagePlus, Loader2, Percent, Ruler, Save, Star, Tag, Trash2, Type, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  obterProdutoAdminFn, salvarProdutoAdminFn, opcoesFiltroFn, getPrecosConfigFn,
  adicionarFotosFn, removerFotoFn, definirFotoPrincipalFn, ordenarFotosFn, avisosVisibilidade, type ProdutoAdmin,
} from "@/lib/produtos-admin";
import { enviarFotos } from "@/lib/imagem-cliente";
import { fmtBRL, fmtUYU, margemDe, uyuDeBrl, vendaDeCusto, precoVenda } from "@/lib/precos";
import { nomeEs } from "@/lib/pecas-es";
import { MONTADORAS } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

// Editor completo de uma peça: dados, preço (R$ e $U), peso/medidas e fotos.
// Usado no diálogo da central de produtos e no modo "precificar uma a uma".
const url = (p: string) => (/^(https?:)?\//.test(p) ? p : `/uploads/${p}`);
const txt = (v: unknown) => (v == null ? "" : String(v));
const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

type Form = Record<string, string>;
function paraForm(p: ProdutoAdmin): Form {
  return {
    nome: p.nome, nome_es: txt(p.nome_es), codigo_fabricante: txt(p.codigo_fabricante), fabricante: txt(p.fabricante),
    marca: txt(p.marca), category_id: txt(p.category_id), estoque: txt(p.estoque), descricao: txt(p.descricao), descricao_es: txt(p.descricao_es),
    veiculos_compativeis: txt(p.veiculos_compativeis), tamanho: txt(p.tamanho), ean: txt(p.ean), ncm: txt(p.ncm),
    valor_compra: txt(p.valor_compra), margem: txt(p.margem), preco_brl: txt(p.preco_brl), preco_modo: p.preco_modo || "AUTO", preco_uyu: txt(p.preco_uyu), valor_promocional: txt(p.valor_promocional),
    peso: txt(p.peso), altura: txt(p.altura), largura: txt(p.largura), profundidade: txt(p.profundidade),
  };
}

export function ProdutoEditor({ sku, aoSalvar, rotuloSalvar = "Salvar", extraAcoes, focoPreco }: {
  sku: string; aoSalvar?: () => void; rotuloSalvar?: string; extraAcoes?: React.ReactNode; focoPreco?: boolean;
}) {
  const qc = useQueryClient();
  const { data: p, refetch } = useQuery({ queryKey: ["produto-admin", sku], queryFn: () => obterProdutoAdminFn({ data: { sku } }) });
  const { data: opc } = useQuery({ queryKey: ["opcoes-filtro"], queryFn: () => opcoesFiltroFn(), staleTime: 300_000 });
  const { data: cfg } = useQuery({ queryKey: ["precos-config"], queryFn: () => getPrecosConfigFn(), staleTime: 300_000 });
  const [f, setF] = useState<Form | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const arq = useRef<HTMLInputElement>(null);
  const custoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (p) setF(paraForm(p)); }, [p?.sku]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (f && focoPreco) setTimeout(() => custoRef.current?.focus(), 50); }, [f?.nome, focoPreco]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: string) => setF((o) => (o ? { ...o, [k]: v } : o));
  // Custo + margem -> venda; venda digitada -> margem
  const mudaCusto = (v: string) => setF((o) => {
    if (!o) return o;
    const c = n(v), m = n(o.margem) ?? cfg?.margemPadrao ?? null;
    return { ...o, valor_compra: v, ...(c && m != null ? { margem: String(m), preco_brl: String(vendaDeCusto(c, m)) } : {}) };
  });
  const mudaMargem = (v: string) => setF((o) => {
    if (!o) return o;
    const c = n(o.valor_compra), m = n(v);
    return { ...o, margem: v, ...(c && m != null ? { preco_brl: String(vendaDeCusto(c, m)) } : {}) };
  });
  const mudaVenda = (v: string) => setF((o) => {
    if (!o) return o;
    const c = n(o.valor_compra), vd = n(v);
    return { ...o, preco_brl: v, ...(c && vd ? { margem: String(margemDe(c, vd) ?? "") } : {}) };
  });
  const uyuAuto = useMemo(() => {
    const b = f ? n(f.preco_brl) : null;
    return b && cfg ? uyuDeBrl(b, cfg) : null;
  }, [f?.preco_brl, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  const promo = useMemo(() => (f && cfg ? precoVenda({ preco_brl: n(f.preco_brl), preco_modo: f.preco_modo, preco_uyu: n(f.preco_uyu), valor_promocional: n(f.valor_promocional) }, cfg) : null), [f, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    if (!f || !p) return;
    setSalvando(true);
    try {
      await salvarProdutoAdminFn({ data: { sku: p.sku, ...f } });
      toast.success("Produto salvo");
      qc.invalidateQueries({ queryKey: ["produtos-admin"] });
      qc.invalidateQueries({ queryKey: ["resumo-produtos"] });
      await refetch();
      aoSalvar?.();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  // ---- Fotos ----
  const fotos = useMemo(() => {
    if (!p) return [] as string[];
    const l = p.images.map((i) => i.path);
    if (p.imagem_principal && !l.includes(p.imagem_principal) && !/redeparts/i.test(p.imagem_principal)) l.unshift(p.imagem_principal);
    return l;
  }, [p]);
  const acaoFoto = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refetch();
      qc.invalidateQueries({ queryKey: ["produtos-admin"] });
    } catch (e: any) {
      toast.error(e?.message || "Falha");
    }
  };
  const enviar = async (files: FileList | null) => {
    if (!files?.length || !p) return;
    setEnviando(true);
    try {
      const paths = await enviarFotos([...files]);
      await adicionarFotosFn({ data: { sku: p.sku, paths } });
      toast.success(`${paths.length} foto(s) adicionada(s)`);
      await refetch();
      qc.invalidateQueries({ queryKey: ["produtos-admin"] });
      qc.invalidateQueries({ queryKey: ["resumo-produtos"] });
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setEnviando(false);
      if (arq.current) arq.current.value = "";
    }
  };
  const mover = (i: number, d: number) => {
    if (!p) return;
    const l = p.images.map((x) => x.path);
    const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    acaoFoto(() => ordenarFotosFn({ data: { sku: p.sku, paths: l } }));
  };

  if (!p || !f) return <div className="flex h-60 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  const lbl = "text-xs font-semibold text-muted-foreground";
  const sec = "rounded-xl border bg-card p-4";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      {/* Fotos */}
      <div className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-xl border bg-white">
          {fotos[0] ? <img src={url(p.imagem_principal && fotos.includes(p.imagem_principal) ? p.imagem_principal : fotos[0])} alt="" className="h-full w-full object-contain" /> : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground"><ImagePlus className="h-10 w-10 opacity-40" /> Sem foto</div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {fotos.map((path) => {
            const iImg = p.images.findIndex((x) => x.path === path);
            const principal = p.imagem_principal === path;
            return (
              <div key={path} className={cn("group relative aspect-square overflow-hidden rounded-lg border bg-white", principal && "ring-2 ring-primary")}>
                <img src={url(path)} alt="" className="h-full w-full object-contain" />
                {principal && <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] font-bold text-white">Principal</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 p-0.5 opacity-0 transition group-hover:opacity-100">
                  {iImg >= 0 && <button type="button" onClick={() => mover(iImg, -1)} className="rounded p-1 text-white hover:bg-white/20" title="Mover para a esquerda"><ArrowLeft className="h-3.5 w-3.5" /></button>}
                  {!principal && <button type="button" onClick={() => acaoFoto(() => definirFotoPrincipalFn({ data: { sku: p.sku, path } }))} className="rounded p-1 text-white hover:bg-white/20" title="Tornar principal"><Star className="h-3.5 w-3.5" /></button>}
                  <button type="button" onClick={() => window.confirm("Remover esta foto?") && acaoFoto(() => removerFotoFn({ data: { sku: p.sku, path } }))} className="rounded p-1 text-red-300 hover:bg-white/20" title="Remover"><Trash2 className="h-3.5 w-3.5" /></button>
                  {iImg >= 0 && <button type="button" onClick={() => mover(iImg, 1)} className="rounded p-1 text-white hover:bg-white/20" title="Mover para a direita"><ArrowRight className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            );
          })}
          <button type="button" onClick={() => arq.current?.click()} disabled={enviando} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary">
            {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />} {enviando ? "Enviando" : "Adicionar"}
          </button>
        </div>
        <input ref={arq} type="file" accept="image/*" multiple className="hidden" onChange={(e) => enviar(e.target.files)} />
        <p className="text-xs text-muted-foreground">Várias fotos de uma vez. Reduzidas automaticamente (WEBP, até 1600 px).</p>
      </div>

      {/* Dados */}
      <div className="space-y-4">
        <Visibilidade p={p} />
        <div className={sec}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Calculator className="h-4 w-4 text-primary" /> Preço</h3>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={lbl}>Custo (R$)</label><Input ref={custoRef} inputMode="decimal" value={f.valor_compra} onChange={(e) => mudaCusto(e.target.value)} placeholder="0,00" /></div>
            <div><label className={lbl}>Margem (%)</label><Input inputMode="decimal" value={f.margem} onChange={(e) => mudaMargem(e.target.value)} placeholder={String(cfg?.margemPadrao ?? 40)} /></div>
            <div><label className={lbl}>Venda (R$)</label><Input inputMode="decimal" value={f.preco_brl} onChange={(e) => mudaVenda(e.target.value)} placeholder="0,00" className="font-semibold" /></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3">
            <div className="flex rounded-lg bg-background p-0.5 text-xs font-semibold">
              {[["AUTO", "$U pela cotação"], ["FIXO", "$U fixo"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set("preco_modo", v)} className={cn("rounded-md px-3 py-1.5", f.preco_modo === v && "bg-primary text-white")}>{l}</button>
              ))}
            </div>
            {f.preco_modo === "FIXO" ? (
              <Input inputMode="decimal" value={f.preco_uyu} onChange={(e) => set("preco_uyu", e.target.value)} placeholder="$U" className="h-9 w-32 font-semibold" />
            ) : (
              <span className="text-lg font-bold">{uyuAuto ? fmtUYU(uyuAuto) : "—"}</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{cfg?.cotacao ? `1 R$ = $U ${cfg.cotacao.toFixed(2)}${cfg.ajuste ? ` +${cfg.ajuste}%` : ""}` : "sem cotação"}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-red-200 bg-red-50/40 p-3">
            <Percent className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold">Promoção: venda por R$</span>
            <Input inputMode="decimal" value={f.valor_promocional} onChange={(e) => set("valor_promocional", e.target.value)} placeholder="sem promoção" className="h-9 w-32" />
            {promo?.desconto ? <span className="text-sm font-semibold text-red-600">-{promo.desconto}% · {promo.uyu ? fmtUYU(promo.uyu) : ""}</span> : n(f.valor_promocional) ? <span className="text-xs text-amber-700">precisa ser menor que a venda</span> : null}
            {f.valor_promocional && <button type="button" onClick={() => set("valor_promocional", "")} className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground">Tirar promoção</button>}
          </div>
          {n(f.preco_brl) ? <p className="mt-2 text-xs text-muted-foreground">No site: {promo?.desconto ? <><s>{promo.deUyu ? fmtUYU(promo.deUyu) : ""}</s> <b className="text-red-600">{promo.uyu ? fmtUYU(promo.uyu) : ""}</b> · {fmtBRL(promo.brl!)} (selo OFERTA -{promo.desconto}%)</> : <>{f.preco_modo === "FIXO" && n(f.preco_uyu) ? fmtUYU(n(f.preco_uyu)!) : uyuAuto ? fmtUYU(uyuAuto) : ""} · {fmtBRL(n(f.preco_brl)!)}</>}</p> : null}
        </div>

        <div className={sec}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Ruler className="h-4 w-4 text-primary" /> Peso e medidas</h3>
          <div className="grid grid-cols-4 gap-2">
            {[["peso", "Peso (kg)"], ["altura", "Altura (cm)"], ["largura", "Largura (cm)"], ["profundidade", "Compr. (cm)"]].map(([k, l]) => (
              <div key={k}><label className={lbl}>{l}</label><Input inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value)} /></div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div><label className={lbl}>Medida (texto livre)</label><Input value={f.tamanho} onChange={(e) => set("tamanho", e.target.value)} placeholder="Ex.: 25 x 40 x 7 mm" /></div>
            <div><label className={lbl}>Estoque</label><Input type="number" min={0} value={f.estoque} onChange={(e) => set("estoque", e.target.value)} /></div>
          </div>
        </div>

        <div className={sec}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Type className="h-4 w-4 text-primary" /> Dados da peça</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={lbl}>Nome (português, do cadastro)</label><Input value={f.nome} onChange={(e) => set("nome", e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={lbl}>Nome no site (espanhol)</label><Input value={f.nome_es} onChange={(e) => set("nome_es", e.target.value)} placeholder={nomeEs(f.nome)} /></div>
            <div><label className={lbl}>Código original</label><Input value={f.codigo_fabricante} onChange={(e) => set("codigo_fabricante", e.target.value)} /></div>
            <div><label className={lbl}>Fabricante da peça</label><Input value={f.fabricante} onChange={(e) => set("fabricante", e.target.value)} /></div>
            <div><label className={lbl}>Marca do trator</label>
              <select value={f.marca} onChange={(e) => set("marca", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">—</option>
                {[...new Set([...MONTADORAS, ...(opc?.marcas ?? []), f.marca].filter(Boolean))].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Categoria</label>
              <select value={f.category_id} onChange={(e) => set("category_id", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Sem categoria (fora da vitrine)</option>
                {opc?.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className={lbl}>Tratores compatíveis</label><Input value={f.veiculos_compativeis} onChange={(e) => set("veiculos_compativeis", e.target.value)} placeholder="Ex.: MF 275, MF 290, MF 4275" /></div>
            <div className="sm:col-span-2"><label className={lbl}>Descrição no site (espanhol)</label><textarea rows={3} value={f.descricao_es} onChange={(e) => set("descricao_es", e.target.value)} className="w-full rounded-md border bg-background p-2 text-sm" placeholder="Opcional: sem ela, o site traduz a descrição em português" /></div>
            <div><label className={lbl}>EAN</label><Input value={f.ean} onChange={(e) => set("ean", e.target.value)} /></div>
            <div><label className={lbl}>NCM</label><Input value={f.ncm} onChange={(e) => set("ncm", e.target.value)} /></div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground"><Tag className="h-3.5 w-3.5" /> SKU {p.sku}{p.precificado_em && ` · precificado em ${new Date(p.precificado_em).toLocaleDateString("pt-BR")}`}</span>
          {extraAcoes}
          <Button onClick={salvar} disabled={salvando}>{salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{rotuloSalvar}</Button>
        </div>
      </div>
    </div>
  );
}

// Mostra se a peça aparece na loja e, se não, por quê
function Visibilidade({ p }: { p: ProdutoAdmin }) {
  const avisos = avisosVisibilidade(p as any);
  const oculto = avisos.some((a) => a.tipo === "oculto");
  return (
    <div className={cn("rounded-xl border p-3 text-sm", oculto ? "border-red-200 bg-red-50" : avisos.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50")}>
      <div className="flex items-center gap-2">
        {oculto ? <EyeOff className="h-4 w-4 text-red-600" /> : avisos.length ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        <b className={oculto ? "text-red-700" : avisos.length ? "text-amber-800" : "text-emerald-800"}>{oculto ? "Não aparece na loja" : avisos.length ? "Aparece na loja, com ressalva" : "Visível no site"}</b>
        <a href={`/produto/${encodeURIComponent(p.sku)}`} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Ver no site <ExternalLink className="h-3.5 w-3.5" /></a>
      </div>
      {avisos.map((a) => <p key={a.texto} className="mt-1 text-xs text-zinc-700">• {a.texto}</p>)}
    </div>
  );
}
