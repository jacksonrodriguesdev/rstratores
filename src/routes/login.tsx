import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { login as legacyAdminLogin } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — RS Auto Parts" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      // Tenta login como cliente no DB
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha: password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Recarregar a página para o componente Root pegar a sessão (ou redirecionar)
        window.location.href = "/";
        return;
      }

      // Fallback para admin legado (sem DB)
      if (legacyAdminLogin(email, password)) {
        window.location.href = "/admin";
        return;
      }

      setError(data.error || "E-mail ou senha inválidos.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 flex-1">
        <Card className="w-full p-8 shadow-xl border-t-4 border-primary rounded-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">
              Já sou Cliente
            </h1>
            <p className="mt-2 text-sm text-zinc-500">Faça login com seu e-mail e senha.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="email">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="password">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary focus:ring-primary"
              />
            </div>
            {error && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-14 text-lg font-bold uppercase tracking-wider rounded-xl"
            >
              {busy ? "Entrando..." : "Entrar"}
            </Button>

            <div className="mt-6 text-center text-sm text-zinc-600 border-t pt-6">
              Ainda não tem cadastro?{" "}
              <Link to="/cadastro" className="text-primary font-bold hover:underline">
                Crie sua conta agora
              </Link>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
