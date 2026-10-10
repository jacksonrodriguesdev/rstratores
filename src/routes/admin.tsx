import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, Upload, LogOut, Tags, Calculator, Image, Flame, Globe2, BookOpen, ShoppingCart, Mail,
  Zap, Images, ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, X, ExternalLink, Home, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSessionFn } from "@/lib/user-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — AGRO PARTS" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

// Menu do painel. Itens com `sub` abrem e fecham com clique (e já abrem quando a página atual está dentro).
type Sub = { to: string; label: string; search?: Record<string, string> };
type Item = { label: string; icon: LucideIcon; to?: string; search?: Record<string, string>; exact?: boolean; sub?: Sub[] };
type Grupo = { titulo: string; itens: Item[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Visão geral",
    itens: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/admin/visitantes", label: "Visitantes", icon: Globe2 },
      { to: "/admin/interesse", label: "Interesse dos clientes", icon: Flame },
    ],
  },
  {
    titulo: "Vendas",
    itens: [
      { to: "/admin/cotacoes", label: "Cotações", icon: Calculator },
      { to: "/admin/carrinhos", label: "Carrinhos", icon: ShoppingCart },
      { to: "/admin/emails", label: "E-mail marketing", icon: Mail },
    ],
  },
  {
    titulo: "Catálogo",
    itens: [
      {
        label: "Produtos",
        icon: Package,
        sub: [
          { to: "/admin/produtos", label: "Todos os produtos" },
          { to: "/admin/precificar", label: "Precificar uma a uma" },
          { to: "/admin/fotos-lote", label: "Fotos em lote" },
          { to: "/admin/upload", label: "Importar planilha" },
          ...(AUTOMOTIVA_ATIVA ? [{ to: "/admin/pellegrino", label: "Extração Pellegrino" }] : []),
        ],
      },
      AUTOMOTIVA_ATIVA
        ? {
            label: "Categorias",
            icon: Tags,
            sub: [
              { to: "/admin/categorias", search: { linha: "AGRICOLA" }, label: "Linha Agrícola" },
              { to: "/admin/categorias", search: { linha: "AUTOMOTIVA" }, label: "Linha Automotiva" },
            ],
          }
        : { to: "/admin/categorias", search: { linha: "AGRICOLA" }, label: "Categorias", icon: Tags },
      { to: "/admin/catalogos", label: "Catálogos (PDF)", icon: BookOpen },
    ],
  },
  {
    titulo: "Site",
    itens: [
      { to: "/admin/homepage", label: "Página inicial", icon: Home },
      { to: "/admin/banners", label: "Banners", icon: Image },
    ],
  },
];

const ativo = (path: string, to: string, exact?: boolean) => (exact ? path === to : path === to || path.startsWith(to + "/"));
const CHAVE = "admin_menu_recolhido";

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [authorized, setAuthorized] = useState(false);
  const [usuario, setUsuario] = useState<{ nome: string; email: string } | null>(null);
  const [recolhido, setRecolhido] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getSessionFn()
      .then((session) => {
        if (session?.role === "ADMIN") {
          setUsuario({ nome: session.nome, email: session.email });
          setAuthorized(true);
        } else window.location.href = "/login";
      })
      .catch(() => (window.location.href = "/login"));
    try {
      setRecolhido(localStorage.getItem(CHAVE) === "1");
    } catch {}
  }, []);

  // Fecha a gaveta do celular ao trocar de página
  useEffect(() => setGaveta(false), [path]);

  const alternarRecolhido = () => {
    setRecolhido((v) => {
      try {
        localStorage.setItem(CHAVE, v ? "0" : "1");
      } catch {}
      return !v;
    });
  };
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    navigate({ to: "/login" });
  };

  if (!authorized) return null;

  const iniciais = (usuario?.nome ?? "AD").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const Navegacao = ({ compacto }: { compacto: boolean }) => (
    <nav className="flex flex-col gap-5">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          {compacto ? <div className="mx-auto mb-2 h-px w-8 bg-border" /> : (
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{g.titulo}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {g.itens.map((it) => {
              if (it.sub) {
                const dentro = it.sub.some((s) => ativo(path, s.to));
                const aberto = abertos[it.label] ?? dentro;
                if (compacto) {
                  // Recolhido: o ícone leva à primeira subpágina
                  return (
                    <li key={it.label}>
                      <Link to={it.sub[0].to as any} search={it.sub[0].search as any} title={it.label}
                        className={cn("mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition", dentro ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <it.icon className="h-5 w-5" />
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={it.label}>
                    <button type="button" onClick={() => setAbertos((a) => ({ ...a, [it.label]: !aberto }))} aria-expanded={aberto}
                      className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition", dentro ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                      <it.icon className={cn("h-4 w-4 shrink-0", dentro ? "text-primary" : "opacity-70")} />
                      <span className="flex-1 text-left">{it.label}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", aberto && "rotate-180")} />
                    </button>
                    {aberto && (
                      <ul className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l pl-3">
                        {it.sub.map((s) => {
                          const on = ativo(path, s.to);
                          return (
                            <li key={s.label}>
                              <Link to={s.to as any} search={s.search as any}
                                className={cn("block rounded-md px-3 py-2 text-sm transition", on ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                                {s.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }
              const on = ativo(path, it.to!, it.exact);
              return (
                <li key={it.label}>
                  <Link to={it.to as any} search={it.search as any} title={compacto ? it.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition",
                      compacto ? "mx-auto h-11 w-11 justify-center rounded-xl" : "px-3 py-2.5",
                      on ? (compacto ? "bg-primary text-white" : "bg-primary/10 text-primary") : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}>
                    <it.icon className={cn("shrink-0", compacto ? "h-5 w-5" : "h-4 w-4", !on && !compacto && "opacity-70")} />
                    {!compacto && <span>{it.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const Marca = ({ compacto }: { compacto: boolean }) => (
    <Link to="/admin" className={cn("flex items-center gap-3", compacto && "justify-center")}>
      <img src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
      {!compacto && (
        <div className="leading-tight">
          <p className="text-lg font-black tracking-tight text-primary">AGRO PARTS</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Painel de controle</p>
        </div>
      )}
    </Link>
  );

  const Rodape = ({ compacto }: { compacto: boolean }) => (
    <div className={cn("border-t p-3", compacto && "px-2")}>
      {!compacto && (
        <div className="mb-2 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{iniciais}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{usuario?.nome ?? "Administrador"}</p>
            <p className="truncate text-xs text-muted-foreground">{usuario?.email}</p>
          </div>
        </div>
      )}
      <div className={cn("flex gap-1", compacto ? "flex-col items-center" : "")}>
        <a href="/" target="_blank" rel="noreferrer" title="Ver o site"
          className={cn("flex items-center gap-2 rounded-lg text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground", compacto ? "h-10 w-10 justify-center" : "flex-1 px-3 py-2")}>
          <ExternalLink className="h-4 w-4" /> {!compacto && "Ver site"}
        </a>
        <button onClick={handleLogout} title="Sair do painel"
          className={cn("flex items-center gap-2 rounded-lg text-sm text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive", compacto ? "h-10 w-10 justify-center" : "flex-1 px-3 py-2")}>
          <LogOut className="h-4 w-4" /> {!compacto && "Sair"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Computador: barra lateral fixa, recolhível */}
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card shadow-sm transition-[width] duration-200 lg:flex", recolhido ? "w-[76px]" : "w-64")}>
        <div className={cn("flex items-center justify-between gap-2 p-4", recolhido && "flex-col px-2")}>
          <Marca compacto={recolhido} />
          <button onClick={alternarRecolhido} title={recolhido ? "Abrir menu" : "Recolher menu"} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            {recolhido ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>
        <div className={cn("flex-1 overflow-y-auto pb-4 [scrollbar-width:thin]", recolhido ? "px-2" : "px-3")}>
          <Navegacao compacto={recolhido} />
        </div>
        <Rodape compacto={recolhido} />
      </aside>

      {/* Celular: barra no topo + gaveta */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 shadow-sm lg:hidden">
        <button onClick={() => setGaveta(true)} className="rounded-lg p-2 hover:bg-muted" aria-label="Abrir menu"><Menu className="h-6 w-6" /></button>
        <Marca compacto={false} />
        <button onClick={handleLogout} className="rounded-lg p-2 text-muted-foreground hover:text-destructive" aria-label="Sair"><LogOut className="h-5 w-5" /></button>
      </header>
      {gaveta && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGaveta(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-card shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4">
              <Marca compacto={false} />
              <button onClick={() => setGaveta(false)} className="rounded-lg p-2 hover:bg-muted" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4"><Navegacao compacto={false} /></div>
            <Rodape compacto={false} />
          </div>
        </div>
      )}

      <main className={cn("transition-[padding] duration-200", recolhido ? "lg:pl-[76px]" : "lg:pl-64")}>
        <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
