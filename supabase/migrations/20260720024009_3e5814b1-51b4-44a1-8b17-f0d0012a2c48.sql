GRANT INSERT, UPDATE ON public.products TO sandbox_exec;
CREATE POLICY "sandbox exec write products" ON public.products FOR ALL TO sandbox_exec USING (true) WITH CHECK (true);