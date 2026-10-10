import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, Images, Loader2, Upload, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { casarFotosFn, adicionarFotosFn, type Casamento } from "@/lib/produtos-admin";
import { enviarFotos } from "@/lib/imagem-cliente";
import { cn } from "@/lib/utils";

// Fotos em lote: o nome do arquivo diz de qual peça é (código original ou SKU).
// "3136019.jpg", "3136019-2.jpg", "3136019 (3).jpg" -> peça 3136019. Confere antes de enviar.
export const Route = createFileRoute("/admin/fotos-lote")({
  component: FotosLote,
});

type Item = Casamento & { file: File; preview: string; escolhido: string | null; status?: "ok" | "erro"; erro?: string };

function FotosLote() {
  const qc = useQueryClient();
  const [itens, setItens] = useState<Item[]>([]);
  const [lendo, setLendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [principal, setPrincipal] = useState(false);
  const arq = useRef<HTMLInputElement>(null);

  const escolher = async (files: FileList | null) => {
    if (!files?.length) return;
    setLendo(true);
    try {
      const lista = [...files].filter((f) => f.type.startsWith("image/"));
      const r = await casarFotosFn({ data: { nomes: lista.map((f) => f.name) } });
      setItens(r.map((c, i) => ({ ...c, file: lista[i], preview: URL.createObjectURL(lista[i]), escolhido: c.sku })));
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setLendo(false);
    }
  };
  const resumo = useMemo(() => ({
    ok: itens.filter((i) => i.escolhido).length,
    semPeca: itens.filter((i) => !i.escolhido).length,
    novas: new Set(itens.filter((i) => i.escolhido && !i.temFoto).map((i) => i.escolhido)).size,
  }), [itens]);

  const enviar = async () => {
    const porSku = new Map<string, Item[]>();
    itens.filter((i) => i.escolhido && i.status !== "ok").forEach((i) => porSku.set(i.escolhido!, [...(porSku.get(i.escolhido!) ?? []), i]));
    if (!porSku.size) return;
    setEnviando(true);
    setProgresso(0);
    let feitos = 0;
    for (const [sku, grupo] of porSku) {
      try {
        // Ordem: arquivo sem sufixo primeiro (vira a principal se a peça não tem foto)
        grupo.sort((a, b) => a.file.name.length - b.file.name.length || a.file.name.localeCompare(b.file.name));
        const paths = await enviarFotos(grupo.map((g) => g.file));
        await adicionarFotosFn({ data: { sku, paths, principal } });
        setItens((l) => l.map((i) => (grupo.includes(i) ? { ...i, status: "ok" } : i)));
      } catch (e: any) {
        setItens((l) => l.map((i) => (grupo.includes(i) ? { ...i, status: "erro", erro: e?.message } : i)));
      }
      feitos++;
      setProgresso(Math.round((feitos / porSku.size) * 100));
    }
    setEnviando(false);
    qc.invalidateQueries({ queryKey: ["produtos-admin"] });
    qc.invalidateQueries({ queryKey: ["resumo-produtos"] });
    toast.success("Envio concluído");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/produtos" className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Images className="h-6 w-6 text-primary" /> Fotos em lote</h1>
          <p className="text-sm text-muted-foreground">Nomeie cada foto com o <b>código original</b> ou o <b>SKU</b> da peça. Várias fotos da mesma peça: <code>3136019.jpg</code>, <code>3136019-2.jpg</code>, <code>3136019-3.jpg</code>.</p>
        </div>
      </div>

      <Card className="p-4">
        <input ref={arq} type="file" accept="image/*" multiple className="hidden" onChange={(e) => escolher(e.target.files)} />
        <button onClick={() => arq.current?.click()} disabled={lendo || enviando}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
          {lendo ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
          <span className="font-semibold">{lendo ? "Reconhecendo as peças…" : "Escolher fotos (pode selecionar centenas)"}</span>
          <span className="text-xs">JPG, PNG ou WEBP · reduzidas automaticamente antes do envio</span>
        </button>
      </Card>

      {itens.length > 0 && (
        <>
          <Card className="flex flex-wrap items-center gap-4 p-4">
            <span className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> {resumo.ok} fotos reconhecidas</span>
            {resumo.semPeca > 0 && <span className="flex items-center gap-2 font-semibold text-amber-700"><AlertTriangle className="h-5 w-5" /> {resumo.semPeca} sem peça (serão ignoradas)</span>}
            <span className="text-sm text-muted-foreground">{resumo.novas} peças vão ganhar a primeira foto</span>
            <label className="flex items-center gap-2 text-sm">Usar como foto principal mesmo se a peça já tiver <Switch checked={principal} onCheckedChange={setPrincipal} /></label>
            <div className="ml-auto flex items-center gap-2">
              {enviando && <span className="text-sm font-semibold">{progresso}%</span>}
              <Button variant="outline" onClick={() => setItens([])} disabled={enviando}>Limpar</Button>
              <Button onClick={enviar} disabled={enviando || !resumo.ok}>{enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Enviar {resumo.ok} fotos</Button>
            </div>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {itens.map((it, k) => (
              <Card key={k} className={cn("flex gap-3 p-3", !it.escolhido && "border-amber-300 bg-amber-50/50", it.status === "ok" && "border-emerald-300 bg-emerald-50/50", it.status === "erro" && "border-red-300")}>
                <img src={it.preview} alt="" className="h-20 w-20 shrink-0 rounded-md border bg-white object-contain" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-mono text-xs text-muted-foreground">{it.arquivo}</p>
                  {it.opcoes.length > 1 ? (
                    <select value={it.escolhido ?? ""} onChange={(e) => setItens((l) => l.map((x, j) => (j === k ? { ...x, escolhido: e.target.value || null } : x)))} className="mt-1 h-8 w-full rounded border bg-background px-2 text-xs">
                      {it.opcoes.map((o) => <option key={o.sku} value={o.sku}>{o.sku} · {o.nome.slice(0, 40)}</option>)}
                      <option value="">Ignorar</option>
                    </select>
                  ) : it.escolhido ? (
                    <p className="mt-1 line-clamp-2 font-medium">{it.nome}</p>
                  ) : (
                    <p className="mt-1 font-semibold text-amber-700">Nenhuma peça com este código</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {it.status === "ok" ? "✓ enviada" : it.status === "erro" ? `Erro: ${it.erro}` : it.escolhido ? (it.temFoto ? "peça já tem foto: vira foto extra" : "primeira foto da peça") : ""}
                  </p>
                </div>
                {!it.status && <button onClick={() => setItens((l) => l.filter((_, j) => j !== k))} className="self-start text-muted-foreground hover:text-red-600" aria-label="Remover"><X className="h-4 w-4" /></button>}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
