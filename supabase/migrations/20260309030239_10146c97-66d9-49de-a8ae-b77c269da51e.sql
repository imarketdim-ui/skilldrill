
-- Marketing campaigns table for mailing requests
CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.business_locations(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  
  -- Target audience
  target_type text NOT NULL DEFAULT 'own_clients', -- own_clients | skillspot_clients
  audience_filter text NOT NULL DEFAULT 'all', -- all | new | vip | stable | high_rating | selected
  selected_client_ids uuid[] DEFAULT '{}',
  include_own_clients boolean DEFAULT true,
  
  -- For skillspot-wide campaigns
  target_count integer NOT NULL DEFAULT 0,
  cost_per_client numeric NOT NULL DEFAULT 7,
  total_cost numeric NOT NULL DEFAULT 0,
  
  -- Status flow
  status text NOT NULL DEFAULT 'draft', -- draft | pending_moderation | approved | rejected | sent | cancelled
  moderator_id uuid REFERENCES public.profiles(id),
  moderator_comment text,
  moderated_at timestamptz,
  
  -- Balance hold
  hold_amount numeric DEFAULT 0,
  hold_released boolean DEFAULT false,
  
  -- Stats
  sent_count integer DEFAULT 0,
  sent_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Creator can manage their campaigns
CREATE POLICY "Creators manage own campaigns" ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (creator_id = auth.uid() OR is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (creator_id = auth.uid() OR is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- Admins can view all campaigns (for moderation)
CREATE POLICY "Admins view all campaigns" ON public.marketing_campaigns
  FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()));
