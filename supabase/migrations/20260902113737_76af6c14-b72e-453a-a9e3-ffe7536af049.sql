ALTER TABLE public.library_apps
  ADD COLUMN IF NOT EXISTS bundle_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ipa_path text NOT NULL DEFAULT '';
ALTER TABLE public.library_apps ALTER COLUMN install_url SET DEFAULT '';