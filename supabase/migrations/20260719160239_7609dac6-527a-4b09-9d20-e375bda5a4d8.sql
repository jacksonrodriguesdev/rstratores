
CREATE TABLE public.products (
  sku TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  preco_brl NUMERIC(10,2),
  categoria TEXT,
  marca TEXT,
  estoque INTEGER NOT NULL DEFAULT 0,
  peso NUMERIC(10,3),
  url TEXT,
  descricao TEXT,
  imagem_principal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_nome_idx ON public.products USING gin (to_tsvector('portuguese', coalesce(nome,'') || ' ' || coalesce(sku,'')));
CREATE INDEX products_categoria_idx ON public.products (categoria);
CREATE INDEX products_marca_idx ON public.products (marca);
CREATE INDEX products_preco_idx ON public.products (preco_brl);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products"
  ON public.products FOR SELECT
  USING (true);

CREATE TABLE public.product_images (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL REFERENCES public.products(sku) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'thumb',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku, image_path)
);

CREATE INDEX product_images_sku_idx ON public.product_images (sku);

GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product_images"
  ON public.product_images FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
