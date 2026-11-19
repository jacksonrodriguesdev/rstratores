// AGRO PARTS Mayorista: portal da empresa (/empresas/portal). Situação da conta, nova cotação
// (colar lista → revisar peça por peça → enviar) e histórico das cotações.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronLeft,
  Clock,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  PackageSearch,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { B2bPagina, Selo, tomStatus } from "@/components/b2b/B2bLayout";
import { CartaoDespachante } from "@/components/b2b/ClienteAduana";
import { VitrineExportacao } from "@/components/b2b/VitrineExportacao";
import { CarritoExport, type ItemCarrito } from "@/components/b2b/CarritoExport";
import type { ItemVitrine } from "@/lib/exportacao/vitrine.server";
import {
  formatarRut,
  INCOTERMS,
  type ItemCotacao,
  lerLista,
  PAGAMENTOS,
  STATUS_COTACAO_ES,
  STATUS_EMPRESA_ES,
  statusVisivel,
  usd,
  fotoUrl,
} from "@/lib/b2b-comum";
import { criarCotacaoFn, minhaEmpresaFn, minhasCotacoesFn, previaCotacaoFn } from "@/lib/b2b";
import { estimarFreteFn } from "@/lib/cubagem/frete-portal";
import { configDescontosPortalFn } from "@/lib/exportacao/descontos-fn";
import { descontoVolume, proximaFaixa, aplicarDesconto } from "@/lib/exportacao/descontos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/empresas/portal")({
  head: () => ({
    meta: [
      { title: "Portal de la empresa · AGRO PARTS Mayorista" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Portal,
});

function Portal() {
  const { data, isLoading } = useQuery({
    queryKey: ["b2b-minha"],
    queryFn: () => minhaEmpresaFn(),
  });
  if (isLoading || !data)
    return (
      <B2bPagina>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </B2bPagina>
    );
  if (!data.sessao)
    return (
      <Aviso
        titulo="Ingresá para ver el portal de tu empresa"
        texto="Usá la cuenta con la que registraste la empresa."
        acao={
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              search={{ redirect: "/empresas/portal" } as any}
              className="inline-flex h-11 items-center rounded-full bg-slate-950 px-6 font-bold text-white"
            >
              Ingresar
            </Link>
            <Link
              to="/empresas/registro"
              className="inline-flex h-11 items-center rounded-full border border-slate-300 px-6 font-semibold"
            >
              Registrar empresa
            </Link>
          </div>
        }
      />
    );
  const e = data.empresa;
  if (!e)
    return (
      <Aviso
        titulo="Tu cuenta todavía no tiene una empresa"
        texto="Registrá la empresa para recibir precios por volumen y enviar cotizaciones."
        acao={
          <Link
            to="/empresas/registro"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-6 font-bold text-white"
          >
            Registrar empresa <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
    );
  if (e.status === "PENDENTE") return <EmRevisao razao={e.razao_social} />;
  if (e.status !== "APROVADA")
    return (
      <Aviso
        titulo={`Cuenta ${STATUS_EMPRESA_ES[e.status].toLowerCase()}`}
        texto="Escribinos por WhatsApp y vemos juntos la situación de la cuenta."
        acao={<BotaoWhats />}
      />
    );
  return <Painel empresa={e} cfg={data.cfg} />;
}

function Aviso({ titulo, texto, acao }: { titulo: string; texto: string; acao: React.ReactNode }) {
  return (
    <B2bPagina>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Building2 className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-slate-600">{texto}</p>
        <div className="mt-8">{acao}</div>
      </div>
    </B2bPagina>
  );
}

const BotaoWhats = () => (
  <a
    href="https://api.whatsapp.com/send?phone=5553991831101&text=Hola%2C%20quiero%20hablar%20sobre%20la%20cuenta%20mayorista%20de%20mi%20empresa."
    target="_blank"
    rel="noreferrer"
    className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-6 font-bold text-white"
  >
    <MessageCircle className="h-4 w-4" /> WhatsApp
  </a>
);

function EmRevisao({ razao }: { razao: string }) {
  const passos = [
    ["Registro recibido", "Ya tenemos los datos de la empresa.", true],
    ["Revisión de la cuenta", "Verificamos la empresa y preparamos tus condiciones.", false],
    ["Cuenta habilitada", "Te avisamos por e-mail y ya podés enviar listas.", false],
  ] as const;
  return (
    <B2bPagina>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Selo tom="ambar">
          <Clock className="h-3.5 w-3.5" /> En revisión
        </Selo>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{razao}</h1>
        <p className="mt-2 text-slate-600">
          Estamos revisando la cuenta. Normalmente lo resolvemos en 1 día hábil.
        </p>
        <ol className="mt-10 space-y-0">
          {passos.map(([t, d, feito], k) => (
            <li key={t} className="relative flex gap-4 pb-8 last:pb-0">
              {k < passos.length - 1 && (
                <span className="absolute left-[15px] top-8 h-full w-px bg-slate-200" />
              )}
              <span
                className={cn(
                  "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full",
                  feito
                    ? "bg-emerald-600 text-white"
                    : k === 1
                      ? "bg-amber-100 text-amber-700 ring-4 ring-amber-50"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {feito ? (
                  <Check className="h-4 w-4" />
                ) : k === 1 ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  k + 1
                )}
              </span>
              <div>
                <p className="font-bold">{t}</p>
                <p className="text-sm text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          ¿Tenés una lista urgente? Escribinos y la adelantamos.
          <div className="mt-3">
            <BotaoWhats />
          </div>
        </div>
      </div>
    </B2bPagina>
  );
}

type Empresa = NonNullable<Awaited<ReturnType<typeof minhaEmpresaFn>>["empresa"]>;
type Cfg = Awaited<ReturnType<typeof minhaEmpresaFn>>["cfg"];

function Painel({ empresa, cfg }: { empresa: Empresa; cfg: Cfg }) {
  const { data: cotacoes } = useQuery({
    queryKey: ["b2b-cotacoes"],
    queryFn: () => minhasCotacoesFn(),
  });
  const abertas = (cotacoes ?? []).filter((c) => statusVisivel(c) === "COTADA");
  const [extras, setExtras] = useState<Array<{ codigo: string; qtd: number }>>([]);
  const [tab, setTab] = useState<"comprar" | "cotizaciones" | "empresa">("comprar");
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Carrinho de importação (persistido no navegador)
  const [cart, setCart] = useState<ItemCarrito[]>([]);
  useEffect(() => {
    try {
      const r = localStorage.getItem("carrito_exp");
      if (r) setCart(JSON.parse(r));
    } catch {
      /* sem localStorage */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("carrito_exp", JSON.stringify(cart));
    } catch {
      /* sem localStorage */
    }
  }, [cart]);
  const addCart = (it: ItemVitrine, qtd: number) =>
    setCart((c) =>
      c.some((x) => x.sku === it.sku)
        ? c
        : [
            ...c,
            {
              sku: it.sku,
              codigo: it.codigo,
              linha: it.linha,
              nome: it.nome,
              marca: it.marca,
              categoria: it.categoria,
              foto: it.foto,
              preco_usd: it.preco_usd,
              peso_cubado_kg: it.peso_cubado_kg,
              qtd: Math.max(1, qtd),
            },
          ],
    );
  const setQtdCart = (sku: string, qtd: number) =>
    setCart((c) => c.map((x) => (x.sku === sku ? { ...x, qtd } : x)));
  const removerCart = (sku: string) => setCart((c) => c.filter((x) => x.sku !== sku));
  const [enviandoCart, setEnviandoCart] = useState(false);
  const enviarCart = async (d: { incoterm: string; destino: string; mensagem: string }) => {
    if (!cart.length) return;
    setEnviandoCart(true);
    try {
      const r = await criarCotacaoFn({
        data: {
          linhas: cart.map((i, k) => ({
            linha: k + 1,
            codigo: i.codigo,
            qtd: i.qtd,
            descricao: i.nome,
          })),
          incoterm: d.incoterm,
          destino: d.destino,
          mensagem: d.mensagem,
        },
      });
      setCart([]);
      qc.invalidateQueries({ queryKey: ["b2b-cotacoes"] });
      navigate({ to: "/empresas/cotizacion/$codigo", params: { codigo: r.codigo } });
    } catch (e: any) {
      alert(e.message);
      setEnviandoCart(false);
    }
  };
  return (
    <B2bPagina>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 py-8 sm:px-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Cuenta mayorista habilitada
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{empresa.razao_social}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Hola, {empresa.contato_nome.split(" ")[0]} · RUT {formatarRut(empresa.rut)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Selo>Mínimo {cfg.minimo} u. por ítem</Selo>
            <Selo>{PAGAMENTOS[empresa.pagamento] ?? empresa.pagamento}</Selo>
            <Selo>Entrega {cfg.incoterm}</Selo>
          </div>
        </div>
        {/* Navegação por abas */}
        <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6">
          {(
            [
              ["comprar", "Comprar"],
              [
                "cotizaciones",
                `Mis cotizaciones${cotacoes?.length ? ` (${cotacoes.length})` : ""}`,
              ],
              ["empresa", "Mi empresa"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition",
                tab === k
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
        {abertas.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-sm text-emerald-900">
              <b>
                {abertas.length === 1
                  ? "Tenés una propuesta esperando tu respuesta."
                  : `Tenés ${abertas.length} propuestas esperando tu respuesta.`}
              </b>
            </p>
            <Link
              to="/empresas/cotizacion/$codigo"
              params={{ codigo: abertas[0].codigo }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-700 px-4 text-sm font-bold text-white"
            >
              Ver propuesta <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
        {tab === "comprar" && (
          <>
            <VitrineExportacao minimo={cfg.minimo} adicionar={addCart} />
            <details className="rounded-2xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-700">
                ¿Preferís pegar una lista de códigos? Abrí el modo lista
              </summary>
              <div className="border-t border-slate-100 p-1">
                <Compositor
                  empresa={empresa}
                  cfg={cfg}
                  extras={extras}
                  consumir={() => setExtras([])}
                />
              </div>
            </details>
          </>
        )}
        {tab === "cotizaciones" && (
          <>
            <AnaliseCotacoes cotacoes={cotacoes} />
            <Historico cotacoes={cotacoes} />
          </>
        )}
        {tab === "empresa" && (
          <>
            <PerfilEmpresa empresa={empresa} cfg={cfg} />
            <CartaoDespachante
              nome={empresa.despachante_nome}
              contato={empresa.despachante_contato}
            />
          </>
        )}
      </div>
      <CarritoExport
        itens={cart}
        setQtd={setQtdCart}
        remover={removerCart}
        limpar={() => setCart([])}
        minimo={cfg.minimo}
        incotermInicial={cfg.incoterm}
        destinoInicial={[empresa.cidade, empresa.departamento].filter(Boolean).join(", ")}
        enviando={enviandoCart}
        onEnviar={enviarCart}
      />
    </B2bPagina>
  );
}

type Linha = ItemCotacao & { chave: string };

function Compositor({
  empresa,
  cfg,
  extras,
  consumir,
}: {
  empresa: Empresa;
  cfg: Cfg;
  extras: Array<{ codigo: string; qtd: number }>;
  consumir: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [instantaneo, setInstantaneo] = useState(false);
  const [minimo, setMinimo] = useState(cfg.minimo);
  const [incoterm, setIncoterm] = useState<string>(cfg.incoterm);
  const [destino, setDestino] = useState(
    [empresa.cidade, empresa.departamento].filter(Boolean).join(", "),
  );
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);

  const lidas = useMemo(() => lerLista(texto), [texto]);
  useEffect(() => {
    if (!extras.length) return;
    const novos = extras;
    consumir();
    if (!linhas) {
      setTexto((x) =>
        [x.trim(), ...novos.map((n) => `${n.codigo}\t${n.qtd}`)].filter(Boolean).join("\n"),
      );
      return;
    }
    previaCotacaoFn({ data: { linhas: novos.map((n, k) => ({ linha: 1000 + k, ...n })) } })
      .then((r) =>
        setLinhas((ls) => [
          ...(ls ?? []),
          ...r.itens.map((i, k) => ({
            ...i,
            linha: (ls?.length ?? 0) + k + 1,
            chave: `c${Date.now()}-${k}`,
          })),
        ]),
      )
      .catch((e) => setErro(e.message));
  }, [extras]); // eslint-disable-line react-hooks/exhaustive-deps

  const analisar = async () => {
    setErro("");
    if (!lidas.length) return setErro("Pegá al menos un código.");
    setCarregando(true);
    try {
      const r = await previaCotacaoFn({ data: { linhas: lidas } });
      setInstantaneo(r.instantaneo);
      setMinimo(r.minimo);
      setLinhas(r.itens.map((i, k) => ({ ...i, chave: `${k}-${i.codigo}` })));
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };
  const lerArquivo = (file: File) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      let t = String(leitor.result ?? "");
      // CSV com vírgula: vira ; (lerLista entende tab e ;)
      if (!/[\t;]/.test(t)) t = t.replace(/,/g, ";");
      setTexto((x) => (x.trim() ? `${x.trim()}\n${t}` : t));
    };
    leitor.readAsText(file);
  };
  const enviar = async () => {
    if (!linhas?.length) return;
    setEnviando(true);
    setErro("");
    try {
      const r = await criarCotacaoFn({
        data: {
          linhas: linhas.map((l) => ({
            linha: l.linha,
            codigo: l.codigo,
            qtd: l.qtd,
            descricao: l.descricao,
          })),
          incoterm,
          destino,
          mensagem,
        },
      });
      qc.invalidateQueries({ queryKey: ["b2b-cotacoes"] });
      navigate({ to: "/empresas/cotizacion/$codigo", params: { codigo: r.codigo } });
    } catch (e: any) {
      setErro(e.message);
      setEnviando(false);
    }
  };

  const resumo = useMemo(() => {
    const l = linhas ?? [];
    return {
      itens: l.length,
      achados: l.filter((i) => i.sku).length,
      unidades: l.reduce((s, i) => s + i.qtd, 0),
      peso: Math.round(l.reduce((s, i) => s + i.qtd * (i.peso ?? 0), 0)),
      total: l.reduce((s, i) => s + i.qtd * (i.sugerido ?? 0), 0),
      semPreco: l.filter((i) => i.sugerido == null).length,
    };
  }, [linhas]);

  // Flete estimado (por kg cubado) com base en la tarifa del transportista cargada en el admin.
  const itensFrete = useMemo(
    () => (linhas ?? []).filter((l) => l.qtd > 0).map((l) => ({ codigo: l.codigo, qtd: l.qtd })),
    [linhas],
  );
  const { data: frete } = useQuery({
    queryKey: ["b2b-frete", itensFrete],
    queryFn: () => estimarFreteFn({ data: { itens: itensFrete } }),
    enabled: itensFrete.length > 0,
  });
  const fmtFrete = (v: number) => (frete?.tarifa.moeda === "BRL" ? `R$ ${v.toFixed(2)}` : usd(v));

  // Desconto por volume (configurável no admin)
  const { data: desc } = useQuery({
    queryKey: ["b2b-descontos"],
    queryFn: () => configDescontosPortalFn(),
    staleTime: 10 * 60_000,
  });
  const descAtivo = !!desc?.ativo;
  const qtdDesc = desc?.base === "UNIDADES" ? resumo.unidades : resumo.itens;
  const unidadeDesc = desc?.base === "UNIDADES" ? "unidades" : "ítems";
  const volumePct = descAtivo ? descontoVolume(qtdDesc, desc!.faixas) : 0;
  const prox = descAtivo ? proximaFaixa(qtdDesc, desc?.faixas ?? []) : null;

  return (
    <section
      id="nueva-cotizacion"
      className="scroll-mt-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-bold">Nueva cotización</h2>
          <p className="text-sm text-slate-500">
            {linhas
              ? "Revisá cada pieza, ajustá cantidades y enviá."
              : "Pegá la lista como la tengas: columnas de Excel, pedido de WhatsApp o códigos sueltos."}
          </p>
        </div>
        <ol className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          {["Lista", "Revisión", "Enviada"].map((p, k) => (
            <li key={p} className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full",
                  (k === 0 && !linhas) || (k === 1 && linhas)
                    ? "bg-slate-950 text-white"
                    : k === 0 && linhas
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100",
                )}
              >
                {k === 0 && linhas ? <Check className="h-3.5 w-3.5" /> : k + 1}
              </span>
              <span className="hidden sm:inline">{p}</span>
              {k < 2 && <span className="h-px w-5 bg-slate-200" />}
            </li>
          ))}
        </ol>
      </div>

      {!linhas ? (
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
          <div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) lerArquivo(f);
              }}
              rows={12}
              placeholder={"84221215\t40\n84228488\t20\n84330073 x30\n…"}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-relaxed outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={analisar}
                disabled={carregando || !lidas.length}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {carregando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageSearch className="h-4 w-4" />
                )}
                Analizar {lidas.length ? `${lidas.length} línea(s)` : "lista"}
              </button>
              <button
                onClick={() => arquivo.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 px-5 text-sm font-semibold hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" /> Subir CSV
              </button>
              <input
                ref={arquivo}
                type="file"
                accept=".csv,.txt,.tsv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) lerArquivo(f);
                  e.target.value = "";
                }}
              />
            </div>
            {erro && <p className="mt-3 text-sm font-medium text-rose-600">{erro}</p>}
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-bold text-slate-900">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Formatos que entendemos
            </p>
            <ul className="mt-3 space-y-2 font-mono text-xs">
              <li>84221215 ⇥ 40</li>
              <li>84221215;40</li>
              <li>40x 84221215</li>
              <li>84221215 x40</li>
              <li>84221215 (sin cantidad = {cfg.minimo})</li>
            </ul>
            <p className="mt-4 text-xs">
              Desde Excel: seleccioná las columnas de código y cantidad, copiá y pegá acá. También
              podés arrastrar un archivo CSV.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Pieza</th>
                  <th className="px-3 py-3 text-right">Cantidad</th>
                  {instantaneo && <th className="px-3 py-3 text-right">Indicativo</th>}
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.map((l) => (
                  <tr key={l.chave} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {l.foto ? (
                          <img
                            src={fotoUrl(l.foto)}
                            alt=""
                            loading="lazy"
                            className="h-11 w-11 shrink-0 rounded-lg border border-slate-100 bg-white object-contain"
                          />
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                            {l.sku ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <PackageSearch className="h-4 w-4" />
                            )}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {l.nome ?? (l.descricao || "Código fuera del catálogo")}
                          </p>
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span className="font-mono">{l.codigo}</span>
                            {l.marca && <span>· {l.marca}</span>}
                            {l.ncm && <span>· NCM {l.ncm}</span>}
                            {!l.sku && <Selo tom="ambar">Lo cotizamos a pedido</Selo>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min={l.minimo ?? minimo}
                        value={l.qtd}
                        onChange={(e) =>
                          setLinhas((ls) =>
                            ls!.map((x) =>
                              x.chave === l.chave
                                ? { ...x, qtd: Math.max(0, Number(e.target.value) || 0) }
                                : x,
                            ),
                          )
                        }
                        onBlur={() =>
                          setLinhas((ls) =>
                            ls!.map((x) =>
                              x.chave === l.chave && x.qtd < (x.minimo ?? minimo)
                                ? { ...x, qtd: x.minimo ?? minimo, ajustadaMinimo: true }
                                : x,
                            ),
                          )
                        }
                        className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-right font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      />
                      {l.ajustadaMinimo && (
                        <p className="mt-1 text-[11px] text-amber-700">ajustada al mínimo</p>
                      )}
                    </td>
                    {instantaneo && (
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {l.sugerido != null ? (
                          <>
                            <p className="font-semibold">{usd(l.qtd * l.sugerido)}</p>
                            <p className="text-xs text-slate-500">{usd(l.sugerido)} c/u</p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">en la propuesta</span>
                        )}
                      </td>
                    )}
                    <td className="px-2 py-3">
                      <button
                        aria-label="Quitar"
                        onClick={() => setLinhas((ls) => ls!.filter((x) => x.chave !== l.chave))}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
              <button
                onClick={() => setLinhas(null)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" /> Volver a la lista
              </button>
            </div>
          </div>
          <aside className="space-y-4 border-t border-slate-100 bg-slate-50/70 p-6 lg:border-l lg:border-t-0">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Dado r="Ítems" v={resumo.itens} />
              <Dado r="En catálogo" v={`${resumo.achados}/${resumo.itens}`} />
              <Dado r="Unidades" v={resumo.unidades.toLocaleString("es-UY")} />
              <Dado r="Peso est." v={resumo.peso ? `${resumo.peso} kg` : "—"} />
            </dl>
            {descAtivo && (volumePct > 0 || prox) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                {volumePct > 0 && (
                  <p className="text-sm font-extrabold text-amber-800">
                    ¡{volumePct}% OFF por volumen!
                  </p>
                )}
                {prox && (
                  <>
                    <p className="mt-0.5 text-[11px] text-amber-800/90">
                      Agregá <b>{prox.min_itens - qtdDesc}</b> {unidadeDesc} más y llegás a{" "}
                      <b>{prox.pct}% OFF</b>
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min(100, (qtdDesc / prox.min_itens) * 100)}%` }}
                      />
                    </div>
                  </>
                )}
                {instantaneo && volumePct > 0 && resumo.total > 0 && (
                  <p className="mt-2 text-xs text-amber-900">
                    Total con descuento: <b>{usd(aplicarDesconto(resumo.total, volumePct))}</b>{" "}
                    <span className="text-amber-700/70 line-through">{usd(resumo.total)}</span>
                  </p>
                )}
              </div>
            )}
            {frete?.configurada && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-700">Flete estimado al destino</p>
                <p className="text-2xl font-extrabold tracking-tight text-emerald-900">
                  {fmtFrete(frete.frete)}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-emerald-800/80">
                  Peso cubado ~{frete.pesoCubadoKg.toLocaleString("es-UY")} kg · estimado, se
                  confirma en la propuesta.
                  {frete.semDado > 0 &&
                    ` ${frete.semDado} ítem(s) sin medida todavía no entran en el cálculo.`}
                </p>
              </div>
            )}
            {instantaneo && (
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-xs text-slate-400">Total indicativo</p>
                <p className="text-2xl font-extrabold tracking-tight">{usd(resumo.total)}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  Precio de tu cuenta, sujeto a confirmación en la propuesta.
                  {resumo.semPreco > 0 && ` ${resumo.semPreco} ítem(s) se cotizan aparte.`}
                </p>
              </div>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Entrega</span>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                {Object.entries(INCOTERMS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Destino</span>
              <input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Mensaje (opcional)</span>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                placeholder="Plazo que necesitás, marcas alternativas aceptadas…"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
              />
            </label>
            {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}
            <button
              onClick={enviar}
              disabled={
                enviando || !linhas.length || linhas.some((l) => l.qtd < (l.minimo ?? minimo))
              }
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {enviando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar cotización
            </button>
            <p className="text-center text-xs text-slate-500">
              Respondemos con la propuesta formal en USD.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

const Dado = ({ r, v }: { r: string; v: React.ReactNode }) => (
  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
    <dt className="text-xs text-slate-500">{r}</dt>
    <dd className="text-lg font-bold">{v}</dd>
  </div>
);

// Análise das cotações feitas (KPIs + por estado)
function AnaliseCotacoes({
  cotacoes,
}: {
  cotacoes: Awaited<ReturnType<typeof minhasCotacoesFn>> | undefined;
}) {
  const lista = cotacoes ?? [];
  const aceitas = lista.filter((c) => c.status === "ACEITA");
  const valorAceito = aceitas.reduce((s, c) => s + (c.total || 0), 0);
  const ticket = aceitas.length ? valorAceito / aceitas.length : 0;
  const aguardando = lista.filter((c) => statusVisivel(c) === "COTADA").length;
  const unidades = lista.reduce((s, c) => s + c.itens.reduce((a, i) => a + i.qtd, 0), 0);
  const porEstado = new Map<string, number>();
  for (const c of lista) {
    const e = statusVisivel(c);
    porEstado.set(e, (porEstado.get(e) ?? 0) + 1);
  }
  if (!lista.length)
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Tus cotizaciones y su análisis aparecen acá cuando envíes la primera.
      </div>
    );
  const Kpi = ({ r, v, sub }: { r: string; v: React.ReactNode; sub?: string }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{r}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{v}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          r="Cotizaciones"
          v={lista.length}
          sub={`${unidades.toLocaleString("es-UY")} unidades`}
        />
        <Kpi r="Esperando respuesta" v={aguardando} />
        <Kpi r="Aceptadas" v={aceitas.length} sub={`${usd(valorAceito)} en total`} />
        <Kpi r="Ticket promedio" v={aceitas.length ? usd(ticket) : "—"} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Por estado
        </p>
        <div className="space-y-1.5">
          {[...porEstado.entries()].map(([e, n]) => (
            <div key={e} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 text-slate-600">
                {STATUS_COTACAO_ES[e as keyof typeof STATUS_COTACAO_ES] ?? e}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(n / lista.length) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right font-semibold">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Perfil da empresa (dados + condições comerciais)
function PerfilEmpresa({ empresa, cfg }: { empresa: Empresa; cfg: Cfg }) {
  const e: any = empresa;
  const Campo = ({ r, v }: { r: string; v: React.ReactNode }) => (
    <div className="border-b border-slate-100 py-2">
      <dt className="text-xs text-slate-500">{r}</dt>
      <dd className="font-medium">{v || "—"}</dd>
    </div>
  );
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-2 flex items-center gap-2 font-bold">
          <Building2 className="h-5 w-5 text-emerald-600" /> Datos de la empresa
        </h3>
        <dl>
          <Campo r="Razón social" v={e.razao_social} />
          <Campo r="RUT" v={formatarRut(e.rut)} />
          <Campo r="Contacto" v={e.contato_nome} />
          <Campo r="E-mail" v={e.email} />
          <Campo r="Teléfono" v={e.telefone} />
          <Campo
            r="Dirección"
            v={[e.endereco, e.cidade, e.departamento, "Uruguay"].filter(Boolean).join(", ")}
          />
        </dl>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-2 flex items-center gap-2 font-bold">
          <BadgeCheck className="h-5 w-5 text-emerald-600" /> Condiciones comerciales
        </h3>
        <dl>
          <Campo r="Mínimo por ítem" v={`${cfg.minimo} u.`} />
          <Campo
            r="Descuento de tu cuenta"
            v={e.desconto_pct ? `${e.desconto_pct}%` : "estándar"}
          />
          <Campo r="Forma de pago" v={PAGAMENTOS[empresa.pagamento] ?? empresa.pagamento} />
          <Campo r="Entrega (Incoterm)" v={cfg.incoterm} />
          <Campo r="Despachante" v={e.despachante_nome} />
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Para actualizar datos o condiciones, escribinos por WhatsApp o respondé el e-mail de tu
          cuenta.
        </p>
      </div>
    </div>
  );
}

function Historico({
  cotacoes,
}: {
  cotacoes: Awaited<ReturnType<typeof minhasCotacoesFn>> | undefined;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Mis cotizaciones</h2>
      </div>
      {!cotacoes ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      ) : !cotacoes.length ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          <Plus className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2">Tu primera cotización aparece acá.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {cotacoes.map((c) => {
              const st = statusVisivel(c);
              return (
                <li key={c.codigo}>
                  <Link
                    to="/empresas/cotizacion/$codigo"
                    params={{ codigo: c.codigo }}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="min-w-[120px]">
                      <p className="font-mono font-bold">{c.codigo}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.created_at).toLocaleDateString("es-UY")}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {c.itens.length} ítems · {c.itens.reduce((s, i) => s + i.qtd, 0)} u.
                    </p>
                    <div className="ml-auto flex items-center gap-4">
                      <p className="text-right text-sm font-bold">
                        {c.status !== "ENVIADA" ? usd(c.total) : ""}
                      </p>
                      <Selo tom={tomStatus(st)}>{STATUS_COTACAO_ES[st]}</Selo>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        ¿Dudas con una cotización? Respondé el e-mail de la propuesta o escribinos por WhatsApp.
      </p>
    </section>
  );
}
