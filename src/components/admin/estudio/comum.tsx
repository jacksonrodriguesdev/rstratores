// Peças comuns às ferramentas do Estúdio: contexto (enviar ao compositor, publicações),
// campos, prévia com download/usar no post, cópia e o motor de lote (gera, envia e agenda).
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PostInstagram } from "@/lib/instagram";
import { paraJpg } from "./artes";

export type Midia = { path: string; tipo: "IMAGE" | "VIDEO" };
export type TipoPost = "FEED" | "CARROSSEL" | "STORY";
export type Horarios = { horas: number[]; semana: number[]; topHoras: number[]; topDias: string[] };
export const EstudioCtx = createContext<{
  usarNoPost: (midias: Midia[], legenda: string, tipo: TipoPost, comentario?: string) => void;
  posts: PostInstagram[];
  horarios?: Horarios;
  abrir: (id: string) => void;
}>({ usarNoPost: () => {}, posts: [], abrir: () => {} });
export const useEstudio = () => useContext(EstudioCtx);

export const miniatura = (u: string) => `/api/admin/estudio/foto?u=${encodeURIComponent(u)}`;

export async function enviarBlob(b: Blob, nome: string): Promise<Midia> {
  const fd = new FormData();
  fd.append("file", new File([b], nome, { type: b.type || "image/jpeg" }));
  const r = await fetch("/api/admin/instagram/upload", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.path) throw new Error(j.error || "Falha no envio");
  return { path: j.path, tipo: "IMAGE" };
}
export function baixarBlob(b: Blob, nome: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = nome.replace(/[^\w.-]+/g, "_");
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export async function copiar(t: string) {
  try {
    await navigator.clipboard.writeText(t);
    toast.success("Copiado");
  } catch {
    toast.error("Não foi possível copiar");
  }
}

export function Campo({
  r,
  children,
  className,
}: {
  r: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {r}
      </span>
      {children}
    </div>
  );
}
export function Opcoes<T extends string | number>({
  v,
  set,
  ops,
}: {
  v: T;
  set: (v: T) => void;
  ops: ReadonlyArray<readonly [T, string]>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {ops.map(([k, r]) => (
        <button
          key={String(k)}
          type="button"
          onClick={() => set(k)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-semibold",
            v === k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
export function BotaoCopiar({ t, rotulo = "Copiar" }: { t: string; rotulo?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await copiar(t);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />} {rotulo}
    </Button>
  );
}

// Prévia ao vivo de um canvas gerado (refaz quando "chave" muda) + baixar / usar no post
export function PreviaArte({
  gerar,
  chave,
  nome,
  legenda = "",
  tipo = "FEED",
  png = false,
  comentario,
}: {
  gerar: () => Promise<HTMLCanvasElement | null>;
  chave: string;
  nome: string;
  legenda?: string;
  tipo?: TipoPost;
  png?: boolean;
  comentario?: string;
}) {
  const { usarNoPost } = useEstudio();
  const [src, setSrc] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [indo, setIndo] = useState(false);
  const atual = useRef<HTMLCanvasElement | null>(null);
  const vez = useRef(0);
  useEffect(() => {
    const minha = ++vez.current;
    setCarregando(true);
    const t = setTimeout(async () => {
      try {
        const c = await gerar();
        if (minha !== vez.current) return;
        atual.current = c;
        setSrc(c ? c.toDataURL(png ? "image/png" : "image/jpeg", 0.85) : null);
      } catch (e: any) {
        if (minha === vez.current) toast.error(e.message);
      } finally {
        if (minha === vez.current) setCarregando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  const blob = () =>
    png
      ? new Promise<Blob>((ok, erro) =>
          atual.current!.toBlob((b) => (b ? ok(b) : erro(new Error("falha"))), "image/png"),
        )
      : paraJpg(atual.current!);
  return (
    <div className="space-y-2">
      <div className="relative flex min-h-[300px] items-center justify-center rounded-xl bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:20px_20px] p-3">
        {src ? (
          <img src={src} alt="Prévia" className="max-h-[520px] rounded-lg shadow-xl" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {carregando ? "Gerando…" : "Preencha os campos para ver a arte."}
          </p>
        )}
        {carregando && src && (
          <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> gerando
          </span>
        )}
      </div>
      {src && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={indo}
            onClick={async () => {
              setIndo(true);
              try {
                const m = await enviarBlob(await paraJpg(atual.current!), `${nome}.jpg`);
                usarNoPost([m], legenda, tipo, comentario);
                toast.success("Enviado ao compositor: revise e publique ou agende");
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setIndo(false);
              }
            }}
          >
            {indo ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}{" "}
            Usar no post
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => baixarBlob(await blob(), `${nome}.${png ? "png" : "jpg"}`)}
          >
            <Download className="mr-1.5 h-4 w-4" /> Baixar
          </Button>
        </div>
      )}
    </div>
  );
}

// Próximos horários livres: N por dia, nas horas escolhidas, a partir de uma data
export function horariosAgenda(o: {
  inicio: string;
  porDia: number;
  horas: number[];
  quantidade: number;
  ocupados?: string[];
}) {
  const out: Date[] = [];
  const horas = [...new Set(o.horas)].sort((a, b) => a - b).slice(0, Math.max(1, o.porDia));
  const ocup = new Set((o.ocupados ?? []).map((x) => new Date(x).toISOString().slice(0, 13)));
  const d = new Date(`${o.inicio}T00:00:00`);
  const limite = Date.now() + 5 * 60_000;
  for (let dia = 0; out.length < o.quantidade && dia < 400; dia++) {
    for (const h of horas) {
      const t = new Date(d);
      t.setDate(d.getDate() + dia);
      t.setHours(h, 0, 0, 0);
      if (t.getTime() < limite || ocup.has(t.toISOString().slice(0, 13))) continue;
      out.push(t);
      if (out.length >= o.quantidade) break;
    }
  }
  return out;
}
