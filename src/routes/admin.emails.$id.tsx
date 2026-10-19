import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Smartphone,
  Monitor,
  Upload,
  Trash2,
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  Send,
  FlaskConical,
  Users,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Type,
  Package,
  MousePointerClick,
  Eye,
  AlertTriangle,
  X,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  obterCampanhaFn,
  salvarCampanhaFn,
  contarPublicoFn,
  enviarTesteFn,
  enviarCampanhaFn,
  enviosCampanhaFn,
  buscarProdutosEmailFn,
  statusEmailFn,
  previaProdutosFn,
  agendarCampanhaFn,
  codigosCuponsFn,
  type Campanha,
} from "@/lib/emails";
import { ConstrutorEmail } from "@/components/admin/EmailConstrutor";
import { cuponsDosBlocos, paraBlocos, TEMA_PADRAO } from "@/lib/email-blocos";
import { renderEmail, type ConteudoEmail, type Publico } from "@/lib/email-template";
import {
  CORES,
  LINKS_RAPIDOS,
  Secao,
  Rotulo,
  areaCls,
  Cabecalho,
  Produtos,
  PublicoSecao,
  PreviaEmail,
  AnuncioSecao,
  useAnuncioPrevia,
} from "@/components/admin/email-editor";
import { DEPARTAMENTOS_UY } from "@/lib/validacao-conta";
import { getSessionFn } from "@/lib/user-auth";
import { COR_STATUS, ROTULO_STATUS } from "@/components/admin/email-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/emails/$id")({
  component: Editor,
});

const ROTULO_ENVIO: Record<string, string> = {
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  ABERTO: "Abriu",
  CLICADO: "Clicou",
  REBOTADO: "Rebote",
  QUEIXA: "Marcou spam",
  FALHA: "Falhou",
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
  if (camp === null)
    return (
      <p>
        Campanha não encontrada.{" "}
        <Link to="/admin/emails" className="text-primary underline">
          Voltar
        </Link>
      </p>
    );
  return (
    <Formulario
      key={camp.id}
      inicial={camp}
      atualizar={() => {
        refetch();
        qc.invalidateQueries({ queryKey: ["email-campanhas"] });
      }}
    />
  );
}

function Formulario({ inicial, atualizar }: { inicial: Campanha; atualizar: () => void }) {
  const [nome, setNome] = useState(inicial.nome);
  const [assunto, setAssunto] = useState(inicial.assunto);
  const [preheader, setPreheader] = useState(inicial.preheader);
  const [c, setC] = useState<ConteudoEmail>(inicial.conteudo);
  const [publico, setPublico] = useState<Publico>(inicial.publico);
  const [salvo, setSalvo] = useState<"salvo" | "salvando" | "pendente">("salvo");
  const set = <K extends keyof ConteudoEmail>(k: K, v: ConteudoEmail[K]) =>
    setC((o) => ({ ...o, [k]: v }));
  const { data: st } = useQuery({ queryKey: ["email-status"], queryFn: () => statusEmailFn() });
  const enviando = inicial.status === "ENVIANDO";

  // Salva sozinho 1 s depois de parar de digitar
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (enviando) return;
    setSalvo("pendente");
    const t = setTimeout(async () => {
      setSalvo("salvando");
      try {
        await salvarCampanhaFn({
          data: { id: inicial.id, nome, assunto, preheader, conteudo: c, publico },
        });
        setSalvo("salvo");
      } catch (e: any) {
        toast.error(e?.message || "Falha ao salvar");
        setSalvo("pendente");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [nome, assunto, preheader, c, publico]); // eslint-disable-line react-hooks/exhaustive-deps

  // Blocos "Produtos": busca as peças de hoje só quando muda o que define a escolha
  const chaveProdutos = JSON.stringify(
    (c.blocos ?? [])
      .filter((b) => b.tipo === "PRODUTOS" && !b.oculto)
      .map((b) => [
        b.id,
        b.d.fonte,
        b.d.alvo,
        b.d.limite,
        (b.d.produtos ?? []).map((p: any) => p.sku),
      ]),
  );
  const [chaveAtrasada, setChaveAtrasada] = useState(chaveProdutos);
  useEffect(() => {
    const t = setTimeout(() => setChaveAtrasada(chaveProdutos), 500);
    return () => clearTimeout(t);
  }, [chaveProdutos]);
  const { data: produtosBloco } = useQuery({
    queryKey: ["email-previa-produtos", chaveAtrasada],
    queryFn: () =>
      previaProdutosFn({
        data: { blocos: (c.blocos ?? []).filter((b) => b.tipo === "PRODUTOS") },
      }),
    enabled: chaveAtrasada !== "[]",
    placeholderData: (v) => v,
  });
  const anuncio = useAnuncioPrevia("CAMPANHA");
  const { data: cupons } = useQuery({
    queryKey: ["email-cupons-existentes"],
    queryFn: () => codigosCuponsFn(),
    enabled: !!c.blocos?.length,
  });

  const html = useMemo(
    () =>
      renderEmail(c, {
        origem: typeof window !== "undefined" ? window.location.origin : "",
        nome: "Juan Pérez",
        preheader,
        urlBaixa: "#",
        whatsappUrl: "#",
        campanha: "previa",
        produtosBloco,
        vars: { departamento: "Montevideo", mi_cupon: "EJEMPLO10" },
        anuncio,
      }),
    [c, preheader, produtosBloco, anuncio],
  );
  const cuponsFaltando = cuponsDosBlocos(c.blocos).filter(
    (k) => cupons && !cupons.includes(k.toUpperCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/admin/emails"
          className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={enviando}
          className="h-10 max-w-md text-lg font-semibold"
          aria-label="Nome interno da campanha"
        />
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            COR_STATUS[inicial.status],
          )}
        >
          {ROTULO_STATUS[inicial.status]}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {salvo === "salvo" ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Salvo
            </>
          ) : salvo === "salvando" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : (
            "Alterações não salvas"
          )}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
        <fieldset disabled={enviando} className="min-w-0 space-y-4 disabled:opacity-70">
          <Secao
            icone={Type}
            titulo="Assunto"
            dica="É o que aparece na caixa de entrada. Use {{nombre}} para o primeiro nome do cliente."
          >
            <div>
              <Rotulo
                extra={
                  <span className={assunto.length > 60 ? "text-amber-600" : ""}>
                    {assunto.length}/60
                  </span>
                }
              >
                Assunto
              </Rotulo>
              <Input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ej.: {{nombre}}, 15% en filtros esta semana"
              />
            </div>
            <div>
              <Rotulo extra={`${preheader.length}/100`}>
                Texto de prévia (aparece ao lado do assunto)
              </Rotulo>
              <Input
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Envíos a todo Uruguay por DAC"
              />
            </div>
          </Secao>

          {c.blocos?.length ? (
            <ConstrutorEmail c={c} setC={setC} cupons={cupons} />
          ) : (
            <>
              <Card className="flex flex-wrap items-center gap-3 border-primary/30 bg-primary/5 p-4">
                <Sparkles className="h-6 w-6 text-primary" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">Passe para o construtor por blocos</p>
                  <p className="text-xs text-muted-foreground">
                    Temas (inclusive Black Friday), contagem regressiva, produtos automáticos com o
                    preço do dia, categorias, passo a passo e mais. O conteúdo atual vira blocos.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    setC((o) => ({ ...o, tema: { ...TEMA_PADRAO }, blocos: paraBlocos(o) }))
                  }
                >
                  Converter
                </Button>
              </Card>
              <Secao
                icone={ImageIcon}
                titulo="Imagem de cabeçalho"
                dica="1200×600 px, JPG ou PNG, até 3 MB. Os banners prontos de marketing/banners_home servem."
              >
                <Cabecalho valor={c.cabecalho} aoMudar={(v) => set("cabecalho", v)} />
                {c.cabecalho && (
                  <div>
                    <Rotulo>Link ao clicar na imagem (opcional)</Rotulo>
                    <Input
                      value={c.cabecalhoLink ?? ""}
                      onChange={(e) => set("cabecalhoLink", e.target.value)}
                      placeholder="/loja"
                    />
                  </div>
                )}
              </Secao>

              <Secao icone={Type} titulo="Conteúdo">
                <div>
                  <Rotulo>Selo de destaque (opcional)</Rotulo>
                  <Input
                    value={c.destaque ?? ""}
                    onChange={(e) => set("destaque", e.target.value)}
                    placeholder="-15% OFF · SOLO ESTA SEMANA"
                  />
                </div>
                <div>
                  <Rotulo>Título</Rotulo>
                  <Input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} />
                </div>
                <div>
                  <Rotulo extra="**negrito** · [texto](/loja)">Texto</Rotulo>
                  <textarea
                    value={c.texto}
                    onChange={(e) => set("texto", e.target.value)}
                    rows={6}
                    className={areaCls}
                  />
                </div>
                <div>
                  <Rotulo>Cor principal</Rotulo>
                  <div className="flex items-center gap-2">
                    {CORES.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        onClick={() => set("cor", cor)}
                        className={cn(
                          "h-8 w-8 rounded-full ring-offset-2",
                          c.cor === cor && "ring-2 ring-primary",
                        )}
                        style={{ background: cor }}
                        aria-label={cor}
                      />
                    ))}
                    <input
                      type="color"
                      value={c.cor}
                      onChange={(e) => set("cor", e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border"
                      aria-label="Outra cor"
                    />
                  </div>
                </div>
              </Secao>

              <Secao
                icone={Package}
                titulo="Produtos do site"
                dica="Até 12. Cada produto vira um card com foto e botão “Cotizar” que abre a página dele."
              >
                <div>
                  <Rotulo>Título da seção</Rotulo>
                  <Input
                    value={c.produtosTitulo ?? ""}
                    onChange={(e) => set("produtosTitulo", e.target.value)}
                    placeholder="Destacados del mes"
                  />
                </div>
                <label className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  <span>
                    <b>Mostrar fotos dos produtos</b>
                    <br />
                    <span className="text-xs">
                      Desligado: o card mostra o código da peça. Ligue só se as fotos forem próprias
                      ou autorizadas pelo fornecedor (boa parte veio de outra loja).
                    </span>
                  </span>
                  <Switch checked={!!c.fotos} onCheckedChange={(v) => set("fotos", v)} />
                </label>
                <Produtos lista={c.produtos} aoMudar={(p) => set("produtos", p)} />
              </Secao>

              <Secao icone={MousePointerClick} titulo="Botões">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Rotulo>Texto do botão</Rotulo>
                    <Input
                      value={c.botaoTexto ?? ""}
                      onChange={(e) => set("botaoTexto", e.target.value)}
                      placeholder="Ver ofertas"
                    />
                  </div>
                  <div>
                    <Rotulo>Link</Rotulo>
                    <Input
                      value={c.botaoUrl ?? ""}
                      onChange={(e) => set("botaoUrl", e.target.value)}
                      placeholder="/loja"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LINKS_RAPIDOS.map((l) => (
                    <button
                      key={l.url}
                      type="button"
                      onClick={() => set("botaoUrl", l.url)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        c.botaoUrl === l.url && "border-primary bg-primary/10 text-primary",
                      )}
                    >
                      {l.rotulo}
                    </button>
                  ))}
                </div>
                <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <span>Botão verde “Cotizar por WhatsApp”</span>
                  <Switch checked={!!c.whatsapp} onCheckedChange={(v) => set("whatsapp", v)} />
                </label>
              </Secao>
            </>
          )}

          <AnuncioSecao
            anuncio={anuncio}
            ligado={!c.semAnuncio}
            aoMudar={(v) => setC((o) => ({ ...o, semAnuncio: !v }))}
          />
          <PublicoSecao publico={publico} aoMudar={setPublico} />
        </fieldset>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <PreviaEmail html={html} assunto={assunto} preheader={preheader} />
          <Envio
            camp={inicial}
            assunto={assunto}
            preheader={preheader}
            conteudo={c}
            publico={publico}
            configurado={!!st?.configurado}
            salvo={salvo === "salvo"}
            atualizar={atualizar}
            cuponsFaltando={cuponsFaltando}
          />
        </div>
      </div>
    </div>
  );
}

function Envio({
  camp,
  assunto,
  preheader,
  conteudo,
  publico,
  configurado,
  salvo,
  atualizar,
  cuponsFaltando,
}: {
  cuponsFaltando: string[];
  camp: Campanha;
  assunto: string;
  preheader: string;
  conteudo: ConteudoEmail;
  publico: Publico;
  configurado: boolean;
  salvo: boolean;
  atualizar: () => void;
}) {
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const [para, setPara] = useState("");
  const [testando, setTestando] = useState(false);
  const [disparando, setDisparando] = useState(false);
  useEffect(() => {
    if (sessao?.email && !para) setPara(sessao.email);
  }, [sessao]); // eslint-disable-line react-hooks/exhaustive-deps
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
    const msg =
      novos !== null
        ? `Enviar "${assunto}" para ${total} clientes agora?\n\nDepois de enviado não dá para desfazer.`
        : `Enviar esta campanha para quem ainda não recebeu (clientes novos no público)?\nQuem já recebeu não recebe de novo.`;
    if (!total) return toast.error("Nenhum cliente no público escolhido");
    if (
      cuponsFaltando.length &&
      !window.confirm(
        `Atenção: o cupom ${cuponsFaltando.join(", ")} não existe em Campanhas e cupons. Enviar mesmo assim?`,
      )
    )
      return;
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
        <h2 className="flex items-center gap-2 font-semibold">
          <FlaskConical className="h-4 w-4 text-primary" /> Enviar teste
        </h2>
        <div className="mt-2 flex gap-2">
          <Input
            value={para}
            onChange={(e) => setPara(e.target.value)}
            placeholder="seu@email.com"
          />
          <Button variant="outline" onClick={teste} disabled={!configurado || testando}>
            {testando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar"}
          </Button>
        </div>
      </div>

      {camp.status === "ENVIANDO" ? (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando… {camp.enviados + camp.falhas} de{" "}
            {camp.total}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{
                width: `${camp.total ? ((camp.enviados + camp.falhas) / camp.total) * 100 : 0}%`,
              }}
            />
          </div>
          {!camp.rodando && (
            <Button size="sm" className="mt-3" onClick={disparar}>
              Retomar envio (o servidor reiniciou)
            </Button>
          )}
        </div>
      ) : (
        <Button
          size="lg"
          className="h-12 w-full text-base"
          onClick={disparar}
          disabled={!configurado || disparando || !salvo}
        >
          {disparando ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Send className="mr-2 h-5 w-5" />
          )}
          {camp.status === "RASCUNHO" || camp.status === "ERRO"
            ? "Enviar campanha"
            : "Enviar para os novos do público"}
        </Button>
      )}
      {(camp.status === "RASCUNHO" || camp.status === "AGENDADA" || camp.status === "ERRO") && (
        <Agendar camp={camp} configurado={configurado} salvo={salvo} atualizar={atualizar} />
      )}
      {cuponsFaltando.length > 0 && (
        <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" /> O e-mail cita o cupom{" "}
          {cuponsFaltando.join(", ")}, que não existe em Campanhas e cupons. Crie antes de enviar.
        </p>
      )}
      {!configurado && (
        <p className="text-xs text-amber-700">Configure o Resend na Hostinger para enviar.</p>
      )}
      {camp.erro && (
        <p className="flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {camp.erro}
        </p>
      )}

      {camp.status !== "RASCUNHO" && envios && (
        <div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/60 p-2">
              <p className="text-lg font-bold">{camp.enviados}</p>enviados
            </div>
            <div className="rounded-lg bg-muted/60 p-2">
              <p className="text-lg font-bold">{pct(abertos)}</p>
              <Eye className="mr-0.5 inline h-3 w-3" />
              abriram
            </div>
            <div className="rounded-lg bg-muted/60 p-2">
              <p className="text-lg font-bold">{pct(ps.CLICADO ?? 0)}</p>clicaram
            </div>
            <div className="rounded-lg bg-muted/60 p-2">
              <p className="text-lg font-bold">
                {(ps.REBOTADO ?? 0) + (ps.QUEIXA ?? 0) + (ps.FALHA ?? 0)}
              </p>
              problemas
            </div>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border text-sm">
            {envios.envios.map((e, i) => (
              <div key={i} className="flex items-center gap-2 border-b px-3 py-1.5 last:border-0">
                <span className="min-w-0 flex-1 truncate">{e.email}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    e.status === "CLICADO" || e.status === "ABERTO"
                      ? "bg-emerald-100 text-emerald-800"
                      : ["FALHA", "REBOTADO", "QUEIXA"].includes(e.status)
                        ? "bg-red-100 text-red-700"
                        : "bg-zinc-100 text-zinc-700",
                  )}
                  title={e.erro ?? undefined}
                >
                  {ROTULO_ENVIO[e.status] ?? e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// Envio agendado: o servidor dispara sozinho (confere a cada 10 minutos)
function Agendar({
  camp,
  configurado,
  salvo,
  atualizar,
}: {
  camp: Campanha;
  configurado: boolean;
  salvo: boolean;
  atualizar: () => void;
}) {
  const local = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const z = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  };
  const [quando, setQuando] = useState(local(camp.agendado_para));
  const [indo, setIndo] = useState(false);
  const salvar = async (q: string | null) => {
    setIndo(true);
    try {
      await agendarCampanhaFn({
        data: { id: camp.id, quando: q ? new Date(q).toISOString() : null },
      });
      toast.success(q ? "Envio agendado" : "Agendamento cancelado");
      atualizar();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao agendar");
    } finally {
      setIndo(false);
    }
  };
  if (camp.status === "AGENDADA" && camp.agendado_para)
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
        <CalendarClock className="h-5 w-5" />
        <span className="flex-1">
          Sai sozinha em{" "}
          <b>
            {new Date(camp.agendado_para).toLocaleString("pt-BR", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </b>
          . Pode continuar editando até lá.
        </span>
        <Button size="sm" variant="outline" disabled={indo} onClick={() => salvar(null)}>
          Cancelar
        </Button>
      </div>
    );
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="h-4 w-4 text-primary" /> Ou agendar o envio
      </h2>
      <div className="mt-2 flex gap-2">
        <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />
        <Button
          variant="outline"
          disabled={!configurado || !quando || indo || !salvo}
          onClick={() => salvar(quando)}
        >
          Agendar
        </Button>
      </div>
    </div>
  );
}
