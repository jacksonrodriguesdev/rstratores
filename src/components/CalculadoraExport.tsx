// Calculadora pública de costo desembarcado (Brasil → Uruguay). Página interactiva:
// el usuario carga códigos + cantidad (+ precio USD opcional), y estimamos peso cubado, flete y,
// si hay precios, el costo final con impuestos (arancel 0% Mercosur). Captura el lead en el CRM.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Calculator,
  MessageCircle,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Package,
  Info,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { simularCostoFn, guardarLeadFn, type ResultadoCalculo } from "@/lib/calculadora-export";
import { ciudadesPorDepartamento } from "@/lib/seo-exportacion";

type Fila = { codigo: string; qty: string; precio: string };
const DEPARTAMENTOS = ciudadesPorDepartamento().map((d) => d.departamento);
const usd = (n: number) => `US$ ${n.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
const kg = (n: number | null) =>
  n == null ? "—" : `${n.toLocaleString("es-UY", { maximumFractionDigits: 2 })} kg`;

function FondoHero() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/export/hero-frontera.webp')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#06321b]/95 via-[#06321b]/85 to-[#06321b]/65" />
    </div>
  );
}

export function CalculadoraExport() {
  const [filas, setFilas] = useState<Fila[]>([{ codigo: "", qty: "1", precio: "" }]);
  const [res, setRes] = useState<ResultadoCalculo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // lead
  const [lead, setLead] = useState({
    contacto: "",
    empresa: "",
    telefono: "",
    email: "",
    departamento: "",
  });
  const [leadOk, setLeadOk] = useState(false);
  const [leadErr, setLeadErr] = useState<string | null>(null);
  const [leadEnviando, setLeadEnviando] = useState(false);

  const setFila = (i: number, k: keyof Fila, v: string) =>
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addFila = () => setFilas((f) => [...f, { codigo: "", qty: "1", precio: "" }]);
  const delFila = (i: number) => setFilas((f) => (f.length > 1 ? f.filter((_, j) => j !== i) : f));

  async function calcular() {
    setError(null);
    const items = filas
      .filter((f) => f.codigo.trim().length >= 2)
      .map((f) => ({
        codigo: f.codigo.trim(),
        qty: Math.max(1, parseInt(f.qty) || 1),
        precioUsd: f.precio.trim() ? Math.max(0, parseFloat(f.precio.replace(",", "."))) : null,
      }));
    if (!items.length) {
      setError("Cargá al menos un código de pieza.");
      return;
    }
    setCargando(true);
    try {
      const r = await simularCostoFn({ data: { items } });
      setRes(r);
      if (r.encontrados === 0)
        setError(
          "No encontramos esos códigos en nuestra base. Revisá el código o pedí la cotización por WhatsApp.",
        );
    } catch {
      setError("No pudimos calcular ahora. Probá de nuevo o escribinos por WhatsApp.");
    } finally {
      setCargando(false);
    }
  }

  const resumenTexto = () => {
    if (!res) return "";
    const lineas = res.items
      .filter((i) => i.encontrado)
      .map((i) => `• ${i.codigo} x${i.qty}${i.precioUsd ? ` (US$${i.precioUsd})` : ""}`);
    const tot = `Peso cubado: ${res.pesoCubadoKg} kg${res.costo ? ` · Costo estimado: ${usd(res.costo.total)}` : ""}`;
    return `Simulación de importación:\n${lineas.join("\n")}\n${tot}`;
  };

  const wa = whatsappContactUrl(
    res
      ? `¡Hola! Usé la calculadora de importación.\n${resumenTexto()}\nQuiero avanzar con la proforma.`
      : "¡Hola! Quiero calcular el costo de importar repuestos a Uruguay.",
  );

  async function enviarLead() {
    setLeadErr(null);
    if (!lead.empresa.trim() && !lead.contacto.trim()) {
      setLeadErr("Decinos tu nombre o el de la empresa.");
      return;
    }
    if (!lead.telefono.trim() && !lead.email.trim()) {
      setLeadErr("Dejá un WhatsApp o email para enviarte la proforma.");
      return;
    }
    setLeadEnviando(true);
    try {
      await guardarLeadFn({
        data: {
          contacto: lead.contacto,
          empresa: lead.empresa,
          telefono: lead.telefono,
          email: lead.email,
          departamento: lead.departamento,
          resumen: resumenTexto(),
        },
      });
      setLeadOk(true);
    } catch {
      setLeadErr("No pudimos guardar tus datos. Escribinos por WhatsApp.");
    } finally {
      setLeadEnviando(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#06321b] text-white">
          <FondoHero />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
          />
          <div className="relative mx-auto max-w-5xl px-4 py-10 md:py-14">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-white/70">
              <Link to="/" className="hover:text-white">
                Inicio
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/exportacion" className="hover:text-white">
                Exportación
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">Calculadora</span>
            </nav>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">
              Calculá tu costo de importación a Uruguay
            </h1>
            <p className="mt-4 max-w-2xl text-white/85 md:text-lg">
              Cargá los códigos de las piezas y te estimamos el peso cubado, el flete y el costo
              desembarcado con impuestos. Origen Mercosur = 0% de arancel. Te armamos la proforma
              exacta después.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:py-12 lg:grid-cols-[1.3fr_1fr]">
          {/* Entrada */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-zinc-900">
              <Package className="h-5 w-5 text-emerald-600" /> Tus piezas
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Código original de la pieza + cantidad. El precio (US$) es opcional: con él calculamos
              también los impuestos.
            </p>

            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-[1fr_64px_92px_36px] gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <span>Código</span>
                <span>Cant.</span>
                <span>US$ c/u</span>
                <span />
              </div>
              {filas.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_64px_92px_36px] gap-2">
                  <input
                    className={inputCls}
                    placeholder="Ej: RE504836"
                    value={f.codigo}
                    onChange={(e) => setFila(i, "codigo", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    type="number"
                    min="1"
                    value={f.qty}
                    onChange={(e) => setFila(i, "qty", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    value={f.precio}
                    onChange={(e) => setFila(i, "precio", e.target.value)}
                  />
                  <button
                    onClick={() => delFila(i)}
                    aria-label="Quitar"
                    className="grid place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addFila}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:underline"
            >
              <Plus className="h-4 w-4" /> Agregar pieza
            </button>

            <button
              onClick={calcular}
              disabled={cargando}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {cargando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Calculator className="h-5 w-5" />
              )}
              Calcular costo
            </button>
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Estimación referencial a partir de
              nuestra base de peso y medidas. El costo oficial sale en la proforma.
            </p>
          </section>

          {/* Resultado */}
          <section className="space-y-4">
            {res ? (
              <>
                <div className="rounded-3xl bg-[#06321b] p-5 text-white shadow-sm md:p-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                    {res.costo ? "Costo desembarcado estimado" : "Logística estimada"}
                  </p>
                  {res.costo ? (
                    <>
                      <p className="mt-1 text-3xl font-extrabold text-amber-300">
                        {usd(res.costo.total)}
                      </p>
                      {res.costo.economiaMercosul > 0 && (
                        <p className="mt-1 text-sm text-emerald-200">
                          Ahorrás {usd(res.costo.economiaMercosul)} por el origen Mercosur (0%
                          arancel).
                        </p>
                      )}
                      <dl className="mt-4 space-y-1.5 text-sm">
                        {[
                          ["FOB (piezas)", res.costo.fob],
                          ["Flete", res.costo.flete],
                          ["Seguro", res.costo.seguro],
                          ["Arancel", res.costo.arancel],
                          [`Tasa consular (${res.taxas.tasaConsular}%)`, res.costo.tasaConsular],
                          [`IVA (${res.taxas.iva}%)`, res.costo.iva],
                          ["Despachante (est.)", res.costo.despachante],
                        ].map(([l, v]) => (
                          <div key={l as string} className="flex justify-between text-white/85">
                            <dt>{l}</dt>
                            <dd>{usd(v as number)}</dd>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-white/15 pt-2 font-bold">
                          <dt>Total con IVA</dt>
                          <dd className="text-amber-300">{usd(res.costo.total)}</dd>
                        </div>
                        <div className="flex justify-between text-white/70">
                          <dt>Total sin IVA (crédito fiscal)</dt>
                          <dd>{usd(res.costo.totalSemIva)}</dd>
                        </div>
                      </dl>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-white/85">
                      Cargá el precio (US$) de cada pieza para ver el costo con impuestos. Mientras
                      tanto, esta es tu logística:
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-center">
                    <div>
                      <div className="text-lg font-extrabold text-amber-300">
                        {kg(res.pesoRealKg)}
                      </div>
                      <div className="text-[11px] text-white/60">Peso real</div>
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-amber-300">
                        {kg(res.pesoCubadoKg)}
                      </div>
                      <div className="text-[11px] text-white/60">Peso cubado</div>
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-amber-300">
                        {res.flete.configurado ? usd(res.flete.estimado) : "A cotizar"}
                      </div>
                      <div className="text-[11px] text-white/60">Flete</div>
                    </div>
                  </div>
                  {res.sinDato > 0 && (
                    <p className="mt-3 text-xs text-amber-200/90">
                      {res.sinDato} pieza(s) sin medida en la base: las cotizamos aparte.
                    </p>
                  )}
                </div>

                {/* Detalle por ítem */}
                <details className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
                  <summary className="cursor-pointer font-bold text-zinc-800">
                    Ver detalle por pieza
                  </summary>
                  <div className="mt-3 space-y-2">
                    {res.items.map((i, k) => (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-800">
                            {i.codigo} <span className="text-zinc-400">×{i.qty}</span>
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            {i.encontrado
                              ? `${kg(i.peso_cubado_kg)} cubado${i.ncmFmt ? ` · NCM ${i.ncmFmt}` : ""}`
                              : "sin dato en la base"}
                          </p>
                        </div>
                        {i.encontrado && i.acordo && (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            {i.acordo === "ACE02" ? "ACE 02" : "Mercosur"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </details>

                {/* Lead + WhatsApp */}
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                  {leadOk ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-extrabold text-zinc-900">
                          ¡Listo! Te vamos a contactar.
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          Un asesor te arma la proforma exacta. ¿Querés adelantar por WhatsApp?
                        </p>
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 font-bold text-[#06381b] hover:brightness-95"
                        >
                          <MessageCircle className="h-5 w-5" /> Abrir WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-extrabold text-zinc-900">Pedí la proforma exacta</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Te enviamos el costo cerrado y la documentación. Sin compromiso.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          className={inputCls}
                          placeholder="Empresa"
                          value={lead.empresa}
                          onChange={(e) => setLead({ ...lead, empresa: e.target.value })}
                        />
                        <input
                          className={inputCls}
                          placeholder="Tu nombre"
                          value={lead.contacto}
                          onChange={(e) => setLead({ ...lead, contacto: e.target.value })}
                        />
                        <input
                          className={inputCls}
                          placeholder="WhatsApp"
                          value={lead.telefono}
                          onChange={(e) => setLead({ ...lead, telefono: e.target.value })}
                        />
                        <input
                          className={inputCls}
                          placeholder="Email"
                          value={lead.email}
                          onChange={(e) => setLead({ ...lead, email: e.target.value })}
                        />
                        <select
                          className={`${inputCls} sm:col-span-2`}
                          value={lead.departamento}
                          onChange={(e) => setLead({ ...lead, departamento: e.target.value })}
                        >
                          <option value="">Departamento…</option>
                          {DEPARTAMENTOS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      {leadErr && (
                        <p className="mt-2 text-sm font-semibold text-red-600">{leadErr}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={enviarLead}
                          disabled={leadEnviando}
                          className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {leadEnviando && <Loader2 className="h-4 w-4 animate-spin" />} Pedir
                          proforma
                        </button>
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 px-5 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <MessageCircle className="h-5 w-5 text-[#25D366]" /> WhatsApp
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white/50 p-8 text-center">
                <Calculator className="mx-auto h-10 w-10 text-zinc-300" />
                <p className="mt-3 font-bold text-zinc-500">Tu estimación aparece acá</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Cargá tus piezas y tocá “Calcular costo”.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
