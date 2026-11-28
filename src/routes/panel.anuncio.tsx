import { useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload, X, Star, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/idioma";
import {
  minhaEmpresaFn,
  getAnuncioEditarFn,
  salvarAnuncioFn,
  uploadFotoMaquina,
  TIPOS_MAQUINA,
  DEPARTAMENTOS_UY,
} from "@/lib/marketplace";

const urlFoto = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);

export const Route = createFileRoute("/panel/anuncio")({
  validateSearch: (s: Record<string, unknown>) => ({ id: s.id ? Number(s.id) : undefined }),
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: async ({ deps }) => {
    const me = await minhaEmpresaFn();
    if (!me.logado)
      throw redirect({ to: "/login", search: { redirect: "/panel/anuncio" } as never });
    if (!me.empresa) throw redirect({ to: "/panel" });
    const anuncio = deps.id ? await getAnuncioEditarFn({ data: { id: deps.id } }) : null;
    return { anuncio };
  },
  head: () => ({ meta: [{ title: "Publicar máquina | AGRO PARTS Marketplace" }] }),
  component: Pagina,
});

function Pagina() {
  const { anuncio } = Route.useLoaderData();
  const { idioma } = useT();
  const es = idioma !== "pt";
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState({
    titulo: anuncio?.titulo ?? "",
    tipo: anuncio?.tipo ?? "tractor",
    marca: anuncio?.marca ?? "",
    modelo: anuncio?.modelo ?? "",
    ano: anuncio?.ano?.toString() ?? "",
    horas_km: anuncio?.horas_km?.toString() ?? "",
    unidade_uso: anuncio?.unidade_uso ?? "h",
    condicao: anuncio?.condicao ?? "USADO",
    potencia: anuncio?.potencia ?? "",
    preco: anuncio?.preco?.toString() ?? "",
    moeda: anuncio?.moeda ?? "USD",
    preco_consultar: anuncio?.preco_consultar ?? false,
    descricao: anuncio?.descricao ?? "",
    departamento: anuncio?.departamento ?? "",
  });
  const [fotos, setFotos] = useState<string[]>(anuncio?.fotos ?? []);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const enviarFotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setSubindo(true);
    setErro("");
    try {
      for (const file of Array.from(files).slice(0, 12 - fotos.length)) {
        const path = await uploadFotoMaquina(file);
        setFotos((xs) => [...xs, path]);
      }
    } catch (e: any) {
      setErro(e.message || "Error al subir");
    } finally {
      setSubindo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const salvar = async () => {
    setErro("");
    if (!f.titulo.trim()) return setErro(es ? "Poné un título." : "Coloque um título.");
    setSalvando(true);
    try {
      const r = await salvarAnuncioFn({
        data: {
          id: anuncio?.id,
          titulo: f.titulo,
          tipo: f.tipo,
          marca: f.marca || null,
          modelo: f.modelo || null,
          ano: f.ano ? Number(f.ano) : null,
          horas_km: f.horas_km ? Number(f.horas_km.replace(/\D/g, "")) : null,
          unidade_uso: f.unidade_uso,
          condicao: f.condicao,
          potencia: f.potencia || null,
          preco: f.preco ? Number(f.preco.replace(/[^\d.]/g, "")) : null,
          moeda: f.moeda,
          preco_consultar: f.preco_consultar,
          descricao: f.descricao || null,
          departamento: f.departamento || null,
          fotos,
        },
      });
      if ("needLogin" in r && r.needLogin) {
        location.href = "/login?redirect=/panel";
        return;
      }
      if ("erro" in r && r.erro) {
        setErro(r.erro);
        return;
      }
      navigate({ to: "/panel" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to="/panel"
          className="flex items-center gap-1 text-sm text-emerald-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {es ? "Volver al panel" : "Voltar ao painel"}
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-slate-800">
          {anuncio
            ? es
              ? "Editar máquina"
              : "Editar máquina"
            : es
              ? "Publicar máquina"
              : "Publicar máquina"}
        </h1>

        <div className="mt-4 space-y-4 rounded-2xl border bg-white p-5">
          {/* Fotos */}
          <div>
            <label className="lbl">{es ? "Fotos (hasta 12)" : "Fotos (até 12)"}</label>
            <div className="flex flex-wrap gap-2">
              {fotos.map((p, i) => (
                <div key={p} className="relative h-20 w-24 overflow-hidden rounded-lg border">
                  <img src={urlFoto(p)} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-amber-400 px-1 text-[9px] font-bold text-amber-900">
                      <Star className="h-2.5 w-2.5" /> {es ? "Portada" : "Capa"}
                    </span>
                  )}
                  <button
                    onClick={() => setFotos((xs) => xs.filter((_, k) => k !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {fotos.length < 12 && (
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={subindo}
                  className="flex h-20 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-500"
                >
                  {subindo ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  <span className="mt-1 text-[10px]">{es ? "Agregar" : "Adicionar"}</span>
                </button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => enviarFotos(e.target.files)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {es ? "La primera foto es la portada." : "A primeira foto é a capa."}
            </p>
          </div>

          <div>
            <label className="lbl">{es ? "Título" : "Título"}</label>
            <input
              className="input"
              value={f.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder={es ? "Tractor John Deere 6110J" : "Trator John Deere 6110J"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="lbl">{es ? "Tipo" : "Tipo"}</label>
              <select
                className="input"
                value={f.tipo}
                onChange={(e) => set("tipo", e.target.value)}
              >
                {TIPOS_MAQUINA.map((t) => (
                  <option key={t.id} value={t.id}>
                    {es ? t.es : t.pt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="lbl">{es ? "Estado" : "Estado"}</label>
              <select
                className="input"
                value={f.condicao}
                onChange={(e) => set("condicao", e.target.value)}
              >
                <option value="USADO">{es ? "Usado" : "Usado"}</option>
                <option value="NUEVO">{es ? "Nuevo" : "Novo"}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="lbl">{es ? "Marca" : "Marca"}</label>
              <input
                className="input"
                value={f.marca}
                onChange={(e) => set("marca", e.target.value)}
              />
            </div>
            <div>
              <label className="lbl">{es ? "Modelo" : "Modelo"}</label>
              <input
                className="input"
                value={f.modelo}
                onChange={(e) => set("modelo", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="lbl">{es ? "Año" : "Ano"}</label>
              <input
                className="input"
                value={f.ano}
                onChange={(e) => set("ano", e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="lbl">{es ? "Uso" : "Uso"}</label>
              <div className="flex gap-1">
                <input
                  className="input"
                  value={f.horas_km}
                  onChange={(e) => set("horas_km", e.target.value)}
                  inputMode="numeric"
                />
                <select
                  className="input w-16"
                  value={f.unidade_uso}
                  onChange={(e) => set("unidade_uso", e.target.value)}
                >
                  <option value="h">h</option>
                  <option value="km">km</option>
                </select>
              </div>
            </div>
            <div>
              <label className="lbl">{es ? "Potencia" : "Potência"}</label>
              <input
                className="input"
                value={f.potencia}
                onChange={(e) => set("potencia", e.target.value)}
                placeholder="110 cv"
              />
            </div>
          </div>

          <div>
            <label className="lbl">{es ? "Precio" : "Preço"}</label>
            <div className="flex items-center gap-2">
              <select
                className="input w-20"
                value={f.moeda}
                onChange={(e) => set("moeda", e.target.value)}
                disabled={f.preco_consultar}
              >
                <option value="USD">US$</option>
                <option value="UYU">$U</option>
              </select>
              <input
                className="input"
                value={f.preco}
                onChange={(e) => set("preco", e.target.value)}
                inputMode="numeric"
                disabled={f.preco_consultar}
                placeholder="48000"
              />
              <label className="flex shrink-0 items-center gap-1 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={f.preco_consultar}
                  onChange={(e) => set("preco_consultar", e.target.checked)}
                />
                {es ? "A consultar" : "A consultar"}
              </label>
            </div>
          </div>

          <div>
            <label className="lbl">Departamento</label>
            <select
              className="input"
              value={f.departamento}
              onChange={(e) => set("departamento", e.target.value)}
            >
              <option value="">—</option>
              {DEPARTAMENTOS_UY.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">{es ? "Descripción" : "Descrição"}</label>
            <textarea
              className="input min-h-[90px]"
              value={f.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder={
                es ? "Estado, mantenimiento, accesorios…" : "Estado, manutenção, acessórios…"
              }
            />
          </div>

          {erro && <p className="text-sm font-semibold text-red-600">{erro}</p>}
          <button
            onClick={salvar}
            disabled={salvando || subindo}
            className="w-full rounded-full bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {salvando
              ? "..."
              : anuncio
                ? es
                  ? "Guardar cambios"
                  : "Salvar alterações"
                : es
                  ? "Publicar"
                  : "Publicar"}
          </button>
        </div>
      </main>
      <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;background:#fff}.lbl{display:block;margin-bottom:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#64748b}`}</style>
    </div>
  );
}
