-- Add full-text search index on services for instant search at scale
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_services_fts ON public.services USING gin(fts);

-- Also add FTS to master_profiles
ALTER TABLE public.master_profiles ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(description, '') || ' ' || coalesce(short_description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_master_profiles_fts ON public.master_profiles USING gin(fts);