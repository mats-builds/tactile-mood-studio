CREATE TABLE public.room_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  input_image TEXT NOT NULL,
  output_image TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.room_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can create room jobs"
  ON public.room_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anyone can read room jobs"
  ON public.room_jobs FOR SELECT
  USING (true);

CREATE TRIGGER room_jobs_updated_at
  BEFORE UPDATE ON public.room_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();