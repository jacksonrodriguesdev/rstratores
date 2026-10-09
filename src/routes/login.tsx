import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, Lock, Loader2, MessageCircle } from "lucide-react";
import { AuthShell, Campo, CampoSenha, BotaoGoogle, Separador, inputCls } from "@/components/auth/AuthShell";
import { getConfigLoginFn } from "@/lib/conta";
import { whatsappContactUrl } from "@/lib/whatsapp";

const ERROS: Record<string, string> = {
  google: "No pudimos ingresar con Google. Probá de nuevo.",
  google_cancelado: "Cancelaste el ingreso con Google.",
  google_no_configurado: "El ingreso con Google todavía no está disponible.",
};

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional(), erro: z.string().optional() }),
  loader: () => getConfigLoginFn(),
  head: () => ({ meta: [{ title: "Ingresar — AGRO PARTS" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, erro } = Route.useSearch();
  const config = Route.useLoaderData();
  const destino = redirect || "/cuenta";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(erro ? ERROS[erro] ?? null : null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha, redirect: destino }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Recarrega para o header e o resto do site pegarem a sessão
        window.location.href = data.destino || destino;
        return;
      }
      setError(data.error || "E-mail o contraseña incorrectos.");
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell titulo="Ingresá a tu cuenta" subtitulo="Cotizá más rápido y accedé a los catálogos.">
      {config.google && (
        <>
          <BotaoGoogle redirect={destino} />
          <Separador />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Campo id="email" label="E-mail" icone={Mail}>
          <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls()} />
        </Campo>
        <Campo id="senha" label="Contraseña" icone={Lock}>
          <CampoSenha id="senha" autoComplete="current-password" placeholder="Tu contraseña" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </Campo>
        <div className="flex justify-end">
          <a href={whatsappContactUrl("¡Hola! Olvidé mi contraseña de AGRO PARTS. Mi e-mail es: ")} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <MessageCircle className="h-4 w-4" /> ¿Olvidaste tu contraseña?
          </a>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</p>}
        <button type="submit" disabled={busy || !email || !senha} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50">
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      <p className="mt-6 text-center text-[15px] text-zinc-600">
        ¿No tenés cuenta?{" "}
        <Link to="/cadastro" search={{ redirect: destino } as never} className="font-bold text-primary hover:underline">Creá tu cuenta gratis</Link>
      </p>
    </AuthShell>
  );
}
