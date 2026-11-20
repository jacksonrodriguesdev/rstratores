import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Target,
  Plus,
  Upload,
  Download,
  Search,
  MessageCircle,
  Mail,
  Trash2,
  Pencil,
  X,
  Save,
  CalendarClock,
  Map as MapIcon,
  List,
  MapPin,
} from "lucide-react";
import {
  estatProspeccionFn,
  listarProspectosFn,
  guardarProspectoFn,
  cambiarEstadoFn,
  fijarProximoFn,
  eliminarProspectoFn,
  importarProspectosFn,
  exportarProspectosFn,
  prospectosMapaFn,
  obtenerProspectoFn,
  importarSemillaFn,
} from "@/lib/prospeccion/prospeccion-admin";
import {
  ESTADOS,
  TIPOS,
  ORIGENES,
  estadoInfo,
  tipoEs,
  telefonoWhatsapp,
  mensajeWhatsapp,
  type EstadoProspecto,
  type Prospecto,
} from "@/lib/prospeccion/prospeccion-comum";
import { coordDeCiudad, lugarMasCercano, CENTRO_UY, ZOOM_UY } from "@/lib/prospeccion/coords-uy";

export const Route = createFileRoute("/admin/prospeccion")({
  head: () => ({ meta: [{ title: "Prospección de importadores — AGRO PARTS" }] }),
  component: ProspeccionPage,
});

type Filtro = { estado?: string; tipo?: string; ciudad?: string; busca?: string; pagina?: number };
const hoy = () => new Date().toISOString().slice(0, 10);
const vacio: Partial<Prospecto> = { nombre: "", estado: "nuevo" };

function ProspeccionPage() {
  const qc = useQueryClient();
  const [f, setF] = useState<Filtro>({ pagina: 1 });
  const [busca, setBusca] = useState("");
  const [edit, setEdit] = useState<Partial<Prospecto> | null>(null);
  const [importar, setImportar] = useState(false);
  const [vista, setVista] = useState<"lista" | "mapa">("lista");

  const { data: stats } = useQuery({
    queryKey: ["prosp-stats"],
    queryFn: () => estatProspeccionFn(),
  });
  const { data, isFetching } = useQuery({
    queryKey: ["prosp-lista", f],
    queryFn: () => listarProspectosFn({ data: f }),
  });
  const { data: puntos } = useQuery({
    queryKey: ["prosp-mapa"],
    queryFn: () => prospectosMapaFn(),
    enabled: vista === "mapa",
  });

  const abrirEdicion = async (id: number) => {
    const full = await obtenerProspectoFn({ data: { id } });
    if (full) setEdit(full);
  };

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["prosp-mapa"] });
    qc.invalidateQueries({ queryKey: ["prosp-lista"] });
    qc.invalidateQueries({ queryKey: ["prosp-stats"] });
  };
  const set = (patch: Partial<Filtro>) => setF((v) => ({ ...v, ...patch, pagina: 1 }));

  const [cargandoBase, setCargandoBase] = useState(false);
  const cargarBase = async () => {
    if (
      !confirm(
        "Cargar la base inicial de empresas de Uruguay (repuesteras, talleres, maquinaria y camiones)? No duplica las que ya estén.",
      )
    )
      return;
    setCargandoBase(true);
    try {
      const r = await importarSemillaFn();
      refrescar();
      alert(`Listo: ${r.insertados} agregadas, ${r.duplicados} ya existían.`);
    } finally {
      setCargandoBase(false);
    }
  };

  const guardar = async () => {
    if (!edit?.nombre?.trim()) return alert("El nombre es obligatorio.");
    await guardarProspectoFn({ data: edit });
    setEdit(null);
    refrescar();
  };
  const cambiarEstado = async (id: number, estado: EstadoProspecto) => {
    await cambiarEstadoFn({ data: { id, estado } });
    refrescar();
  };
  const fijarProximo = async (id: number, fecha: string) => {
    await fijarProximoFn({ data: { id, fecha: fecha || null } });
    refrescar();
  };
  const eliminar = async (p: Prospecto) => {
    if (!confirm(`¿Eliminar "${p.nombre}" de la lista? Esta acción no se puede deshacer.`)) return;
    await eliminarProspectoFn({ data: { id: p.id } });
    refrescar();
  };
  const exportar = async () => {
    const csv = await exportarProspectosFn();
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospectos-${hoy()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = data?.rows ?? [];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Target className="h-6 w-6 text-primary" /> Prospección de importadores
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Empresas uruguayas para importar. Actualizá la lista cada semana: agregá en lote desde
            Google Maps y seguí cada contacto por su estado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={cargarBase}
            disabled={cargandoBase}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <MapPin className="h-4 w-4" /> {cargandoBase ? "Cargando…" : "Cargar base de empresas"}
          </button>
          <button
            onClick={() => setImportar(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white hover:bg-zinc-800"
          >
            <Upload className="h-4 w-4" /> Importar lote
          </button>
          <button
            onClick={() => setEdit({ ...vacio })}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Añadir empresa
          </button>
          <button
            onClick={exportar}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Stat
          label="Total"
          valor={stats?.total ?? 0}
          cor="#06321b"
          activo={!f.estado}
          onClick={() => set({ estado: undefined })}
        />
        {ESTADOS.map((e) => (
          <Stat
            key={e.v}
            label={e.es}
            valor={stats?.porEstado?.[e.v] ?? 0}
            cor={e.cor}
            activo={f.estado === e.v}
            onClick={() => set({ estado: f.estado === e.v ? undefined : e.v })}
          />
        ))}
      </div>
      {!!stats?.porContactarHoy && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
          <CalendarClock className="h-4 w-4" /> {stats.porContactarHoy} para contactar hoy
        </p>
      )}

      {/* Vista: lista / mapa */}
      <div className="mt-4 flex w-fit gap-1 rounded-lg border border-zinc-200 bg-white p-1">
        <button
          onClick={() => setVista("lista")}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${vista === "lista" ? "bg-primary text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
        >
          <List className="h-4 w-4" /> Lista
        </button>
        <button
          onClick={() => setVista("mapa")}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${vista === "mapa" ? "bg-primary text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
        >
          <MapIcon className="h-4 w-4" /> Mapa
        </button>
      </div>

      {vista === "mapa" && (
        <MapaProspectos
          puntos={puntos ?? []}
          onEditar={abrirEdicion}
          onAgregar={(d) => setEdit({ ...vacio, ...d })}
          onCliente={(id) => cambiarEstado(id, "cliente")}
        />
      )}

      {vista === "lista" && (
        <>
          {/* Filtros */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && set({ busca: busca || undefined })}
                placeholder="Buscar nombre, ciudad, teléfono…"
                className="h-10 w-64 rounded-lg border border-zinc-200 pl-8 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <select
              value={f.tipo ?? ""}
              onChange={(e) => set({ tipo: e.target.value || undefined })}
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm"
            >
              <option value="">Todos los tipos</option>
              {TIPOS.map((t) => (
                <option key={t.v} value={t.v}>
                  {t.es}
                </option>
              ))}
            </select>
            <input
              value={f.ciudad ?? ""}
              onChange={(e) => set({ ciudad: e.target.value || undefined })}
              placeholder="Ciudad"
              className="h-10 w-40 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-primary"
            />
            {isFetching && <span className="text-sm text-zinc-400">Cargando…</span>}
          </div>

          {/* Tabla */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2.5 font-semibold">Empresa</th>
                  <th className="px-3 py-2.5 font-semibold">Ciudad</th>
                  <th className="px-3 py-2.5 font-semibold">Contacto</th>
                  <th className="px-3 py-2.5 font-semibold">Estado</th>
                  <th className="px-3 py-2.5 font-semibold">Próximo</th>
                  <th className="px-3 py-2.5 font-semibold">Notas</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const info = estadoInfo(p.estado);
                  const wa = p.telefono
                    ? `https://wa.me/${telefonoWhatsapp(p.telefono)}?text=${encodeURIComponent(mensajeWhatsapp(p))}`
                    : null;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-zinc-50 align-top hover:bg-zinc-50/60"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-zinc-900">{p.nombre}</div>
                        <div className="text-xs text-zinc-400">{tipoEs(p.tipo)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">{p.ciudad || "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 rounded-md bg-[#25D366]/10 px-2 py-1 text-xs font-bold text-[#128C3E] hover:bg-[#25D366]/20"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> {p.telefono}
                            </a>
                          )}
                          {!wa && <span className="text-xs text-zinc-400">sin teléfono</span>}
                          {p.email && (
                            <a
                              href={`mailto:${p.email}`}
                              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
                            >
                              <Mail className="h-3.5 w-3.5" /> email
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={p.estado}
                          onChange={(e) => cambiarEstado(p.id, e.target.value as EstadoProspecto)}
                          className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold"
                          style={{ color: info.cor }}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e.v} value={e.v}>
                              {e.es}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="date"
                          value={p.proximo_contacto ?? ""}
                          onChange={(e) => fijarProximo(p.id, e.target.value)}
                          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
                        />
                      </td>
                      <td className="max-w-[220px] px-3 py-2.5 text-xs text-zinc-500">
                        <span className="line-clamp-2">{p.notas || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEdit(p)}
                            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-primary"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => eliminar(p)}
                            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-zinc-400">
                      No hay empresas todavía. Usá <strong>Importar lote</strong> para pegar una
                      lista de Google Maps, o <strong>Añadir empresa</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!!data && data.total > data.rows.length && (
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <button
                disabled={(f.pagina ?? 1) <= 1}
                onClick={() => setF((v) => ({ ...v, pagina: Math.max(1, (v.pagina ?? 1) - 1) }))}
                className="rounded-md border border-zinc-200 px-3 py-1 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-zinc-500">
                {data.rows.length ? (data.pagina - 1) * data.porPagina + 1 : 0}–
                {(data.pagina - 1) * data.porPagina + data.rows.length} de {data.total}
              </span>
              <button
                disabled={data.pagina * data.porPagina >= data.total}
                onClick={() => setF((v) => ({ ...v, pagina: (v.pagina ?? 1) + 1 }))}
                className="rounded-md border border-zinc-200 px-3 py-1 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {edit && <FormEditar p={edit} setP={setEdit} onGuardar={guardar} />}
      {importar && (
        <ImportarLote
          onClose={() => setImportar(false)}
          onHecho={() => {
            setImportar(false);
            refrescar();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Mapa (Leaflet + OpenStreetMap)
type PuntoMapa = Awaited<ReturnType<typeof prospectosMapaFn>>[number];

const escapeHtml = (s: string) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      (
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }) as Record<
          string,
          string
        >
      )[c],
  );

function cargarLeaflet(): Promise<unknown> {
  const w = window as unknown as { L?: unknown; __leafletP?: Promise<unknown> };
  if (w.L) return Promise.resolve(w.L);
  w.__leafletP ??= new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => resolve((window as unknown as { L: unknown }).L);
    s.onerror = () => reject(new Error("mapa"));
    document.head.appendChild(s);
  });
  return w.__leafletP;
}

// Perfil da empresa no Google Maps (abre o lugar real pela busca nome+cidade).
const urlGoogleMaps = (nombre: string, ciudad?: string | null) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nombre} ${ciudad ?? ""} Uruguay`)}`;

function MapaProspectos({
  puntos,
  onEditar,
  onAgregar,
  onCliente,
}: {
  puntos: PuntoMapa[];
  onEditar: (id: number) => void;
  onAgregar: (d: { lat: number; lng: number; ciudad: string; departamento: string }) => void;
  onCliente: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const mapRef = useRef<any>(null);

  const layerRef = useRef<any>(null);
  const [modo, setModo] = useState(false);
  const [error, setError] = useState(false);
  const modoRef = useRef(false);
  const agregarRef = useRef(onAgregar);
  const editarRef = useRef(onEditar);
  const clienteRef = useRef(onCliente);
  modoRef.current = modo;
  agregarRef.current = onAgregar;
  editarRef.current = onEditar;
  clienteRef.current = onCliente;

  useEffect(() => {
    let cancel = false;
    cargarLeaflet()
      .then((L: any) => {
        if (cancel || !ref.current || mapRef.current) return;
        const map = L.map(ref.current).setView(CENTRO_UY, ZOOM_UY);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 18,
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);

        map.on("click", (e: any) => {
          if (!modoRef.current) return;
          const { lat, lng } = e.latlng;
          const lugar = lugarMasCercano(lat, lng);
          agregarRef.current({ lat, lng, ciudad: lugar.nombre, departamento: lugar.departamento });
          setModo(false);
        });
        const w = window as unknown as {
          __prospEditar?: (id: number) => void;
          __prospCliente?: (id: number) => void;
        };
        w.__prospEditar = (id) => editarRef.current(id);
        w.__prospCliente = (id) => clienteRef.current(id);
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 120);
      })
      .catch(() => setError(true));
    return () => {
      cancel = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = (window as unknown as { L?: any }).L;
    const layer = layerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    const bounds: Array<[number, number]> = [];
    for (const p of puntos) {
      let co: [number, number] | null = null;
      if (p.lat != null && p.lng != null) {
        co = [p.lat, p.lng];
      } else {
        const c = coordDeCiudad(p.ciudad);
        if (c) {
          // Espalha lojas da mesma cidade em espiral, pra não ficarem empilhadas no centroide.
          const ang = p.id * 2.399963;
          const r = 0.016 + ((p.id * 7) % 6) * 0.006;
          co = [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)];
        }
      }
      if (!co) continue;
      bounds.push(co);
      const info = estadoInfo(p.estado);
      // Pins verdes. Cliente = verde escuro com ✓ (destaque); descartado = cinza; resto = verde.
      const esCliente = p.estado === "cliente";
      const esDescartado = p.estado === "descartado";
      const cor = esCliente ? "#06821b" : esDescartado ? "#9aa4ad" : "#1f9d57";
      const tam = esCliente ? 22 : 16;
      const icon = L.divIcon({
        className: "",
        html: esCliente
          ? `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${cor};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);color:#fff;font-size:13px;font-weight:700">✓</span>`
          : `<span style="display:block;width:${tam}px;height:${tam}px;border-radius:50%;background:${cor};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></span>`,
        iconSize: [tam, tam],
        iconAnchor: [tam / 2, tam / 2],
      });
      const wa = p.telefono
        ? `https://wa.me/${telefonoWhatsapp(p.telefono)}?text=${encodeURIComponent(mensajeWhatsapp(p))}`
        : null;
      const maps = urlGoogleMaps(p.nombre, p.ciudad);
      const html = `<div style="min-width:190px;font-size:13px;line-height:1.5">
        <strong style="font-size:14px">${escapeHtml(p.nombre)}</strong><br/>
        <span style="color:#666">${escapeHtml(p.ciudad || "")}${p.tipo ? " · " + escapeHtml(tipoEs(p.tipo)) : ""}</span><br/>
        <span style="color:${info.cor};font-weight:700">${info.es}</span>
        <a href="${maps}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:6px;margin-top:8px;padding:7px 10px;border-radius:8px;background:#eef3ee;color:#06321b;font-weight:700;text-decoration:none">📍 Ver en Google Maps</a>
        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:8px 12px">
          ${wa ? `<a href="${wa}" target="_blank" rel="noopener noreferrer" style="color:#128C3E;font-weight:700">WhatsApp</a>` : ""}
          ${esCliente ? "" : `<a href="#" onclick="window.__prospCliente&&window.__prospCliente(${p.id});return false" style="color:#06821b;font-weight:700">✓ Cliente</a>`}
          <a href="#" onclick="window.__prospEditar&&window.__prospEditar(${p.id});return false" style="color:#2f6abf;font-weight:700">Editar</a>
        </div></div>`;
      const marker = L.marker(co, { icon, title: p.nombre, riseOnHover: true })
        .addTo(layer)
        .bindPopup(html);
      // Ao passar o mouse, abre o cartão da empresa (com o link do Google Maps).
      marker.on("mouseover", () => marker.openPopup());
    }
    if (bounds.length && mapRef.current) {
      try {
        mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
      } catch {
        /* ignora */
      }
    }
  }, [puntos]);

  const colocados = puntos.filter(
    (p) => (p.lat != null && p.lng != null) || coordDeCiudad(p.ciudad),
  ).length;
  const sinUbicar = puntos.length - colocados;

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setModo((m) => !m)}
          className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold ${modo ? "bg-amber-500 text-white" : "bg-primary text-white hover:opacity-90"}`}
        >
          <MapPin className="h-4 w-4" />{" "}
          {modo ? "Hacé clic en el mapa para ubicar…" : "Añadir en el mapa"}
        </button>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1">
            <span
              className="grid h-3.5 w-3.5 place-items-center rounded-full text-[8px] font-bold text-white"
              style={{ background: "#06821b" }}
            >
              ✓
            </span>{" "}
            Cliente
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#1f9d57" }} />{" "}
            Prospecto
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#9aa4ad" }} />{" "}
            Descartado
          </span>
        </div>
      </div>
      <div className="isolate overflow-hidden rounded-xl border border-zinc-200">
        <div ref={ref} className="h-[520px] w-full" style={{ background: "#e9edf0" }} />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">
          No se pudo cargar el mapa. Revisá la conexión e intentá de nuevo.
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-500">
        {colocados} empresa{colocados === 1 ? "" : "s"} en el mapa
        {sinUbicar > 0
          ? ` · ${sinUbicar} sin ubicación (ciudad desconocida o sin coordenadas)`
          : ""}
        . Tip: activá “Añadir en el mapa” y hacé clic donde está la empresa — completamos ciudad y
        departamento por vos.
      </p>
    </div>
  );
}

function Stat({
  label,
  valor,
  cor,
  activo,
  onClick,
}: {
  label: string;
  valor: number;
  cor: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border bg-white p-3 text-left transition ${activo ? "ring-2 ring-primary" : "border-zinc-200 hover:border-zinc-300"}`}
    >
      <div className="text-2xl font-black tabular-nums" style={{ color: cor }}>
        {valor}
      </div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
    </button>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
const inp =
  "h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-primary";

function FormEditar({
  p,
  setP,
  onGuardar,
}: {
  p: Partial<Prospecto>;
  setP: (p: Partial<Prospecto> | null) => void;
  onGuardar: () => void;
}) {
  const u = (patch: Partial<Prospecto>) => setP({ ...p, ...patch });
  return (
    <Modal titulo={p.id ? "Editar empresa" : "Añadir empresa"} onClose={() => setP(null)}>
      {p.lat != null && p.lng != null && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <MapPin className="h-4 w-4" /> Ubicación fijada en el mapa ({p.lat.toFixed(3)},{" "}
          {p.lng.toFixed(3)})
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo label="Nombre *">
            <input
              className={inp}
              value={p.nombre ?? ""}
              onChange={(e) => u({ nombre: e.target.value })}
            />
          </Campo>
        </div>
        <Campo label="Tipo">
          <select
            className={inp}
            value={p.tipo ?? ""}
            onChange={(e) => u({ tipo: e.target.value })}
          >
            <option value="">—</option>
            {TIPOS.map((t) => (
              <option key={t.v} value={t.v}>
                {t.es}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Origen">
          <select
            className={inp}
            value={p.origen ?? ""}
            onChange={(e) => u({ origen: e.target.value })}
          >
            <option value="">—</option>
            {ORIGENES.map((o) => (
              <option key={o.v} value={o.v}>
                {o.es}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Ciudad">
          <input
            className={inp}
            value={p.ciudad ?? ""}
            onChange={(e) => u({ ciudad: e.target.value })}
          />
        </Campo>
        <Campo label="Departamento">
          <input
            className={inp}
            value={p.departamento ?? ""}
            onChange={(e) => u({ departamento: e.target.value })}
          />
        </Campo>
        <Campo label="Teléfono / WhatsApp">
          <input
            className={inp}
            value={p.telefono ?? ""}
            onChange={(e) => u({ telefono: e.target.value })}
          />
        </Campo>
        <Campo label="Email">
          <input
            className={inp}
            value={p.email ?? ""}
            onChange={(e) => u({ email: e.target.value })}
          />
        </Campo>
        <div className="sm:col-span-2">
          <Campo label="Web / link de Maps">
            <input
              className={inp}
              value={p.web ?? ""}
              onChange={(e) => u({ web: e.target.value })}
            />
          </Campo>
        </div>
        <Campo label="Estado">
          <select
            className={inp}
            value={p.estado ?? "nuevo"}
            onChange={(e) => u({ estado: e.target.value as EstadoProspecto })}
          >
            {ESTADOS.map((e) => (
              <option key={e.v} value={e.v}>
                {e.es}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Próximo contacto">
          <input
            type="date"
            className={inp}
            value={p.proximo_contacto ?? ""}
            onChange={(e) => u({ proximo_contacto: e.target.value })}
          />
        </Campo>
        <div className="sm:col-span-2">
          <Campo label="Notas">
            <textarea
              className="min-h-20 w-full rounded-lg border border-zinc-200 p-3 text-sm outline-none focus:border-primary"
              value={p.notas ?? ""}
              onChange={(e) => u({ notas: e.target.value })}
            />
          </Campo>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => setP(null)}
          className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
        >
          Cancelar
        </button>
        <button
          onClick={onGuardar}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:opacity-90"
        >
          <Save className="h-4 w-4" /> Guardar
        </button>
      </div>
    </Modal>
  );
}

function ImportarLote({ onClose, onHecho }: { onClose: () => void; onHecho: () => void }) {
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [origen, setOrigen] = useState("maps");
  const [res, setRes] = useState<{ insertados: number; duplicados: number; total: number } | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);

  const importar = async () => {
    if (!texto.trim()) return;
    setCargando(true);
    try {
      const r = await importarProspectosFn({ data: { texto, tipo, ciudad, departamento, origen } });
      setRes(r);
    } finally {
      setCargando(false);
    }
  };
  return (
    <Modal titulo="Importar lote de empresas" onClose={onClose}>
      <p className="text-sm text-zinc-500">
        Pegá una empresa por línea. Separá los campos con <strong>tabulación</strong> (copiando de
        una planilla) o con <strong>;</strong> — en el orden: <em>Nombre; Ciudad; Teléfono</em>. El
        nombre alcanza; lo demás es opcional.
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={
          "Repuestos El Campo; Salto; 099 123 456\nTaller Diesel Norte; Paysandú; 472 00000\nAgro Repuestos SRL; Young"
        }
        className="mt-3 min-h-40 w-full rounded-lg border border-zinc-200 p-3 font-mono text-xs outline-none focus:border-primary"
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Tipo (por defecto)">
          <select className={inp} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">—</option>
            {TIPOS.map((t) => (
              <option key={t.v} value={t.v}>
                {t.es}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Ciudad (si no viene)">
          <input className={inp} value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        </Campo>
        <Campo label="Departamento">
          <input
            className={inp}
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
          />
        </Campo>
        <Campo label="Origen">
          <select className={inp} value={origen} onChange={(e) => setOrigen(e.target.value)}>
            {ORIGENES.map((o) => (
              <option key={o.v} value={o.v}>
                {o.es}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {res && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {res.insertados} agregadas · {res.duplicados} duplicadas (ignoradas) · {res.total} líneas
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={res ? onHecho : onClose}
          className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
        >
          {res ? "Cerrar" : "Cancelar"}
        </button>
        <button
          onClick={importar}
          disabled={cargando || !texto.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" /> {cargando ? "Importando…" : "Importar"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mt-6 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-zinc-900">{titulo}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
