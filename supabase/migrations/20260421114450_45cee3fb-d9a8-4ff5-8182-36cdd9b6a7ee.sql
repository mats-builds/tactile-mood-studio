
-- Products imported via the bulk-import pipeline
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  name TEXT NOT NULL,
  maker TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'EUR',
  category TEXT,
  image_url TEXT,
  original_image_url TEXT,
  specs JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX products_source_url_key ON public.products (source_url);
CREATE INDEX products_status_idx ON public.products (status);
CREATE INDEX products_job_idx ON public.products (job_id);

-- Bulk-import jobs
CREATE TABLE public.import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_url TEXT NOT NULL,
  max_items INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'running',
  total INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  current_label TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX import_jobs_created_idx ON public.import_jobs (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_import_jobs_updated
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: read-only for the public anon role; writes go through the edge function (service role bypasses RLS).
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Import jobs are viewable by everyone"
  ON public.import_jobs FOR SELECT USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_jobs;
