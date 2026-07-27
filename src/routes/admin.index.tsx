import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getStats } from "@/lib/products";

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
  devices: Array<{ name: string; value: number }>;
  topProducts: Array<{ name: string; value: number }>;
};

async function fetchAnalytics(): Promise<AnalyticsPayload> {
  const res = await fetch("/api/public/analytics", { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

function AdminDashboard() {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: getStats });
  const analytics = useQuery({ queryKey: ["admin-analytics"], queryFn: fetchAnalytics });

  const cards = [
    { label: "Produtos", value: stats.data?.totalProducts, icon: Package, color: "text-primary" },
    { label: "Categorias", value: stats.data?.totalCategorias, icon: Tag, color: "text-accent" },
    { label: "Marcas", value: stats.data?.totalMarcas, icon: Factory, color: "text-primary" },
    { label: "Estoque total", value: stats.data?.estoqueTotal, icon: Boxes, color: "text-accent" },
    {
      label: "Acessos (total)",
      value: analytics.data?.total,
      icon: Eye,
      color: "text-primary",
    },
    {
      label: "Acessos (30 dias)",
      value: analytics.data?.last30,
      icon: Eye,
      color: "text-accent",
    },
    {
      label: "Países",
      value: analytics.data?.countries.length,
      icon: Globe2,
      color: "text-primary",
    },
    {
      label: "Cidades",
      value: analytics.data?.cities.length,
      icon: MapPin,
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 border shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</div>
                <div className="mt-2 text-3xl font-black text-foreground">
                  {stats.isLoading || analytics.isLoading
                    ? "…"
                    : (c.value ?? 0).toLocaleString("pt-BR")}
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <c.icon className={`h-6 w-6 ${c.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Analytics */}
        <Card className="p-6 border shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Acessos nos últimos 30 dias</h2>
              <p className="text-sm text-muted-foreground font-medium">Visitas por dia na loja</p>
            </div>
          </div>
          <div className="h-72 w-full">
            {analytics.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.data.days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVisits)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {analytics.isLoading ? "Carregando…" : "Sem dados ainda"}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Top países</h2>
          <p className="mb-3 text-sm text-muted-foreground">Últimos 30 dias</p>
          <div className="h-72 w-full">
            {analytics.data && analytics.data.countries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.data.countries}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="url(#colorBar)" radius={[0, 4, 4, 0]} barSize={24} />
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
                <BarChart
                  data={analytics.data.cities}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Aparelhos</h2>
          <p className="mb-3 text-sm text-muted-foreground">Mobile vs Desktop</p>
          <div className="h-72 w-full">
            {analytics.data && analytics.data.devices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.data.devices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analytics.data.devices.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados ainda
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Top Produtos (SKU)</h2>
          <p className="mb-3 text-sm text-muted-foreground">Mais acessados</p>
          <div className="h-72 w-full">
            {analytics.data && analytics.data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.data.topProducts}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="url(#colorBar)" radius={[0, 4, 4, 0]} barSize={24} />
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Importar produtos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie um arquivo CSV com as colunas: sku, nome, preco_brl, categoria, marca, estoque, peso, url, imagem, descricao.
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
              Ver produtos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
