// Formulário montado a partir da descrição dos campos (Construtor da Home e e-mails por blocos):
// texto, área de texto, link, imagem, data e hora, número, cor, sim/não, lista e escolha.
import { createContext, useContext, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Plus, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CORES_MARCA, type Campo } from "@/lib/blocos-home";
import { reduzirImagem } from "@/lib/imagem-cliente";
import { cn } from "@/lib/utils";

// Quem usa o formulário pode trocar o envio de imagens (os e-mails não aceitam WEBP)
export type EnviarImagem = (arq: File) => Promise<string>;
export const EnvioImagemCtx = createContext<{ enviar?: EnviarImagem; aceita?: string }>({});

const CAMPO_CLS = "mt-1";
export function CampoForm({
  campo: f,
  valor,
  valorPt,
  aoMudar,
}: {
  campo: Campo;
  valor: any;
  valorPt?: any;
  aoMudar: (k: string, v: any) => void;
}) {
  const largo = f.tipo === "lista" || f.tipo === "textarea";
  const rotulo = (
    <span className="text-sm font-semibold text-zinc-700">
      {f.rotulo}
      {f.ajuda && <span className="block text-xs font-normal text-zinc-500">{f.ajuda}</span>}
    </span>
  );
  const wrap = (filho: React.ReactNode) => (
    <label className={cn("block", largo && "md:col-span-2")}>
      {rotulo}
      {filho}
    </label>
  );

  if (f.tipo === "bool")
    return (
      <label className="flex items-center gap-3 md:col-span-2">
        <Switch checked={!!valor} onCheckedChange={(v) => aoMudar(f.k, v)} />
        {rotulo}
      </label>
    );
  if (f.tipo === "select")
    return wrap(
      <select
        value={valor ?? f.opcoes[0][0]}
        onChange={(e) => aoMudar(f.k, e.target.value)}
        className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
      >
        {f.opcoes.map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </select>,
    );
  if (f.tipo === "cor")
    return wrap(
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(valor ?? "") ? valor : "#000000"}
          onChange={(e) => aoMudar(f.k, e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border"
        />
        <Input
          value={valor ?? ""}
          onChange={(e) => aoMudar(f.k, e.target.value)}
          className="h-9 w-24 font-mono text-xs"
        />
        {CORES_MARCA.map(([hex, nome]) => (
          <button
            key={hex}
            type="button"
            title={nome}
            onClick={() => aoMudar(f.k, hex)}
            className={cn(
              "h-6 w-6 rounded-full ring-1 ring-black/10",
              valor === hex && "ring-2 ring-primary ring-offset-1",
            )}
            style={{ background: hex }}
          />
        ))}
      </div>,
    );
  if (f.tipo === "lista")
    return wrap(
      <Lista
        campo={f}
        valor={Array.isArray(valor) ? valor : []}
        aoMudar={(v) => aoMudar(f.k, v)}
      />,
    );
  if (f.tipo === "imagem")
    return wrap(<CampoImagem valor={valor} aoMudar={(v) => aoMudar(f.k, v)} />);
  if (f.tipo === "datahora")
    return wrap(
      <Input
        type="datetime-local"
        value={paraLocal(valor)}
        onChange={(e) => aoMudar(f.k, e.target.value ? new Date(e.target.value).toISOString() : "")}
        className={CAMPO_CLS}
      />,
    );

  // texto / textarea / link / numero (bilíngue: espanhol + português)
  const entrada = (v: any, k: string, ph?: string) =>
    f.tipo === "textarea" ? (
      <textarea
        value={v ?? ""}
        onChange={(e) => aoMudar(k, e.target.value)}
        rows={4}
        placeholder={ph}
        className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
      />
    ) : (
      <Input
        type={f.tipo === "numero" ? "number" : "text"}
        value={v ?? ""}
        placeholder={ph ?? (f.tipo === "link" ? "/loja ou https://…" : undefined)}
        onChange={(e) => aoMudar(k, f.tipo === "numero" ? Number(e.target.value) : e.target.value)}
        className={CAMPO_CLS}
      />
    );
  if ("bilingue" in f && f.bilingue)
    return (
      <div className={cn(largo && "md:col-span-2")}>
        {rotulo}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-[11px] font-bold text-zinc-400">🇺🇾 ES</span>
            {entrada(valor, f.k)}
          </div>
          <div>
            <span className="text-[11px] font-bold text-zinc-400">
              🇧🇷 PT (vazio = usa o espanhol)
            </span>
            {entrada(valorPt, `${f.k}_pt`)}
          </div>
        </div>
      </div>
    );
  return wrap(entrada(valor, f.k));
}

// Data ISO → valor do campo datetime-local (no fuso do navegador)
function paraLocal(v: unknown) {
  if (typeof v !== "string" || !v) return "";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

function Lista({
  campo,
  valor,
  aoMudar,
}: {
  campo: Extract<Campo, { tipo: "lista" }>;
  valor: any[];
  aoMudar: (v: any[]) => void;
}) {
  const mudar = (i: number, k: string, v: any) =>
    aoMudar(valor.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= valor.length) return;
    const n = [...valor];
    [n[i], n[j]] = [n[j], n[i]];
    aoMudar(n);
  };
  return (
    <div className="mt-1 space-y-2">
      {valor.map((item, i) => (
        <div key={i} className="rounded-xl bg-zinc-50 p-3 ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">#{i + 1}</span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => mover(i, -1)}
                className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-800"
                aria-label="Subir"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-800"
                aria-label="Descer"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aoMudar(valor.filter((_, j) => j !== i))}
                className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {campo.campos.map((f) => (
              <CampoForm
                key={f.k}
                campo={f}
                valor={item[f.k]}
                valorPt={item[`${f.k}_pt`]}
                aoMudar={(k, v) => mudar(i, k, v)}
              />
            ))}
          </div>
        </div>
      ))}
      {valor.length < campo.max && (
        <button
          type="button"
          onClick={() => aoMudar([...valor, {}])}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      )}
    </div>
  );
}

function CampoImagem({ valor, aoMudar }: { valor: any; aoMudar: (v: string) => void }) {
  const [enviando, setEnviando] = useState(false);
  const ctx = useContext(EnvioImagemCtx);
  const url =
    typeof valor === "string" && valor
      ? valor.startsWith("http") || valor.startsWith("/")
        ? valor
        : `/uploads/${valor}`
      : "";
  const enviar = async (arq: File) => {
    setEnviando(true);
    try {
      if (ctx.enviar) {
        aoMudar(await ctx.enviar(arq));
        return;
      }
      const fd = new FormData();
      fd.append("file", await reduzirImagem(arq, 1600));
      fd.append("kind", "hero");
      const r = await fetch("/api/admin/banners/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.path) throw new Error(j.error || "Falha no envio");
      aoMudar(j.path);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="mt-1 flex items-center gap-3">
      {url ? (
        <img src={url} alt="" className="h-14 w-20 rounded-lg object-cover ring-1 ring-black/10" />
      ) : (
        <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-zinc-100 text-[10px] text-zinc-400">
          sem imagem
        </span>
      )}
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{" "}
        Enviar
        <input
          type="file"
          accept={ctx.aceita ?? "image/jpeg,image/png,image/webp,image/avif"}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])}
        />
      </label>
      {url && (
        <button
          type="button"
          onClick={() => aoMudar("")}
          className="text-xs text-red-600 hover:underline"
        >
          remover
        </button>
      )}
    </div>
  );
}
