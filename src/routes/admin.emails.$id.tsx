import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Smartphone, Monitor, Upload, Trash2, Search, Plus, ChevronUp, ChevronDown, Send, FlaskConical, Users,
  Loader2, CheckCircle2, Image as ImageIcon, Type, Package, MousePointerClick, Eye, AlertTriangle, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  obterCampanhaFn, salvarCampanhaFn, contarPublicoFn, enviarTesteFn, enviarCampanhaFn, enviosCampanhaFn, buscarProdutosEmailFn, statusEmailFn,
  type Campanha,
} from "@/lib/emails";
import { renderEmail, urlAbsoluta, PUBLICOS, type ConteudoEmail, type Publico, type ProdutoEmail } from "@/lib/email-template";
import { DEPARTAMENTOS_UY } from "@/lib/validacao-conta";
import { getSessionFn } from "@/lib/user-auth";
import { COR_STATUS, ROTULO_STATUS } from "@/components/admin/email-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/emails/$id")({
  component: Editor,
});

const CORES = ["#0b7a3b", "#06321b", "#c8102e", "#e07b00", "#1f6fb5", "#18181b"];
const LINKS_RAPIDOS = [
  { rotulo: "Tienda", url: "/loja" },
  { rotulo: "Catálogos PDF", url: "/catalogos" },
  { rotulo: "Pedido rápido", url: "/pedido-rapido" },
  { rotulo: "Inicio", url: "/" },
];
const ROTULO_ENVIO: Record<string, string> = {
  ENVIADO: "Enviado", ENTREGUE: "Entregue", ABERTO: "Abriu", CLICADO: "Clicou", REBOTADO: "Rebote", QUEIXA: "Marcou spam", FALHA: "Falhou",
};

function Editor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: camp, refetch } = useQuery({
    queryKey: ["email-campanha", id],
    queryFn: () => obterCampanhaFn({ data: { id: Number(id) } }),
    refetchInterval: (q) => (q.state.data?.status === "ENVIANDO" ? 2500 : false),
  });
  if (camp === undefined) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (camp === null) return <p>Campanha não encontrada. <Link to="/admin/emails" className="text-primary underline">Voltar</Link></p>;
  return <Formulario key={camp.id} inicial={camp} atualizar={() => { refetch(); qc.invalidateQueries({ queryKey: ["email-campanhas"] }); }} />;
}

function Secao({ icone: Icone, titulo, children, dica }: { icone: any; titulo: string; children: React.ReactNode; dica?: string }) {
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 font-semibold"><Icone className="h-4 w-4 text-primary" /> {titulo}</h2>
      {dica && <p className="mt-0.5 text-xs text-muted-foreground">{dica}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </Card>
  );
}
const Rotulo = ({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) => (
  <label className="flex items-baseline justify-between text-xs font-semibold text-muted-foreground"><span>{children}</span>{extra}</label>
);
const areaCls = "w-full rounded-md border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function Formulario({ inicial, atualizar }: { inicial: Campanha; atualizar: () => void }) {
  const [nome, setNome] = useState(inicial.nome);
  const [assunto, setAssunto] = useState(inicial.assunto);
  const [preheader, setPreheader] = useState(inicial.preheader);
  const [c, setC] = useState<ConteudoEmail>(inicial.conteudo);
  const [publico, setPublico] = useState<Publico>(inicial.publico);
  const [salvo, setSalvo] = useState<"salvo" | "salvando" | "pendente">("salvo");
  const [modo, setModo] = useState<"celular" | "computador">("celular");
  const set = <K extends keyof ConteudoEmail>(k: K, v: ConteudoEmail[K]) => setC((o) => ({ ...o, [k]: v }));
  const { data: st } = useQuery({ queryKey: ["email-status"], queryFn: () => statusEmailFn() });
  const enviando = inicial.status === "ENVIANDO";

  // Salva sozinho 1 s depois de parar de digitar
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    if (enviando) return;
    setSalvo("pendente");
    const t = setTimeout(async () => {
      setSalvo("salvando");
      try {
        await salvarCampanhaFn({ data: { id: inicial.id, nome, assunto, preheader, conteudo: c, publico } });
        setSalvo("salvo");
      } catch (e: any) {
        toast.error(e?.message || "Falha ao salvar");
        setSalvo("pendente");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [nome, assunto, preheader, c, publico]); // eslint-disable-line react-hooks/exhaustive-deps

  const html = useMemo(
    () => renderEmail(c, { origem: typeof window !== "undefined" ? window.location.origin : "", nome: "Juan Pérez", preheader, urlBaixa: "#", whatsappUrl: "#", campanha: "previa" }),
    [c, preheader],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/emails" className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Link>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={enviando} className="h-10 max-w-md text-lg font-semibold" aria-label="Nome interno da campanha" />
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", COR_STATUS[inicial.status])}>{ROTULO_STATUS[inicial.status]}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {salvo === "salvo" ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Salvo</> : salvo === "salvando" ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</> : "Alterações não salvas"}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
        <fieldset disabled={enviando} className="min-w-0 space-y-4 disabled:opacity-70">
          <Secao icone={Type} titulo="Assunto" dica="É o que aparece na caixa de entrada. Use {{nombre}} para o primeiro nome do cliente.">
            <div>
              <Rotulo extra={<span className={assunto.length > 60 ? "text-amber-600" : ""}>{assunto.length}/60</span>}>Assunto</Rotulo>
              <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ej.: {{nombre}}, 15% en filtros esta semana" />
            </div>
            <div>
              <Rotulo extra={`${preheader.length}/100`}>Texto de prévia (aparece ao lado do assunto)</Rotulo>
              <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Envíos a todo Uruguay por DAC" />
            </div>
          </Secao>

          <Secao icone={ImageIcon} titulo="Imagem de cabeçalho" dica="1200×600 px, JPG ou PNG, até 3 MB. Os banners prontos de marketing/banners_home servem.">
            <Cabecalho valor={c.cabecalho} aoMudar={(v) => set("cabecalho", v)} />
            {c.cabecalho && (
              <div>
                <Rotulo>Link ao clicar na imagem (opcional)</Rotulo>
                <Input value={c.cabecalhoLink ?? ""} onChange={(e) => set("cabecalhoLink", e.target.value)} placeholder="/loja" />
              </div>
            )}
          </Secao>

          <Secao icone={Type} titulo="Conteúdo">
            <div>
              <Rotulo>Selo de destaque (opcional)</Rotulo>
              <Input value={c.destaque ?? ""} onChange={(e) => set("destaque", e.target.value)} placeholder="-15% OFF · SOLO ESTA SEMANA" />
            </div>
            <div>
              <Rotulo>Título</Rotulo>
              <Input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} />
            </div>
            <div>
              <Rotulo extra="**negrito** · [texto](/loja)">Texto</Rotulo>
              <textarea value={c.texto} onChange={(e) => set("texto", e.target.value)} rows={6} className={areaCls} />
            </div>
            <div>
              <Rotulo>Cor principal</Rotulo>
              <div className="flex items-center gap-2">
                {CORES.map((cor) => (
                  <button key={cor} type="button" onClick={() => set("cor", cor)} className={cn("h-8 w-8 rounded-full ring-offset-2", c.cor === cor && "ring-2 ring-primary")} style={{ background: cor }} aria-label={cor} />
                ))}
                <input type="color" value={c.cor} onChange={(e) => set("cor", e.target.value)} className="h-8 w-10 cursor-pointer rounded border" aria-label="Outra cor" />
              </div>
            </div>
          </Secao>

          <Secao icone={Package} titulo="Produtos do site" dica="Até 12. Cada produto vira um card com foto e botão “Cotizar” que abre a página dele.">
            <div>
              <Rotulo>Título da seção</Rotulo>
              <Input value={c.produtosTitulo ?? ""} onChange={(e) => set("produtosTitulo", e.target.value)} placeholder="Destacados del mes" />
            </div>
            <label className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <span><b>Mostrar fotos dos produtos</b><br /><span className="text-xs">Desligado: o card mostra o código da peça. Ligue só se as fotos forem próprias ou autorizadas pelo fornecedor (boa parte veio de outra loja).</span></span>
              <Switch checked={!!c.fotos} onCheckedChange={(v) => set("fotos", v)} />
            </label>
            <Produtos lista={c.produtos} aoMudar={(p) => set("produtos", p)} />
          </Secao>

          <Secao icone={MousePointerClick} titulo="Botões">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Rotulo>Texto do botão</Rotulo>
                <Input value={c.botaoTexto ?? ""} onChange={(e) => set("botaoTexto", e.target.value)} placeholder="Ver ofertas" />
              </div>
              <div>
                <Rotulo>Link</Rotulo>
                <Input value={c.botaoUrl ?? ""} onChange={(e) => set("botaoUrl", e.target.value)} placeholder="/loja" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LINKS_RAPIDOS.map((l) => (
                <button key={l.url} type="button" onClick={() => set("botaoUrl", l.url)} className={cn("rounded-full border px-3 py-1 text-xs", c.botaoUrl === l.url && "border-primary bg-primary/10 text-primary")}>{l.rotulo}</button>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
              <span>Botão verde “Cotizar por WhatsApp”</span>
              <Switch checked={!!c.whatsapp} onCheckedChange={(v) => set("whatsapp", v)} />
            </label>
          </Secao>

          <PublicoSecao publico={publico} aoMudar={setPublico} />
        </fieldset>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b p-2">
              <span className="pl-2 text-sm font-semibold">Prévia</span>
              <div className="ml-auto flex rounded-lg bg-muted p-0.5">
                {(["celular", "computador"] as const).map((m) => (
                  <button key={m} onClick={() => setModo(m)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold", modo === m && "bg-background shadow")}>
                    {m === "celular" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />} {m === "celular" ? "Celular" : "Computador"}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-b bg-white px-4 py-2.5">
              <p className="truncate text-sm"><b>AGRO PARTS</b> · <span className="font-semibold">{assunto.replace(/\{\{\s*nombre\s*\}\}/gi, "Juan") || "(sem assunto)"}</span></p>
              <p className="truncate text-xs text-muted-foreground">{preheader}</p>
            </div>
            <div className="flex justify-center bg-zinc-200 p-3">
              <iframe title="Prévia do e-mail" srcDoc={html} sandbox="" className="h-[640px] rounded-lg bg-white shadow transition-all" style={{ width: modo === "celular" ? 375 : "100%" }} />
            </div>
          </Card>
          <Envio camp={inicial} assunto={assunto} preheader={preheader} conteudo={c} publico={publico} configurado={!!st?.configurado} salvo={salvo === "salvo"} atualizar={atualizar} />
        </div>
      </div>
    </div>
  );
}

function Cabecalho({ valor, aoMudar }: { valor?: string; aoMudar: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const enviar = async (f: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/admin/emails/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      aoMudar(j.path);
    } catch (e: any) {
      toast.error(e?.message || "Falha no envio");
    } finally {
      setEnviando(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/gif" className="hidden" onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
      {valor ? (
        <div className="relative overflow-hidden rounded-lg border">
          <img src={urlAbsoluta(valor, "")} alt="" className="max-h-56 w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => ref.current?.click()}><Upload className="mr-1 h-4 w-4" /> Trocar</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => aoMudar("")} aria-label="Remover imagem"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={enviando} className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary">
          {enviando ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />} {enviando ? "Enviando…" : "Escolher imagem"}
        </button>
      )}
    </div>
  );
}

function Produtos({ lista, aoMudar }: { lista: ProdutoEmail[]; aoMudar: (p: ProdutoEmail[]) => void }) {
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setBusca(q), 350);
    return () => clearTimeout(t);
  }, [q]);
  const { data: res, isFetching } = useQuery({ queryKey: ["email-produtos", busca], queryFn: () => buscarProdutosEmailFn({ data: { q: busca } }) });
  const mover = (i: number, d: number) => {
    const n = [...lista];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    aoMudar(n);
  };
  const tem = new Set(lista.map((p) => p.sku));
  return (
    <div className="space-y-3">
      {lista.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {lista.map((p, i) => (
            <li key={p.sku} className="flex items-center gap-3 p-2">
              <div className="h-12 w-12 shrink-0 rounded bg-muted">{p.imagem && <img src={urlAbsoluta(p.imagem, "")} alt="" className="h-full w-full object-contain" />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.nome}</p>
                <p className="text-xs text-muted-foreground">Cód: {p.codigo}</p>
              </div>
              <button type="button" disabled={i === 0} onClick={() => mover(i, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-30" aria-label="Subir"><ChevronUp className="h-4 w-4" /></button>
              <button type="button" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30" aria-label="Descer"><ChevronDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => aoMudar(lista.filter((x) => x.sku !== p.sku))} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label="Remover"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto por nome ou código…" className="pl-9" />
        {isFetching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">
        {res?.map((p) => (
          <button
            key={p.sku}
            type="button"
            disabled={tem.has(p.sku) || lista.length >= 12}
            onClick={() => aoMudar([...lista, { sku: p.sku, nome: p.nome, codigo: p.codigo, imagem: p.imagem }])}
            className="group relative flex flex-col rounded-lg border p-2 text-left hover:border-primary disabled:opacity-40"
          >
            <div className="aspect-square rounded bg-muted">{p.imagem && <img src={urlAbsoluta(p.imagem, "")} alt="" loading="lazy" className="h-full w-full object-contain" />}</div>
            <p className="mt-1 line-clamp-2 text-xs font-medium">{p.nome}</p>
            <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white opacity-0 group-hover:opacity-100">{tem.has(p.sku) ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PublicoSecao({ publico, aoMudar }: { publico: Publico; aoMudar: (p: Publico) => void }) {
  const [conta, setConta] = useState<{ total: number; exemplos: string[] } | null>(null);
  useEffect(() => {
    setConta(null);
    const t = setTimeout(() => contarPublicoFn({ data: publico }).then(setConta).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [publico]);
  const opcao = PUBLICOS.find((p) => p.valor === publico.tipo);
  return (
    <Secao icone={Users} titulo="Quem vai receber" dica="Só clientes cadastrados que não se descadastraram.">
      <select value={publico.tipo} onChange={(e) => aoMudar({ ...publico, tipo: e.target.value as Publico["tipo"] })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
        {PUBLICOS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
      </select>
      {opcao?.usaDias && (
        <div className="flex items-center gap-2 text-sm">
          N =
          <Input type="number" min={1} value={publico.dias} onChange={(e) => aoMudar({ ...publico, dias: Math.max(1, Number(e.target.value) || 1) })} className="w-24" /> dias
        </div>
      )}
      {publico.tipo === "departamentos" && (
        <div className="flex flex-wrap gap-1.5">
          {DEPARTAMENTOS_UY.map((d) => {
            const on = publico.departamentos.includes(d);
            return (
              <button key={d} type="button" onClick={() => aoMudar({ ...publico, departamentos: on ? publico.departamentos.filter((x) => x !== d) : [...publico.departamentos, d] })}
                className={cn("rounded-full border px-3 py-1 text-xs", on && "border-primary bg-primary text-white")}>{d}</button>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-sm">
        <Users className="h-5 w-5 text-primary" />
        {conta ? <span><b className="text-lg">{conta.total}</b> {conta.total === 1 ? "cliente vai" : "clientes vão"} receber</span> : <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    </Secao>
  );
}

function Envio({ camp, assunto, preheader, conteudo, publico, configurado, salvo, atualizar }: {
  camp: Campanha; assunto: string; preheader: string; conteudo: ConteudoEmail; publico: Publico; configurado: boolean; salvo: boolean; atualizar: () => void;
}) {
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const [para, setPara] = useState("");
  const [testando, setTestando] = useState(false);
  const [disparando, setDisparando] = useState(false);
  useEffect(() => { if (sessao?.email && !para) setPara(sessao.email); }, [sessao]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: envios } = useQuery({
    queryKey: ["email-envios", camp.id, camp.enviados, camp.status],
    queryFn: () => enviosCampanhaFn({ data: { id: camp.id } }),
    enabled: camp.status !== "RASCUNHO",
  });

  const teste = async () => {
    setTestando(true);
    try {
      await enviarTesteFn({ data: { para, assunto, preheader, conteudo } });
      toast.success(`Teste enviado para ${para}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha no envio");
    } finally {
      setTestando(false);
    }
  };
  const disparar = async () => {
    if (!assunto.trim()) return toast.error("Escreva o assunto");
    const { total } = await contarPublicoFn({ data: publico });
    const novos = camp.status === "RASCUNHO" ? total : null;
    const msg = novos !== null
      ? `Enviar "${assunto}" para ${total} clientes agora?\n\nDepois de enviado não dá para desfazer.`
      : `Enviar esta campanha para quem ainda não recebeu (clientes novos no público)?\nQuem já recebeu não recebe de novo.`;
    if (!total) return toast.error("Nenhum cliente no público escolhido");
    if (!window.confirm(msg)) return;
    setDisparando(true);
    try {
      await enviarCampanhaFn({ data: { id: camp.id } });
      toast.success("Envio iniciado");
      setTimeout(atualizar, 800);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar");
    } finally {
      setDisparando(false);
    }
  };

  const ps = envios?.porStatus ?? {};
  const abertos = (ps.ABERTO ?? 0) + (ps.CLICADO ?? 0);
  const pct = (a: number) => (camp.enviados ? `${Math.round((a / camp.enviados) * 100)}%` : "—");

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold"><FlaskConical className="h-4 w-4 text-primary" /> Enviar teste</h2>
        <div className="mt-2 flex gap-2">
          <Input value={para} onChange={(e) => setPara(e.target.value)} placeholder="seu@email.com" />
          <Button variant="outline" onClick={teste} disabled={!configurado || testando}>{testando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar"}</Button>
        </div>
      </div>

      {camp.status === "ENVIANDO" ? (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><Loader2 className="h-4 w-4 animate-spin" /> Enviando… {camp.enviados + camp.falhas} de {camp.total}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full bg-amber-500 transition-all" style={{ width: `${camp.total ? ((camp.enviados + camp.falhas) / camp.total) * 100 : 0}%` }} /></div>
          {!camp.rodando && (
            <Button size="sm" className="mt-3" onClick={disparar}>Retomar envio (o servidor reiniciou)</Button>
          )}
        </div>
      ) : (
        <Button size="lg" className="h-12 w-full text-base" onClick={disparar} disabled={!configurado || disparando || !salvo}>
          {disparando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          {camp.status === "RASCUNHO" || camp.status === "ERRO" ? "Enviar campanha" : "Enviar para os novos do público"}
        </Button>
      )}
      {!configurado && <p className="text-xs text-amber-700">Configure o Resend na Hostinger para enviar.</p>}
      {camp.erro && <p className="flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" /> {camp.erro}</p>}

      {camp.status !== "RASCUNHO" && envios && (
        <div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/60 p-2"><p className="text-lg font-bold">{camp.enviados}</p>enviados</div>
            <div className="rounded-lg bg-muted/60 p-2"><p className="text-lg font-bold">{pct(abertos)}</p><Eye className="mr-0.5 inline h-3 w-3" />abriram</div>
            <div className="rounded-lg bg-muted/60 p-2"><p className="text-lg font-bold">{pct(ps.CLICADO ?? 0)}</p>clicaram</div>
            <div className="rounded-lg bg-muted/60 p-2"><p className="text-lg font-bold">{(ps.REBOTADO ?? 0) + (ps.QUEIXA ?? 0) + (ps.FALHA ?? 0)}</p>problemas</div>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border text-sm">
            {envios.envios.map((e, i) => (
              <div key={i} className="flex items-center gap-2 border-b px-3 py-1.5 last:border-0">
                <span className="min-w-0 flex-1 truncate">{e.email}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  e.status === "CLICADO" || e.status === "ABERTO" ? "bg-emerald-100 text-emerald-800" : ["FALHA", "REBOTADO", "QUEIXA"].includes(e.status) ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-700")}
                  title={e.erro ?? undefined}>{ROTULO_ENVIO[e.status] ?? e.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
