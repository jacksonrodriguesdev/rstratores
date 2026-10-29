import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Flame,
  Plus,
  Save,
  Trash2,
  Loader2,
  Eye,
  Ticket,
  Sparkles,
  Calculator,
  X,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  listarCampanhasFn,
  salvarCampanhaFn,
  apagarCampanhaFn,
  modeloBlackFridayFn,
  alcanceRegrasFn,
  opcoesRegrasFn,
  listarCuponsFn,
  salvarCupomFn,
  apagarCupomFn,
  type CampanhaForm,
  type CupomForm,
  type RegraForm,
} from "@/lib/campanhas";
import { CONFIG_PADRAO } from "@/lib/campanha-comum";
import { cn } from "@/lib/utils";
import { AbaIndicacoes } from "@/components/admin/IndicacoesAdmin";

// Admin → Campanhas e cupons: Black Friday (ou outra campanha) com pré-campanha, contagem, site em
// preto e dourado, descontos por categoria/marca/peça e cupons (inclusive "mistério").
export const Route = createFileRoute("/admin/campanhas")({ component: Campanhas });

const FASE_ROTULO: Record<string, [string, string]> = {
  AGUARDANDO: ["Aguardando a pré", "bg-zinc-200 text-zinc-700"],
  PRE: ["Pré-campanha no ar", "bg-amber-100 text-amber-800"],
  BLACK: ["Campanha no ar", "bg-black text-[#f2c94c]"],
  FIM: ["Encerrada", "bg-zinc-200 text-zinc-500"],
};
// ISO ↔ datetime-local (fuso do navegador)
const paraLocal = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
};
const deLocal = (v: string) => (v ? new Date(v).toISOString() : "");
const dataBR = (v: string) =>
  new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function Campanhas() {
  const [aba, setAba] = useState<"campanhas" | "cupons" | "indicacoes">("campanhas");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zinc-900">
          <Flame className="h-6 w-6 text-primary" /> Campanhas e cupons
        </h1>
        <p className="text-sm text-zinc-500">
          Black Friday com contagem regressiva, pré-campanha, site em preto e dourado, descontos por
          categoria, marca ou peça, e cupons.
        </p>
      </div>
      <div className="flex gap-2">
        {(["campanhas", "cupons", "indicacoes"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold",
              aba === a ? "bg-primary text-white" : "bg-zinc-100 text-zinc-700",
            )}
          >
            {a === "campanhas" ? "Campanhas" : a === "cupons" ? "Cupons" : "Indique e ganhe"}
          </button>
        ))}
      </div>
      {aba === "campanhas" ? (
        <AbaCampanhas />
      ) : aba === "cupons" ? (
        <AbaCupons />
      ) : (
        <AbaIndicacoes />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- campanhas
function AbaCampanhas() {
  const qc = useQueryClient();
  const { data: lista = [], isLoading } = useQuery({
    queryKey: ["admin-campanhas"],
    queryFn: () => listarCampanhasFn(),
  });
  const [form, setForm] = useState<CampanhaForm | null>(null);
  const novaBlack = async () => setForm(await modeloBlackFridayFn({ data: {} }));
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin-campanhas"] });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={novaBlack} className="gap-1.5 bg-black text-[#f2c94c] hover:bg-zinc-900">
          <Sparkles className="h-4 w-4" /> Criar Black Friday (modelo pronto)
        </Button>
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            const agora = Date.now();
            setForm({
              nome: "Nova campanha",
              tipo: "OUTRA",
              ativa: false,
              pre_inicio: new Date(agora + 86400000).toISOString(),
              inicio: new Date(agora + 8 * 86400000).toISOString(),
              fim: new Date(agora + 11 * 86400000).toISOString(),
              tema: "padrao",
              config: { ...CONFIG_PADRAO, selo: "OFERTA" },
              regras: [],
            });
          }}
        >
          <Plus className="h-4 w-4" /> Campanha em branco
        </Button>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </p>
      ) : !lista.length && !form ? (
        <Card className="p-6 text-sm text-zinc-600">
          Nenhuma campanha ainda. Clique em <b>Criar Black Friday</b>: as datas deste ano já vêm
          calculadas (pré de 30 dias antes, Black na sexta e até o Cyber Monday).
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((c) => {
            const [rot, cls] = FASE_ROTULO[c.fase] ?? [c.fase, ""];
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-zinc-900">{c.nome}</p>
                    <p className="text-xs text-zinc-500">
                      Pré {dataBR(c.pre_inicio)} · Começa {dataBR(c.inicio)} · Fim {dataBR(c.fim)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                      c.ativa ? cls : "bg-zinc-100 text-zinc-500",
                    )}
                  >
                    {c.ativa ? rot : "Desligada"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-600">
                  {c.regras.length} regra(s) de desconto · tema{" "}
                  {c.tema === "black" ? "preto e dourado" : "padrão"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setForm({ ...c, tipo: c.tipo })}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <a href="/?ver_campanha=pre" target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost" className="gap-1">
                      <Eye className="h-3.5 w-3.5" /> Ver pré
                    </Button>
                  </a>
                  <a href="/black-friday?ver_campanha=black" target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost" className="gap-1">
                      <Eye className="h-3.5 w-3.5" /> Ver Black
                    </Button>
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {form && (
        <EditorCampanha
          inicial={form}
          aoFechar={() => setForm(null)}
          aoSalvar={() => {
            setForm(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function EditorCampanha({
  inicial,
  aoFechar,
  aoSalvar,
}: {
  inicial: CampanhaForm;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [f, setF] = useState<CampanhaForm>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [alcance, setAlcance] = useState<number[] | null>(null);
  const { data: opcoes } = useQuery({
    queryKey: ["opcoes-regras"],
    queryFn: () => opcoesRegrasFn(),
  });
  useEffect(() => setAlcance(null), [f.regras]);
  const cfg = (k: string, v: unknown) => setF((o) => ({ ...o, config: { ...o.config, [k]: v } }));
  const regra = (i: number, campo: Partial<RegraForm>) =>
    setF((o) => ({ ...o, regras: o.regras.map((r, j) => (j === i ? { ...r, ...campo } : r)) }));
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarCampanhaFn({ data: f });
      toast.success(f.ativa ? "Campanha salva e ativada" : "Campanha salva (desligada)");
      aoSalvar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const texto = (k: string, rotulo: string, longo?: boolean) => (
    <div className={cn(longo && "md:col-span-2")}>
      <p className="text-sm font-semibold text-zinc-700">{rotulo}</p>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <Input
          value={(f.config as any)[k] ?? ""}
          onChange={(e) => cfg(k, e.target.value)}
          placeholder="🇺🇾 espanhol"
        />
        <Input
          value={(f.config as any)[`${k}_pt`] ?? ""}
          onChange={(e) => cfg(`${k}_pt`, e.target.value)}
          placeholder="🇧🇷 português"
        />
      </div>
    </div>
  );
  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{f.id ? "Editar campanha" : "Nova campanha"}</h2>
        <div className="flex gap-2">
          {f.id && (
            <Button
              variant="ghost"
              className="gap-1 text-red-600"
              onClick={async () => {
                if (!confirm("Apagar esta campanha? Os descontos dela saem do site na hora."))
                  return;
                await apagarCampanhaFn({ data: { id: f.id! } });
                aoSalvar();
              }}
            >
              <Trash2 className="h-4 w-4" /> Apagar
            </Button>
          )}
          <Button variant="outline" onClick={aoFechar}>
            Fechar
          </Button>
          <Button onClick={salvar} disabled={salvando} className="gap-1.5">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Nome
          <Input
            value={f.nome}
            onChange={(e) => setF({ ...f, nome: e.target.value })}
            className="mt-1"
          />
        </label>
        <div className="flex flex-wrap items-center gap-6 pt-5">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Switch checked={f.ativa} onCheckedChange={(v) => setF({ ...f, ativa: v })} /> Ativa
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Switch
              checked={f.tema === "black"}
              onCheckedChange={(v) => setF({ ...f, tema: v ? "black" : "padrao" })}
            />{" "}
            Site em preto e dourado
          </label>
        </div>
        <label className="text-sm font-semibold">
          Começa a pré (contagem regressiva aparece)
          <Input
            type="datetime-local"
            value={paraLocal(f.pre_inicio)}
            onChange={(e) => setF({ ...f, pre_inicio: deLocal(e.target.value) })}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-semibold">
          Começa a Black (descontos da campanha)
          <Input
            type="datetime-local"
            value={paraLocal(f.inicio)}
            onChange={(e) => setF({ ...f, inicio: deLocal(e.target.value) })}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-semibold">
          Termina
          <Input
            type="datetime-local"
            value={paraLocal(f.fim)}
            onChange={(e) => setF({ ...f, fim: deLocal(e.target.value) })}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-semibold">
          Selo nos preços (ex.: BLACK)
          <Input
            value={f.config.selo}
            onChange={(e) => cfg("selo", e.target.value.toUpperCase().slice(0, 14))}
            className="mt-1"
          />
        </label>
        {texto("titulo", "Título da campanha (hero e página /black-friday)", true)}
        {texto("subtitulo", "Subtítulo", true)}
        {texto("barra_pre", "Barra do topo na pré (antes da contagem)", true)}
        {texto("barra_black", "Barra do topo durante a campanha", true)}
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch
            checked={f.config.mostrar_barra}
            onCheckedChange={(v) => cfg("mostrar_barra", v)}
          />{" "}
          Barra de contagem no topo de todas as páginas
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch
            checked={f.config.inserir_na_home}
            onCheckedChange={(v) => cfg("inserir_na_home", v)}
          />{" "}
          Hero da campanha no topo da home
        </label>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold">Descontos</h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={async () => setAlcance(await alcanceRegrasFn({ data: { regras: f.regras } }))}
          >
            <Calculator className="h-4 w-4" /> Quantas peças cada regra pega
          </Button>
        </div>
        <p className="text-xs text-zinc-500">
          A regra de uma peça vale mais que as outras; entre categoria, marca e “site todo”, vale o
          maior desconto. Se a peça já tem promoção própria melhor, fica a promoção. “Destaque” =
          aparece nas vitrines de ofertas.
        </p>
        <div className="mt-2 space-y-2">
          {f.regras.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-2 items-center gap-2 rounded-xl bg-zinc-50 p-2 md:grid-cols-[130px_1fr_90px_120px_110px_32px]"
            >
              <select
                value={r.tipo}
                onChange={(e) => regra(i, { tipo: e.target.value, alvo: "" })}
                className="rounded-md border px-2 py-2 text-sm"
              >
                <option value="TUDO">Site todo</option>
                <option value="CATEGORIA">Categoria</option>
                <option value="MARCA">Marca</option>
                <option value="ITEM">Peça (SKU)</option>
              </select>
              {r.tipo === "TUDO" ? (
                <span className="text-sm text-zinc-500">todas as peças com preço</span>
              ) : r.tipo === "ITEM" ? (
                <Input
                  value={r.alvo}
                  onChange={(e) => regra(i, { alvo: e.target.value })}
                  placeholder="SKU da peça"
                />
              ) : (
                <select
                  value={r.alvo}
                  onChange={(e) => regra(i, { alvo: e.target.value })}
                  className="rounded-md border px-2 py-2 text-sm"
                >
                  <option value="">Escolha…</option>
                  {/* O valor salvo sempre aparece (mesmo antes de a lista carregar ou fora dela) */}
                  {r.alvo &&
                    !(r.tipo === "CATEGORIA" ? opcoes?.categorias : opcoes?.marcas)?.includes(
                      r.alvo,
                    ) && <option value={r.alvo}>{r.alvo}</option>}
                  {(r.tipo === "CATEGORIA" ? opcoes?.categorias : opcoes?.marcas)?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-1 text-sm">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={r.pct}
                  onChange={(e) => regra(i, { pct: Number(e.target.value) })}
                  className="w-16"
                />
                %
              </label>
              <select
                value={r.fase}
                onChange={(e) => regra(i, { fase: e.target.value })}
                className="rounded-md border px-2 py-2 text-sm"
              >
                <option value="PRE">Só na pré</option>
                <option value="BLACK">Só na Black</option>
                <option value="AMBAS">Pré e Black</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={r.destaque}
                  onChange={(e) => regra(i, { destaque: e.target.checked })}
                />{" "}
                Destaque
                {alcance && (
                  <span className="ml-1 text-xs font-bold text-primary">
                    {alcance[i]?.toLocaleString("pt-BR")} peças
                  </span>
                )}
              </label>
              <button
                onClick={() => setF((o) => ({ ...o, regras: o.regras.filter((_, j) => j !== i) }))}
                className="text-zinc-400 hover:text-red-600"
                aria-label="Remover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setF((o) => ({
                ...o,
                regras: [
                  ...o.regras,
                  { tipo: "CATEGORIA", alvo: "", pct: 10, fase: "BLACK", destaque: true },
                ],
              }))
            }
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <Plus className="h-4 w-4" /> Adicionar desconto
          </button>
        </div>
      </div>
      <p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
        Depois de salvar, use “Ver pré” e “Ver Black” na lista para ver o visual de cada fase (só
        você vê a prévia; os preços da prévia são os da fase atual — no ar, cada fase usa os seus
        descontos sozinha). Ativa + dentro das datas = no ar para todos.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------- cupons
const CUPOM_VAZIO: CupomForm = {
  codigo: "",
  tipo: "PERCENT",
  valor: 10,
  moeda: "UYU",
  minimo: 0,
  descricao: "",
  descricao_pt: "",
  inicio: null,
  fim: null,
  revelar_em: null,
  max_usos: 0,
  por_cliente: 1,
  so_primeira_compra: false,
  publico: true,
  ativo: true,
};

function AbaCupons() {
  const qc = useQueryClient();
  const { data: lista = [], isLoading } = useQuery({
    queryKey: ["admin-cupons"],
    queryFn: () => listarCuponsFn(),
  });
  const { data: campanhas = [] } = useQuery({
    queryKey: ["admin-campanhas"],
    queryFn: () => listarCampanhasFn(),
  });
  const [form, setForm] = useState<CupomForm | null>(null);
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin-cupons"] });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setForm({ ...CUPOM_VAZIO })} className="gap-1.5">
          <Ticket className="h-4 w-4" /> Novo cupom
        </Button>
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            const black = campanhas.find((c) => c.ativa) ?? campanhas[0];
            setForm({
              ...CUPOM_VAZIO,
              codigo: "BLACK15",
              valor: 15,
              campanha_id: black?.id ?? null,
              revelar_em: black?.inicio ?? null,
              inicio: black?.inicio ?? null,
              fim: black?.fim ?? null,
              descricao: "Cupón exclusivo de la Black Friday",
              descricao_pt: "Cupom exclusivo da Black Friday",
              max_usos: 100,
            });
          }}
        >
          <Sparkles className="h-4 w-4" /> Cupom mistério da Black
        </Button>
        <a href="/cupones" target="_blank" rel="noreferrer">
          <Button variant="ghost" className="gap-1.5">
            <Eye className="h-4 w-4" /> Ver página de cupons
          </Button>
        </a>
      </div>
      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-zinc-500">Carregando…</p>
        ) : !lista.length ? (
          <p className="p-4 text-sm text-zinc-500">Nenhum cupom ainda.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-zinc-500">
                <th className="p-3">Código</th>
                <th>Desconto</th>
                <th>Usos</th>
                <th>Validade</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-mono font-black">{c.codigo}</td>
                  <td>
                    {c.tipo === "PERCENT"
                      ? `${c.valor}%`
                      : c.tipo === "FRETE"
                        ? "Frete grátis"
                        : `${c.valor} ${c.moeda}`}
                    {c.minimo > 0 && (
                      <span className="text-xs text-zinc-500"> (mín. {c.minimo})</span>
                    )}
                  </td>
                  <td>
                    {c.usos}
                    {c.max_usos > 0 && ` / ${c.max_usos}`}
                  </td>
                  <td className="text-xs text-zinc-600">
                    {c.inicio ? dataBR(c.inicio) : "já"} → {c.fim ? dataBR(c.fim) : "sem fim"}
                    {c.revelar_em && (
                      <span className="block text-amber-700">
                        mistério até {dataBR(c.revelar_em)}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        c.ativo ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600",
                      )}
                    >
                      {c.ativo ? "Ativo" : "Desligado"}
                    </span>
                    {!c.publico && <span className="ml-1 text-xs text-zinc-500">oculto</span>}
                  </td>
                  <td className="pr-3 text-right">
                    <button
                      onClick={() =>
                        setForm({
                          ...c,
                          descricao: c.descricao ?? "",
                          descricao_pt: c.descricao_pt ?? "",
                        })
                      }
                      className="text-primary hover:underline"
                    >
                      editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {form && (
        <EditorCupom
          inicial={form}
          campanhas={campanhas.map((c) => ({ id: c.id, nome: c.nome }))}
          aoFechar={() => setForm(null)}
          aoSalvar={() => {
            setForm(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function EditorCupom({
  inicial,
  campanhas,
  aoFechar,
  aoSalvar,
}: {
  inicial: CupomForm;
  campanhas: Array<{ id: number; nome: string }>;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [f, setF] = useState<CupomForm>(inicial);
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof CupomForm, v: unknown) => setF((o) => ({ ...o, [k]: v }));
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarCupomFn({ data: f });
      toast.success("Cupom salvo");
      aoSalvar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f.id ? `Cupom ${f.codigo}` : "Novo cupom"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Código
            <Input
              value={f.codigo}
              onChange={(e) => set("codigo", e.target.value.toUpperCase())}
              className="mt-1 font-mono"
              placeholder="BLACK15"
            />
          </label>
          <label className="text-sm font-semibold">
            Campanha (opcional)
            <select
              value={f.campanha_id ?? ""}
              onChange={(e) => set("campanha_id", e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Nenhuma</option>
              {campanhas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Tipo
            <select
              value={f.tipo}
              onChange={(e) => set("tipo", e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="PERCENT">Percentual (%)</option>
              <option value="FIXO">Valor fixo</option>
              <option value="FRETE">Frete grátis</option>
            </select>
          </label>
          {f.tipo !== "FRETE" && (
            <label className="text-sm font-semibold">
              {f.tipo === "PERCENT" ? "Desconto (%)" : "Desconto (valor)"}
              <Input
                type="number"
                value={f.valor}
                onChange={(e) => set("valor", Number(e.target.value))}
                className="mt-1"
              />
            </label>
          )}
          <label className="text-sm font-semibold">
            Moeda (valor fixo e mínimo)
            <select
              value={f.moeda}
              onChange={(e) => set("moeda", e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="UYU">$U (Uruguai)</option>
              <option value="BRL">R$ (Brasil)</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Compra mínima (0 = sem mínimo)
            <Input
              type="number"
              value={f.minimo}
              onChange={(e) => set("minimo", Number(e.target.value))}
              className="mt-1"
            />
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Descrição (espanhol / português)
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <Input
                value={f.descricao ?? ""}
                onChange={(e) => set("descricao", e.target.value)}
                placeholder="🇺🇾"
              />
              <Input
                value={f.descricao_pt ?? ""}
                onChange={(e) => set("descricao_pt", e.target.value)}
                placeholder="🇧🇷"
              />
            </div>
          </label>
          <label className="text-sm font-semibold">
            Vale a partir de
            <Input
              type="datetime-local"
              value={paraLocal(f.inicio)}
              onChange={(e) => set("inicio", deLocal(e.target.value) || null)}
              className="mt-1"
            />
          </label>
          <label className="text-sm font-semibold">
            Vence em
            <Input
              type="datetime-local"
              value={paraLocal(f.fim)}
              onChange={(e) => set("fim", deLocal(e.target.value) || null)}
              className="mt-1"
            />
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Mistério até (antes disso aparece bloqueado com contagem; vazio = mostra já)
            <Input
              type="datetime-local"
              value={paraLocal(f.revelar_em)}
              onChange={(e) => set("revelar_em", deLocal(e.target.value) || null)}
              className="mt-1"
            />
          </label>
          <label className="text-sm font-semibold">
            Limite de usos no total (0 = sem limite)
            <Input
              type="number"
              value={f.max_usos}
              onChange={(e) => set("max_usos", Number(e.target.value))}
              className="mt-1"
            />
          </label>
          <label className="text-sm font-semibold">
            Usos por cliente (0 = sem limite)
            <Input
              type="number"
              value={f.por_cliente}
              onChange={(e) => set("por_cliente", Number(e.target.value))}
              className="mt-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Switch
              checked={f.so_primeira_compra}
              onCheckedChange={(v) => set("so_primeira_compra", v)}
            />{" "}
            Só na primeira compra
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Switch checked={f.publico} onCheckedChange={(v) => set("publico", v)} /> Aparece na
            página de cupons
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Switch checked={f.ativo} onCheckedChange={(v) => set("ativo", v)} /> Ativo
          </label>
        </div>
        <div className="mt-4 flex justify-between gap-2">
          {f.id ? (
            <Button
              variant="ghost"
              className="gap-1 text-red-600"
              onClick={async () => {
                if (!confirm(`Apagar o cupom ${f.codigo}?`)) return;
                await apagarCupomFn({ data: { id: f.id! } });
                aoSalvar();
              }}
            >
              <Trash2 className="h-4 w-4" /> Apagar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando} className="gap-1.5">
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}{" "}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
