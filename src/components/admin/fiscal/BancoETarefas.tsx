// Fiscal: resumo do extrato do banco (o que vai para o MEI e para o IR) e as tarefas do dono
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { painelExtratoFn, salvarTarefasFn, tarefasFn } from "@/lib/extratos";
import type { Tarefa } from "@/lib/extratos.server";

const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeMes = (m: string) => MESES[Number(m.slice(5, 7)) - 1];
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const hoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function ResumoBanco({ ano }: { ano: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["fiscal-extrato", ano],
    queryFn: () => painelExtratoFn({ data: { ano } }),
  });
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <ReceiptText className="h-4 w-4 text-primary" /> Seu banco em {ano}
        </h2>
        <Link to="/admin/extratos">
          <Button size="sm" variant="outline">
            {data?.arquivos.length ? "Abrir extratos" : "Importar extrato"}
          </Button>
        </Link>
      </div>
      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {data && !data.arquivos.length && (
        <p className="text-sm text-muted-foreground">
          Importe todo mês o PDF do extrato da conta. O painel separa venda, doação da família,
          serviço que você fez como pessoa física e gasto pessoal, e já monta os números do imposto
          de renda.
        </p>
      )}
      {data && !!data.arquivos.length && (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Entrou</p>
              <p className="font-bold tabular-nums">{brl(data.totais.entradas)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Saiu</p>
              <p className="font-bold tabular-nums">{brl(data.totais.saidas)}</p>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between gap-2">
              <span>Vendas (CNPJ) que passaram pelo banco</span>
              <b className="tabular-nums">{brl(data.mei.vendasNoBanco)}</b>
            </li>
            <li className="flex justify-between gap-2">
              <span>Serviço como pessoa física → IR {ano + 1}</span>
              <b className="tabular-nums">{brl(data.ir.totalServicoPF)}</b>
            </li>
            <li className="flex justify-between gap-2">
              <span>Doações recebidas (isento) → IR {ano + 1}</span>
              <b className="tabular-nums">{brl(data.ir.totalDoacoes)}</b>
            </li>
            <li className="flex justify-between gap-2">
              <span>Ajuda à família → IR {ano + 1}</span>
              <b className="tabular-nums">{brl(data.ir.totalDoacoesFeitas)}</b>
            </li>
          </ul>
          {(!!data.mei.vendasSemLancar.length ||
            !!data.totais.aClassificar ||
            !!data.faltando.length) && (
            <div className="space-y-1 rounded-lg border border-amber-400 bg-amber-50/60 p-3 text-sm dark:bg-amber-950/30">
              {!!data.faltando.length && (
                <p className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>Falta importar o extrato de: {data.faltando.map(nomeMes).join(", ")}.</span>
                </p>
              )}
              {!!data.totais.aClassificar && (
                <p className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {data.totais.aClassificar} movimento(s) a classificar.
                </p>
              )}
              {!!data.mei.vendasSemLancar.length && (
                <p className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {data.mei.vendasSemLancar.length} venda(s) no banco sem lançar em Vendas.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

const VAZIA: Tarefa = { id: "", titulo: "", detalhe: "", prazo: null, feito: false };

export function Tarefas() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["fiscal-tarefas"], queryFn: () => tarefasFn() });
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [verFeitas, setVerFeitas] = useState(false);

  const gravar = async (lista: Tarefa[]) => {
    setSalvando(true);
    try {
      const r = await salvarTarefasFn({ data: { tarefas: lista } });
      qc.setQueryData(["fiscal-tarefas"], r);
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setSalvando(false);
    }
  };
  if (!data) return null;
  // Pendentes primeiro: sem prazo (fazer já) em cima, depois pelo prazo mais perto
  const ordem = [...data].sort(
    (a, b) => Number(a.feito) - Number(b.feito) || (a.prazo ?? "").localeCompare(b.prazo ?? ""),
  );
  const visiveis = verFeitas ? ordem : ordem.filter((t) => !t.feito);
  const feitas = data.filter((t) => t.feito).length;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <ListTodo className="h-4 w-4 text-primary" /> O que eu tenho que fazer
        </h2>
        <Button size="sm" variant="outline" onClick={() => setEditando({ ...VAZIA })}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Anotar
        </Button>
      </div>
      <ul className="divide-y">
        {visiveis.map((t) => {
          const atrasada = !t.feito && t.prazo && t.prazo < hoje();
          return (
            <li key={t.id} className="flex gap-3 py-2.5">
              <button
                type="button"
                aria-label={t.feito ? "Marcar como não feita" : "Marcar como feita"}
                disabled={salvando}
                onClick={() =>
                  gravar(data.map((x) => (x.id === t.id ? { ...x, feito: !x.feito } : x)))
                }
                className="mt-0.5 shrink-0"
              >
                {t.feito ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <span className="block h-5 w-5 rounded-full border-2 border-muted-foreground/40 hover:border-primary" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", t.feito && "text-muted-foreground line-through")}>
                  {t.titulo}
                </p>
                {t.detalhe && (
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{t.detalhe}</p>
                )}
                {t.prazo && (
                  <p
                    className={cn(
                      "mt-0.5 flex items-center gap-1 text-xs",
                      atrasada ? "font-semibold text-red-600" : "text-muted-foreground",
                    )}
                  >
                    <CalendarClock className="h-3 w-3" /> até {dataBR(t.prazo)}
                    {atrasada && " · atrasada"}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Editar"
                onClick={() => setEditando({ ...t })}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            </li>
          );
        })}
        {!visiveis.length && (
          <li className="py-4 text-center text-sm text-muted-foreground">Tudo feito ✔</li>
        )}
      </ul>
      {!!feitas && (
        <button
          type="button"
          className="self-start text-xs text-primary hover:underline"
          onClick={() => setVerFeitas(!verFeitas)}
        >
          {verFeitas ? "Esconder as feitas" : `Ver as ${feitas} feita(s)`}
        </button>
      )}

      {editando && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Input
            autoFocus
            placeholder="O que fazer *"
            value={editando.titulo}
            onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
          />
          <textarea
            className="min-h-20 w-full rounded-md border bg-background p-2 text-sm"
            placeholder="Detalhes, valores, a ideia…"
            value={editando.detalhe}
            onChange={(e) => setEditando({ ...editando, detalhe: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Prazo
              <Input
                type="date"
                className="h-8 w-40"
                value={editando.prazo ?? ""}
                onChange={(e) => setEditando({ ...editando, prazo: e.target.value || null })}
              />
            </label>
            <div className="ml-auto flex gap-2">
              {editando.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={salvando}
                  onClick={async () => {
                    if (!confirm("Apagar esta anotação?")) return;
                    if (await gravar(data.filter((x) => x.id !== editando.id))) setEditando(null);
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Apagar
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={salvando || !editando.titulo.trim()}
                onClick={async () => {
                  const lista = editando.id
                    ? data.map((x) => (x.id === editando.id ? editando : x))
                    : [...data, { ...editando, id: `t${Date.now()}` }];
                  if (await gravar(lista)) setEditando(null);
                }}
              >
                {salvando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
