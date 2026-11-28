import { useState } from "react";
import { createFileRoute, redirect, Link, useRouter } from "@tanstack/react-router";
import {
  Store,
  Plus,
  BadgeCheck,
  Eye,
  Pencil,
  Trash2,
  Megaphone,
  Tractor,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/idioma";
import {
  meusAnunciosFn,
  criarEmpresaFn,
  mudarStatusFn,
  deletarAnuncioFn,
  DEPARTAMENTOS_UY,
} from "@/lib/marketplace";

const urlFoto = (p: string | null) =>
  !p ? null : p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`;

export const Route = createFileRoute("/panel/")({
  loader: async () => {
    const data = await meusAnunciosFn();
    if (!data.logado) throw redirect({ to: "/login", search: { redirect: "/panel" } as never });
    return data;
  },
  head: () => ({ meta: [{ title: "Mi panel | AGRO PARTS Marketplace" }] }),
  component: Pagina,
});

function Pagina() {
  const data = Route.useLoaderData();
  const { idioma } = useT();
  const es = idioma !== "pt";
  if (!("empresa" in data) || !data.empresa) return <CriarTienda es={es} />;
  return <Dashboard es={es} empresa={data.empresa} anuncios={data.anuncios} />;
}

function CriarTienda({ es }: { es: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({
    handle: "",
    nome: "",
    telefone_wa: "",
    ubicacion: "",
    departamento: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const criar = async () => {
    setErro("");
    setSalvando(true);
    try {
      const r = await criarEmpresaFn({ data: f });
      if (r.needLogin) {
        location.href = "/login?redirect=/panel";
        return;
      }
      if ("erro" in r && r.erro) {
        setErro(r.erro);
        return;
      }
      await router.invalidate();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-2xl border bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-6 w-6 text-emerald-700" />
            <h1 className="text-xl font-extrabold text-slate-800">
              {es ? "Creá tu tienda" : "Crie sua loja"}
            </h1>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            {es
              ? "Es gratis. Tu primera máquina la publicás sin costo y tenés tu vidriera con enlace propio."
              : "É grátis. Sua primeira máquina você publica sem custo e tem sua vitrine com link próprio."}
          </p>

          <Campo label={es ? "Nombre de la empresa" : "Nome da empresa"}>
            <input
              className="input"
              value={f.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="AgroMaq Salto"
            />
          </Campo>
          <Campo label={es ? "@usuario (tu enlace)" : "@usuário (seu link)"}>
            <div className="flex items-center rounded-lg border bg-white px-2">
              <span className="text-sm text-slate-400">agropartsuy.com/m/@</span>
              <input
                className="w-full px-1 py-2 text-sm outline-none"
                value={f.handle}
                onChange={(e) =>
                  set("handle", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="agromaqsalto"
              />
            </div>
          </Campo>
          <Campo label="WhatsApp">
            <input
              className="input"
              value={f.telefone_wa}
              onChange={(e) => set("telefone_wa", e.target.value)}
              placeholder="598 99 123 456"
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label={es ? "Ciudad" : "Cidade"}>
              <input
                className="input"
                value={f.ubicacion}
                onChange={(e) => set("ubicacion", e.target.value)}
              />
            </Campo>
            <Campo label="Departamento">
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
            </Campo>
          </div>

          {erro && <p className="mb-2 text-sm font-semibold text-red-600">{erro}</p>}
          <button
            onClick={criar}
            disabled={salvando}
            className="mt-2 w-full rounded-full bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {salvando ? "..." : es ? "Crear tienda gratis" : "Criar loja grátis"}
          </button>
        </div>
      </main>
      <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px}`}</style>
    </div>
  );
}

function Dashboard({
  es,
  empresa,
  anuncios: iniciais,
}: {
  es: boolean;
  empresa: any;
  anuncios: any[];
}) {
  const [anuncios, setAnuncios] = useState(iniciais);
  const totalViews = anuncios.reduce((s, a) => s + a.views, 0);
  const ativos = anuncios.filter((a) => a.status === "ACTIVO").length;

  const trocarStatus = async (id: number, status: string) => {
    const r = await mudarStatusFn({ data: { id, status } });
    if (!("needLogin" in r) || !r.needLogin)
      setAnuncios((xs) => xs.map((a) => (a.id === id ? { ...a, status } : a)));
  };
  const borrar = async (id: number) => {
    if (!confirm(es ? "¿Borrar este anuncio?" : "Apagar este anúncio?")) return;
    const r = await deletarAnuncioFn({ data: { id } });
    if (!("needLogin" in r) || !r.needLogin) setAnuncios((xs) => xs.filter((a) => a.id !== id));
  };

  const estadoCor: Record<string, string> = {
    ACTIVO: "text-emerald-700",
    PAUSADO: "text-amber-600",
    VENDIDO: "text-slate-500",
    PENDIENTE: "text-sky-600",
    RECHAZADO: "text-red-600",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Cabeçalho da loja */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-emerald-700">
              {empresa.logo_url ? (
                <img
                  src={urlFoto(empresa.logo_url)!}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1 font-extrabold text-slate-800">
                {empresa.nome}
                {empresa.verificada && <BadgeCheck className="h-4 w-4 text-sky-500" />}
              </div>
              <Link
                to="/m/$handle"
                params={{ handle: empresa.handle }}
                className="text-xs text-emerald-700 hover:underline"
              >
                agropartsuy.com/m/@{empresa.handle}
              </Link>
            </div>
          </div>
          <Link
            to="/panel/anuncio"
            className="flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-[#06321b] hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" /> {es ? "Publicar máquina" : "Publicar máquina"}
          </Link>
        </div>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Kpi n={anuncios.length} label={es ? "anuncios" : "anúncios"} />
          <Kpi n={ativos} label={es ? "activos" : "ativos"} />
          <Kpi n={totalViews} label={es ? "visitas" : "visitas"} />
        </div>

        {/* Lista */}
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          {es ? "Mis máquinas" : "Minhas máquinas"}
        </h2>
        {anuncios.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">
            <Tractor className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-slate-500">
              {es
                ? "Todavía no publicaste ninguna máquina."
                : "Você ainda não publicou nenhuma máquina."}
            </p>
            <Link
              to="/panel/anuncio"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
            >
              <Megaphone className="h-4 w-4" /> {es ? "Publicar la primera" : "Publicar a primeira"}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {anuncios.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
                <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {urlFoto(a.foto) ? (
                    <img src={urlFoto(a.foto)!} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Tractor className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{a.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {a.preco != null
                      ? `${a.moeda === "USD" ? "US$" : "$U"} ${a.preco.toLocaleString("es-UY")}`
                      : es
                        ? "Consultar"
                        : "Consultar"}{" "}
                    · <span className={estadoCor[a.status]}>{a.status}</span> · {a.views} 👁 ·{" "}
                    {a.nFotos} 📷
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {a.status === "ACTIVO" ? (
                    <IconBtn
                      title={es ? "Pausar" : "Pausar"}
                      onClick={() => trocarStatus(a.id, "PAUSADO")}
                    >
                      <PauseCircle className="h-4 w-4" />
                    </IconBtn>
                  ) : (
                    <IconBtn
                      title={es ? "Activar" : "Ativar"}
                      onClick={() => trocarStatus(a.id, "ACTIVO")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </IconBtn>
                  )}
                  {a.status !== "VENDIDO" && (
                    <IconBtn
                      title={es ? "Marcar vendido" : "Marcar vendido"}
                      onClick={() => trocarStatus(a.id, "VENDIDO")}
                    >
                      💰
                    </IconBtn>
                  )}
                  <Link
                    to="/panel/anuncio"
                    search={{ id: a.id } as never}
                    title={es ? "Editar" : "Editar"}
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/maquina/$id"
                    params={{ id: String(a.id) }}
                    title={es ? "Ver" : "Ver"}
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <IconBtn title={es ? "Borrar" : "Apagar"} onClick={() => borrar(a.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Kpi({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl border bg-white p-3 text-center">
      <div className="text-xl font-extrabold text-emerald-700">{n.toLocaleString("es-UY")}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
    >
      {children}
    </button>
  );
}
