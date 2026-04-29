CREATE POLICY "Authenticated users can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);