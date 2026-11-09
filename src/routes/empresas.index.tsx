// AGRO PARTS Mayorista (/empresas): página de apresentação para empresas do Uruguai que compram por
// volume (repuesteras, talleres, cooperativas). Em espanhol. A seção "Probá con tu lista" confere a
// lista colada contra o catálogo de verdade (sem preços) e leva ao cadastro.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Building2,
  Check,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Globe2,
  Loader2,
  PackageCheck,
  Repeat,
  ScanSearch,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { B2bHeader } from "@/components/b2b/B2bLayout";
import { numerosB2bFn } from "@/lib/b2b";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/empresas/")({
  loader: () => numerosB2bFn(),
  head: () => {
    const titulo = "AGRO PARTS Mayorista: repuestos agrícolas por volumen para empresas de Uruguay";
    const desc =
      "Precios de distribuidor para casas de repuestos, talleres y cooperativas. Cotizá tu lista en minutos y recibí la propuesta en USD con NCM, origen y proforma. Despacho directo desde Brasil.";
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/empresas` }],
    };
  },
  component: PaginaEmpresas,
});

const EXEMPLO = `84221215	40
84228488	20
84330073 x30
504047548
RE504836 25`;

function PaginaEmpresas() {
  const n = Route.useLoaderData();
  return (
    <div className="bg-white text-slate-900">
      <div className="relative overflow-hidden bg-slate-950 text-white">
        <FundoTecnico />
        <B2bHeader escuro />
        <Hero pecas={n.pecas} minimo={n.minimo} />
      </div>
      <Numeros pecas={n.pecas} minimo={n.minimo} />
      <Probar />
      <ComoFunciona />
      <Diferenciais />
      <ParaQuem />
      <Perguntas minimo={n.minimo} prazo={n.prazo} />
      <Chamada />
    </div>
  );
}

function FundoTecnico() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 70% 30%, black 20%, transparent 75%)",
        }}
      />
      <div className="absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full bg-emerald-500/25 blur-[120px]" />
      <div className="absolute bottom-[-30%] left-[-10%] h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-[120px]" />
    </div>
  );
}

function Hero({ pecas, minimo }: { pecas: number; minimo: number }) {
  return (
    <section className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-20">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold tracking-[0.18em] text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          CANAL MAYORISTA · URUGUAY
        </p>
        <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.6rem]">
          Repuestos agrícolas por volumen,{" "}
          <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-lime-300 bg-clip-text text-transparent">
            directo desde Brasil
          </span>{" "}
          a tu depósito.
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-300">
          Precios de distribuidor para casas de repuestos, talleres y cooperativas. Pegá tu lista, y
          recibí una propuesta formal en dólares con NCM, origen y proforma lista para tu
          despachante.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/empresas/registro"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-500 px-6 text-base font-bold text-slate-950 shadow-[0_10px_40px_-10px_rgba(16,185,129,.9)] transition hover:bg-emerald-400"
          >
            Registrar mi empresa <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#probar"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-base font-semibold text-white transition hover:bg-white/10"
          >
            <ScanSearch className="h-5 w-5" /> Probar con mi lista
          </a>
        </div>
        <ul className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-300">
          {[
            `+${pecas.toLocaleString("es-UY")} piezas en catálogo`,
            `Mínimo ${minimo} unidades por ítem`,
            "Propuesta en USD con validez",
            "Despacho por Chuy y Río Branco",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-400" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <Rota />
    </section>
  );
}

// Visual do hero: a rota Brasil → fronteira → Uruguai com o caminhão andando e a proposta pronta
function Rota() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:mt-4">
      <div className="relative rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl ring-1 ring-white/5 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">EMBARQUE · CARGA CONSOLIDADA</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> en ruta
          </span>
        </div>
        <svg
          viewBox="0 0 500 260"
          className="mt-3 w-full"
          role="img"
          aria-label="Ruta Brasil a Uruguay"
        >
          <defs>
            <linearGradient id="trilha" x1="0" x2="1">
              <stop offset="0" stopColor="#34d399" />
              <stop offset="1" stopColor="#a3e635" />
            </linearGradient>
          </defs>
          <path
            id="rota-b2b"
            d="M60 60 C 170 40, 210 150, 260 150 S 380 210, 440 200"
            fill="none"
            stroke="rgba(255,255,255,.12)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M60 60 C 170 40, 210 150, 260 150 S 380 210, 440 200"
            fill="none"
            stroke="url(#trilha)"
            strokeWidth="3"
            strokeDasharray="6 10"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="160"
              to="0"
              dur="4s"
              repeatCount="indefinite"
            />
          </path>
          {[
            [60, 60, "Depósito · RS, Brasil"],
            [260, 150, "Frontera · Chuy"],
            [440, 200, "Tu depósito · Uruguay"],
          ].map(([x, y, t], i) => (
            <g key={i}>
              <circle cx={x as number} cy={y as number} r="16" fill="rgba(16,185,129,.15)" />
              <circle cx={x as number} cy={y as number} r="6" fill="#34d399" />
              <text
                x={x as number}
                y={(y as number) + (i === 0 ? -26 : 34)}
                textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                fill="#cbd5e1"
                fontSize="13"
                fontWeight="600"
              >
                {t}
              </text>
            </g>
          ))}
          <g>
            <rect x="-14" y="-9" width="28" height="18" rx="4" fill="#fff" />
            <rect x="-10" y="-5" width="13" height="10" rx="1.5" fill="#0f172a" />
            <animateMotion dur="8s" repeatCount="indefinite" rotate="auto">
              <mpath href="#rota-b2b" />
            </animateMotion>
          </g>
        </svg>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
          <div className="rounded-xl bg-white/[0.04] p-2">
            <p className="text-base font-bold text-white">48</p>ítems
          </div>
          <div className="rounded-xl bg-white/[0.04] p-2">
            <p className="text-base font-bold text-white">1.260</p>unidades
          </div>
          <div className="rounded-xl bg-white/[0.04] p-2">
            <p className="text-base font-bold text-white">DAP</p>Montevideo
          </div>
        </div>
      </div>
      {/* Proposta pronta (ilustração) */}
      <div className="absolute -bottom-8 -left-4 w-64 rounded-2xl border border-white/10 bg-white p-4 text-slate-900 shadow-2xl sm:-left-10">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <FileText className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-bold">Propuesta M-7KQ2PD</p>
            <p className="text-[11px] text-slate-500">Lista para aceptar</p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Origen Mercosur</span>
            <span className="font-semibold text-emerald-700">41 de 48 ítems</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Validez</span>
            <span className="font-semibold">15 días</span>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 -top-6 hidden rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-xs text-slate-300 shadow-xl backdrop-blur sm:block">
        <p className="flex items-center gap-1.5 font-semibold text-white">
          <BadgeCheck className="h-4 w-4 text-emerald-400" /> RUT verificado
        </p>
        <p className="mt-0.5">Cuenta mayorista habilitada</p>
      </div>
    </div>
  );
}

function Numeros({ pecas, minimo }: { pecas: number; minimo: number }) {
  const itens = [
    [
      `+${pecas.toLocaleString("es-UY")}`,
      "piezas en el catálogo, buscables por código del fabricante",
    ],
    [`${minimo} u.`, "mínimo por ítem: precios de distribuidor desde la primera caja"],
    ["USD", "propuesta formal en dólares, con validez y proforma"],
    ["1 lista", "pegada desde Excel o WhatsApp: el sistema identifica cada código"],
  ];
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 lg:grid-cols-4">
        {itens.map(([n, t]) => (
          <div key={t} className="bg-white px-6 py-10">
            <p className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{n}</p>
            <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-slate-600">{t}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

type Achado = {
  linha: number;
  codigo: string;
  qtd: number | null;
  achou: boolean;
  nome: string | null;
  marca: string | null;
  foto: string | null;
};

function Probar() {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState<{ itens: Achado[]; achados: number } | null>(null);
  const conferir = async () => {
    setCarregando(true);
    setErro("");
    try {
      const r = await fetch("/api/public/empresas-lista", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: texto || EXEMPLO }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No pudimos verificar la lista.");
      if (!texto) setTexto(EXEMPLO);
      setRes(j);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };
  const pct = res ? Math.round((res.achados / Math.max(1, res.itens.length)) * 100) : 0;
  return (
    <section id="probar" className="scroll-mt-20 bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-[0.18em] text-emerald-700">PROBALO AHORA</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Pegá tu lista y mirá qué tenemos.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Copiá las columnas de Excel (código y cantidad), un pedido de WhatsApp o escribí los
            códigos. Verificamos cada uno contra el catálogo en segundos. Los precios por volumen se
            ven al registrar la empresa.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Tu lista
            </div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={EXEMPLO}
              rows={10}
              className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-relaxed outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={conferir}
                disabled={carregando}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {carregando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanSearch className="h-4 w-4" />
                )}
                {texto ? "Verificar en el catálogo" : "Probar con un ejemplo"}
              </button>
              <span className="text-xs text-slate-500">Hasta 60 líneas · sin registro</span>
            </div>
            {erro && <p className="mt-3 text-sm font-medium text-rose-600">{erro}</p>}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {!res ? (
              <div className="grid h-full min-h-[320px] place-items-center text-center text-slate-500">
                <div>
                  <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 max-w-xs text-sm">
                    El resultado aparece acá: cada código con la pieza identificada en el catálogo.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Encontramos en el catálogo</p>
                    <p className="text-3xl font-extrabold tracking-tight">
                      {res.achados} de {res.itens.length}{" "}
                      <span className="text-base font-semibold text-slate-500">códigos</span>
                    </p>
                  </div>
                  <div className="w-40">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-slate-500">{pct}% identificados</p>
                  </div>
                </div>
                <ul className="mt-4 max-h-[300px] divide-y divide-slate-100 overflow-y-auto">
                  {res.itens.map((i) => (
                    <li key={i.linha} className="flex items-center gap-3 py-2.5">
                      {i.achou && i.foto ? (
                        <img
                          src={i.foto}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 rounded-lg border border-slate-100 bg-white object-contain"
                        />
                      ) : (
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${i.achou ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                        >
                          {i.achou ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {i.achou ? i.nome : "Lo cotizamos a pedido"}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-500">
                          {i.codigo}
                          {i.marca ? ` · ${i.marca}` : ""}
                        </p>
                      </div>
                      {i.qtd != null && (
                        <span className="text-xs font-semibold text-slate-500">{i.qtd} u.</span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 p-4 text-white">
                  <p className="text-sm">
                    <b>¿Querés los precios por volumen?</b>{" "}
                    <span className="text-slate-300">Registrá la empresa y enviá esta lista.</span>
                  </p>
                  <Link
                    to="/empresas/registro"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-500 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    Registrar empresa <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const passos = [
    {
      i: Building2,
      t: "Registrá tu empresa",
      d: "Razón social y RUT (lo validamos al instante). Revisamos la cuenta y la habilitamos con tus condiciones.",
    },
    {
      i: FileSpreadsheet,
      t: "Enviá tu lista",
      d: "Pegá desde Excel, subí un CSV o escribí los códigos. El sistema identifica cada pieza y ajusta al mínimo por ítem.",
    },
    {
      i: FileText,
      t: "Recibí la propuesta",
      d: "Precio por unidad en USD, NCM, origen, peso estimado, plazo y validez. Con proforma para tu despachante.",
    },
    {
      i: Truck,
      t: "Confirmá y despachamos",
      d: "Aceptás en un clic. Preparamos la carga en Brasil y la enviamos por la frontera con la documentación.",
    },
  ];
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-bold tracking-[0.18em] text-emerald-700">CÓMO FUNCIONA</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          De la lista a la carga, sin planillas de ida y vuelta.
        </h2>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
          <div
            aria-hidden
            className="absolute left-6 right-6 top-6 hidden h-px bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200 md:block"
          />
          {passos.map((p, k) => (
            <li key={p.t} className="relative">
              <span className="relative z-10 grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg ring-8 ring-white">
                <p.i className="h-5 w-5" />
              </span>
              <p className="mt-5 font-mono text-xs font-bold text-emerald-700">0{k + 1}</p>
              <h3 className="mt-1 text-lg font-bold">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Diferenciais() {
  const itens = [
    {
      i: Globe2,
      t: "Origen Mercosur documentado",
      d: "Para las piezas que cumplen las reglas de origen emitimos el certificado de origen, que permite solicitar la preferencia arancelaria del Mercosur. Cada ítem de la propuesta indica su origen y NCM.",
      grande: true,
    },
    {
      i: FileText,
      t: "Proforma profesional",
      d: "Documento con NCM, origen, Incoterm, peso y condiciones de pago, listo para tu despachante y tu banco.",
    },
    {
      i: Boxes,
      t: "Precio por volumen",
      d: "Cada empresa tiene su nivel de precio. Cuanto más comprás, mejor la condición.",
    },
    {
      i: Repeat,
      t: "Recompra en un clic",
      d: "Historial de cotizaciones en el portal. Repetí una lista o pedí la actualización de una propuesta vencida.",
    },
    {
      i: PackageCheck,
      t: "Lo que no está, lo buscamos",
      d: "Los códigos que no están en el catálogo quedan en la cotización y los conseguimos con nuestros proveedores.",
    },
    {
      i: ShieldCheck,
      t: "Cuenta verificada",
      d: "Solo empresas con RUT válido y aprobadas por nuestro equipo ven los precios mayoristas.",
    },
  ];
  return (
    <section className="bg-slate-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-bold tracking-[0.18em] text-emerald-300">POR QUÉ AGRO PARTS</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Pensado para quien compra para revender.
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {itens.map((x) => (
            <div
              key={x.t}
              className={`group rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-emerald-400/40 hover:bg-white/[0.06] ${x.grande ? "md:col-span-2 md:row-span-1" : ""}`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <x.i className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold">{x.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ParaQuem() {
  const tipos = [
    [Wrench, "Casas de repuestos", "Stock de reposición con margen para revender."],
    [Building2, "Cooperativas y gremiales", "Compras conjuntas para los socios."],
    [Truck, "Contratistas", "Repuestos para la flota antes de la zafra."],
    [Boxes, "Concesionarios y talleres", "Piezas de alta rotación por caja."],
  ] as const;
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-emerald-700">PARA QUIÉN</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Empresas de Uruguay que compran por caja.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Si vendés o usás repuestos para tractores, cosechadoras e implementos, la cuenta
              mayorista es para vos.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {tipos.map(([I, t, d]) => (
              <div key={t} className="rounded-3xl border border-slate-200 p-6">
                <I className="h-6 w-6 text-emerald-600" />
                <h3 className="mt-4 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Perguntas({ minimo, prazo }: { minimo: number; prazo: string }) {
  const faq = [
    [
      "¿Cuál es el pedido mínimo?",
      `${minimo} unidades por ítem. Si pedís menos, el sistema ajusta la cantidad al mínimo y te lo muestra antes de enviar.`,
    ],
    [
      "¿En qué moneda son los precios?",
      "En dólares estadounidenses (USD). La propuesta indica el precio por unidad, el total, el Incoterm y la validez.",
    ],
    [
      "¿Las piezas pagan arancel al entrar a Uruguay?",
      "Las piezas que cumplen las reglas de origen del Mercosur pueden acceder a la preferencia arancelaria con el certificado de origen, que emitimos cuando corresponde. El IVA y las tasas de importación de Uruguay siguen aplicando. Recomendamos confirmar cada NCM con tu despachante de aduana.",
    ],
    [
      "¿Cómo se entrega?",
      "Por defecto DAP: puesto en tu depósito en Uruguay, con el despacho de importación a cargo de tu despachante. También podemos cotizar CPT (hasta la frontera) o FCA (retiro en Brasil).",
    ],
    ["¿Cuánto tarda?", `${prazo.charAt(0).toUpperCase()}${prazo.slice(1)}.`],
    [
      "¿Cómo se paga?",
      "Para la primera compra, por adelantado por transferencia. Con historial, podemos acordar condiciones según la empresa.",
    ],
  ];
  return (
    <section id="preguntas" className="scroll-mt-20 bg-slate-50 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-center text-sm font-bold tracking-[0.18em] text-emerald-700">
          PREGUNTAS FRECUENTES
        </p>
        <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          Lo que nos preguntan las empresas
        </h2>
        <div className="mt-10 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
          {faq.map(([p, r]) => (
            <details key={p} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {p}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chamada() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-slate-950 px-6 py-14 text-white sm:px-14">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-emerald-500/30 blur-[100px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Tu próxima carga empieza con una lista.
            </h2>
            <p className="mt-3 text-lg text-slate-300">
              Registrá la empresa hoy. La revisión es rápida y te avisamos por e-mail.
            </p>
          </div>
          <Link
            to="/empresas/registro"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-500 px-7 text-base font-bold text-slate-950 hover:bg-emerald-400"
          >
            Registrar mi empresa <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
