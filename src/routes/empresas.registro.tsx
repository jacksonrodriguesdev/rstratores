// AGRO PARTS Mayorista: cadastro da empresa (/empresas/registro). RUT validado enquanto digita e um
// "cartão de cliente mayorista" que se preenche ao lado. Quem já tem conta só completa a empresa.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ArrowRight, BadgeCheck, Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { B2bPagina } from "@/components/b2b/B2bLayout";
import { formatarRut, rutValido, soDigitos, TIPOS_EMPRESA, VOLUMES } from "@/lib/b2b-comum";
import { minhaEmpresaFn } from "@/lib/b2b";
import { DEPARTAMENTOS_UY } from "@/lib/validacao-conta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/empresas/registro")({
  head: () => ({
    meta: [
      { title: "Registrar empresa · AGRO PARTS Mayorista" },
      {
        name: "description",
        content:
          "Abrí la cuenta mayorista de tu empresa en AGRO PARTS: precios por volumen, cotizaciones en USD y despacho directo desde Brasil.",
      },
    ],
  }),
  component: Registro,
});

type Form = {
  razao_social: string;
  nome_fantasia: string;
  rut: string;
  tipo: string;
  departamento: string;
  cidade: string;
  endereco: string;
  telefone: string;
  site: string;
  contato_nome: string;
  contato_cargo: string;
  email: string;
  volume: string;
  marcas: string;
};
const VAZIO: Form = {
  razao_social: "",
  nome_fantasia: "",
  rut: "",
  tipo: "REPUESTERA",
  departamento: "",
  cidade: "",
  endereco: "",
  telefone: "",
  site: "",
  contato_nome: "",
  contato_cargo: "",
  email: "",
  volume: "",
  marcas: "",
};

function Registro() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["b2b-minha"], queryFn: () => minhaEmpresaFn() });
  const [f, setF] = useState<Form>(VAZIO);
  const [senha, setSenha] = useState("");
  const [aceita, setAceita] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ msg: string; login?: boolean } | null>(null);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const logado = !!data?.sessao;
  const rutDig = soDigitos(f.rut);
  const rutOk = rutValido(rutDig);

  if (data?.empresa)
    return (
      <B2bPagina>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <BadgeCheck className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-extrabold">Tu empresa ya está registrada</h1>
          <p className="mt-2 text-slate-600">{data.empresa.razao_social}</p>
          <Link
            to="/empresas/portal"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-6 font-bold text-white"
          >
            Ir al portal <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </B2bPagina>
    );

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!rutOk) return setErro({ msg: "Revisá el RUT: tiene que tener 12 dígitos válidos." });
    setEnviando(true);
    try {
      const r = await fetch("/api/empresas/registro", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          empresa: { ...f, email: f.email || data?.sessao?.email },
          email: f.email,
          senha,
          aceita,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw Object.assign(new Error(j.error), { login: j.login });
      await qc.invalidateQueries();
      navigate({ to: "/empresas/portal" });
    } catch (err: any) {
      setErro({ msg: err.message || "No pudimos registrar la empresa.", login: err.login });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <B2bPagina>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:py-16">
        <form onSubmit={enviar} className="space-y-8">
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-emerald-700">CUENTA MAYORISTA</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Registrá tu empresa
            </h1>
            <p className="mt-2 text-slate-600">
              Tarda dos minutos. Revisamos los datos y te avisamos por e-mail cuando la cuenta esté
              habilitada.
            </p>
          </div>

          <Bloco n={1} titulo="La empresa">
            <Campo r="Razón social" className="sm:col-span-2">
              <input
                required
                value={f.razao_social}
                onChange={(e) => set({ razao_social: e.target.value })}
                className={entrada}
                placeholder="Ej.: Repuestos del Este S.A."
                autoComplete="organization"
              />
            </Campo>
            <Campo r="RUT">
              <div className="relative">
                <input
                  required
                  inputMode="numeric"
                  value={f.rut}
                  onChange={(e) =>
                    set({ rut: e.target.value.replace(/[^\d\s.-]/g, "").slice(0, 16) })
                  }
                  onBlur={() => rutOk && set({ rut: formatarRut(rutDig) })}
                  className={cn(
                    entrada,
                    "pr-10 font-mono",
                    rutDig.length === 12 &&
                      !rutOk &&
                      "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10",
                  )}
                  placeholder="21 123456 001 2"
                />
                {rutOk && (
                  <BadgeCheck className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" />
                )}
              </div>
              <p
                className={cn(
                  "mt-1 text-xs",
                  rutDig.length === 12 && !rutOk ? "text-rose-600" : "text-slate-500",
                )}
              >
                {rutOk
                  ? "RUT válido"
                  : rutDig.length === 12
                    ? "El dígito verificador no coincide. Revisá el número."
                    : `${rutDig.length}/12 dígitos`}
              </p>
            </Campo>
            <Campo r="Nombre comercial (opcional)">
              <input
                value={f.nome_fantasia}
                onChange={(e) => set({ nome_fantasia: e.target.value })}
                className={entrada}
              />
            </Campo>
            <Campo r="Tipo de empresa" className="sm:col-span-2" grupo>
              <div className="grid gap-2 sm:grid-cols-3">
                {TIPOS_EMPRESA.map(([k, t]) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => set({ tipo: k })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition",
                      f.tipo === k
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-4 ring-emerald-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Campo>
            <Campo r="Departamento">
              <select
                required
                value={f.departamento}
                onChange={(e) => set({ departamento: e.target.value })}
                className={entrada}
              >
                <option value="">Elegí…</option>
                {DEPARTAMENTOS_UY.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Campo>
            <Campo r="Ciudad">
              <input
                required
                value={f.cidade}
                onChange={(e) => set({ cidade: e.target.value })}
                className={entrada}
              />
            </Campo>
            <Campo r="Dirección del depósito (entrega)" className="sm:col-span-2">
              <input
                value={f.endereco}
                onChange={(e) => set({ endereco: e.target.value })}
                className={entrada}
                autoComplete="street-address"
              />
            </Campo>
          </Bloco>

          <Bloco n={2} titulo="Contacto y acceso">
            <Campo r="Nombre y apellido">
              <input
                required
                value={f.contato_nome}
                onChange={(e) => set({ contato_nome: e.target.value })}
                className={entrada}
                autoComplete="name"
              />
            </Campo>
            <Campo r="Cargo (opcional)">
              <input
                value={f.contato_cargo}
                onChange={(e) => set({ contato_cargo: e.target.value })}
                className={entrada}
                placeholder="Compras, gerencia…"
              />
            </Campo>
            <Campo r="Celular / WhatsApp">
              <input
                required
                value={f.telefone}
                onChange={(e) => set({ telefone: e.target.value })}
                className={entrada}
                inputMode="tel"
                autoComplete="tel"
                placeholder="09X XXX XXX"
              />
            </Campo>
            <Campo r={logado ? "E-mail de compras (opcional)" : "E-mail"}>
              <input
                required={!logado}
                type="email"
                value={f.email}
                onChange={(e) => set({ email: e.target.value })}
                className={entrada}
                autoComplete="email"
                placeholder={data?.sessao?.email ?? "compras@empresa.com.uy"}
              />
            </Campo>
            {logado ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 sm:col-span-2">
                <Check className="h-4 w-4" /> La empresa queda en tu cuenta ({data?.sessao?.email}).
              </p>
            ) : (
              <Campo r="Contraseña" className="sm:col-span-2">
                <input
                  required
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className={entrada}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres, con letras y números"
                />
                <p className="mt-1 text-xs text-slate-500">
                  ¿Ya tenés cuenta en AGRO PARTS?{" "}
                  <Link
                    to="/login"
                    search={{ redirect: "/empresas/registro" } as any}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    Ingresá
                  </Link>{" "}
                  y registrá la empresa en ella.
                </p>
              </Campo>
            )}
          </Bloco>

          <Bloco n={3} titulo="Tu operación (nos ayuda a preparar las condiciones)">
            <Campo r="Volumen de compra estimado" className="sm:col-span-2" grupo>
              <div className="grid gap-2 sm:grid-cols-2">
                {VOLUMES.map(([k, t]) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => set({ volume: k })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition",
                      f.volume === k
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-4 ring-emerald-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Campo>
            <Campo r="Marcas de maquinaria con las que trabajás" className="sm:col-span-2">
              <input
                value={f.marcas}
                onChange={(e) => set({ marcas: e.target.value })}
                className={entrada}
                placeholder="John Deere, Massey Ferguson, New Holland, Valtra…"
              />
            </Campo>
            <Campo r="Sitio web (opcional)" className="sm:col-span-2">
              <input
                value={f.site}
                onChange={(e) => set({ site: e.target.value })}
                className={entrada}
                placeholder="www.empresa.com.uy"
              />
            </Campo>
          </Bloco>

          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={aceita}
              onChange={(e) => setAceita(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span>
              Declaro que los datos son de la empresa y acepto que AGRO PARTS los use para evaluar
              la cuenta y enviar cotizaciones.
            </span>
          </label>

          {erro && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {erro.msg}{" "}
              {erro.login && (
                <Link
                  to="/login"
                  search={{ redirect: "/empresas/registro" } as any}
                  className="font-bold underline"
                >
                  Ingresar
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || !aceita}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-base font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:w-auto sm:px-10"
          >
            {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
            Registrar empresa
          </button>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Cartao f={f} rutOk={rutOk} />
          <ul className="mt-8 space-y-4 text-sm text-slate-600">
            {[
              [
                "Precios por volumen",
                "Tu nivel de precio queda en la cuenta: cada propuesta ya sale con él.",
              ],
              [
                "Propuesta formal",
                "USD, NCM, origen, Incoterm y validez, con proforma imprimible.",
              ],
              ["Datos protegidos", "Solo nuestro equipo ve los datos de la empresa."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <span>
                  <b className="text-slate-900">{t}.</b> {d}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </B2bPagina>
  );
}

// Cartão de cliente que se preenche enquanto a pessoa digita
function Cartao({ f, rutOk }: { f: Form; rutOk: boolean }) {
  return (
    <div className="relative aspect-[1.6/1] overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-2xl">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/40 blur-3xl" />
      <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-lime-400/20 blur-3xl" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)",
        }}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.22em] text-emerald-300">
            AGRO PARTS · MAYORISTA
          </span>
          <img src="/logo.png" alt="" className="h-8 w-auto opacity-90" />
        </div>
        <p className="mt-auto line-clamp-2 text-xl font-extrabold leading-tight tracking-tight">
          {f.razao_social || "Razón social de tu empresa"}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3 text-xs text-slate-300">
          <div>
            <p className="text-[10px] tracking-widest text-slate-400">RUT</p>
            <p className="font-mono text-sm text-white">
              {soDigitos(f.rut) ? formatarRut(soDigitos(f.rut)) : "—— —————— ——— —"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-widest text-slate-400">
              {f.departamento ? f.departamento.toUpperCase() : "URUGUAY"}
            </p>
            {rutOk ? (
              <p className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" /> RUT verificado
              </p>
            ) : (
              <p className="text-slate-400">Pendiente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const entrada =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

function Bloco({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <legend className="sr-only">{titulo}</legend>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white">
          {n}
        </span>
        <h2 className="font-bold">{titulo}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Campo({
  r,
  children,
  className,
  grupo,
}: {
  r: string;
  children: ReactNode;
  className?: string;
  grupo?: boolean; // grupo de botões: div com role=group em vez de label
}) {
  const Tag = grupo ? "div" : "label";
  return (
    <Tag className={cn("block", className)} {...(grupo && { role: "group", "aria-label": r })}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{r}</span>
      {children}
    </Tag>
  );
}
