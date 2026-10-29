import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Package,
  FlaskConical,
  Send,
  Zap,
  Ticket,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  obterAutomacaoFn,
  salvarAutomacaoFn,
  ativarAutomacaoFn,
  testarAutomacaoFn,
  enviarAutomacaoAgoraFn,
  contarEnvioAgoraFn,
  enviosAutomacaoFn,
  type Automacao,
} from "@/lib/automacoes";
import {
  defTipo,
  blackFriday,
  PRODUTOS_EXEMPLO,
  type ConfigAutomacao,
} from "@/lib/automacoes-tipos";
import {
  renderEmail,
  aplicarVariaveis,
  trocarVariaveis,
  type ConteudoEmail,
  type Publico,
} from "@/lib/email-template";
import { statusEmailFn } from "@/lib/emails";
import { getSessionFn } from "@/lib/user-auth";
import {
  CORES,
  LINKS_RAPIDOS,
  Secao,
  Rotulo,
  areaCls,
  Cabecalho,
  PublicoSecao,
  PreviaEmail,
  AnuncioSecao,
  useAnuncioPrevia,
} from "@/components/admin/email-editor";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/automacoes/$id")({
  component: Editor,
});

const ROTULO_VAR: Record<string, string> = {
  marca: "marca do catálogo",
  busqueda: "o que o cliente buscou",
  catalogo: "título do catálogo",
  anos: "número de anos",
  tiempo: "“1 año” / “2 años”",
};
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
  const { data: a, refetch } = useQuery({
    queryKey: ["automacao", id],
    queryFn: () => obterAutomacaoFn({ data: { id: Number(id) } }),
  });
  if (a === undefined) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (a === null)
    return (
      <p>
        Automação não encontrada.{" "}
        <Link to="/admin/automacoes" className="text-primary underline">
          Voltar
        </Link>
      </p>
    );
  return (
    <Formulario
      key={a.id}
      inicial={a}
      atualizar={() => {
        refetch();
        qc.invalidateQueries({ queryKey: ["automacoes"] });
      }}
    />
  );
}

function Numero({
  valor,
  aoMudar,
  sufixo,
  min = 0,
}: {
  valor?: number;
  aoMudar: (n: number) => void;
  sufixo: string;
  min?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Input
        type="number"
        min={min}
        value={valor ?? 0}
        onChange={(e) => aoMudar(Math.max(min, Number(e.target.value) || 0))}
        className="h-9 w-20"
      />
      <span className="text-sm text-muted-foreground">{sufixo}</span>
    </span>
  );
}

function Formulario({ inicial, atualizar }: { inicial: Automacao; atualizar: () => void }) {
  const def = defTipo(inicial.tipo);
  const [nome, setNome] = useState(inicial.nome);
  const [assunto, setAssunto] = useState(inicial.assunto);
  const [preheader, setPreheader] = useState(inicial.preheader);
  const [c, setC] = useState<ConteudoEmail>(inicial.conteudo);
  const [publico, setPublico] = useState<Publico>(inicial.publico);
  const [cfg, setCfg] = useState<ConfigAutomacao>(inicial.config);
  const [ativo, setAtivo] = useState(inicial.ativo);
  const [salvo, setSalvo] = useState<"salvo" | "salvando" | "pendente">("salvo");
  const set = <K extends keyof ConteudoEmail>(k: K, v: ConteudoEmail[K]) =>
    setC((o) => ({ ...o, [k]: v }));
  const setConf = <K extends keyof ConfigAutomacao>(k: K, v: ConfigAutomacao[K]) =>
    setCfg((o) => ({ ...o, [k]: v }));
  const { data: st } = useQuery({ queryKey: ["email-status"], queryFn: () => statusEmailFn() });

  // Salva sozinho 1 s depois de parar de digitar
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    setSalvo("pendente");
    const t = setTimeout(async () => {
      setSalvo("salvando");
      try {
        await salvarAutomacaoFn({
          data: { id: inicial.id, nome, assunto, preheader, conteudo: c, publico, config: cfg },
        });
        setSalvo("salvo");
      } catch (e: any) {
        toast.error(e?.message || "Falha ao salvar");
        setSalvo("pendente");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [nome, assunto, preheader, c, publico, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  const vars = { ...def.variaveis, cupon: c.cupom?.codigo ?? "", validez: c.cupom?.validade ?? "" };
  const anuncio = useAnuncioPrevia("AUTOMACAO");
  const html = useMemo(
    () =>
      renderEmail(
        aplicarVariaveis({ ...c, produtos: def.produtos ? PRODUTOS_EXEMPLO : [] }, vars),
        {
          origem: typeof window !== "undefined" ? window.location.origin : "",
          nome: "Juan Pérez",
          preheader,
          urlBaixa: "#",
          whatsappUrl: "#",
          campanha: "previa",
          anuncio,
        },
      ),
    [c, preheader, anuncio], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const ligar = async (v: boolean) => {
    try {
      await ativarAutomacaoFn({ data: { id: inicial.id, ativo: v } });
      setAtivo(v);
      toast.success(v ? "Automação ligada: vale daqui para frente" : "Automação desligada");
      atualizar();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/admin/automacoes"
          className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-2xl">{def.emoji}</span>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="h-10 max-w-md text-lg font-semibold"
          aria-label="Nome da automação"
        />
        <label
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
            ativo ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "text-muted-foreground",
          )}
        >
          <Switch checked={ativo} onCheckedChange={ligar} /> {ativo ? "Ligada" : "Desligada"}
        </label>
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
      {inicial.ultimo_erro && (
        <p className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Último erro: {inicial.ultimo_erro}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
        <div className="min-w-0 space-y-4">
          <Secao icone={Zap} titulo="Quando enviar" dica={def.gatilho}>
            <Gatilho tipo={inicial.tipo} cfg={cfg} setConf={setConf} />
          </Secao>

          <Secao
            icone={Type}
            titulo="Assunto"
            dica={`Variáveis: {{nombre}} = primeiro nome · {{cupon}} = código do cupom · {{validez}} = validade${Object.keys(
              def.variaveis ?? {},
            )
              .map((k) => ` · {{${k}}} = ${ROTULO_VAR[k] ?? k}`)
              .join("")}.`}
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
              <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} />
            </div>
            <div>
              <Rotulo extra={`${preheader.length}/100`}>
                Texto de prévia (aparece ao lado do assunto)
              </Rotulo>
              <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} />
            </div>
          </Secao>

          <Secao
            icone={ImageIcon}
            titulo="Imagem"
            dica="1200×600 px, JPG ou PNG, até 3 MB. Ex.: banner de boas-vindas ou da oferta."
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

          <Secao
            icone={Ticket}
            titulo="Cupom"
            dica={
              inicial.tipo === "boas_vindas"
                ? "Nas boas-vindas, o código é trocado pelo cupom único de cada cliente (AGRO-XXXX), o mesmo do pop-up. Você confere em Site → Pop-up de cadastro."
                : "Caixa em destaque com o código. O cliente menciona o código no WhatsApp ao pedir."
            }
          >
            <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
              <span>Incluir cupom neste e-mail</span>
              <Switch
                checked={!!c.cupom}
                onCheckedChange={(v) =>
                  set(
                    "cupom",
                    v
                      ? {
                          codigo: "AGRO10",
                          texto: "10% de descuento en tu próxima compra",
                          validade: "hasta fin de mes",
                        }
                      : null,
                  )
                }
              />
            </label>
            {c.cupom && (
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Rotulo>Código</Rotulo>
                  <Input
                    value={c.cupom.codigo}
                    onChange={(e) =>
                      set("cupom", {
                        ...c.cupom!,
                        codigo: e.target.value.toUpperCase().replace(/\s+/g, ""),
                      })
                    }
                    className="font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Rotulo>Texto do cupom</Rotulo>
                  <Input
                    value={c.cupom.texto ?? ""}
                    onChange={(e) => set("cupom", { ...c.cupom!, texto: e.target.value })}
                    placeholder="10% de descuento en tu próxima compra"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Rotulo>Validade (aparece como “Válido …”)</Rotulo>
                  <Input
                    value={c.cupom.validade ?? ""}
                    onChange={(e) => set("cupom", { ...c.cupom!, validade: e.target.value })}
                    placeholder="hasta el 30/11"
                  />
                </div>
              </div>
            )}
          </Secao>

          <Secao icone={Type} titulo="Conteúdo">
            <div>
              <Rotulo>Selo de destaque (opcional)</Rotulo>
              <Input value={c.destaque ?? ""} onChange={(e) => set("destaque", e.target.value)} />
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
                rows={5}
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

          {def.produtos && (
            <Secao
              icone={Package}
              titulo="Peças do e-mail"
              dica="Entram sozinhas: as peças que entraram em oferta, baixaram de preço ou estão na lista do cliente, com o preço atual. Na prévia aparecem exemplos."
            >
              <div>
                <Rotulo>Título da seção</Rotulo>
                <Input
                  value={c.produtosTitulo ?? ""}
                  onChange={(e) => set("produtosTitulo", e.target.value)}
                />
              </div>
              <label className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <span>
                  <b>Mostrar fotos das peças</b>
                  <br />
                  <span className="text-xs">
                    Ligue só se as fotos forem próprias ou autorizadas.
                  </span>
                </span>
                <Switch checked={!!c.fotos} onCheckedChange={(v) => set("fotos", v)} />
              </label>
            </Secao>
          )}

          <Secao icone={MousePointerClick} titulo="Botões">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Rotulo>Texto do botão</Rotulo>
                <Input
                  value={c.botaoTexto ?? ""}
                  onChange={(e) => set("botaoTexto", e.target.value)}
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
              <span>
                Botão verde do WhatsApp{" "}
                {c.cupom
                  ? "(já vai com o código do cupom)"
                  : def.produtos
                    ? "(já vai com a lista de peças)"
                    : ""}
              </span>
              <Switch checked={!!c.whatsapp} onCheckedChange={(v) => set("whatsapp", v)} />
            </label>
          </Secao>

          <AnuncioSecao
            anuncio={anuncio}
            ligado={!c.semAnuncio}
            aoMudar={(v) => set("semAnuncio", !v)}
          />
          <PublicoSecao publico={publico} aoMudar={setPublico} />
          <p className="-mt-2 px-1 text-xs text-muted-foreground">
            {inicial.tipo === "boas_vindas"
              ? "Para boas-vindas, deixe “Todos os clientes”: cada cliente novo recebe uma vez."
              : "A automação só envia para quem está neste público (ex.: só clientes de Rocha e Treinta y Tres)."}
          </p>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <PreviaEmail html={html} assunto={trocarVariaveis(assunto, vars)} preheader={preheader} />
          <Acoes
            a={inicial}
            assunto={assunto}
            preheader={preheader}
            conteudo={c}
            configurado={!!st?.configurado}
            salvo={salvo === "salvo"}
            atualizar={atualizar}
          />
        </div>
      </div>
    </div>
  );
}

function Gatilho({
  tipo,
  cfg,
  setConf,
}: {
  tipo: string;
  cfg: ConfigAutomacao;
  setConf: <K extends keyof ConfigAutomacao>(k: K, v: ConfigAutomacao[K]) => void;
}) {
  const linha = (rotulo: string, campo: React.ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
      <span>{rotulo}</span>
      {campo}
    </div>
  );
  if (tipo === "boas_vindas")
    return linha(
      "Esperar depois do cadastro",
      <Numero
        valor={cfg.atrasoHoras}
        aoMudar={(n) => setConf("atrasoHoras", n)}
        sufixo="horas (0 = na hora)"
      />,
    );
  if (tipo === "cupom")
    return (
      <>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["manual", "Só quando eu clicar em “Enviar agora”"],
              ["cadastro", "Sozinho, N dias depois do cadastro"],
            ] as const
          ).map(([k, r]) => (
            <button
              key={k}
              type="button"
              onClick={() => setConf("gatilho", k)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm",
                (cfg.gatilho ?? "manual") === k
                  ? "border-primary bg-primary/5 font-semibold text-primary"
                  : "hover:bg-muted",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        {cfg.gatilho === "cadastro" &&
          linha(
            "Enviar depois do cadastro",
            <Numero valor={cfg.dias} min={1} aoMudar={(n) => setConf("dias", n)} sufixo="dias" />,
          )}
      </>
    );
  if (tipo === "promocao" || tipo === "preco_baixou")
    return (
      <>
        {linha(
          tipo === "promocao" ? "Desconto mínimo para avisar" : "Queda mínima de preço",
          <Numero valor={cfg.minimo} aoMudar={(n) => setConf("minimo", n)} sufixo="%" />,
        )}
        {linha(
          "Peças por e-mail (no máximo)",
          <Numero
            valor={cfg.maxProdutos}
            min={1}
            aoMudar={(n) => setConf("maxProdutos", Math.min(12, n))}
            sufixo="peças"
          />,
        )}
        {linha(
          "No máximo 1 e-mail por cliente a cada",
          <Numero
            valor={cfg.intervaloDias}
            aoMudar={(n) => setConf("intervaloDias", n)}
            sufixo="dias"
          />,
        )}
      </>
    );
  if (tipo === "carrinho_baixou")
    return (
      <>
        {linha(
          "Considerar listas montadas nos últimos",
          <Numero valor={cfg.dias} min={1} aoMudar={(n) => setConf("dias", n)} sufixo="dias" />,
        )}
        {linha(
          "Queda mínima de preço",
          <Numero valor={cfg.minimo} aoMudar={(n) => setConf("minimo", n)} sufixo="%" />,
        )}
      </>
    );
  if (tipo === "carrinho_abandonado")
    return linha(
      "Lista parada sem pedido há",
      <Numero valor={cfg.horas} min={1} aoMudar={(n) => setConf("horas", n)} sufixo="horas" />,
    );
  if (tipo === "interesse_sem_pedido")
    return (
      <>
        {linha(
          "Enviar depois da última visita do cliente",
          <Numero valor={cfg.horas} min={1} aoMudar={(n) => setConf("horas", n)} sufixo="horas" />,
        )}
        {linha(
          "Peças vistas nos últimos",
          <Numero valor={cfg.dias} min={1} aoMudar={(n) => setConf("dias", n)} sufixo="dias" />,
        )}
        {linha(
          "Peças no e-mail (as mais vistas)",
          <Numero
            valor={cfg.maxProdutos}
            min={1}
            aoMudar={(n) => setConf("maxProdutos", Math.min(12, n))}
            sufixo="peças"
          />,
        )}
        {linha(
          "Cupom exclusivo de desconto",
          <Numero
            valor={cfg.descontoPct}
            aoMudar={(n) => setConf("descontoPct", Math.min(50, n))}
            sufixo="% (0 = sem cupom)"
          />,
        )}
        {linha(
          "Validade do cupom",
          <Numero
            valor={cfg.validadeDias}
            min={1}
            aoMudar={(n) => setConf("validadeDias", n)}
            sufixo="dias"
          />,
        )}
        {linha(
          "No máximo 1 e-mail por cliente a cada",
          <Numero
            valor={cfg.intervaloDias}
            aoMudar={(n) => setConf("intervaloDias", n)}
            sufixo="dias"
          />,
        )}
        <p className="text-xs text-muted-foreground">
          Só para quem não pediu nada no período (WhatsApp, cotação, carrinho, link de pagamento ou
          venda). Cada cliente recebe o próprio cupom, de uso único. Acompanhe em E-mail marketing →
          Peças vistas.
        </p>
      </>
    );
  if (tipo === "catalogo_aberto")
    return (
      <>
        {linha(
          "Enviar depois de abrir o catálogo",
          <Numero valor={cfg.horas} min={1} aoMudar={(n) => setConf("horas", n)} sufixo="horas" />,
        )}
        {linha(
          "Peças da marca no e-mail",
          <Numero
            valor={cfg.maxProdutos}
            min={1}
            aoMudar={(n) => setConf("maxProdutos", Math.min(12, n))}
            sufixo="peças"
          />,
        )}
        {linha(
          "No máximo 1 e-mail por cliente a cada",
          <Numero
            valor={cfg.intervaloDias}
            aoMudar={(n) => setConf("intervaloDias", n)}
            sufixo="dias"
          />,
        )}
        <p className="text-xs text-muted-foreground">
          Entram primeiro as peças da marca em promoção; depois, as com preço e foto. Só funciona
          para catálogos com a marca preenchida.
        </p>
      </>
    );
  if (tipo === "busca_sem_resultado")
    return (
      <>
        {linha(
          "Considerar buscas dos últimos",
          <Numero valor={cfg.dias} min={1} aoMudar={(n) => setConf("dias", n)} sufixo="dias" />,
        )}
        {linha(
          "Peças encontradas no e-mail",
          <Numero
            valor={cfg.maxProdutos}
            min={1}
            aoMudar={(n) => setConf("maxProdutos", Math.min(12, n))}
            sufixo="peças"
          />,
        )}
        <p className="text-xs text-muted-foreground">
          Vale para buscas de clientes com conta. Cada busca é avisada uma vez só.
        </p>
      </>
    );
  if (tipo === "catalogo_novo")
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["marca", "Só quem já abriu catálogos da mesma marca"],
            ["todos", "Todo o público escolhido abaixo"],
          ] as const
        ).map(([k, r]) => (
          <button
            key={k}
            type="button"
            onClick={() => setConf("alvo", k)}
            className={cn(
              "rounded-lg border p-3 text-left text-sm",
              (cfg.alvo ?? "marca") === k
                ? "border-primary bg-primary/5 font-semibold text-primary"
                : "hover:bg-muted",
            )}
          >
            {r}
          </button>
        ))}
      </div>
    );
  if (tipo === "data_especial") {
    const ano = new Date().getFullYear();
    const proximo = (d: string) =>
      d < new Date().toISOString().slice(0, 10) ? d.replace(String(ano), String(ano + 1)) : d;
    const presets = [
      [
        "Black Friday",
        proximo(blackFriday(ano)) === blackFriday(ano) ? blackFriday(ano) : blackFriday(ano + 1),
      ],
      ["Navidad", proximo(`${ano}-12-20`)],
      ["Fin de año", proximo(`${ano}-12-28`)],
      ["Reyes", proximo(`${ano}-01-06`)],
    ] as const;
    return (
      <>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(([r, d]) => (
            <button
              key={r}
              type="button"
              onClick={() => setConf("data", d)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                cfg.data === d && "border-primary bg-primary/10 text-primary",
              )}
            >
              {r} · {d.split("-").reverse().join("/")}
            </button>
          ))}
        </div>
        {linha(
          "Data do envio",
          <Input
            type="date"
            value={cfg.data ?? ""}
            onChange={(e) => setConf("data", e.target.value)}
            className="h-9 w-44"
          />,
        )}
        {linha(
          "A partir das",
          <Numero
            valor={cfg.hora}
            aoMudar={(n) => setConf("hora", Math.min(23, n))}
            sufixo="h (Montevidéu)"
          />,
        )}
        <p className="text-xs text-muted-foreground">
          CyberLunes: escolha a data anunciada no ano. Para várias datas, duplique esta automação
          (uma por data).
        </p>
      </>
    );
  }
  if (tipo === "aniversario")
    return (
      <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
        Sai sozinho no dia em que a conta do cliente completa 1, 2, 3… anos. Use {"{{tiempo}}"} (“1
        año”, “2 años”) no texto.
      </p>
    );
  if (tipo === "reengajamento")
    return (
      <>
        {linha(
          "Cliente sem entrar no site há",
          <Numero valor={cfg.dias} min={1} aoMudar={(n) => setConf("dias", n)} sufixo="dias" />,
        )}
        {linha(
          "Repetir para o mesmo cliente só depois de",
          <Numero
            valor={cfg.intervaloDias}
            min={1}
            aoMudar={(n) => setConf("intervaloDias", n)}
            sufixo="dias"
          />,
        )}
      </>
    );
  return null;
}

function Acoes({
  a,
  assunto,
  preheader,
  conteudo,
  configurado,
  salvo,
  atualizar,
}: {
  a: Automacao;
  assunto: string;
  preheader: string;
  conteudo: ConteudoEmail;
  configurado: boolean;
  salvo: boolean;
  atualizar: () => void;
}) {
  const def = defTipo(a.tipo);
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const [para, setPara] = useState("");
  const [testando, setTestando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (sessao?.email && !para) setPara(sessao.email);
  }, [sessao]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: envios, refetch } = useQuery({
    queryKey: ["automacao-envios", a.id],
    queryFn: () => enviosAutomacaoFn({ data: { id: a.id } }),
  });

  const teste = async () => {
    setTestando(true);
    try {
      await testarAutomacaoFn({ data: { para, tipo: a.tipo, assunto, preheader, conteudo } });
      toast.success(`Teste enviado para ${para}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha no envio");
    } finally {
      setTestando(false);
    }
  };
  const agora = async () => {
    const { total, jaReceberam } = await contarEnvioAgoraFn({ data: { id: a.id } });
    if (!total)
      return toast.info(
        jaReceberam
          ? `Todos do público já receberam (${jaReceberam}).`
          : "Nenhum cliente no público.",
      );
    if (
      !window.confirm(
        `Enviar "${assunto}" para ${total} cliente(s) agora?${jaReceberam ? `\n(${jaReceberam} já receberam e ficam de fora)` : ""}`,
      )
    )
      return;
    setEnviando(true);
    try {
      const r = await enviarAutomacaoAgoraFn({ data: { id: a.id } });
      toast.success(`Enviando para ${r.total} cliente(s)…`);
      setTimeout(() => {
        refetch();
        atualizar();
      }, 3000);
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setEnviando(false);
    }
  };

  const ps = envios?.porStatus ?? {};
  const total = Object.entries(ps)
    .filter(([k]) => k !== "FALHA")
    .reduce((t, [, n]) => t + n, 0);
  const abertos = (ps.ABERTO ?? 0) + (ps.CLICADO ?? 0);

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <FlaskConical className="h-4 w-4 text-primary" /> Enviar teste
        </h2>
        <p className="text-xs text-muted-foreground">
          {def.produtos
            ? "O teste usa peças que estão em promoção agora (ou exemplos)."
            : "Chega com [PRUEBA] no assunto."}
        </p>
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

      {def.enviarAgora && (
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" /> Enviar agora para o público
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {a.tipo === "boas_vindas"
              ? "Manda as boas-vindas também para quem já era cliente."
              : a.tipo === "cupom"
                ? "Cada cliente recebe este cupom uma vez só."
                : "Respeita o intervalo entre e-mails."}{" "}
            Para clientes escolhidos, use a página Clientes.
          </p>
          <Button
            className="mt-2 w-full"
            onClick={agora}
            disabled={!configurado || enviando || !salvo}
          >
            {enviando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}{" "}
            Enviar agora
          </Button>
        </div>
      )}
      {!configurado && (
        <p className="text-xs text-amber-700">Configure o Resend na Hostinger para enviar.</p>
      )}

      <div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-lg font-bold">{total}</p>enviados
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-lg font-bold">
              {total ? `${Math.round((abertos / total) * 100)}%` : "—"}
            </p>
            abriram
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-lg font-bold">
              {(ps.REBOTADO ?? 0) + (ps.QUEIXA ?? 0) + (ps.FALHA ?? 0)}
            </p>
            problemas
          </div>
        </div>
        {envios && envios.envios.length > 0 && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border text-sm">
            {envios.envios.map((e, i) => (
              <div key={i} className="flex items-center gap-2 border-b px-3 py-1.5 last:border-0">
                <span className="min-w-0 flex-1 truncate">{e.email}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(e.quando).toLocaleDateString("pt-BR")}
                </span>
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
        )}
      </div>
    </Card>
  );
}
