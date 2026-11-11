// Convite do despachante: a pessoa cria a própria senha pelo link (uso único, 7 dias) e entra no painel
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { conviteFn } from "@/lib/despachante/despachante";
import { avaliarSenha } from "@/lib/validacao-conta";

type Busca = { token: string };
export const Route = createFileRoute("/convite-despachante")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    token: String(s.token ?? "").slice(0, 64),
  }),
  head: () => ({
    meta: [
      { title: "Criar senha · Painel do despachante · AGRO PARTS" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Convite,
});

function Convite() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["convite", token],
    queryFn: () => conviteFn({ data: { token } }),
  });
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const regras = avaliarSenha(senha);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const r = await fetch("/api/despachante/convite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, senha, confirmar }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await qc.invalidateQueries();
      navigate({ to: "/despachante" });
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <img src="/logo.png" alt="" className="h-12 w-auto" />
        <p className="mt-4 text-xs font-bold tracking-[0.18em] text-emerald-700">
          PAINEL DO DESPACHANTE
        </p>
        {isLoading ? (
          <Loader2 className="mt-6 h-5 w-5 animate-spin text-slate-400" />
        ) : !data ? (
          <>
            <h1 className="mt-1 text-xl font-bold">Link inválido ou vencido</h1>
            <p className="mt-2 text-sm text-slate-600">
              Peça um novo convite à AGRO PARTS. Cada link vale 7 dias e só pode ser usado uma vez.
            </p>
          </>
        ) : (
          <form onSubmit={enviar} className="mt-1 space-y-4">
            <div>
              <h1 className="text-xl font-bold">Olá, {data.nome.split(" ")[0]}!</h1>
              <p className="mt-1 text-sm text-slate-600">
                Crie sua senha para <b>{data.email}</b>.
              </p>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3"
              />
            </label>
            <ul className="space-y-0.5 text-xs">
              {regras.regras.map((r) => (
                <li key={r.texto} className={r.ok ? "text-emerald-700" : "text-slate-400"}>
                  {r.ok ? "✓" : "○"} {r.texto}
                </li>
              ))}
            </ul>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Repita a senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3"
              />
            </label>
            {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
            <button
              disabled={enviando || !regras.valida || senha !== confirmar}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 font-bold text-white disabled:opacity-40"
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}{" "}
              Criar senha e entrar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
