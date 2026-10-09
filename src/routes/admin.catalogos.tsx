import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Upload, FolderSearch, Eye, EyeOff, Trash2, Lock, Unlock, ExternalLink, Loader2, Save, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  listarCatalogosAdminFn, detectarCatalogosFn, salvarCatalogoFn, excluirCatalogoFn, TIPOS_CATALOGO, type Catalogo,
} from "@/lib/catalogos";
import { MONTADORAS } from "@/lib/navegacao";
import { formatarCelularUY } from "@/lib/validacao-conta";

export const Route = createFileRoute("/admin/catalogos")({
  component: AdminCatalogos,
});

const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

// Catálogos e manuais em PDF da página /catalogos. Cada um só aparece no site quando publicado.
function AdminCatalogos() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-catalogos"], queryFn: () => listarCatalogosAdminFn() });
  const [enviando, setEnviando] = useState(false);
  const [marcaUpload, setMarcaUpload] = useState("");
  const inputArq = useRef<HTMLInputElement>(null);
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin-catalogos"] });

  const detectar = async () => {
    const r = await detectarCatalogosFn();
    toast.success(r.novos ? `${r.novos} arquivo(s) novo(s) cadastrado(s), despublicados.` : "Nenhum arquivo novo na pasta.");
    recarregar();
  };

  const enviar = async (arq: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", arq);
      fd.append("marca", marcaUpload);
      const res = await fetch("/api/admin/catalogos/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success("PDF enviado. Revise os dados e publique.");
      recarregar();
    } catch (e: any) {
      toast.error(e?.message || "Falha no envio");
    } finally {
      setEnviando(false);
      if (inputArq.current) inputArq.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><BookOpen className="h-6 w-6 text-primary" /> Catálogos para mecânicos</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          PDFs da página <a href="/catalogos" target="_blank" className="font-semibold text-primary underline">/catalogos</a>. Cada catálogo só aparece no site
          quando você publica. Com "exige login", o mecânico precisa criar conta para ver (só visualização, sem baixar) e você vê quem abriu.
        </p>
      </div>

      <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Publique só catálogos que vocês têm direito de distribuir (material próprio ou de fornecedores que autorizam). Manuais de fabricantes (AGCO, CNH, John Deere) costumam ter direitos autorais.</p>
      </Card>

      <Card className="grid gap-4 p-4 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Enviar PDF</h2>
          <p className="mb-3 text-xs text-muted-foreground">Até 300 MB. Para arquivos maiores, use o gerenciador de arquivos da Hostinger.</p>
          <div className="flex flex-wrap gap-2">
            <select value={marcaUpload} onChange={(e) => setMarcaUpload(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Marca (pasta)…</option>
              {MONTADORAS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input ref={inputArq} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
            <Button onClick={() => inputArq.current?.click()} disabled={enviando}>
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} {enviando ? "Enviando…" : "Escolher PDF"}
            </Button>
          </div>
        </div>
        <div>
          <h2 className="font-semibold">Arquivos colocados na pasta</h2>
          <p className="mb-3 break-all text-xs text-muted-foreground">Pasta no servidor: <code>{data?.pasta ?? "…"}</code></p>
          <Button variant="outline" onClick={detectar}><FolderSearch className="mr-2 h-4 w-4" /> Detectar arquivos</Button>
        </div>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : data?.catalogos.length ? (
        <div className="space-y-3">{data.catalogos.map((c) => <Linha key={c.id} c={c} aoMudar={recarregar} />)}</div>
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum catálogo cadastrado. Envie um PDF ou use "Detectar arquivos".</Card>
      )}

      <Card className="p-4">
        <h2 className="mb-1 font-semibold">Últimas visualizações</h2>
        <p className="mb-3 text-xs text-muted-foreground">Mecânicos que abriram catálogos: contatos para oferecer peças.</p>
        {data?.ultimos.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Quando</th><th className="pr-3">Quem</th><th className="pr-3">Contato</th><th className="pr-3">Departamento</th><th>Catálogo</th></tr></thead>
              <tbody>
                {data.ultimos.map((d, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(d.quando).toLocaleString("pt-BR", { timeZone: "America/Montevideo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="pr-3 font-medium">{d.nome}</td>
                    <td className="pr-3 text-muted-foreground">{[d.telefone && formatarCelularUY(d.telefone), d.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="pr-3">{d.departamento ?? "—"}</td>
                    <td className="max-w-[260px] truncate">{d.titulo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma visualização ainda.</p>
        )}
      </Card>
    </div>
  );
}

function Linha({ c, aoMudar }: { c: Catalogo; aoMudar: () => void }) {
  const [f, setF] = useState(c);
  const [salvando, setSalvando] = useState(false);
  const mudou = JSON.stringify(f) !== JSON.stringify(c);
  const salvar = async (extra: Partial<Catalogo> = {}) => {
    setSalvando(true);
    try {
      const d = { ...f, ...extra };
      await salvarCatalogoFn({ data: { id: d.id, titulo: d.titulo, marca: d.marca, tipo: d.tipo, descricao: d.descricao, idioma: d.idioma, ativo: d.ativo, exige_login: d.exige_login, ordem: d.ordem } });
      toast.success("Salvo");
      aoMudar();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  };
  const excluir = async () => {
    const apagar = window.confirm(`Excluir "${c.titulo}" do site?\n\nOK = também apagar o arquivo PDF do servidor\nCancelar = não excluir`);
    if (!apagar) return;
    await excluirCatalogoFn({ data: { id: c.id, apagarArquivo: true } });
    toast.success("Catálogo excluído");
    aoMudar();
  };
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Publicado" : "Não publicado"}</Badge>
        <Badge variant="outline">{c.exige_login ? "Exige login" : "Livre"}</Badge>
        <span className="text-xs text-muted-foreground">{mb(c.tamanho)} · {c.downloads} visualizações · {c.arquivo}</span>
        <div className="ml-auto flex gap-1">
          <a href={`/catalogos/archivo/${c.id}`} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted" title="Abrir PDF"><ExternalLink className="h-4 w-4" /></a>
          <Button size="sm" variant={c.ativo ? "outline" : "default"} onClick={() => salvar({ ativo: !c.ativo })} disabled={salvando}>
            {c.ativo ? <><EyeOff className="mr-1.5 h-4 w-4" /> Despublicar</> : <><Eye className="mr-1.5 h-4 w-4" /> Publicar</>}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => salvar({ exige_login: !c.exige_login })} disabled={salvando} title="Exigir login para ver">
            {c.exige_login ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={excluir} className="text-red-600" title="Excluir"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_80px]">
        <Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Título" />
        <select value={f.marca ?? ""} onChange={(e) => setF({ ...f, marca: e.target.value || null })} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">Sem marca</option>
          {MONTADORAS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm">
          {TIPOS_CATALOGO.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={f.idioma ?? ""} onChange={(e) => setF({ ...f, idioma: e.target.value || null })} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">Idioma…</option>
          {["Español", "Portugués", "Inglés"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <Input type="number" value={f.ordem} onChange={(e) => setF({ ...f, ordem: Number(e.target.value) })} title="Ordem" />
      </div>
      <textarea value={f.descricao ?? ""} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Descrição curta (modelos, ano, conteúdo)…" rows={2} className="mt-2 w-full rounded-md border bg-background p-2 text-sm" />
      {mudou && <Button size="sm" className="mt-2" onClick={() => salvar()} disabled={salvando}><Save className="mr-1.5 h-4 w-4" /> Salvar alterações</Button>}
    </Card>
  );
}
