
GRANT INSERT, UPDATE, DELETE ON public.site_banners TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.site_banners_id_seq TO anon, authenticated;
CREATE POLICY "Anyone can insert site_banners" ON public.site_banners FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update site_banners" ON public.site_banners FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete site_banners" ON public.site_banners FOR DELETE USING (true);
