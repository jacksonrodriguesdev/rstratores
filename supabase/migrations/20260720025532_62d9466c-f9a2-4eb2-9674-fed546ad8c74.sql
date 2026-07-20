
CREATE TABLE public.site_visits (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  city TEXT,
  region TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_visits TO anon, authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site_visits" ON public.site_visits FOR SELECT USING (true);
CREATE INDEX site_visits_created_at_idx ON public.site_visits (created_at DESC);
CREATE INDEX site_visits_country_idx ON public.site_visits (country);
