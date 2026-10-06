import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Package,
  Upload,
  LogOut,
  ImageIcon,
  Tags,
  Calculator,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSessionFn } from "@/lib/user-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — RS Auto Peças" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

const groups: any[] = [
  {
    title: "Visão Geral",
    links: [
      { to: "/admin", search: undefined, label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Catálogo",
    links: [
      {
        label: "Produtos",
        icon: Package,
        exact: false,
        sublinks: [
          { to: "/admin/produtos", search: { linha: "AGRICOLA" }, label: "Linha Agrícola" },
          // Linha automotiva desligada — ver src/lib/linhas.ts
          ...(AUTOMOTIVA_ATIVA
            ? [{ to: "/admin/produtos", search: { linha: "AUTOMOTIVA" }, label: "Linha Automotiva" }]
            : []),
        ],
      },
      {
        label: "Categorias",
        icon: Tags,
        exact: false,
        sublinks: [
          { to: "/admin/categorias", search: { linha: "AGRICOLA" }, label: "Linha Agrícola" },
          ...(AUTOMOTIVA_ATIVA
            ? [{ to: "/admin/categorias", search: { linha: "AUTOMOTIVA" }, label: "Linha Automotiva" }]
            : []),
        ],
      },
    ],
  },
  {
    title: "Sistema",
    links: [
      {
        to: "/admin/upload",
        search: undefined,
        label: "Upload em lote",
        icon: Upload,
        exact: false,
      },
      // Extração Pellegrino alimenta o catálogo automotivo — oculta junto com a linha
      ...(AUTOMOTIVA_ATIVA
        ? [
            {
              to: "/admin/pellegrino",
              search: undefined,
              label: "Extração Pellegrino",
              icon: Package,
              exact: false,
            },
          ]
        : []),
      {
        to: "/admin/homepage",
        search: undefined,
        label: "Página Inicial (CMS)",
        icon: LayoutDashboard,
        exact: false,
      },
      { to: "/admin/banners", search: undefined, label: "Banners", icon: Image, exact: false },
      {
        to: "/admin/cotacoes",
        search: undefined,
        label: "Cotações",
        icon: Calculator,
        exact: false,
      },
    ],
  },
];

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState(false);
  const [usuario, setUsuario] = useState<{ nome: string; email: string } | null>(null);

  useEffect(() => {
    getSessionFn()
      .then((session) => {
        if (session?.role === "ADMIN") {
          setUsuario({ nome: session.nome, email: session.email });
          setAuthorized(true);
        }
        else window.location.href = "/login";
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    navigate({ to: "/login" });
  };

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
      <aside className="flex border-r bg-card lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between shadow-sm z-10">
        <div className="flex flex-col p-4 lg:p-6 w-full">
          <div className="mb-8 hidden lg:block">
            <img src="/logo.png" alt="" width={56} height={56} className="mb-3 h-14 w-14" />
            <h1 className="text-2xl font-black tracking-tight text-primary">RS Admin</h1>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
              Painel de Controle
            </p>
          </div>

          <nav className="flex lg:flex-col gap-6 overflow-x-auto lg:overflow-visible w-full [scrollbar-width:none]">
            {groups.map((group) => (
              <div key={group.title} className="flex flex-col gap-1 min-w-[120px] lg:min-w-0">
                <div className="text-[11px] font-bold uppercase text-muted-foreground/70 mb-2 px-3 hidden lg:block">
                  {group.title}
                </div>
                <div className="flex lg:flex-col gap-1">
                  {group.links.map((t: any) => {
                    if (t.sublinks) {
                      return (
                        <div key={t.label} className="group relative flex flex-col">
                          <div className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all text-muted-foreground hover:bg-muted hover:text-foreground cursor-default">
                            <t.icon className="h-4 w-4 shrink-0 opacity-70 group-hover:text-primary" />
                            <span className="whitespace-nowrap">{t.label}</span>
                          </div>
                          <div className="hidden group-hover:flex flex-col pl-9 pr-2 pb-2 gap-1.5 lg:absolute lg:left-full lg:top-0 lg:ml-2 lg:w-48 lg:bg-popover lg:text-popover-foreground lg:border lg:rounded-md lg:shadow-md lg:p-2 lg:z-50">
                            {t.sublinks.map((sub: any) => {
                              const isActive =
                                location.pathname === sub.to &&
                                (!sub.search ||
                                  (location.search as any).linha === sub.search.linha);
                              return (
                                <Link
                                  key={sub.label}
                                  to={sub.to}
                                  search={sub.search}
                                  className={cn(
                                    "text-xs font-medium py-1.5 lg:px-3 lg:py-2 lg:rounded-sm transition-colors",
                                    isActive
                                      ? "text-primary lg:bg-primary/10"
                                      : "text-muted-foreground hover:text-foreground lg:hover:bg-muted",
                                  )}
                                >
                                  {sub.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    const isActiveExact =
                      location.pathname === t.to &&
                      (!t.search || (location.search as any).linha === (t.search as any).linha);
                    const active = t.exact
                      ? isActiveExact
                      : location.pathname.startsWith(t.to) &&
                        (!t.search || (location.search as any).linha === (t.search as any).linha);
                    return (
                      <Link
                        key={t.label}
                        to={t.to!}
                        search={t.search}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <t.icon
                          className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "opacity-70")}
                        />
                        <span className="whitespace-nowrap">{t.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-auto hidden border-t bg-muted/20 p-4 lg:block">
          <div className="mb-4 flex items-center gap-3 px-2">
            <Avatar className="h-10 w-10 border border-background shadow-sm">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {(usuario?.nome ?? "AD")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold truncate">{usuario?.nome ?? "Administrador"}</span>
              <span className="text-xs text-muted-foreground truncate">{usuario?.email}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair do painel
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between lg:hidden bg-card p-4 rounded-lg shadow-sm border">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
              <img src="/logo.png" alt="" width={32} height={32} className="h-8 w-8" /> RS Admin
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
