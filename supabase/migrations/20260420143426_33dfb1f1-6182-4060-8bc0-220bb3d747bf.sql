-- Master client types table (replaces localStorage)
CREATE TABLE IF NOT EXISTS public.master_client_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#4F46E5',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_client_types_master ON public.master_client_types(master_id);

ALTER TABLE public.master_client_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master views own types"
  ON public.master_client_types FOR SELECT
  USING (auth.uid() = master_id);

CREATE POLICY "Master inserts own types"
  ON public.master_client_types FOR INSERT
  WITH CHECK (auth.uid() = master_id);

CREATE POLICY "Master updates own types"
  ON public.master_client_types FOR UPDATE
  USING (auth.uid() = master_id);

CREATE POLICY "Master deletes own types"
  ON public.master_client_types FOR DELETE
  USING (auth.uid() = master_id);

CREATE TRIGGER update_master_client_types_updated_at
  BEFORE UPDATE ON public.master_client_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();