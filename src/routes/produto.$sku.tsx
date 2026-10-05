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
  ShoppingCart,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductImage } from "@/components/ProductImage";
import { QuoteButton } from "@/components/QuoteButton";
import { TrustCards } from "@/components/TrustCards";
import { ProductSlider } from "@/components/ProductSlider";
import { useLanguage } from "@/components/LanguageContext";
import { useCart } from "@/components/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getProduct,
  getProductImages,
  getRelatedProducts,
  getRelatedCategories,
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
        meta: [{ title: "Produto não encontrado" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.product;
    const title = `${p.nome} — SKU ${p.sku}`;
    const desc =
      `${p.nome}. ${p.categoria ?? ""} ${p.marca ?? ""}. Faça sua cotação pelo WhatsApp.`.trim();
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
  const { language, t } = useLanguage();
  const { addItem } = useCart();
  const [mainImage, setMainImage] = useState<string | null>(product.imagem_principal);

  const imagesQuery = useQuery({
    queryKey: ["product-images", product.sku],
    queryFn: () => getProductImages(product.sku),
  });

  const relatedQuery = useQuery({
    queryKey: ["related", product.sku, product.category_id],
    queryFn: () => getRelatedProducts(product.sku, product.category_id),
  });

  const categoriesQuery = useQuery({
    queryKey: ["related-categories", product.category_id],
    queryFn: () => getRelatedCategories(product.category_id),
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
        {categoriesQuery.data && categoriesQuery.data.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {t("product.categoriasQueTalvezPrecise")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {categoriesQuery.data.map((cat) => (
                <Link
                  key={cat.id}
                  to="/"
                  search={{ search: "", page: 1, linha: product.linha, categoria: cat.nome }}
                  className="rounded-full border bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {cat.nome}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("product.voltar")}
          </Link>
        </Button>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Gallery */}
          <div>
            <Card className="aspect-square overflow-hidden bg-muted p-0">
              <ProductImage
                src={mainImage}
                alt={language === "es-UY" && product.nome_es ? product.nome_es : product.nome}
              />
            </Card>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {gallery.map((path) => (
                  <button
                    key={path}
                    onClick={() => setMainImage(path)}
                    className={`aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                      mainImage === path
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/30"
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
              {language === "es-UY" && product.nome_es ? product.nome_es : product.nome}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">SKU: {product.sku}</p>

            {/* Detalhes Rápidos em Cards */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {product.marca && (
                <div className="rounded-xl border bg-muted/20 p-3 shadow-sm transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Factory className="h-3.5 w-3.5" /> {t("product.marca")}
                  </div>
                  <div className="mt-1 text-sm font-bold text-foreground">{product.marca}</div>
                </div>
              )}
              {product.categoria && (
                <div className="rounded-xl border bg-muted/20 p-3 shadow-sm transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> {t("product.categoria")}
                  </div>
                  <div
                    className="mt-1 line-clamp-1 text-sm font-bold text-foreground"
                    title={product.categoria}
                  >
                    {product.categoria}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-1 shadow-lg shadow-primary/10">
              <div className="rounded-xl bg-card p-6">
                <div className="mb-4 text-center">
                  <div className="text-sm font-semibold uppercase tracking-wide text-primary">
                    Venda Direta
                  </div>
                  <div className="mt-1 text-2xl font-black text-foreground">Consulte o Preço</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Temos a melhor negociação do mercado para você.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() =>
                      addItem({
                        sku: product.sku,
                        name: product.nome,
                        image: product.imagem_principal || undefined,
                        quantity: 1,
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white h-14 rounded-md font-bold text-lg uppercase tracking-wide hover:bg-primary/90 transition-colors shadow-xl shadow-primary/20"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Adicionar ao Carrinho
                  </button>
                  <QuoteButton
                    product={product}
                    size="lg"
                    fullWidth
                    label="Fazer cotação rápida"
                    className="h-14 text-lg bg-zinc-100 text-zinc-900 border border-zinc-200 hover:bg-zinc-200 transition-colors font-bold"
                  />
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Entrega rápida para Sul e Sudeste
                </div>
                {product.url && (
                  <div className="mt-4 flex justify-center border-t pt-4">
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver ficha completa do fabricante
                    </a>
                  </div>
                )}
              </div>
            </div>

            {product.descricao && (
              <div className="mt-6 rounded-lg border bg-card p-5">
                <h2 className="mb-2 text-base font-semibold">Descrição</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {language === "es-UY" && product.descricao_es
                    ? product.descricao_es
                    : product.descricao}
                </p>
              </div>
            )}

            {(product as any).fichas_tecnicas?.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                  <Package2 className="h-6 w-6 text-primary" /> Ficha Técnica
                </h2>
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    {(product as any).fichas_tecnicas.map((ficha: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between border-b border-muted/50 p-3 text-sm sm:even:border-l sm:last:border-b-0"
                      >
                        <span className="font-medium text-muted-foreground">{ficha.chave}</span>
                        <span className="text-right text-foreground font-semibold ml-4">
                          {ficha.valor}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(product as any).aplicacoes?.length > 0 && (
              <div className="mt-6 rounded-lg border bg-card p-5">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                  <Tag className="h-5 w-5 text-primary" /> Aplicações (Veículos Compatíveis)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Montadora</th>
                        <th className="px-3 py-2 font-medium">Veículo</th>
                        <th className="px-3 py-2 font-medium">Ano</th>
                        <th className="px-3 py-2 font-medium">Motor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30">
                      {(product as any).aplicacoes.map((app: any, idx: number) => (
                        <tr key={idx} className="transition-colors hover:bg-muted/20">
                          <td className="px-3 py-2 font-semibold">{app.montadora}</td>
                          <td className="px-3 py-2">{app.veiculo}</td>
                          <td className="px-3 py-2 text-muted-foreground">{app.ano || "-"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{app.motor || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(product as any).similares?.length > 0 && (
              <div className="mt-6 rounded-lg border bg-card p-5">
                <h2 className="mb-3 text-base font-semibold text-muted-foreground">
                  Códigos Similares (Outras Marcas)
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(product as any).similares.map((sim: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-muted/10 text-xs">
                      <span className="opacity-70 mr-1">{sim.marca_similar}:</span>{" "}
                      {sim.codigo_similar}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {product.veiculos_compativeis && (
              <div className="mt-6 rounded-lg border bg-card p-5">
                <h2 className="mb-2 text-base font-semibold">Veículos Compatíveis</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {product.veiculos_compativeis}
                </p>
              </div>
            )}

            {/* Specs summary */}
            <div className="mt-6 rounded-lg border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">Especificações</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <SpecRow label="SKU / Código" value={product.sku} />
                {product.categoria && <SpecRow label="Categoria" value={product.categoria} />}
                {product.marca && <SpecRow label="Marca" value={product.marca} />}
                {product.tamanho && <SpecRow label="Tamanho" value={product.tamanho} />}
                {product.altura != null && (
                  <SpecRow label="Altura" value={`${product.altura} cm`} />
                )}
                {product.largura != null && (
                  <SpecRow label="Largura" value={`${product.largura} cm`} />
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Trust cards */}
        <TrustCards />

        {/* Related */}
        {relatedQuery.data && relatedQuery.data.length > 0 && (
          <div className="mt-16 rounded-xl bg-muted/10 p-6 md:p-8">
            <h2 className="mb-6 text-2xl font-bold tracking-tight">
              Produtos que podem interessar
            </h2>
            <ProductSlider title="" products={relatedQuery.data} />
          </div>
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
