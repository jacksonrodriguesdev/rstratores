import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Package2,
  Tag,
  Factory,
  CheckCircle2,
  ShoppingCart,
  Check,
  ChevronRight,
  Copy,
  Truck,
  ShieldCheck,
  MessageCircle,
  Search,
  Share2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductImage } from "@/components/ProductImage";
import { QuoteButton } from "@/components/QuoteButton";
import { TrustCards } from "@/components/TrustCards";
import { ProductSlider } from "@/components/ProductSlider";
import { useCart } from "@/components/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getProduct, getProductImages, getRelatedProducts, codigoExibicao, marcaExibicao } from "@/lib/products";
import { categoriaEs, descricaoEs, nomeEs, nomeProduto } from "@/lib/pecas-es";
import { whatsappQuoteUrl } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { registrarVisto } from "@/hooks/use-vistos";

const SITE = SITE_URL;
const urlImagem = (p: string) => (p.startsWith("http") ? p : `${SITE}${p.startsWith("/") ? p : `/uploads/${p}`}`);

export const Route = createFileRoute("/produto/$sku")({
  loader: async ({ params }) => {
    const product = await getProduct(params.sku);
    if (!product) throw notFound();
    // Versão agrupada: mantém links antigos funcionando levando ao produto principal.
    if (product.duplicado_de) {
      throw redirect({ to: "/produto/$sku", params: { sku: product.duplicado_de } });
    }
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Repuesto no encontrado" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.product;
    const nome = nomeProduto(p);
    const marca = marcaExibicao(p);
    const codigo = codigoExibicao(p);
    // "RODAMIENTO 6205 Massey Ferguson — Cód. 6205 | AGRO PARTS": nome, marca e código são o que se busca
    const title = `${nome}${marca ? ` ${marca}` : ""} — Cód. ${codigo} | AGRO PARTS`;
    const desc = `${nome.charAt(0)}${nome.slice(1).toLowerCase()}, código ${codigo}${
      marca ? `, para ${marca}` : ""
    }. Envío a todo Uruguay por DAC. Consultá precio y disponibilidad por WhatsApp.`;
    const url = `${SITE}/produto/${encodeURIComponent(p.sku)}`;
    // "redeparts" é o logo do fornecedor usado como foto provisória: não serve como imagem da peça
    const temFoto = !!p.imagem_principal && !p.imagem_principal.includes("redeparts");
    const imagem = temFoto ? urlImagem(p.imagem_principal!) : `${SITE}/icon-512.png`;
    // Dados estruturados: o Google entende nome, código e marca da peça (resultado mais completo)
    const produtoLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: nome,
      sku: p.sku,
      mpn: codigo,
      image: [imagem],
      description: descricaoEs(p),
      category: categoriaEs(p.categoria) || undefined,
      ...(marca && { brand: { "@type": "Brand", name: marca } }),
      url,
    };
    const trilhaLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
        ...(p.categoria
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: categoriaEs(p.categoria),
                item: `${SITE}/loja?categoria=${encodeURIComponent(p.categoria)}`,
              },
            ]
          : []),
        { "@type": "ListItem", position: p.categoria ? 3 : 2, name: nome, item: url },
      ],
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:image", content: imagem },
        { name: "twitter:image", content: imagem },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(produtoLd) },
        { type: "application/ld+json", children: JSON.stringify(trilhaLd) },
      ],
    };
  },
  errorComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">No pudimos cargar el repuesto</h1>
        <p className="mt-2 text-sm text-muted-foreground">Probá recargar la página en unos segundos.</p>
        <Button asChild className="mt-6">
          <Link to="/loja">Volver al catálogo</Link>
        </Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Repuesto no encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El código no existe o fue retirado del catálogo. Buscá otra pieza o consultanos por WhatsApp.
        </p>
        <Button asChild className="mt-6">
          <Link to="/loja">Ver catálogo</Link>
        </Button>
      </div>
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const { items, addItem, setIsCartOpen } = useCart();
  const marca = marcaExibicao(product);
  const nome = nomeProduto(product);
  const codigo = codigoExibicao(product);
  const naCotacao = items.some((i) => i.sku === product.sku);
  const [mainImage, setMainImage] = useState<string | null>(product.imagem_principal);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    registrarVisto(product.sku);
    setMainImage(product.imagem_principal);
  }, [product.sku]);

  const imagesQuery = useQuery({
    queryKey: ["product-images", product.sku],
    queryFn: () => getProductImages(product.sku),
  });

  const relatedQuery = useQuery({
    queryKey: ["related", product.sku, product.category_id],
    queryFn: () => getRelatedProducts(product.sku, product.category_id),
  });

  const gallery = [
    product.imagem_principal,
    ...(imagesQuery.data ?? []).filter((i) => i.image_path !== product.imagem_principal).map((i) => i.image_path),
  ].filter(Boolean) as string[];

  const adicionar = () => {
    if (!naCotacao) {
      addItem({
        sku: product.sku,
        codigo,
        name: product.nome,
        nameEs: nome,
        image: product.imagem_principal || undefined,
        quantity: 1,
      });
    }
    setIsCartOpen(true);
  };

  // Compartilhar: menu nativo do celular; no computador, abre o WhatsApp com o link
  const compartilhar = async () => {
    const url = `${SITE_URL}/produto/${encodeURIComponent(product.sku)}`;
    const texto = `${nome} — Cód. ${codigo}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: texto, text: texto, url });
        return;
      }
    } catch {
      return; // cliente cancelou
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${texto}\n${url}`)}`, "_blank");
  };

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* navegador sem permissão de cópia: nada a fazer */
    }
  };

  const p = product as any;

  return (
    <div className="min-h-screen bg-zinc-50">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
        {/* Trilha */}
        <nav aria-label="Ruta" className="mb-4 flex min-w-0 items-center gap-1 text-xs text-zinc-500 md:text-sm">
          <Link to="/" className="shrink-0 hover:text-primary">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            to="/loja"
            search={(product.categoria ? { categoria: product.categoria } : {}) as never}
            className="shrink-0 hover:text-primary"
          >
            {product.categoria ? categoriaEs(product.categoria) : "Catálogo"}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-zinc-700">{nome}</span>
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-2 md:gap-10 md:p-8">
          {/* Galeria */}
          <div className="min-w-0">
            <Card className="aspect-square overflow-hidden border-zinc-100 bg-white p-0 shadow-none">
              <ProductImage src={mainImage} alt={nome} marca={marca} className="object-contain" />
            </Card>
            {product.imagem_origem && mainImage === product.imagem_principal && (
              <p className="mt-2 text-xs text-muted-foreground">
                Imagen ilustrativa. Confirmá la pieza por el código antes de comprar.
              </p>
            )}
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {gallery.map((path) => (
                  <button
                    key={path}
                    onClick={() => setMainImage(path)}
                    aria-label="Ver imagen"
                    className={cn(
                      "aspect-square overflow-hidden rounded-md border-2 transition-colors",
                      mainImage === path ? "border-primary" : "border-transparent hover:border-muted-foreground/30",
                    )}
                  >
                    <ProductImage src={path} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações e compra */}
          <div className="flex min-w-0 flex-col">
            <div className="mb-3 flex flex-wrap gap-2">
              {product.categoria && (
                <Badge variant="secondary">
                  <Tag className="mr-1 h-3 w-3" />
                  {categoriaEs(product.categoria)}
                </Badge>
              )}
              {marca && (
                <Badge variant="outline">
                  <Factory className="mr-1 h-3 w-3" />
                  {marca}
                </Badge>
              )}
            </div>

            <h1 className="break-words text-2xl font-extrabold leading-tight text-zinc-900 md:text-3xl">{nome}</h1>

            <button
              onClick={copiarCodigo}
              className="mt-3 flex w-max items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-primary hover:text-primary"
              title="Copiar código"
            >
              <span className="text-zinc-500">Código:</span>
              <span className="font-mono font-bold">{codigo}</span>
              {copiado ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              onClick={compartilhar}
              className="mt-2 flex w-max items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-primary"
            >
              <Share2 className="h-4 w-4" /> Compartir
            </button>
            {nome !== product.nome && (
              <p className="mt-2 break-words text-xs text-zinc-400">Descripción original: {product.nome}</p>
            )}

            {/* Caixa de compra */}
            <div className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-white p-5 shadow-lg shadow-primary/10">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Precio por consulta</p>
              <p className="mt-1 text-sm text-zinc-600">
                Escribinos y te pasamos el precio, la disponibilidad y el costo de envío a tu localidad.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <QuoteButton
                  product={product}
                  size="lg"
                  fullWidth
                  label="Consultar precio por WhatsApp"
                  className="h-14 text-base font-bold shadow-lg shadow-[#25D366]/30 md:text-lg"
                />
                <button
                  onClick={adicionar}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-primary font-bold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  {naCotacao ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                  {naCotacao ? "En tu cotización · ver lista" : "Agregar a mi cotización"}
                </button>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                <li className="flex items-center gap-2">
                  <Truck className="h-4 w-4 shrink-0 text-primary" /> Envío a todo Uruguay por DAC, con seguimiento
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> Confirmamos la compatibilidad antes de enviar
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Sin compromiso de compra
                </li>
              </ul>
            </div>

            <div className="mt-6 rounded-xl border bg-white p-5">
              <h2 className="mb-2 text-base font-bold">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{descricaoEs(product)}</p>
            </div>

            {p.fichas_tecnicas?.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <Package2 className="h-5 w-5 text-primary" /> Ficha técnica
                </h2>
                <div className="overflow-hidden rounded-xl border bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    {p.fichas_tecnicas.map((ficha: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between border-b border-muted/50 p-3 text-sm sm:last:border-b-0 sm:even:border-l"
                      >
                        <span className="font-medium text-muted-foreground">{nomeEs(ficha.chave)}</span>
                        <span className="ml-4 text-right font-semibold">{ficha.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {p.aplicacoes?.length > 0 && (
              <div className="mt-6 rounded-xl border bg-white p-5">
                <h2 className="mb-4 text-base font-bold">Aplicaciones (tractores compatibles)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Marca</th>
                        <th className="px-3 py-2 font-medium">Modelo</th>
                        <th className="px-3 py-2 font-medium">Año</th>
                        <th className="px-3 py-2 font-medium">Motor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30">
                      {p.aplicacoes.map((app: any, idx: number) => (
                        <tr key={idx}>
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

            {p.similares?.length > 0 && (
              <div className="mt-6 rounded-xl border bg-white p-5">
                <h2 className="mb-3 text-base font-bold">Códigos equivalentes (otras marcas)</h2>
                <div className="flex flex-wrap gap-2">
                  {p.similares.map((sim: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <span className="mr-1 opacity-70">{sim.marca_similar}:</span> {sim.codigo_similar}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {product.veiculos_compativeis && (
              <div className="mt-6 rounded-xl border bg-white p-5">
                <h2 className="mb-2 text-base font-bold">Tractores compatibles</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                  {product.veiculos_compativeis}
                </p>
              </div>
            )}

            {product.variantes && product.variantes.length > 0 && (
              <div className="mt-6 rounded-xl border bg-white p-5">
                <h2 className="mb-1 text-base font-bold">Versiones disponibles</h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  Esta pieza también está disponible con estos códigos y fabricantes. Indicá en la consulta cuál
                  preferís.
                </p>
                <ul className="divide-y text-sm">
                  {product.variantes.map((v) => (
                    <li key={v.sku} className="flex items-center justify-between gap-4 py-2">
                      <span className="font-medium">{v.codigo_fabricante || v.sku.toUpperCase()}</span>
                      <span className="text-muted-foreground">{v.fabricante || "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 rounded-xl border bg-white p-5">
              <h2 className="mb-3 text-base font-bold">Especificaciones</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <SpecRow label="Código" value={codigo} />
                {product.fabricante && <SpecRow label="Fabricante" value={product.fabricante} />}
                {product.categoria && <SpecRow label="Categoría" value={categoriaEs(product.categoria)} />}
                {marca && <SpecRow label="Marca" value={marca} />}
                {product.tamanho && <SpecRow label="Medida" value={product.tamanho} />}
                {product.altura != null && <SpecRow label="Alto" value={`${product.altura} cm`} />}
                {product.largura != null && <SpecRow label="Ancho" value={`${product.largura} cm`} />}
              </dl>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <Search className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                ¿No estás seguro de que sea la pieza correcta? Mandanos el modelo y el número de serie de tu
                tractor por WhatsApp y te lo confirmamos.
              </p>
            </div>
          </div>
        </div>

        <TrustCards />

        {relatedQuery.data && relatedQuery.data.length > 0 && (
          <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm md:p-8">
            <h2 className="mb-4 text-xl font-bold tracking-tight md:text-2xl">También te puede interesar</h2>
            <ProductSlider title="" products={relatedQuery.data} />
          </div>
        )}
      </main>

      {/* Barra de compra fixa no celular (acima da barra de navegação) */}
      <div className="fixed inset-x-0 bottom-[var(--barra-inferior)] z-40 border-t border-zinc-200 bg-white px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
        <div className="flex gap-2">
          <button
            onClick={adicionar}
            aria-label={naCotacao ? "Ver mi cotización" : "Agregar a mi cotización"}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 transition active:scale-95",
              naCotacao ? "border-primary bg-primary text-white" : "border-primary text-primary",
            )}
          >
            {naCotacao ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
          </button>
          <a
            href={whatsappQuoteUrl(product)}
            target="_blank"
            rel="noreferrer noopener"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-white shadow-lg shadow-[#25D366]/30 active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" /> Consultar precio
          </a>
        </div>
      </div>
      {/* Espaço para a barra fixa não cobrir o fim da página */}
      <div className="h-16 md:hidden" aria-hidden />
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
