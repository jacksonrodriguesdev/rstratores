// Admin → Empresas (atacado): AGRO PARTS Mayorista. Cotações das empresas (revisar preços e enviar a
// proposta), aprovação das empresas (desconto e pagamento) e configuração do canal.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  ExternalLink,
  Loader2,
  Printer,
  Save,
  Send,
  Settings,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatarRut,
  INCOTERMS,
  type ItemCotacao,
  PAGAMENTOS,
  STATUS_COTACAO_PT,
  STATUS_EMPRESA_PT,
  statusVisivel,
  TIPOS_EMPRESA,
  totaisCotacao,
  usd,
  VOLUMES,
} from "@/lib/b2b-comum";
import {
  atualizarEmpresaFn,
  cotacaoAdminFn,
  painelB2bFn,
  salvarConfigB2bFn,
  salvarPropostaFn,
} from "@/lib/b2b";
import {
  EditorEmbarque,
  ListaEmbarques,
  PainelAduana,
  usePainelAduana,
} from "@/components/b2b/AdminAduana";
import { AdminCatalogo } from "@/components/b2b/AdminCatalogo";
import { AdminDespachantes } from "@/components/b2b/AdminDespachantes";
import { acordoDaNcm, origemValida, STATUS_ORIGEM_PT } from "@/lib/aduana/aduana-comum";
import { Selo, tomStatus } from "@/components/b2b/B2bLayout";
import { cn } from "@/lib/utils";

type Busca = { cotacao?: string };
export const Route = createFileRoute("/admin/empresas")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    cotacao: typeof s.cotacao === "string" ? s.cotacao.slice(0, 16) : undefined,
  }),
  component: PaginaEmpresas,
});

type Painel = Awaited<ReturnType<typeof painelB2bFn>>;

function PaginaEmpresas() {
  const busca = Route.useSearch();
  const { data, isLoading } = useQuery({ queryKey: ["b2b-painel"], queryFn: () => painelB2bFn() });
  const [aberta, setAberta] = useState<string | null>(busca.cotacao ?? null);
  const [embarque, setEmbarque] = useState<string | null>(null);
  const { data: aduana } = usePainelAduana();
  const [empresa, setEmpresa] = useState<Painel["empresas"][number] | null>(null);
  const [aba, setAba] = useState("cotacoes");
  const n = useMemo(() => {
    const e = data?.empresas ?? [];
    const c = data?.cotacoes ?? [];
    return {
      pendentes: e.filter((x) => x.status === "PENDENTE").length,
      aprovadas: e.filter((x) => x.status === "APROVADA").length,
      novas: c.filter((x) => x.status === "ENVIADA").length,
      abertas: c.filter((x) => statusVisivel(x) === "COTADA").length,
      aceitas: c.filter((x) => x.status === "ACEITA").reduce((s, x) => s + x.total, 0),
    };
  }, [data]);
  useEffect(() => {
    if (n.pendentes && !n.novas) setAba("empresas");
  }, [n.pendentes, n.novas]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Building2 className="h-6 w-6 text-primary" /> Empresas (atacado)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AGRO PARTS Mayorista: empresas do Uruguai que compram por volume, com despacho do
            Brasil.
          </p>
        </div>
        <a href="/empresas" target="_blank" rel="noreferrer">
          <Button variant="outline">
            <ExternalLink className="mr-1.5 h-4 w-4" /> Ver página /empresas
          </Button>
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Numero n={n.novas} r="cotações para responder" destaque={n.novas > 0} />
        <Numero n={n.pendentes} r="empresas para aprovar" destaque={n.pendentes > 0} />
        <Numero n={n.abertas} r="propostas aguardando o cliente" />
        <Numero n={n.aprovadas} r="empresas aprovadas" />
        <Numero n={usd(n.aceitas)} r="aceito (total)" />
      </div>

      {isLoading || !data ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <Tabs value={aba} onValueChange={setAba}>
          <TabsList>
            <TabsTrigger value="cotacoes">Cotações ({data.cotacoes.length})</TabsTrigger>
            <TabsTrigger value="empresas">Empresas ({data.empresas.length})</TabsTrigger>
            <TabsTrigger value="catalogo">Catálogo exportação</TabsTrigger>
            <TabsTrigger value="embarques">Embarques ({aduana?.embarques.length ?? 0})</TabsTrigger>
            <TabsTrigger value="aduana">
              Aduana{" "}
              {aduana && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {aduana.prontidao.prontos}/{aduana.prontidao.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="despachantes">Despachantes</TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="mr-1 h-3.5 w-3.5" /> Configuração
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cotacoes">
            <ListaCotacoes cotacoes={data.cotacoes} abrir={setAberta} />
          </TabsContent>
          <TabsContent value="empresas">
            <ListaEmpresas empresas={data.empresas} editar={setEmpresa} />
          </TabsContent>
          <TabsContent value="catalogo">
            <AdminCatalogo />
          </TabsContent>
          <TabsContent value="embarques">
            <ListaEmbarques abrir={setEmbarque} />
          </TabsContent>
          <TabsContent value="aduana">
            <PainelAduana />
          </TabsContent>
          <TabsContent value="despachantes">
            <AdminDespachantes />
          </TabsContent>
          <TabsContent value="config">
            <Configuracao cfg={data.cfg} usdPorReal={data.usdPorReal} />
          </TabsContent>
        </Tabs>
      )}

      {aberta && <EditorCotacao codigo={aberta} fechar={() => setAberta(null)} />}
      {embarque && <EditorEmbarque codigo={embarque} fechar={() => setEmbarque(null)} />}
      {empresa && <EditorEmpresa e={empresa} fechar={() => setEmpresa(null)} />}
    </div>
  );
}

function Numero({ n, r, destaque }: { n: React.ReactNode; r: string; destaque?: boolean }) {
  return (
    <Card className={cn("p-4", destaque && "border-primary/40 bg-primary/5")}>
      <p className="text-2xl font-bold">{n}</p>
      <p className="text-xs text-muted-foreground">{r}</p>
    </Card>
  );
}

function ListaCotacoes({
  cotacoes,
  abrir,
}: {
  cotacoes: Painel["cotacoes"];
  abrir: (c: string) => void;
}) {
  if (!cotacoes.length)
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Nenhuma cotação ainda. Quando uma empresa aprovada enviar a lista, ela aparece aqui.
      </Card>
    );
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Cotação</th>
              <th className="p-3">Empresa</th>
              <th className="p-3">Itens</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Situação</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {cotacoes.map((c) => {
              const st = statusVisivel(c);
              const achadas = c.itens.filter((i) => i.sku).length;
              return (
                <tr key={c.codigo} className="border-t">
                  <td className="p-3">
                    <p className="font-mono font-bold">{c.codigo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")} · {c.incoterm}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold">{c.razao_social}</p>
                    <p className="text-xs text-muted-foreground">{c.destino}</p>
                  </td>
                  <td className="p-3 text-xs">
                    {c.itens.length} itens · {c.itens.reduce((s, i) => s + i.qtd, 0)} u.
                    <br />
                    <span className="text-muted-foreground">
                      {achadas} no catálogo
                      {c.itens.length - achadas > 0 && ` · ${c.itens.length - achadas} a cotar`}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 text-right font-semibold">
                    {c.status === "ENVIADA" ? (
                      <span className="text-muted-foreground">~{usd(c.total)}</span>
                    ) : (
                      usd(c.total)
                    )}
                  </td>
                  <td className="p-3">
                    <Selo tom={tomStatus(st)}>{STATUS_COTACAO_PT[st]}</Selo>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant={c.status === "ENVIADA" ? "default" : "outline"}
                      onClick={() => abrir(c.codigo)}
                    >
                      {c.status === "ENVIADA" ? "Cotar" : "Abrir"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

type LinhaEd = ItemCotacao & { precoTxt: string };

function EditorCotacao({ codigo, fechar }: { codigo: string; fechar: () => void }) {
  const qc = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ["b2b-cotacao-admin", codigo],
    queryFn: () => cotacaoAdminFn({ data: { codigo } }),
  });
  const [linhas, setLinhas] = useState<LinhaEd[]>([]);
  const [frete, setFrete] = useState("");
  const [incoterm, setIncoterm] = useState("DAP");
  const [validade, setValidade] = useState("");
  const [prazo, setPrazo] = useState("");
  const [notaCliente, setNotaCliente] = useState("");
  const [notaInterna, setNotaInterna] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);
  useEffect(() => {
    if (!data) return;
    const c = data.cotacao;
    setLinhas(c.itens.map((i) => ({ ...i, precoTxt: i.preco != null ? String(i.preco) : "" })));
    setFrete(c.frete != null ? String(c.frete) : "");
    setIncoterm(c.incoterm);
    setValidade(
      c.validade ?? new Date(Date.now() + data.cfg.validade * 86400_000).toISOString().slice(0, 10),
    );
    setPrazo(c.prazo ?? data.cfg.prazo);
    setNotaCliente(c.nota_cliente ?? "");
    setNotaInterna(c.nota_interna ?? "");
  }, [data]);

  const mudar = (linha: number, p: Partial<LinhaEd>) =>
    setLinhas((ls) => ls.map((l) => (l.linha === linha ? { ...l, ...p } : l)));
  const itensAtuais = linhas.map((l) => ({
    ...l,
    preco: l.precoTxt === "" ? null : Number(l.precoTxt.replace(",", ".")),
  }));
  const t = totaisCotacao(itensAtuais, frete === "" ? null : Number(frete.replace(",", ".")));

  const salvar = async (modo: "rascunho" | "enviar" | "cancelar") => {
    setSalvando(modo);
    try {
      await salvarPropostaFn({
        data: {
          codigo,
          itens: itensAtuais.map((l) => ({
            linha: l.linha,
            qtd: l.qtd,
            preco: l.preco,
            ncm: l.ncm,
            origem: l.origem,
            disponivel: l.disponivel,
            obs: l.obs,
            peso: l.peso,
            aec: l.aec ?? null,
          })),
          frete: frete === "" ? null : Number(frete.replace(",", ".")),
          incoterm,
          validade,
          prazo,
          nota_cliente: notaCliente,
          nota_interna: notaInterna,
          enviar: modo === "enviar",
          cancelar: modo === "cancelar",
        },
      });
      qc.invalidateQueries({ queryKey: ["b2b-painel"] });
      qc.invalidateQueries({ queryKey: ["b2b-cotacao-admin", codigo] });
      toast.success(
        modo === "enviar"
          ? "Proposta enviada ao cliente por e-mail"
          : modo === "cancelar"
            ? "Cotação cancelada"
            : "Rascunho salvo",
      );
      if (modo !== "rascunho") fechar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(null);
    }
  };

  const c = data?.cotacao;
  const e = data?.empresa;
  const editavel = c && ["ENVIADA", "COTADA"].includes(c.status);
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Cotação <span className="font-mono">{codigo}</span>
            {c && (
              <Selo tom={tomStatus(statusVisivel(c))}>{STATUS_COTACAO_PT[statusVisivel(c)]}</Selo>
            )}
          </DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : !c || !e ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="font-semibold">{e.razao_social}</p>
                <p className="text-xs text-muted-foreground">
                  RUT {formatarRut(e.rut)} · {e.cidade} {e.departamento}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.contato_nome} · {e.email} {e.telefone && `· ${e.telefone}`}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-xs">
                <p>
                  Desconto da empresa: <b>{e.desconto_pct}%</b> (já nos sugeridos)
                </p>
                <p>
                  Pagamento: <b>{PAGAMENTOS[e.pagamento] ?? e.pagamento}</b>
                </p>
                <p>
                  Destino: <b>{c.destino ?? "—"}</b> · pediu <b>{c.incoterm}</b>
                </p>
              </div>
              <div className="rounded-lg border p-3 text-xs">
                <p className="font-semibold">Mensagem do cliente</p>
                <p className="whitespace-pre-line text-muted-foreground">{c.mensagem || "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!editavel}
                onClick={() =>
                  setLinhas((ls) =>
                    ls.map((l) =>
                      l.precoTxt === "" && l.sugerido != null
                        ? { ...l, precoTxt: String(l.sugerido) }
                        : l,
                    ),
                  )
                }
              >
                <Sparkles className="mr-1.5 h-4 w-4" /> Preencher vazios com o sugerido
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!editavel}
                onClick={() =>
                  setLinhas((ls) =>
                    ls.map((l) => {
                      const o = l.sku ? data?.origens[l.sku] : undefined;
                      return o && !l.origem && origemValida(o) ? { ...l, origem: "MERCOSUL" } : l;
                    }),
                  )
                }
              >
                Marcar Mercosul onde a origem está comprovada
              </Button>
              <span className="text-xs text-muted-foreground">
                Sugerido = custo da peça + margem da configuração − desconto da empresa, em USD.
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">✓</th>
                    <th className="p-2">Peça</th>
                    <th className="p-2">Qtd</th>
                    <th className="p-2">Sugerido</th>
                    <th className="p-2">Preço USD</th>
                    <th className="p-2">NCM</th>
                    <th className="p-2">Origem</th>
                    <th className="p-2">TEC %</th>
                    <th className="p-2">Peso kg</th>
                    <th className="p-2">Obs. (cliente vê)</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => {
                    const preco = l.precoTxt === "" ? null : Number(l.precoTxt.replace(",", "."));
                    return (
                      <tr
                        key={l.linha}
                        className={cn("border-t align-top", l.disponivel === false && "opacity-50")}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            aria-label="Disponível"
                            checked={l.disponivel !== false}
                            disabled={!editavel}
                            onChange={(ev) => mudar(l.linha, { disponivel: ev.target.checked })}
                            className="mt-2 h-4 w-4 accent-primary"
                          />
                        </td>
                        <td className="max-w-[260px] p-2">
                          <p className="line-clamp-2 font-semibold">
                            {l.nome ?? (l.descricao || "Fora do catálogo")}
                          </p>
                          <p className="font-mono text-muted-foreground">
                            {l.codigo}
                            {l.sku && l.sku !== l.codigo ? ` → ${l.sku}` : ""}
                            {!l.sku && (
                              <span className="ml-1 font-sans font-semibold text-amber-700">
                                a cotar
                              </span>
                            )}
                          </p>
                          {l.sku && (
                            <p className="mt-0.5 text-[10px]">
                              {(() => {
                                const o = data.origens[l.sku];
                                if (!o)
                                  return (
                                    <span className="text-muted-foreground">
                                      origem não registrada
                                    </span>
                                  );
                                const vencida = o.status === "COMPROVADA" && !origemValida(o);
                                return (
                                  <span
                                    className={
                                      o.status === "COMPROVADA" && !vencida
                                        ? "font-semibold text-emerald-700"
                                        : o.status === "EXTRAZONA"
                                          ? "text-red-700"
                                          : "text-amber-700"
                                    }
                                  >
                                    {vencida
                                      ? "prova de origem vencida"
                                      : STATUS_ORIGEM_PT[o.status as keyof typeof STATUS_ORIGEM_PT]}
                                  </span>
                                );
                              })()}
                            </p>
                          )}
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="h-8 w-20 text-xs"
                            value={l.qtd}
                            disabled={!editavel}
                            onChange={(ev) => mudar(l.linha, { qtd: Number(ev.target.value) || 1 })}
                          />
                        </td>
                        <td className="whitespace-nowrap p-2 pt-4 text-muted-foreground">
                          {l.sugerido != null ? usd(l.sugerido) : "—"}
                        </td>
                        <td className="p-2">
                          <Input
                            inputMode="decimal"
                            className="h-8 w-24 text-xs"
                            value={l.precoTxt}
                            disabled={!editavel}
                            placeholder={l.sugerido != null ? String(l.sugerido) : "0,00"}
                            onChange={(ev) => mudar(l.linha, { precoTxt: ev.target.value })}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8 w-24 font-mono text-xs"
                            value={l.ncm ?? ""}
                            disabled={!editavel}
                            onChange={(ev) => mudar(l.linha, { ncm: ev.target.value })}
                          />
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {acordoDaNcm(l.ncm)?.acordo === "ACE02"
                              ? "ACE 02 · 76º PA"
                              : acordoDaNcm(l.ncm)
                                ? "ACE 18 · ROM"
                                : l.origem === "MERCOSUL"
                                  ? "⚠ falta NCM"
                                  : ""}
                          </p>
                        </td>
                        <td className="p-2">
                          <select
                            className="h-8 rounded-md border bg-background px-1 text-xs"
                            value={l.origem ?? ""}
                            disabled={!editavel}
                            onChange={(ev) =>
                              mudar(l.linha, { origem: (ev.target.value || null) as any })
                            }
                          >
                            <option value="">—</option>
                            <option value="MERCOSUL">Mercosul</option>
                            <option value="OUTRA">Extra-zona</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <Input
                            inputMode="decimal"
                            className="h-8 w-14 text-xs"
                            value={l.aec ?? ""}
                            placeholder={l.origem === "MERCOSUL" ? "0" : ""}
                            disabled={!editavel}
                            onChange={(ev) =>
                              mudar(l.linha, {
                                aec:
                                  ev.target.value === ""
                                    ? null
                                    : Number(ev.target.value.replace(",", ".")),
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            inputMode="decimal"
                            className="h-8 w-16 text-xs"
                            value={l.peso ?? ""}
                            disabled={!editavel}
                            onChange={(ev) =>
                              mudar(l.linha, {
                                peso:
                                  ev.target.value === ""
                                    ? null
                                    : Number(ev.target.value.replace(",", ".")),
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8 w-36 text-xs"
                            value={l.obs ?? ""}
                            disabled={!editavel}
                            placeholder="ex.: equivalente"
                            onChange={(ev) => mudar(l.linha, { obs: ev.target.value })}
                          />
                        </td>
                        <td className="whitespace-nowrap p-2 pt-4 text-right font-semibold">
                          {preco != null && l.disponivel !== false ? usd(preco * l.qtd) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_300px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Entrega (Incoterm)</span>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    value={incoterm}
                    disabled={!editavel}
                    onChange={(ev) => setIncoterm(ev.target.value)}
                  >
                    {Object.keys(INCOTERMS).map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">
                    Frete USD (vazio = incluso/não cobrado)
                  </span>
                  <Input
                    inputMode="decimal"
                    value={frete}
                    disabled={!editavel}
                    onChange={(ev) => setFrete(ev.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Válida até</span>
                  <Input
                    type="date"
                    value={validade}
                    disabled={!editavel}
                    onChange={(ev) => setValidade(ev.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Prazo de entrega (cliente vê)</span>
                  <Input
                    value={prazo}
                    disabled={!editavel}
                    onChange={(ev) => setPrazo(ev.target.value)}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">Nota para o cliente (em espanhol)</span>
                  <Textarea
                    rows={2}
                    value={notaCliente}
                    disabled={!editavel}
                    onChange={(ev) => setNotaCliente(ev.target.value)}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">Nota interna (só o admin vê)</span>
                  <Textarea
                    rows={2}
                    value={notaInterna}
                    onChange={(ev) => setNotaInterna(ev.target.value)}
                  />
                </label>
              </div>
              <Card className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Itens com preço</span>
                  <b>
                    {t.itens}/{linhas.length}
                  </b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidades</span>
                  <b>{t.unidades}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peso estimado</span>
                  <b>{t.peso ? `${t.peso} kg` : "—"}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <b>{usd(t.subtotal)}</b>
                </div>
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-semibold">Total</span>
                  <b>{usd(t.total)}</b>
                </div>
                {editavel ? (
                  <div className="space-y-2 pt-2">
                    <Button
                      className="w-full"
                      onClick={() => salvar("enviar")}
                      disabled={!!salvando || !t.itens}
                    >
                      {salvando === "enviar" ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 h-4 w-4" />
                      )}
                      {c.status === "COTADA" ? "Reenviar proposta" : "Enviar proposta"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => salvar("rascunho")}
                      disabled={!!salvando}
                    >
                      <Save className="mr-1.5 h-4 w-4" /> Salvar rascunho
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-destructive"
                      onClick={() => salvar("cancelar")}
                      disabled={!!salvando}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" /> Cancelar cotação
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => salvar("rascunho")}
                    disabled={!!salvando}
                  >
                    <Save className="mr-1.5 h-4 w-4" /> Salvar nota interna
                  </Button>
                )}
                {c.status !== "ENVIADA" && (
                  <a
                    href={`/empresas/proforma/${c.codigo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <Button variant="ghost" className="w-full">
                      <Printer className="mr-1.5 h-4 w-4" /> Ver proforma
                    </Button>
                  </a>
                )}
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListaEmpresas({
  empresas,
  editar,
}: {
  empresas: Painel["empresas"];
  editar: (e: Painel["empresas"][number]) => void;
}) {
  if (!empresas.length)
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Nenhuma empresa cadastrada ainda. Divulgue a página <b>/empresas</b>.
      </Card>
    );
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Empresa</th>
              <th className="p-3">Contato</th>
              <th className="p-3">Perfil</th>
              <th className="p-3">Condições</th>
              <th className="p-3">Situação</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-t align-top">
                <td className="p-3">
                  <p className="font-semibold">{e.razao_social}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    RUT {formatarRut(e.rut)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[e.cidade, e.departamento].filter(Boolean).join(", ")}
                  </p>
                </td>
                <td className="p-3 text-xs">
                  <p className="font-semibold">{e.contato_nome}</p>
                  <p className="text-muted-foreground">{e.email}</p>
                  {e.telefone && (
                    <a
                      href={`https://wa.me/${e.telefone.replace(/\D/g, "").replace(/^0?9/, "5989")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline"
                    >
                      {e.telefone}
                    </a>
                  )}
                </td>
                <td className="p-3 text-xs">
                  <p>{TIPOS_EMPRESA.find(([k]) => k === e.tipo)?.[1]}</p>
                  <p className="text-muted-foreground">
                    {VOLUMES.find(([k]) => k === e.volume)?.[1] ?? "volume não informado"}
                  </p>
                  {e.marcas && <p className="text-muted-foreground">{e.marcas}</p>}
                </td>
                <td className="p-3 text-xs">
                  <p>Desconto {e.desconto_pct}%</p>
                  <p className="text-muted-foreground">{PAGAMENTOS[e.pagamento] ?? e.pagamento}</p>
                  <p className="text-muted-foreground">
                    {e.cotacoes} cotação(ões) · aceito {usd(e.aceito)}
                  </p>
                </td>
                <td className="p-3">
                  <Selo tom={tomStatus(e.status)}>{STATUS_EMPRESA_PT[e.status]}</Selo>
                </td>
                <td className="p-3 text-right">
                  <Button
                    size="sm"
                    variant={e.status === "PENDENTE" ? "default" : "outline"}
                    onClick={() => editar(e)}
                  >
                    {e.status === "PENDENTE" ? "Avaliar" : "Editar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EditorEmpresa({ e, fechar }: { e: Painel["empresas"][number]; fechar: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(e.status);
  const [desconto, setDesconto] = useState(String(e.desconto_pct));
  const [pagamento, setPagamento] = useState<string>(e.pagamento);
  const [nota, setNota] = useState(e.nota_admin ?? "");
  const [salvando, setSalvando] = useState(false);
  const salvar = async (novo?: typeof status) => {
    setSalvando(true);
    try {
      await atualizarEmpresaFn({
        data: {
          id: e.id,
          status: novo ?? status,
          desconto_pct: Number(desconto.replace(",", ".")) || 0,
          pagamento,
          nota_admin: nota,
        },
      });
      qc.invalidateQueries({ queryKey: ["b2b-painel"] });
      toast.success(
        (novo ?? status) === "APROVADA" && e.status !== "APROVADA"
          ? "Empresa aprovada · o cliente recebe um e-mail"
          : "Empresa atualizada",
      );
      fechar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{e.razao_social}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid gap-1 rounded-lg border p-3 text-xs">
            <p>
              <b>RUT</b> {formatarRut(e.rut)} {e.nome_fantasia && `· ${e.nome_fantasia}`}
            </p>
            <p>
              <b>Endereço</b>{" "}
              {[e.endereco, e.cidade, e.departamento].filter(Boolean).join(", ") || "—"}
            </p>
            <p>
              <b>Contato</b> {e.contato_nome} {e.contato_cargo && `(${e.contato_cargo})`} ·{" "}
              {e.email} {e.telefone && `· ${e.telefone}`}
            </p>
            {e.site && (
              <p>
                <b>Site</b> {e.site}
              </p>
            )}
            <p>
              <b>Cadastro</b> {new Date(e.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1 block font-medium">Situação</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-2"
                value={status}
                onChange={(ev) => setStatus(ev.target.value as any)}
              >
                {Object.entries(STATUS_EMPRESA_PT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block font-medium">Desconto %</span>
              <Input
                inputMode="decimal"
                value={desconto}
                onChange={(ev) => setDesconto(ev.target.value)}
              />
            </label>
            <label>
              <span className="mb-1 block font-medium">Pagamento</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-2"
                value={pagamento}
                onChange={(ev) => setPagamento(ev.target.value)}
              >
                {Object.entries(PAGAMENTOS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            O desconto sai do preço sugerido de cada peça nas cotações desta empresa. Confira o RUT
            no site da DGI antes de aprovar.
          </p>
          <label className="block">
            <span className="mb-1 block font-medium">Nota interna</span>
            <Textarea rows={2} value={nota} onChange={(ev) => setNota(ev.target.value)} />
          </label>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {e.status === "PENDENTE" && (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={salvando}
                onClick={() => salvar("RECUSADA")}
              >
                Recusar
              </Button>
            )}
            <Button variant="outline" disabled={salvando} onClick={() => salvar()}>
              <Save className="mr-1.5 h-4 w-4" /> Salvar
            </Button>
            {e.status !== "APROVADA" && (
              <Button disabled={salvando} onClick={() => salvar("APROVADA")}>
                {salvando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="mr-1.5 h-4 w-4" />
                )}
                Aprovar empresa
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Configuracao({ cfg, usdPorReal }: { cfg: Painel["cfg"]; usdPorReal: number | null }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    minimo: String(cfg.minimo),
    incoterm: cfg.incoterm as string,
    validade: String(cfg.validade),
    margem: String(cfg.margem),
    instantaneo: cfg.instantaneo,
    prazo: cfg.prazo,
    exportador: cfg.exportador,
  });
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarConfigB2bFn({
        data: {
          minimo: Number(f.minimo),
          incoterm: f.incoterm,
          validade: Number(f.validade),
          margem: Number(f.margem.replace(",", ".")),
          instantaneo: f.instantaneo,
          prazo: f.prazo,
          exportador: f.exportador,
        },
      });
      qc.invalidateQueries({ queryKey: ["b2b-painel"] });
      toast.success("Configuração salva");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const exemplo = usdPorReal ? 100 * (1 + Number(f.margem || 0) / 100) * usdPorReal : null;
  return (
    <Card className="max-w-3xl space-y-4 p-5 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block font-medium">Mínimo por item (unidades)</span>
          <Input
            type="number"
            value={f.minimo}
            onChange={(e) => setF({ ...f, minimo: e.target.value })}
          />
        </label>
        <label>
          <span className="mb-1 block font-medium">Entrega padrão</span>
          <select
            className="h-10 w-full rounded-md border bg-background px-2"
            value={f.incoterm}
            onChange={(e) => setF({ ...f, incoterm: e.target.value })}
          >
            {Object.entries(INCOTERMS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-medium">Margem sobre o custo (%)</span>
          <Input
            inputMode="decimal"
            value={f.margem}
            onChange={(e) => setF({ ...f, margem: e.target.value })}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {exemplo != null
              ? `Peça com custo R$ 100 → sugerido USD ${exemplo.toFixed(2)} (antes do desconto da empresa). Câmbio atual: R$ 1 = USD ${usdPorReal!.toFixed(4)}.`
              : "Sem cotação do dólar agora: o sugerido aparece quando a cotação voltar."}
          </span>
        </label>
        <label>
          <span className="mb-1 block font-medium">Validade da proposta (dias)</span>
          <Input
            type="number"
            value={f.validade}
            onChange={(e) => setF({ ...f, validade: e.target.value })}
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block font-medium">Prazo de entrega padrão (em espanhol)</span>
          <Input value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block font-medium">
            Vendedor na proforma (razão social, CNPJ, endereço)
          </span>
          <Textarea
            rows={3}
            value={f.exportador}
            onChange={(e) => setF({ ...f, exportador: e.target.value })}
          />
        </label>
        <label className="flex items-start gap-2 sm:col-span-2">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={f.instantaneo}
            onChange={(e) => setF({ ...f, instantaneo: e.target.checked })}
          />
          <span>
            <b>Mostrar preço indicativo na hora</b> para empresas aprovadas, enquanto montam a lista
            (o preço final é o da proposta que você envia).
          </span>
        </label>
      </div>
      <Button onClick={salvar} disabled={salvando}>
        {salvando ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-4 w-4" />
        )}
        Salvar configuração
      </Button>
    </Card>
  );
}
