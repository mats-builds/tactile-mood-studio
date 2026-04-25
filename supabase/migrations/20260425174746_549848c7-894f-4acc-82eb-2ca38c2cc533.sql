
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Furniture (user-owned)
CREATE TABLE public.furniture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  maker TEXT,
  category TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'EUR',
  source_url TEXT,
  src TEXT,
  original_src TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  specs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.furniture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own furniture select" ON public.furniture FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own furniture insert" ON public.furniture FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own furniture update" ON public.furniture FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own furniture delete" ON public.furniture FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX furniture_user_idx ON public.furniture(user_id, created_at DESC);

CREATE TRIGGER furniture_updated_at BEFORE UPDATE ON public.furniture
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rooms (user moodboards)
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My room',
  background_image TEXT,
  scene JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rooms select" ON public.rooms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own rooms insert" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rooms update" ON public.rooms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own rooms delete" ON public.rooms FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX rooms_user_idx ON public.rooms(user_id, updated_at DESC);

CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for furniture images (private, per-user folders)
INSERT INTO storage.buckets (id, name, public) VALUES ('furniture', 'furniture', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "own furniture files select" ON storage.objects FOR SELECT
  USING (bucket_id = 'furniture' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own furniture files insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'furniture' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own furniture files update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'furniture' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own furniture files delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'furniture' AND auth.uid()::text = (storage.foldername(name))[1]);
