import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, Lock, User, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { AuthShell, Campo, CampoSenha, CampoCelular, ForcaSenha, BotaoGoogle, Separador, inputCls } from "@/components/auth/AuthShell";
import { getConfigLoginFn } from "@/lib/conta";
import { DEPARTAMENTOS_UY, normalizarCelularUY, emailValido, avaliarSenha } from "@/lib/validacao-conta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cadastro")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  loader: () => getConfigLoginFn(),
  head: () => ({ meta: [{ title: "Crear cuenta — AGRO PARTS" }, { name: "robots", content: "noindex" }] }),
  component: CadastroPage,
});

function CadastroPage() {
  const { redirect } = Route.useSearch();
  const config = Route.useLoaderData();
  const destino = redirect || "/cuenta";
  const [f, setF] = useState({ nome_completo: "", email: "", telefone: "", departamento: "", cidade: "", senha: "", confirmar: "" });
  const [aceita, setAceita] = useState(false);
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const marcar = (k: string) => () => setTocado((t) => ({ ...t, [k]: true }));

  // Erros só depois que a pessoa sai do campo (não grita enquanto digita)
  const erros = {
    nome_completo: f.nome_completo.trim().length < 3 ? "Escribí tu nombre completo." : null,
    email: !emailValido(f.email) ? "Revisá el e-mail." : null,
    telefone: !normalizarCelularUY(f.telefone) ? "Celular uruguayo: 9 dígitos, empieza con 09." : null,
    senha: !avaliarSenha(f.senha).valida ? "Mínimo 8 caracteres, con letras y números." : null,
    confirmar: f.confirmar !== f.senha || !f.confirmar ? "Las contraseñas no coinciden." : null,
  };
  const valido = Object.values(erros).every((e) => !e) && aceita;
  const mostrar = (k: keyof typeof erros) => (tocado[k] ? erros[k] : null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({ nome_completo: true, email: true, telefone: true, senha: true, confirmar: true });
    if (!valido) {
      setError(aceita ? "Revisá los campos marcados." : "Aceptá los términos para continuar.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...f, aceita, redirect: destino }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = data.destino || destino;
        return;
      }
      setError(data.error || "No pudimos crear la cuenta.");
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell titulo="Creá tu cuenta" subtitulo="Gratis. Cotizá más rápido y accedé a los catálogos.">
      {config.google && (
        <>
          <BotaoGoogle redirect={destino} texto="Registrarme con Google" />
          <Separador />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Campo id="nome" label="Nombre completo" icone={User} erro={mostrar("nome_completo")}>
          <input id="nome" autoComplete="name" placeholder="Juan Pérez" value={f.nome_completo} onChange={(e) => set("nome_completo")(e.target.value)} onBlur={marcar("nome_completo")} className={inputCls(true, !!mostrar("nome_completo"))} />
        </Campo>
        <Campo id="email" label="E-mail" icone={Mail} erro={mostrar("email")}>
          <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" value={f.email} onChange={(e) => set("email")(e.target.value)} onBlur={marcar("email")} className={inputCls(true, !!mostrar("email"))} />
        </Campo>
        <Campo id="tel" label="Celular (WhatsApp)" erro={mostrar("telefone")} dica="Te escribimos por acá con el precio de tus repuestos.">
          <div onBlur={marcar("telefone")}><CampoCelular id="tel" value={f.telefone} onChange={set("telefone")} invalido={!!mostrar("telefone")} /></div>
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <Campo id="depto" label="Departamento" icone={MapPin}>
            <select id="depto" value={f.departamento} onChange={(e) => set("departamento")(e.target.value)} className={cn(inputCls(true), "appearance-none pr-8")}>
              <option value="">Elegí…</option>
              {DEPARTAMENTOS_UY.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Campo>
          <Campo id="cidade" label="Ciudad">
            <input id="cidade" autoComplete="address-level2" placeholder="Ej.: Tacuarembó" value={f.cidade} onChange={(e) => set("cidade")(e.target.value)} className={inputCls(false)} />
          </Campo>
        </div>
        <Campo id="senha" label="Contraseña" icone={Lock} erro={mostrar("senha")} dica={<ForcaSenha senha={f.senha} />}>
          <CampoSenha id="senha" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={f.senha} onChange={(e) => set("senha")(e.target.value)} onBlur={marcar("senha")} invalido={!!mostrar("senha")} />
        </Campo>
        <Campo
          id="confirmar"
          label="Confirmá la contraseña"
          icone={Lock}
          erro={mostrar("confirmar")}
          dica={f.confirmar && !erros.confirmar ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Las contraseñas coinciden</span> : null}
        >
          <CampoSenha id="confirmar" autoComplete="new-password" placeholder="Repetí la contraseña" value={f.confirmar} onChange={(e) => set("confirmar")(e.target.value)} onBlur={marcar("confirmar")} invalido={!!mostrar("confirmar")} />
        </Campo>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
          <input type="checkbox" checked={aceita} onChange={(e) => { setAceita(e.target.checked); if (e.target.checked) setError(null); }} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
          <span>Acepto los términos y la <a href="/ayuda#privacidad" target="_blank" className="font-semibold text-primary underline">política de privacidad</a>.</span>
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</p>}
        <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60">
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} {busy ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-6 text-center text-[15px] text-zinc-600">
        ¿Ya tenés cuenta?{" "}
        <Link to="/login" search={{ redirect: destino } as never} className="font-bold text-primary hover:underline">Ingresá</Link>
      </p>
    </AuthShell>
  );
}
