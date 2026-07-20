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
  LineChart,
  Line,
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
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="mt-1 text-3xl font-bold">
                  {stats.isLoading || analytics.isLoading
                    ? "…"
                    : (c.value ?? 0).toLocaleString("pt-BR")}
                </div>
              </div>
              <c.icon className={`h-8 w-8 ${c.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Analytics */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Acessos nos últimos 30 dias</h2>
            <p className="text-sm text-muted-foreground">Visitas por dia</p>
          </div>
        </div>
        <div className="h-64 w-full">
          {analytics.data ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.data.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
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
