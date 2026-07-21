import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ProductImage";
import {
  Package,
  Tag,
  Factory,
  Boxes,
  Upload,
  ArrowRight,
  Eye,
  Globe2,
  MapPin,
  DollarSign,
  ImageOff,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getStats, formatBRL } from "@/lib/products";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type AnalyticsPayload = {
  total: number;
  last30: number;
  countries: Array<{ name: string; value: number }>;
  cities: Array<{ name: string; value: number }>;
  paths: Array<{ name: string; value: number }>;
  days: Array<{ name: string; value: number }>;
  topProducts: Array<{ sku: string; nome: string; views: number; imagem_principal: string | null }>;
};

async function fetchAnalytics(): Promise<AnalyticsPayload> {
  const res = await fetch("/api/public/analytics", { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(148 55% 55%)",
  "hsl(82 75% 55%)",
  "hsl(200 65% 55%)",
  "hsl(25 75% 60%)",
  "hsl(280 55% 60%)",
  "hsl(340 65% 60%)",
];

function AdminDashboard() {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: getStats });
  const analytics = useQuery({ queryKey: ["admin-analytics"], queryFn: fetchAnalytics });

  const kpis = [
    { label: "Produtos", value: stats.data?.totalProducts, icon: Package, tone: "primary" as const },
    { label: "Categorias", value: stats.data?.totalCategorias, icon: Tag, tone: "accent" as const },
    { label: "Marcas", value: stats.data?.totalMarcas, icon: Factory, tone: "primary" as const },
    { label: "Estoque total", value: stats.data?.estoqueTotal, icon: Boxes, tone: "accent" as const },
    { label: "Acessos (total)", value: analytics.data?.total, icon: Eye, tone: "primary" as const },
    { label: "Acessos (30 dias)", value: analytics.data?.last30, icon: TrendingUp, tone: "accent" as const },
    { label: "Países", value: analytics.data?.countries.length, icon: Globe2, tone: "primary" as const },
    { label: "Cidades", value: analytics.data?.cities.length, icon: MapPin, tone: "accent" as const },
  ];

  const alerts = stats.data
    ? [
        {
          label: "Sem imagem",
          value: stats.data.semImagem,
          icon: ImageOff,
          tone: "warn" as const,
        },
        {
          label: "Sem estoque",
          value: stats.data.semEstoque,
          icon: AlertTriangle,
          tone: "warn" as const,
        },
        {
          label: "Sem preço",
          value: stats.data.semPreco,
          icon: DollarSign,
          tone: "warn" as const,
        },
        {
          label: "Preço médio",
          value: formatBRL(stats.data.avgPreco),
          icon: DollarSign,
          tone: "info" as const,
          isText: true,
        },
        {
          label: "Valor do estoque",
          value: formatBRL(stats.data.valorEstoque),
          icon: Boxes,
          tone: "info" as const,
          isText: true,
        },
      ]
    : [];

  const catPie = (stats.data?.porCategoria ?? []).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {kpis.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </div>
                <div className="mt-1 text-2xl font-bold md:text-3xl">
                  {stats.isLoading || analytics.isLoading
                    ? "…"
                    : (c.value ?? 0).toLocaleString("pt-BR")}
                </div>
              </div>
              <c.icon className={`h-7 w-7 shrink-0 ${c.tone === "primary" ? "text-primary" : "text-accent"}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Alertas / saúde do catálogo */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {alerts.map((a) => (
          <Card key={a.label} className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  a.tone === "warn" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"
                }`}
              >
                <a.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs text-muted-foreground">{a.label}</div>
                <div className="truncate text-lg font-bold">
                  {stats.isLoading
                    ? "…"
                    : a.isText
                      ? (a.value as string)
                      : (a.value as number).toLocaleString("pt-BR")}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Acessos por dia + Distribuição por categoria */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Acessos nos últimos 30 dias</h2>
            <p className="text-sm text-muted-foreground">Visitas por dia</p>
          </div>
          <div className="h-64 w-full">
            {analytics.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.data.days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {analytics.isLoading ? "Carregando…" : "Sem dados ainda"}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Produtos por categoria</h2>
            <p className="text-sm text-muted-foreground">Distribuição do catálogo</p>
          </div>
          <div className="h-64 w-full">
            {catPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {catPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top marcas + Faixa de preço */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Top 10 marcas</h2>
            <p className="text-sm text-muted-foreground">Marcas com mais produtos</p>
          </div>
          <div className="h-72 w-full">
            {stats.data && stats.data.porMarca.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.data.porMarca} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Faixa de preço (R$)</h2>
            <p className="text-sm text-muted-foreground">Quantidade de produtos por faixa</p>
          </div>
          <div className="h-72 w-full">
            {stats.data && stats.data.precoBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.data.precoBuckets} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top produtos mais visualizados */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Produtos mais visualizados</h2>
            <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/produtos">
              Gerenciar produtos <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {analytics.data && analytics.data.topProducts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {analytics.data.topProducts.slice(0, 5).map((p, i) => (
              <Link
                key={p.sku}
                to="/produto/$sku"
                params={{ sku: p.sku }}
                className="group flex gap-3 rounded-lg border p-2 transition-colors hover:bg-muted"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                  <ProductImage src={p.imagem_principal} alt={p.nome} />
                  <Badge className="absolute left-1 top-1 h-5 px-1.5 text-[10px]">#{i + 1}</Badge>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="line-clamp-2 text-xs font-medium leading-snug group-hover:text-primary">
                    {p.nome}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>SKU {p.sku}</span>
                    <span className="font-semibold text-foreground">{p.views} views</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            {analytics.isLoading ? "Carregando…" : "Sem visualizações ainda"}
          </div>
        )}
      </Card>

      {/* Top países + Top cidades */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Top países</h2>
          <p className="mb-3 text-sm text-muted-foreground">Últimos 30 dias</p>
          <div className="h-72 w-full">
            {analytics.data && analytics.data.countries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.data.countries} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados ainda
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Top cidades</h2>
          <p className="mb-3 text-sm text-muted-foreground">Últimos 30 dias</p>
          <div className="h-72 w-full">
            {analytics.data && analytics.data.cities.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.data.cities} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados ainda
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Páginas mais acessadas + atalhos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Páginas mais acessadas</h2>
          <p className="mb-3 text-sm text-muted-foreground">Últimos 30 dias</p>
          {analytics.data && analytics.data.paths.length > 0 ? (
            <ul className="divide-y">
              {analytics.data.paths.slice(0, 10).map((p) => (
                <li key={p.name} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate font-mono text-xs">{p.name}</span>
                  <Badge variant="secondary">{p.value.toLocaleString("pt-BR")}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem dados ainda</div>
          )}
        </Card>

        <div className="grid gap-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Importar produtos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie um CSV para adicionar ou atualizar itens em lote.
            </p>
            <Button asChild className="mt-4">
              <Link to="/admin/upload">
                <Upload className="mr-2 h-4 w-4" />
                Ir para upload
              </Link>
            </Button>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Gerenciar produtos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Buscar, editar e remover produtos cadastrados.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/admin/produtos">
                Ver produtos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
