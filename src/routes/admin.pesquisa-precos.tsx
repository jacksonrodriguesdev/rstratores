import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  SearchCheck, Settings2, ChevronDown, Loader2, Play, Square, ExternalLink, AlertTriangle, CheckCircle2, Link2, Copy, Search, EyeOff, Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  obterConfigPPFn, salvarConfigPPFn, loginMLFn, desconectarMLFn, iniciarPesquisaFn, statusPesquisaFn, pararPesquisaFn,
  listarResultadosFn, marcarOfertaFn, aplicarPrecosFn, type FiltroLote, type ResultadoPP,
} from "@/lib/pesquisa-precos";
import { getPrecosConfigFn } from "@/lib/produtos-admin";
import { uyuDeBrl, fmtBRL, fmtUYU } from "@/lib/precos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/pesquisa-precos")({
  validateSearch: (s: Record<string, unknown>) => ({ ml: s.ml as string | undefined, msg: s.msg as string | undefined }),
  component: PesquisaPrecos,
});

type Regra = "maior" | "mediana" | "maior5";
const REGRAS: Array<[Regra, string]> = [["maior", "Maior preço"], ["maior5", "Maior − 5%"], ["mediana", "Mediana"]];
const sugerido = (r: ResultadoPP, regra: Regra) => {
  if (!r.maior) return null;
  const v = regra === "mediana" ? r.mediana! : regra === "maior5" ? r.maior * 0.95 : r.maior;
  return Math.round(v * 100) / 100;
};
// Maior muito acima da mediana: provável anúncio fora da curva (kit maior, parcelado, outro produto)
const foraDaCurva = (r: ResultadoPP) => !!(r.maior && r.mediana && r.achados >= 3 && r.maior > r.mediana * 1.6);

function PesquisaPrecos() {
  const qc = useQueryClient();
  const busca = Route.useSearch();
  const [regra, setRegra] = useState<Regra>(() => {
    try {
      return (localStorage.getItem("pp_regra") as Regra) || "maior";
    } catch {
      return "maior";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pp_regra", regra);
    } catch {}
  }, [regra]);
  useEffect(() => {
    if (busca.ml === "ok") toast.success("Mercado Livre conectado");
    if (busca.ml === "erro") toast.error(`Mercado Livre: ${busca.msg ?? "não conectou"}`);
  }, [busca.ml]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: precos } = useQuery({ queryKey: ["precos-config"], queryFn: () => getPrecosConfigFn() });
  const { data: st } = useQuery({ queryKey: ["pp-status"], queryFn: () => statusPesquisaFn(), refetchInterval: (q) => (q.state.data?.rodando ? 2000 : 15000) });
  const [aba, setAba] = useState<"pendentes" | "aplicados" | "sem_resultado">("pendentes");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const { data: res, isFetching } = useQuery({
    queryKey: ["pp-resultados", aba, q, pagina, st?.feitos],
    queryFn: () => listarResultadosFn({ data: { aba, busca: q, pagina } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><SearchCheck className="h-6 w-6 text-primary" /> Pesquisa de preços</h1>
          <p className="mt-1 text-sm text-muted-foreground">Busca o código de cada peça no Google Shopping e no Mercado Livre (Brasil e Uruguai) e sugere o preço de venda em R$.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1 text-sm">
          <span className="px-2 text-xs font-semibold text-muted-foreground">Regra:</span>
          {REGRAS.map(([k, r]) => (
            <button key={k} onClick={() => setRegra(k)} className={cn("rounded-md px-3 py-1.5", regra === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{r}</button>
          ))}
        </div>
      </div>

      <Configuracao />
      <LoteCard st={st} atualizar={() => qc.invalidateQueries({ queryKey: ["pp-status"] })} />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <div className="mr-auto flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {([["pendentes", "Para revisar", res?.contagem.pendentes], ["aplicados", "Aplicados", res?.contagem.aplicados], ["sem_resultado", "Sem resultado", res?.contagem.semResultado]] as const).map(([k, r, n]) => (
              <button key={k} onClick={() => { setAba(k); setPagina(1); }} className={cn("rounded-md px-3 py-1.5 font-semibold", aba === k ? "bg-background shadow" : "text-muted-foreground")}>
                {r} {n != null && <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 text-xs">{n}</span>}
              </button>
            ))}
          </div>
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} placeholder="Código ou nome…" className="h-9 w-56 rounded-lg border bg-background pl-8 pr-3 text-sm" />
          </label>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Resultados lista={res?.lista ?? []} regra={regra} cotacao={precos ?? null} aba={aba} atualizar={() => qc.invalidateQueries({ queryKey: ["pp-resultados"] })} />
        {res && res.paginas > 1 && (
          <div className="flex items-center justify-center gap-2 border-t p-3 text-sm">
            <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</Button>
            <span>Página {pagina} de {res.paginas}</span>
            <Button size="sm" variant="outline" disabled={pagina >= res.paginas} onClick={() => setPagina(pagina + 1)}>Próxima</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Configuracao() {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({ queryKey: ["pp-config"], queryFn: () => obterConfigPPFn() });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ pp_serpapi_key: "", pp_paises: "BR,UY", pp_ml_client_id: "", pp_ml_client_secret: "" });
  useEffect(() => {
    if (cfg) {
      setV({ pp_serpapi_key: cfg.serpapiKey, pp_paises: cfg.paises, pp_ml_client_id: cfg.mlClientId, pp_ml_client_secret: cfg.mlClientSecret });
      if (!cfg.serpapiKey && !cfg.mlConectado) setAberto(true);
    }
  }, [cfg]);
  const paises = v.pp_paises.split(",").filter(Boolean);
  const salvar = async () => {
    try {
      await salvarConfigPPFn({ data: v });
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["pp-config"] });
    } catch (e: any) {
      toast.error(e?.message);
    }
  };
  const conectarML = async () => {
    try {
      await salvarConfigPPFn({ data: v });
      const { url } = await loginMLFn();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  return (
    <Card className="p-0">
      <button onClick={() => setAberto(!aberto)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-2 font-semibold"><Settings2 className="h-4 w-4 text-primary" /> Fontes de preço</span>
        <span className="flex flex-wrap items-center gap-2 text-xs">
          <span className={cn("rounded-full px-2 py-0.5", cfg?.serpapiKey ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600")}>
            SerpAPI {cfg?.serpapiKey ? `ligado${cfg.quota?.restantes != null ? ` · ${cfg.quota.restantes} buscas restantes` : ""}` : "não configurado"}
          </span>
          <span className={cn("rounded-full px-2 py-0.5", cfg?.mlConectado ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600")}>
            Mercado Livre {cfg?.mlConectado ? "conectado" : "não conectado"}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition", aberto && "rotate-180")} />
        </span>
      </button>
      {aberto && cfg && (
        <div className="grid gap-6 border-t p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-semibold">SerpAPI (Google Shopping)</h3>
            <label className="block text-xs font-semibold text-muted-foreground">Chave da API
              <Input className="mt-1 font-mono" type="password" autoComplete="off" value={v.pp_serpapi_key}
                onFocus={(e) => e.target.value.startsWith("••••") && setV({ ...v, pp_serpapi_key: "" })}
                onChange={(e) => setV({ ...v, pp_serpapi_key: e.target.value })} />
            </label>
            {cfg.quota?.plano?.startsWith("erro") && <p className="text-xs text-red-600">{cfg.quota.plano}</p>}
            <div className="text-xs font-semibold text-muted-foreground">Buscar em
              <div className="mt-1 flex gap-2">
                {([["BR", "🇧🇷 Brasil (R$)"], ["UY", "🇺🇾 Uruguai ($U)"]] as const).map(([k, r]) => (
                  <label key={k} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal text-foreground", paises.includes(k) && "border-primary bg-primary/5")}>
                    <input type="checkbox" checked={paises.includes(k)} onChange={(e) => setV({ ...v, pp_paises: (e.target.checked ? [...paises, k] : paises.filter((x) => x !== k)).join(",") })} /> {r}
                  </label>
                ))}
              </div>
              <span className="mt-1 block font-normal">Cada país = 1 busca por peça no SerpAPI.</span>
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Crie a conta em <a className="text-primary underline" href="https://serpapi.com/users/sign_up" target="_blank" rel="noreferrer">serpapi.com</a> (100 buscas/mês grátis).</li>
              <li>Em “Your Account” → copie a “Private API Key” e cole acima.</li>
            </ol>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Mercado Livre (app próprio)</h3>
            {cfg.mlConectado ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Conectado{cfg.mlUsuario ? ` (usuário ${cfg.mlUsuario})` : ""}</span>
                <Button size="sm" variant="outline" onClick={async () => { await desconectarMLFn(); qc.invalidateQueries({ queryKey: ["pp-config"] }); }}>Desconectar</Button>
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-muted-foreground">App ID (client_id)
                  <Input className="mt-1 font-mono" value={v.pp_ml_client_id} onChange={(e) => setV({ ...v, pp_ml_client_id: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">Chave secreta (client_secret)
                  <Input className="mt-1 font-mono" type="password" autoComplete="off" value={v.pp_ml_client_secret}
                    onFocus={(e) => e.target.value.startsWith("••••") && setV({ ...v, pp_ml_client_secret: "" })}
                    onChange={(e) => setV({ ...v, pp_ml_client_secret: e.target.value })} />
                </label>
                <div className="text-xs text-muted-foreground">URI de redirect (cadastre igual no app):
                  <div className="mt-1 flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] text-foreground">
                    <span className="min-w-0 flex-1 truncate">{cfg.redirectML}</span>
                    <button onClick={() => { navigator.clipboard.writeText(cfg.redirectML); toast.success("Copiado"); }} aria-label="Copiar"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <Button variant="outline" onClick={conectarML}><Link2 className="mr-2 h-4 w-4" /> Conectar Mercado Livre</Button>
              </>
            )}
            <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Em <a className="text-primary underline" href="https://developers.mercadolivre.com.br/devcenter" target="_blank" rel="noreferrer">developers.mercadolivre.com.br</a> → “Criar aplicação”.</li>
              <li>Cole a URI de redirect acima e copie o App ID e a chave secreta para cá.</li>
              <li>Clique em “Conectar Mercado Livre” e autorize com a sua conta.</li>
            </ol>
            <p className="text-xs text-amber-700">Atenção: o Mercado Livre restringiu a busca de anúncios a apps com permissão. Se aparecer “bloqueou a busca (403)”, os preços continuam vindo pelo SerpAPI (que também mostra anúncios do ML no Google Shopping).</p>
          </div>
          <div className="lg:col-span-2"><Button onClick={salvar}>Salvar fontes</Button></div>
        </div>
      )}
    </Card>
  );
}

function LoteCard({ st, atualizar }: { st?: Awaited<ReturnType<typeof statusPesquisaFn>>; atualizar: () => void }) {
  const [filtro, setFiltro] = useState<FiltroLote>("com_foto_sem_preco");
  const [limite, setLimite] = useState(20);
  const [codigos, setCodigos] = useState("");
  const [refazer, setRefazer] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const iniciar = async () => {
    setIniciando(true);
    try {
      const r = await iniciarPesquisaFn({ data: { filtro, limite, codigos, refazer } });
      toast.success(`Pesquisando ${r.total} peça(s)…`);
      atualizar();
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setIniciando(false);
    }
  };
  const pct = st?.total ? Math.round((st.feitos / st.total) * 100) : 0;
  return (
    <Card className="space-y-3 p-4">
      <h2 className="font-semibold">Pesquisar um lote</h2>
      {st?.rodando ? (
        <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
          <p className="flex items-center gap-2 font-semibold"><Loader2 className="h-4 w-4 animate-spin" /> Pesquisando {st.feitos} de {st.total} · {st.comPreco} com preço{st.erros ? ` · ${st.erros} erro(s)` : ""}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100"><div className="h-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} /></div>
          {st.ultimoErro && <p className="mt-2 text-xs text-red-700">{st.ultimoErro}</p>}
          <Button size="sm" variant="outline" className="mt-2" onClick={async () => { await pararPesquisaFn(); atualizar(); }}><Square className="mr-1.5 h-3.5 w-3.5" /> Parar</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-muted-foreground">Peças
              <select value={filtro} onChange={(e) => setFiltro(e.target.value as FiltroLote)} className="mt-1 block h-10 rounded-md border bg-background px-3 text-sm">
                <option value="com_foto_sem_preco">Com foto e sem preço (recomendado)</option>
                <option value="sem_preco">Todas sem preço</option>
                <option value="com_foto">Todas com foto (também as já precificadas)</option>
                <option value="codigos">Códigos que eu colar</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Quantas
              <Input type="number" min={1} max={2000} value={limite} onChange={(e) => setLimite(Number(e.target.value) || 1)} className="mt-1 w-28" />
            </label>
            {filtro !== "codigos" && (
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={refazer} onChange={(e) => setRefazer(e.target.checked)} /> Incluir as pesquisadas nos últimos 30 dias</label>
            )}
            <Button onClick={iniciar} disabled={iniciando}>{iniciando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Pesquisar</Button>
          </div>
          {filtro === "codigos" && (
            <textarea value={codigos} onChange={(e) => setCodigos(e.target.value)} rows={3} placeholder="82636800, 3136019, 81863003…" className="w-full rounded-md border bg-background p-2.5 font-mono text-sm" />
          )}
          <p className="text-xs text-muted-foreground">
            Cada peça usa 1 busca por país no SerpAPI. A pesquisa roda no servidor (pode fechar a página) e para sozinha se a cota acabar.
            {st && !st.rodando && st.total > 0 && ` Última: ${st.feitos} de ${st.total} peças, ${st.comPreco} com preço.`}
          </p>
        </>
      )}
    </Card>
  );
}

function Resultados({ lista, regra, cotacao, aba, atualizar }: {
  lista: ResultadoPP[]; regra: Regra; cotacao: Awaited<ReturnType<typeof getPrecosConfigFn>> | null; aba: string; atualizar: () => void;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [editado, setEditado] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  useEffect(() => setMarcados(new Set()), [lista]);

  const valor = (r: ResultadoPP) => {
    const e = editado[r.sku];
    return e != null && e !== "" ? Number(e.replace(",", ".")) : sugerido(r, regra);
  };
  const emUYU = (brl: number | null) => (brl && cotacao?.cotacao ? fmtUYU(uyuDeBrl(brl, cotacao)!) : null);
  const aplicar = async (skus: string[]) => {
    const itens = skus.map((sku) => ({ sku, preco_brl: valor(lista.find((r) => r.sku === sku)!) ?? 0 })).filter((i) => i.preco_brl > 0);
    if (!itens.length) return;
    if (itens.length > 1 && !window.confirm(`Gravar o preço de venda de ${itens.length} peça(s)? Elas passam a mostrar preço no site.`)) return;
    setAplicando(true);
    try {
      const r = await aplicarPrecosFn({ data: { itens } });
      toast.success(`${r.aplicados} preço(s) aplicados`);
      atualizar();
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setAplicando(false);
    }
  };
  const todos = useMemo(() => lista.filter((r) => r.maior).map((r) => r.sku), [lista]);

  if (!lista.length) return <p className="p-8 text-center text-sm text-muted-foreground">{aba === "pendentes" ? "Nada para revisar. Pesquise um lote acima." : "Nada aqui ainda."}</p>;

  return (
    <div>
      {aba !== "sem_resultado" && (
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-4 py-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={todos.length > 0 && todos.every((s) => marcados.has(s))} onChange={(e) => setMarcados(e.target.checked ? new Set(todos) : new Set())} /> Marcar todos</label>
          <Button size="sm" disabled={!marcados.size || aplicando} onClick={() => aplicar([...marcados])}>
            {aplicando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />} Aplicar {marcados.size ? `${marcados.size} marcados` : "marcados"}
          </Button>
          <span className="text-xs text-muted-foreground">Preço de venda em R$ (o site converte para $U pela cotação do dia).</span>
        </div>
      )}
      <ul className="divide-y">
        {lista.map((r) => {
          const v = valor(r);
          const curva = foraDaCurva(r);
          return (
            <li key={r.sku} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                {aba !== "sem_resultado" && <input type="checkbox" disabled={!r.maior} checked={marcados.has(r.sku)} onChange={() => setMarcados((s) => { const n = new Set(s); n.has(r.sku) ? n.delete(r.sku) : n.add(r.sku); return n; })} />}
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-white">{r.imagem && <img src={r.imagem} alt="" className="h-full w-full object-contain" />}</div>
                <div className="min-w-0 flex-1">
                  <a href={`/produto/${encodeURIComponent(r.sku)}`} target="_blank" rel="noreferrer" className="line-clamp-1 font-medium hover:text-primary">{r.nome}</a>
                  <p className="text-xs text-muted-foreground">
                    Cód. <b className="font-mono">{r.codigo}</b>{r.marca ? ` · ${r.marca}` : ""} · {r.achados} oferta(s) válida(s){r.precoAtual ? ` · preço atual ${fmtBRL(r.precoAtual)}` : ""}
                  </p>
                  {r.erro && <p className="text-xs text-red-600">{r.erro}</p>}
                </div>
                {r.maior != null && (
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div><p className="text-muted-foreground">Menor</p><p className="font-semibold">{fmtBRL(r.menor!)}</p></div>
                    <div><p className="text-muted-foreground">Mediana</p><p className="font-semibold">{fmtBRL(r.mediana!)}</p></div>
                    <div><p className="text-muted-foreground">Maior</p><p className={cn("font-semibold", curva && "text-amber-700")}>{fmtBRL(r.maior)}</p></div>
                  </div>
                )}
                {r.maior != null && aba !== "sem_resultado" && (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex items-center gap-1"><span className="text-xs font-bold">R$</span>
                        <Input value={editado[r.sku] ?? (v != null ? String(v) : "")} onChange={(e) => setEditado({ ...editado, [r.sku]: e.target.value })} className="h-9 w-28 text-right font-bold" inputMode="decimal" />
                      </div>
                      {emUYU(v) && <p className="text-[11px] text-muted-foreground">≈ {emUYU(v)} no site</p>}
                    </div>
                    <Button size="sm" variant={aba === "aplicados" ? "outline" : "default"} disabled={aplicando || !v} onClick={() => aplicar([r.sku])}>Aplicar</Button>
                  </div>
                )}
                <button onClick={() => setAberto(aberto === r.sku ? null : r.sku)} className="flex items-center gap-1 text-xs font-semibold text-primary">
                  Ofertas <ChevronDown className={cn("h-4 w-4 transition", aberto === r.sku && "rotate-180")} />
                </button>
              </div>
              {curva && <p className="ml-[4.5rem] mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> O maior está bem acima dos outros: confira se é a mesma peça (kit maior, parcelado, outro modelo) e tire da conta se não for.</p>}
              {aberto === r.sku && <Ofertas r={r} atualizar={atualizar} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Ofertas({ r, atualizar }: { r: ResultadoPP; atualizar: () => void }) {
  const marcar = async (id: number, d: { ignorar?: boolean; relevante?: boolean }) => {
    await marcarOfertaFn({ data: { id, ...d } });
    atualizar();
  };
  if (!r.ofertas.length) return <p className="ml-[4.5rem] mt-2 text-xs text-muted-foreground">Nenhuma oferta encontrada para este código.</p>;
  return (
    <div className="ml-[4.5rem] mt-2 overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-1.5">Loja</th><th className="px-3 py-1.5">Anúncio</th><th className="px-3 py-1.5 text-right">Preço</th><th className="px-3 py-1.5 text-right">Em R$</th><th className="px-3 py-1.5"></th></tr></thead>
        <tbody className="divide-y">
          {r.ofertas.map((o) => {
            const conta = o.relevante && !o.ignorar && o.preco_brl != null;
            return (
              <tr key={o.id} className={cn(!conta && "text-muted-foreground opacity-70")}>
                <td className="whitespace-nowrap px-3 py-1.5">{o.pais === "BR" ? "🇧🇷" : "🇺🇾"} {o.loja ?? o.fonte}</td>
                <td className="px-3 py-1.5">
                  {o.link ? <a href={o.link} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">{o.titulo} <ExternalLink className="inline h-3 w-3" /></a> : o.titulo}
                  {!o.relevante && <span className="ml-1 rounded bg-zinc-100 px-1 text-[10px]">sem o código no título</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right">{o.moeda} {o.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold">{o.preco_brl != null ? fmtBRL(o.preco_brl) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                  {o.relevante ? (
                    <button onClick={() => marcar(o.id, { ignorar: !o.ignorar })} className="inline-flex items-center gap-1 text-primary hover:underline">
                      {o.ignorar ? <><Eye className="h-3 w-3" /> Usar</> : <><EyeOff className="h-3 w-3" /> Tirar da conta</>}
                    </button>
                  ) : (
                    <button onClick={() => marcar(o.id, { relevante: true, ignorar: false })} className="text-primary hover:underline">É a mesma peça</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
