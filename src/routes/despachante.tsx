// Painel do despachante aduaneiro (/despachante): cotações, embarques, NCM e origem dos produtos,
// empresas compradoras, dados do exportador e ferramentas. Só papel DESPACHANTE (ou admin); os dados
// passam por assertDespachante no servidor.
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  PackageSearch,
  Wrench,
} from "lucide-react";
import { sessaoDespFn } from "@/lib/despachante/despachante";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/despachante")({
  head: () => ({
    meta: [
      { title: "Painel do despachante · AGRO PARTS" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LayoutDespachante,
});

const MENU = [
  { to: "/despachante", label: "Painel", icon: LayoutDashboard, exato: true },
  { to: "/despachante/cotacoes", label: "Cotações e embarques", icon: ClipboardList },
  { to: "/despachante/produtos", label: "Produtos, NCM e origem", icon: PackageSearch },
  { to: "/despachante/empresas", label: "Empresas compradoras", icon: Building2 },
  { to: "/despachante/ferramentas", label: "Ferramentas e guia", icon: Wrench },
] as const;

function LayoutDespachante() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: sessao, isLoading } = useQuery({
    queryKey: ["despachante-sessao"],
    queryFn: () => sessaoDespFn(),
  });
  if (isLoading)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  if (!sessao)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="max-w-sm text-center">
          <img src="/logo.png" alt="" className="mx-auto h-14 w-auto" />
          <h1 className="mt-4 text-xl font-bold">Painel do despachante</h1>
          <p className="mt-2 text-sm text-slate-600">
            Entre com a conta que a AGRO PARTS criou para você.
          </p>
          <Link
            to="/login"
            search={{ redirect: "/despachante" } as any}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-slate-950 px-6 font-bold text-white"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  const sair = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    navigate({ to: "/login" });
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
          <img src="/logo.png" alt="" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-extrabold">AGRO PARTS</p>
            <p className="text-[10px] font-bold tracking-[0.18em] text-emerald-700">DESPACHANTE</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {MENU.map((m) => {
            const ativo = "exato" in m ? pathname === m.to : pathname.startsWith(m.to);
            return (
              <Link
                key={m.to}
                to={m.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                  ativo ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <m.icon className="h-4 w-4" /> {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-4 text-sm">
          <p className="truncate font-semibold">{sessao.nome}</p>
          <p className="truncate text-xs text-slate-500">{sessao.email}</p>
          <button
            onClick={sair}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <img src="/logo.png" alt="" className="h-8 w-auto" />
          <p className="text-sm font-bold">Despachante</p>
          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {MENU.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="rounded-md p-2 text-slate-600"
                aria-label={m.label}
              >
                <m.icon className="h-4 w-4" />
              </Link>
            ))}
            <button onClick={sair} className="rounded-md p-2 text-slate-600" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
