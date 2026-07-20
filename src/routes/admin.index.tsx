import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Tag, Factory, Boxes, Upload, ArrowRight } from "lucide-react";
import { getStats } from "@/lib/products";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: getStats });

  const cards = [
    { label: "Produtos", value: stats.data?.totalProducts, icon: Package, color: "text-primary" },
    { label: "Categorias", value: stats.data?.totalCategorias, icon: Tag, color: "text-accent" },
    { label: "Marcas", value: stats.data?.totalMarcas, icon: Factory, color: "text-primary" },
    { label: "Estoque total", value: stats.data?.estoqueTotal, icon: Boxes, color: "text-accent" },
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
                  {stats.isLoading
                    ? "…"
                    : (c.value ?? 0).toLocaleString("pt-BR")}
                </div>
              </div>
              <c.icon className={`h-8 w-8 ${c.color}`} />
            </div>
          </Card>
        ))}
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
