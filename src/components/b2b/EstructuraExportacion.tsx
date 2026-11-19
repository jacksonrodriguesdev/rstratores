// "Estructura de exportación": muestra la logística real de AGRO PARTS hacia Uruguay — fronteras,
// etapas del despacho y sellos de confianza. Reutiliza ETAPAS y PONTOS_FRONTEIRA del módulo de aduana.
import { Link } from "@tanstack/react-router";
import {
  Globe2,
  ShieldCheck,
  FileCheck2,
  MapPin,
  Truck,
  BadgeCheck,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { ETAPAS, PONTOS_FRONTEIRA } from "@/lib/aduana/aduana-comum";

const SELOS = [
  {
    icon: Globe2,
    t: "Origen Mercosur",
    d: "Preferencia arancelaria ACE 02/18 — 0% de arancel en las piezas con origen comprobado.",
  },
  {
    icon: FileCheck2,
    t: "NCM verificada",
    d: "Cada pieza con su clasificación fiscal, para un despacho sin sorpresas.",
  },
  {
    icon: Boxes,
    t: "Cubaje y flete claros",
    d: "Peso cubicado y flete estimado antes de comprar — sin costos escondidos.",
  },
  {
    icon: ShieldCheck,
    t: "Proforma y packing list",
    d: "Documentos listos para tu despachante y la DUA en el sistema LUCIA.",
  },
];

export function EstructuraExportacion() {
  // Só as etapas visíveis ao cliente, na ordem do trâmite
  const etapas = ETAPAS.filter((e) => e.cliente);
  return (
    <section id="estructura" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-700">
            <Truck className="h-4 w-4" /> Estructura de exportación
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Exportamos a todo Uruguay, con todo en regla
          </h2>
          <p className="mt-3 text-slate-600">
            No somos un intermediario: despachamos directo desde Rio Grande do Sul, con origen
            Mercosur, documentación completa y entrega hasta tu local.
          </p>
        </div>

        {/* Selos de confiança */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SELOS.map((s) => (
            <div key={s.t} className="rounded-2xl border border-slate-200 bg-white p-5">
              <s.icon className="h-7 w-7 text-emerald-600" />
              <p className="mt-2 font-bold">{s.t}</p>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Fronteiras de entrada */}
        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="flex items-center gap-2 font-bold">
            <MapPin className="h-5 w-5 text-emerald-600" /> Entramos por la frontera más cercana a
            vos
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.values(PONTOS_FRONTEIRA).map((p) => (
              <span
                key={p}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Etapas do despacho */}
        <div className="mt-12">
          <p className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-slate-500">
            Cómo llega tu pedido
          </p>
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {etapas.map((e, i) => (
              <li
                key={e.id}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold leading-snug">{e.es}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{e.base}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/empresas/registro"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-600 px-7 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            Quiero importar con ustedes <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/empresas/portal"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-300 px-7 font-semibold text-slate-700 hover:bg-white"
          >
            <BadgeCheck className="h-5 w-5" /> Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}
