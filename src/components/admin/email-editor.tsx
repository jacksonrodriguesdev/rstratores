// Peças do editor de e-mail (campanhas e automações): seções, imagem de cabeçalho,
// produtos, público e prévia.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Trash2, Search, Plus, ChevronUp, ChevronDown, Users, Loader2, CheckCircle2, X, Smartphone, Monitor } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contarPublicoFn, buscarProdutosEmailFn } from "@/lib/emails";
import { urlAbsoluta, PUBLICOS, type Publico, type ProdutoEmail } from "@/lib/email-template";
import { DEPARTAMENTOS_UY } from "@/lib/validacao-conta";
import { cn } from "@/lib/utils";

export const CORES = ["#0b7a3b", "#06321b", "#c8102e", "#e07b00", "#1f6fb5", "#18181b"];
export const LINKS_RAPIDOS = [
  { rotulo: "Tienda", url: "/loja" },
  { rotulo: "Catálogos PDF", url: "/catalogos" },
  { rotulo: "Pedido rápido", url: "/pedido-rapido" },
  { rotulo: "Inicio", url: "/" },
];

export function Secao({ icone: Icone, titulo, children, dica }: { icone: any; titulo: string; children: React.ReactNode; dica?: string }) {
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 font-semibold"><Icone className="h-4 w-4 text-primary" /> {titulo}</h2>
      {dica && <p className="mt-0.5 text-xs text-muted-foreground">{dica}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </Card>
  );
}
export const Rotulo = ({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) => (
  <label className="flex items-baseline justify-between text-xs font-semibold text-muted-foreground"><span>{children}</span>{extra}</label>
);
export const areaCls = "w-full rounded-md border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function Cabecalho({ valor, aoMudar }: { valor?: string; aoMudar: (v: string) => void }) {
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

export function Produtos({ lista, aoMudar }: { lista: ProdutoEmail[]; aoMudar: (p: ProdutoEmail[]) => void }) {
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

export function PublicoSecao({ publico, aoMudar }: { publico: Publico; aoMudar: (p: Publico) => void }) {
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

// Prévia do e-mail como o cliente vê (celular ou computador)
export function PreviaEmail({ html, assunto, preheader }: { html: string; assunto: string; preheader: string }) {
  const [modo, setModo] = useState<"celular" | "computador">("celular");
  return (
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
  );
}
