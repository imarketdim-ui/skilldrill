
-- ================================================
-- FULL DATABASE RESTRUCTURE FOR SKILLSPOT
-- ================================================

-- 1. New enum for user roles
CREATE TYPE public.user_role AS ENUM (
  'client',
  'master',
  'business_manager',
  'network_manager',
  'business_owner',
  'network_owner',
  'platform_admin',
  'super_admin'
);

-- 2. Role request type
CREATE TYPE public.role_request_type AS ENUM ('master', 'business', 'network');

-- 3. User roles table (separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Service categories
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- 5. Category requests
CREATE TABLE public.category_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.category_requests ENABLE ROW LEVEL SECURITY;

-- 6. Networks (must be before business_locations for FK)
CREATE TABLE public.networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_start_date TIMESTAMPTZ DEFAULT now(),
  subscription_price NUMERIC NOT NULL DEFAULT 3999,
  extra_location_price NUMERIC NOT NULL DEFAULT 1200,
  free_locations INTEGER NOT NULL DEFAULT 3,
  free_masters_per_location INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;

-- 7. Business locations
CREATE TABLE public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  inn TEXT NOT NULL,
  legal_form public.legal_form NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  interior_photos JSONB DEFAULT '[]'::jsonb,
  exterior_photos JSONB DEFAULT '[]'::jsonb,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_start_date TIMESTAMPTZ DEFAULT now(),
  subscription_price NUMERIC NOT NULL DEFAULT 1499,
  extra_master_price NUMERIC NOT NULL DEFAULT 500,
  free_masters INTEGER NOT NULL DEFAULT 3,
  network_id UUID REFERENCES public.networks(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

-- 8. Master profiles
CREATE TABLE public.master_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id),
  description TEXT,
  workplace_description TEXT,
  max_services INTEGER NOT NULL DEFAULT 10,
  max_monthly_bookings INTEGER NOT NULL DEFAULT 100,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_start_date TIMESTAMPTZ DEFAULT now(),
  trial_days INTEGER NOT NULL DEFAULT 14,
  promo_code_used TEXT,
  subscription_price NUMERIC NOT NULL DEFAULT 600,
  business_id UUID REFERENCES public.business_locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.master_profiles ENABLE ROW LEVEL SECURITY;

-- 9. Role requests
CREATE TABLE public.role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  request_type public.role_request_type NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  category_id UUID REFERENCES public.service_categories(id),
  promo_code TEXT,
  business_name TEXT,
  business_address TEXT,
  business_inn TEXT,
  business_legal_form public.legal_form,
  business_description TEXT,
  business_contact_email TEXT,
  business_contact_phone TEXT,
  network_name TEXT,
  network_description TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- 10. Business masters
CREATE TABLE public.business_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  master_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending',
  commission_percent NUMERIC DEFAULT 0,
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, master_id)
);
ALTER TABLE public.business_masters ENABLE ROW LEVEL SECURITY;

-- 11. Business managers
CREATE TABLE public.business_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);
ALTER TABLE public.business_managers ENABLE ROW LEVEL SECURITY;

-- 12. Network managers
CREATE TABLE public.network_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(network_id, user_id)
);
ALTER TABLE public.network_managers ENABLE ROW LEVEL SECURITY;

-- 13. Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  favorite_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, favorite_type, target_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 14. Client tags
CREATE TABLE public.client_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  tagger_id UUID NOT NULL REFERENCES public.profiles(id),
  business_id UUID REFERENCES public.business_locations(id),
  tag TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, tagger_id, tag)
);
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

-- 15. Promotions
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  business_id UUID REFERENCES public.business_locations(id),
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'all',
  target_ids UUID[] DEFAULT '{}',
  min_rating NUMERIC,
  required_tags TEXT[],
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- 16. User balances
CREATE TABLE public.user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  main_balance NUMERIC NOT NULL DEFAULT 0,
  referral_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- 17. Balance transactions
CREATE TABLE public.balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- 18. Referral codes
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- 19. Referral earnings
CREATE TABLE public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id),
  referred_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- 20. Disputes
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  initiator_id UUID NOT NULL REFERENCES public.profiles(id),
  respondent_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- 21. Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  chat_type TEXT NOT NULL DEFAULT 'direct',
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 22. Rating criteria
CREATE TABLE public.rating_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rating_criteria ENABLE ROW LEVEL SECURITY;

-- 23. Rating scores (per-criteria)
CREATE TABLE public.rating_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES public.ratings(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.rating_criteria(id),
  score INTEGER NOT NULL,
  UNIQUE(rating_id, criteria_id)
);
ALTER TABLE public.rating_scores ENABLE ROW LEVEL SECURITY;

-- 24. Ownership transfers
CREATE TABLE public.ownership_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id),
  to_user_id UUID NOT NULL REFERENCES public.profiles(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.ownership_transfers ENABLE ROW LEVEL SECURITY;

-- 25. Admin assignments
CREATE TABLE public.admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigner_id UUID NOT NULL REFERENCES public.profiles(id),
  assignee_id UUID NOT NULL REFERENCES public.profiles(id),
  role public.user_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.admin_assignments ENABLE ROW LEVEL SECURITY;

-- 26. Promo codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'trial_extension',
  value INTEGER NOT NULL DEFAULT 45,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- 27. Business finances
CREATE TABLE public.business_finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  master_id UUID REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_finances ENABLE ROW LEVEL SECURITY;

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

CREATE OR REPLACE FUNCTION public.has_user_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin' AND is_active = true
  );
$$;

-- Update is_platform_admin to also check user_roles
CREATE OR REPLACE FUNCTION public.is_platform_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id AND platform_role = 'platform_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND role IN ('platform_admin', 'super_admin') AND is_active = true
  );
$$;

-- ================================================
-- AUTO-CREATE PROFILE TRIGGER
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, skillspot_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    public.generate_skillspot_id(),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  INSERT INTO public.user_balances (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- RLS POLICIES
-- ================================================

-- user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- service_categories
CREATE POLICY "Categories viewable by everyone"
  ON public.service_categories FOR SELECT USING (true);

CREATE POLICY "Admins manage categories"
  ON public.service_categories FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- category_requests
CREATE POLICY "Users can create category requests"
  ON public.category_requests FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can view own category requests admins see all"
  ON public.category_requests FOR SELECT
  USING (requester_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update category requests"
  ON public.category_requests FOR UPDATE
  USING (public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- networks
CREATE POLICY "Networks viewable when active"
  ON public.networks FOR SELECT
  USING (is_active = true OR owner_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Owners manage their network"
  ON public.networks FOR ALL
  USING (owner_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- business_locations
CREATE POLICY "Business viewable when active"
  ON public.business_locations FOR SELECT
  USING (is_active = true OR owner_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Owners manage their business"
  ON public.business_locations FOR ALL
  USING (owner_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- master_profiles
CREATE POLICY "Public can view active master profiles"
  ON public.master_profiles FOR SELECT
  USING (is_active = true OR user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Masters manage their own profile"
  ON public.master_profiles FOR ALL
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- role_requests
CREATE POLICY "Users can create role requests"
  ON public.role_requests FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users view own admins see all role requests"
  ON public.role_requests FOR SELECT
  USING (requester_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update role requests"
  ON public.role_requests FOR UPDATE
  USING (public.is_platform_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- business_masters
CREATE POLICY "Business masters viewable by relevant users"
  ON public.business_masters FOR SELECT
  USING (
    master_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Business owners and masters manage"
  ON public.business_masters FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    master_id = auth.uid() OR
    public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    master_id = auth.uid() OR
    public.is_platform_admin(auth.uid())
  );

-- business_managers
CREATE POLICY "Business managers viewable"
  ON public.business_managers FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Business owners manage managers"
  ON public.business_managers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    public.is_platform_admin(auth.uid())
  );

-- network_managers
CREATE POLICY "Network managers viewable"
  ON public.network_managers FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.networks n WHERE n.id = network_id AND n.owner_id = auth.uid()) OR
    public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Network owners manage managers"
  ON public.network_managers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.networks n WHERE n.id = network_id AND n.owner_id = auth.uid()) OR
    public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.networks n WHERE n.id = network_id AND n.owner_id = auth.uid()) OR
    public.is_platform_admin(auth.uid())
  );

-- favorites
CREATE POLICY "Users manage own favorites"
  ON public.favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- client_tags
CREATE POLICY "Taggers manage tags"
  ON public.client_tags FOR ALL
  USING (tagger_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (tagger_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Clients see their own tags"
  ON public.client_tags FOR SELECT
  USING (client_id = auth.uid());

-- promotions
CREATE POLICY "Creators manage promotions"
  ON public.promotions FOR ALL
  USING (creator_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (creator_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Active promotions viewable"
  ON public.promotions FOR SELECT
  USING (is_active = true);

-- user_balances
CREATE POLICY "Users view own balance"
  ON public.user_balances FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own balance"
  ON public.user_balances FOR ALL
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- balance_transactions
CREATE POLICY "Users view own transactions"
  ON public.balance_transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System creates transactions"
  ON public.balance_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- referral_codes
CREATE POLICY "Users manage own referral codes"
  ON public.referral_codes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Active referral codes viewable"
  ON public.referral_codes FOR SELECT
  USING (is_active = true);

-- referral_earnings
CREATE POLICY "Users view own referral earnings"
  ON public.referral_earnings FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- disputes
CREATE POLICY "Participants and admins view disputes"
  ON public.disputes FOR SELECT
  USING (initiator_id = auth.uid() OR respondent_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (initiator_id = auth.uid());

CREATE POLICY "Participants and admins update disputes"
  ON public.disputes FOR UPDATE
  USING (initiator_id = auth.uid() OR respondent_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- chat_messages
CREATE POLICY "Users view own messages"
  ON public.chat_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users update own messages"
  ON public.chat_messages FOR UPDATE
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- rating_criteria
CREATE POLICY "Rating criteria viewable"
  ON public.rating_criteria FOR SELECT USING (true);

CREATE POLICY "Admins manage rating criteria"
  ON public.rating_criteria FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- rating_scores
CREATE POLICY "Rating scores viewable"
  ON public.rating_scores FOR SELECT USING (true);

CREATE POLICY "Users create rating scores"
  ON public.rating_scores FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ratings r WHERE r.id = rating_id AND r.rater_id = auth.uid())
  );

-- ownership_transfers
CREATE POLICY "Transfer participants view"
  ON public.ownership_transfers FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Owners create transfers"
  ON public.ownership_transfers FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Recipients update transfers"
  ON public.ownership_transfers FOR UPDATE
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

-- admin_assignments
CREATE POLICY "Super admins and assignees manage assignments"
  ON public.admin_assignments FOR ALL
  USING (public.is_super_admin(auth.uid()) OR assignee_id = auth.uid())
  WITH CHECK (public.is_super_admin(auth.uid()));

-- promo_codes
CREATE POLICY "Active promo codes viewable"
  ON public.promo_codes FOR SELECT
  USING (is_active = true OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins manage promo codes"
  ON public.promo_codes FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- business_finances
CREATE POLICY "Business owners managers view finances"
  ON public.business_finances FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_managers bm WHERE bm.business_id = business_finances.business_id AND bm.user_id = auth.uid() AND bm.is_active = true) OR
    public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Business owners managers manage finances"
  ON public.business_finances FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_managers bm WHERE bm.business_id = business_finances.business_id AND bm.user_id = auth.uid() AND bm.is_active = true) OR
    public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = business_id AND bl.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_managers bm WHERE bm.business_id = business_finances.business_id AND bm.user_id = auth.uid() AND bm.is_active = true) OR
    public.is_platform_admin(auth.uid())
  );

-- ================================================
-- SEED DATA
-- ================================================

INSERT INTO public.service_categories (name, description) VALUES
  ('Бьюти-услуги', 'Парикмахерские, маникюр, косметология'),
  ('Автомойка', 'Мойка автомобилей, детейлинг'),
  ('Репетиторство', 'Образовательные услуги, преподавание'),
  ('Фитнес', 'Тренировки, йога, массаж'),
  ('Ремонт', 'Бытовой ремонт, сантехника, электрика'),
  ('IT-услуги', 'Разработка, дизайн, консалтинг'),
  ('Фото/Видео', 'Фотография, видеосъемка, монтаж'),
  ('Клининг', 'Уборка, химчистка'),
  ('Авторемонт', 'Ремонт и обслуживание автомобилей'),
  ('Другое', 'Прочие услуги');

INSERT INTO public.rating_criteria (name, description, category) VALUES
  ('Качество работы', 'Оценка качества выполненной услуги', 'quality'),
  ('Клиентоориентированность', 'Вежливость и внимательность к клиенту', 'communication'),
  ('Пунктуальность', 'Соблюдение времени записи', 'punctuality'),
  ('Соотношение цена/качество', 'Соответствие цены качеству услуги', 'value'),
  ('Чистота рабочего места', 'Чистота и порядок на рабочем месте', 'cleanliness');
