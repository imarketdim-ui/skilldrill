CREATE TABLE IF NOT EXISTS public.profile_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('master', 'business')),
  entity_id uuid NOT NULL,
  author_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_kind text NOT NULL DEFAULT 'post' CHECK (post_kind IN ('post', 'story', 'work_update', 'service_update', 'achievement')),
  title text,
  body text,
  media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  is_pinned boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_posts_story_expiry_chk CHECK (
    post_kind <> 'story' OR expires_at IS NULL OR expires_at > created_at
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_posts_entity
  ON public.profile_posts(entity_type, entity_id, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_posts_expiry
  ON public.profile_posts(expires_at);

ALTER TABLE public.profile_posts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_profile_content(_entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _entity_type = 'master' THEN EXISTS (
      SELECT 1
      FROM public.master_profiles mp
      WHERE mp.id = _entity_id
        AND (
          mp.user_id = auth.uid()
          OR public.is_platform_admin(auth.uid())
          OR public.is_super_admin(auth.uid())
        )
    )
    WHEN _entity_type = 'business' THEN (
      public.can_manage_business_context(_entity_id)
      OR public.is_platform_admin(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
    ELSE false
  END;
$$;

DROP POLICY IF EXISTS "Public can view published profile posts" ON public.profile_posts;
CREATE POLICY "Public can view published profile posts"
ON public.profile_posts FOR SELECT
USING (
  is_published = true
  AND (
    post_kind <> 'story'
    OR expires_at IS NULL
    OR expires_at > now()
  )
);

DROP POLICY IF EXISTS "Owners manage profile posts" ON public.profile_posts;
CREATE POLICY "Owners manage profile posts"
ON public.profile_posts FOR ALL
USING (public.can_manage_profile_content(entity_type, entity_id))
WITH CHECK (public.can_manage_profile_content(entity_type, entity_id));

DROP TRIGGER IF EXISTS trg_profile_posts_updated_at ON public.profile_posts;
CREATE TRIGGER trg_profile_posts_updated_at
BEFORE UPDATE ON public.profile_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
