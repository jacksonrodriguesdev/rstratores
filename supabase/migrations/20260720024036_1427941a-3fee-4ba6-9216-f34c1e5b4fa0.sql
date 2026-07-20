DROP POLICY IF EXISTS "sandbox exec write products" ON public.products;
REVOKE INSERT, UPDATE ON public.products FROM sandbox_exec;