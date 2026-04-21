-- Allow updates on staging products and import_jobs (admin staging area, no public auth)
CREATE POLICY "Products are updatable by everyone"
ON public.products FOR UPDATE
USING (true) WITH CHECK (true);

CREATE POLICY "Products are deletable by everyone"
ON public.products FOR DELETE
USING (true);