import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Package2,
  Scale,
  Tag,
  Factory,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductImage } from "@/components/ProductImage";
import { QuoteButton } from "@/components/QuoteButton";
import { TrustCards } from "@/components/TrustCards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getProduct,
  getProductImages,
  getRelatedProducts,
} from "@/lib/products";

export const Route = createFileRoute("/produto/$sku")({
  loader: async ({ params }) => {
    const product = await getProduct(params.sku);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Produto não encontrado" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData.product;
    const title = `${p.nome} — SKU ${p.sku}`;
    const desc = `${p.nome}. ${p.categoria ?? ""} ${p.marca ?? ""}. Faça sua cotação pelo WhatsApp.`.trim();
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(p.imagem_principal?.startsWith("http")
          ? [
              { property: "og:image", content: p.imagem_principal },
              { name: "twitter:image", content: p.imagem_principal },
            ]
          : []),
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Erro ao carregar produto</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button asChild className="mt-6">
          <Link to="/">Voltar ao catálogo</Link>
        </Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Produto não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O SKU informado não existe ou foi removido.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Voltar ao catálogo</Link>
        </Button>
      </div>
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const [mainImage, setMainImage] = useState<string | null>(product.imagem_principal);

  const imagesQuery = useQuery({
    queryKey: ["product-images", product.sku],
    queryFn: () => getProductImages(product.sku),
  });

  const relatedQuery = useQuery({
    queryKey: ["related", product.sku, product.categoria],
    queryFn: () => getRelatedProducts(product.sku, product.categoria),
  });

  const gallery = [
    product.imagem_principal,
    ...(imagesQuery.data ?? [])
      .filter((i) => i.image_path !== product.imagem_principal)
      .map((i) => i.image_path),
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao catálogo
          </Link>
        </Button>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Gallery */}
          <div>
            <Card className="aspect-square overflow-hidden bg-muted p-0">
              <ProductImage src={mainImage} alt={product.nome} />
            </Card>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {gallery.map((path) => (
                  <button
                    key={path}
                    onClick={() => setMainImage(path)}
                    className={`aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                      mainImage === path ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <ProductImage src={path} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="mb-3 flex flex-wrap gap-2">
              {product.categoria && (
                <Badge variant="secondary">
                  <Tag className="mr-1 h-3 w-3" />
                  {product.categoria}
                </Badge>
              )}
              {product.marca && (
                <Badge variant="outline">
                  <Factory className="mr-1 h-3 w-3" />
                  {product.marca}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-bold leading-tight md:text-3xl">
              {product.nome}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">SKU: {product.sku}</p>

            {/* Stock pill */}
            <div className="mt-3">
              {product.estoque > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Em estoque · {product.estoque} un.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <XCircle className="h-3.5 w-3.5" />
                  Sob consulta
                </span>
              )}
            </div>

            <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Consulte o preço pelo WhatsApp
                </div>
                <div className="mt-1 text-2xl font-bold text-primary">
                  Fazer cotação
                </div>
              </div>
              <QuoteButton
                product={product}
                size="lg"
                fullWidth
                label="Fazer cotação pelo WhatsApp"
              />
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <InfoLine
                  icon={<Package2 className="h-4 w-4" />}
                  label="Estoque"
                  value={`${product.estoque} un.`}
                  highlight={product.estoque > 0}
                />
                <InfoLine
                  icon={<Scale className="h-4 w-4" />}
                  label="Peso"
                  value={product.peso ? `${product.peso} kg` : "—"}
                />
              </div>
              {product.url && (
                <a
                  href={product.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver ficha completa do fabricante
                </a>
              )}
            </div>

            {product.descricao && (
              <div className="mt-6 rounded-lg border bg-card p-5">
                <h2 className="mb-2 text-base font-semibold">Descrição</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {product.descricao}
                </p>
              </div>
            )}

            {/* Specs summary */}
            <div className="mt-6 rounded-lg border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">Especificações</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <SpecRow label="SKU" value={product.sku} />
                {product.categoria && <SpecRow label="Categoria" value={product.categoria} />}
                {product.marca && <SpecRow label="Marca" value={product.marca} />}
                <SpecRow label="Estoque" value={`${product.estoque} un.`} />
                {product.peso != null && <SpecRow label="Peso" value={`${product.peso} kg`} />}
              </dl>
            </div>
          </div>
        </div>

        {/* Trust cards */}
        <TrustCards />

        {/* Related */}
        {relatedQuery.data && relatedQuery.data.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 text-xl font-semibold">Produtos relacionados</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {relatedQuery.data.map((p) => (
                <Card key={p.sku} className="flex flex-col overflow-hidden p-0 transition-all hover:shadow-md">
                  <Link
                    to="/produto/$sku"
                    params={{ sku: p.sku }}
                    className="block aspect-square bg-muted"
                  >
                    <ProductImage src={p.imagem_principal} alt={p.nome} />
                  </Link>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <Link
                      to="/produto/$sku"
                      params={{ sku: p.sku }}
                      className="line-clamp-2 text-sm font-medium hover:text-primary"
                    >
                      {p.nome}
                    </Link>
                    <div className="mt-auto pt-2">
                      <QuoteButton product={p} fullWidth />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}

function InfoLine({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-medium ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
