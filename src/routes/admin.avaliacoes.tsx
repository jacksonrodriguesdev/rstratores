// Admin → Avaliações: aprovar, rejeitar e responder as avaliações dos clientes. Só as
// aprovadas aparecem na página da peça (e no Google, como estrelas do produto).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  Loader2,
  MessageSquareReply,
  Star,
  Undo2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { moderacaoFn, moderarFn } from "@/lib/avaliacoes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/avaliacoes")({ component: PaginaAvaliacoes });

const ABAS = [
  ["PENDENTE", "Para aprovar"],
  ["APROVADA", "Aprovadas"],
  ["REJEITADA", "Rejeitadas"],
  ["TODAS", "Todas"],
] as const;
const foto = (u: string | null) =>
  !u ? null : u.startsWith("http") ? u : `/uploads/${u.replace(/^\/?(uploads\/)?/, "")}`;

function PaginaAvaliacoes() {
  const [aba, setAba] = useState<(typeof ABAS)[number][0]>("PENDENTE");
  const { data, isLoading } = useQuery({
    queryKey: ["moderacao", aba],
    queryFn: () => moderacaoFn({ data: { status: aba } }),
  });
  const c = data?.contagem;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Star className="h-6 w-6 text-amber-400" fill="currentColor" strokeWidth={0} /> Avaliações
          dos clientes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aprove as avaliações reais (boas ou ruins): rejeite só spam, ofensa ou dados pessoais.
          Responder às críticas passa confiança. As vendas e etiquetas ficam em{" "}
          <Link to="/admin/vendas" className="font-semibold text-primary underline">
            Vendas
          </Link>
          .
        </p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {ABAS.map(([k, r]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold",
              aba === k ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r}
            {k === "PENDENTE" && !!c?.pendentes && (
              <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-[10px] text-white">
                {c.pendentes}
              </span>
            )}
            {k === "APROVADA" && c ? ` (${c.aprovadas})` : ""}
            {k === "REJEITADA" && c ? ` (${c.rejeitadas})` : ""}
          </button>
        ))}
      </div>
      {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
      {data && !data.lista.length && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {aba === "PENDENTE" ? "Nenhuma avaliação esperando aprovação." : "Nada aqui."}
        </Card>
      )}
      <div className="space-y-3">
        {data?.lista.map((a) => (
          <ItemAvaliacao key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}

function ItemAvaliacao({ a }: { a: any }) {
  const qc = useQueryClient();
  const [resp, setResp] = useState<string>(a.resposta ?? "");
  const [abrir, setAbrir] = useState(false);
  const [indo, setIndo] = useState("");
  const acao = async (
    dados: { status?: "APROVADA" | "REJEITADA" | "PENDENTE"; resposta?: string | null },
    msg: string,
  ) => {
    setIndo(JSON.stringify(dados));
    try {
      await moderarFn({ data: { id: a.id, ...dados } });
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["moderacao"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIndo("");
    }
  };
  const f = foto(a.foto);
  return (
    <Card className={cn("p-4", a.nota <= 2 && "border-amber-300")}>
      <div className="flex flex-wrap items-start gap-4">
        {f ? (
          <img src={f} alt="" className="h-16 w-16 rounded-lg border bg-white object-contain" />
        ) : (
          <span className="h-16 w-16 rounded-lg bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <a
            href={`/produto/${encodeURIComponent(a.sku)}#avaliacoes`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            {a.peca} <ExternalLink className="h-3 w-3" />
          </a>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn("h-4 w-4", i <= a.nota ? "text-amber-400" : "text-zinc-200")}
                  fill="currentColor"
                  strokeWidth={0}
                />
              ))}
            </span>
            <b>{a.nome}</b>
            {a.cidade && <span className="text-muted-foreground">{a.cidade}</span>}
            <span className="text-xs text-muted-foreground">
              {new Date(a.created_at).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
            <span className="rounded bg-muted px-1.5 text-[10px] font-bold uppercase">
              {a.idioma}
            </span>
            {a.verificada && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" /> venda {a.venda?.codigo}
              </span>
            )}
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold",
                a.status === "APROVADA"
                  ? "bg-emerald-100 text-emerald-800"
                  : a.status === "REJEITADA"
                    ? "bg-zinc-200 text-zinc-600"
                    : "bg-amber-100 text-amber-800",
              )}
            >
              {a.status}
            </span>
          </div>
          {a.comentario ? (
            <p className="mt-2 whitespace-pre-line text-sm">{a.comentario}</p>
          ) : (
            <p className="mt-2 text-xs italic text-muted-foreground">
              Só as estrelas, sem comentário.
            </p>
          )}
          {!!a.fotos?.length && (
            <div className="mt-2 flex flex-wrap gap-2">
              {a.fotos.map((p: string) => (
                <a
                  key={p}
                  href={`/uploads/${p}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir foto (baixe para usar no Instagram)"
                >
                  <img
                    src={`/uploads/${p}`}
                    alt=""
                    className="h-20 w-20 rounded-md border object-cover"
                  />
                </a>
              ))}
              <span className="self-end text-[11px] text-muted-foreground">
                Fotos do cliente: aparecem na peça quando aprovada
              </span>
            </div>
          )}
          {a.resposta && !abrir && (
            <p className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
              <b>Sua resposta:</b> {a.resposta}
            </p>
          )}
          {abrir && (
            <div className="mt-2 space-y-2">
              <Textarea
                rows={3}
                value={resp}
                onChange={(e) => setResp(e.target.value)}
                placeholder="Resposta pública da AGRO PARTS…"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    acao({ resposta: resp }, "Resposta salva").then(() => setAbrir(false))
                  }
                >
                  Salvar resposta
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAbrir(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {a.status !== "APROVADA" && (
            <Button
              size="sm"
              onClick={() => acao({ status: "APROVADA" }, "Aprovada: já aparece no site")}
              disabled={!!indo}
            >
              <Check className="mr-1 h-4 w-4" /> Aprovar
            </Button>
          )}
          {a.status !== "REJEITADA" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => acao({ status: "REJEITADA" }, "Rejeitada")}
              disabled={!!indo}
            >
              <X className="mr-1 h-4 w-4" /> Rejeitar
            </Button>
          )}
          {a.status !== "PENDENTE" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => acao({ status: "PENDENTE" }, "Voltou para aprovar")}
              disabled={!!indo}
            >
              <Undo2 className="mr-1 h-4 w-4" /> Desfazer
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAbrir(true)}>
            <MessageSquareReply className="mr-1 h-4 w-4" /> Responder
          </Button>
        </div>
      </div>
    </Card>
  );
}
