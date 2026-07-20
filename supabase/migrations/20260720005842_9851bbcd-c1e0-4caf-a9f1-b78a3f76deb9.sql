
CREATE TABLE public.site_banners (
  id bigserial PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('hero','strip')),
  position integer NOT NULL DEFAULT 0,
  image_path text NOT NULL,
  link_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_banners TO anon, authenticated;
GRANT ALL ON public.site_banners TO service_role;
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site_banners" ON public.site_banners FOR SELECT USING (true);
