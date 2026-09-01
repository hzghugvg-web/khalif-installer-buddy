CREATE TABLE public.library_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Приложения',
  version TEXT NOT NULL DEFAULT '',
  icon_url TEXT NOT NULL DEFAULT '',
  install_url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.library_apps TO anon, authenticated;
GRANT ALL ON public.library_apps TO service_role;
ALTER TABLE public.library_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published library apps are public" ON public.library_apps FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE OR REPLACE FUNCTION public.set_library_apps_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER library_apps_updated_at
BEFORE UPDATE ON public.library_apps
FOR EACH ROW EXECUTE FUNCTION public.set_library_apps_updated_at();