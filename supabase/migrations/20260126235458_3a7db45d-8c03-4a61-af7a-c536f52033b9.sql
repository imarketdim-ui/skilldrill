-- =============================================================================
-- SkillSpot Database Schema - Complete Migration
-- =============================================================================

-- 1. ENUMS
-- =============================================================================

-- Platform-level roles enum
CREATE TYPE public.platform_role AS ENUM ('platform_admin', 'user');

-- Organization request status
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- Booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Organization legal form
CREATE TYPE public.legal_form AS ENUM ('ip', 'ooo', 'zao', 'oao', 'self_employed', 'other');

-- =============================================================================
-- 2. BASE TABLES
-- =============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    skillspot_id VARCHAR(6) UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    platform_role platform_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT skillspot_id_format CHECK (skillspot_id ~ '^[A-Z]{2}[0-9]{4}$')
);

-- Organizations table
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    inn TEXT NOT NULL,
    legal_form legal_form NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    logo_url TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Organization requests (pending approval)
CREATE TABLE public.organization_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    inn TEXT NOT NULL,
    legal_form legal_form NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    status request_status DEFAULT 'pending' NOT NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Roles table (for organization roles)
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Permissions table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL
);

-- Role permissions (many-to-many)
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Organization users (user-organization-role link)
CREATE TABLE public.organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    accepted_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Services table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Service cards / Tech cards
CREATE TABLE public.service_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cost_price DECIMAL(10,2),
    materials JSONB DEFAULT '[]'::jsonb,
    steps JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Service executors (which users can perform which services)
CREATE TABLE public.service_executors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    UNIQUE(service_id, user_id)
);

-- Schedules table (executor availability)
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Schedule exceptions (vacations, sick days, etc.)
CREATE TABLE public.schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_available BOOLEAN DEFAULT false NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    executor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status booking_status DEFAULT 'pending' NOT NULL,
    notes TEXT,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ratings table (bi-directional)
CREATE TABLE public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rated_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(booking_id, rater_id)
);

-- Blacklists table
CREATE TABLE public.blacklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    is_organization_wide BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, blocker_id, blocked_id)
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

CREATE INDEX idx_profiles_skillspot_id ON public.profiles(skillspot_id);
CREATE INDEX idx_profiles_platform_role ON public.profiles(platform_role);
CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX idx_organization_requests_status ON public.organization_requests(status);
CREATE INDEX idx_organization_requests_requester ON public.organization_requests(requester_id);
CREATE INDEX idx_organization_users_org ON public.organization_users(organization_id);
CREATE INDEX idx_organization_users_user ON public.organization_users(user_id);
CREATE INDEX idx_services_org ON public.services(organization_id);
CREATE INDEX idx_bookings_org ON public.bookings(organization_id);
CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_executor ON public.bookings(executor_id);
CREATE INDEX idx_bookings_scheduled ON public.bookings(scheduled_at);
CREATE INDEX idx_ratings_rated ON public.ratings(rated_id);
CREATE INDEX idx_schedules_user_org ON public.schedules(user_id, organization_id);

-- =============================================================================
-- 4. HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================================================

-- Generate unique skillspot_id (2 letters + 4 digits)
CREATE OR REPLACE FUNCTION public.generate_skillspot_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id TEXT;
    letters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    attempts INTEGER := 0;
BEGIN
    LOOP
        new_id := substr(letters, floor(random() * 26 + 1)::int, 1) ||
                  substr(letters, floor(random() * 26 + 1)::int, 1) ||
                  lpad(floor(random() * 10000)::text, 4, '0');
        
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE skillspot_id = new_id);
        
        attempts := attempts + 1;
        IF attempts > 100 THEN
            RAISE EXCEPTION 'Could not generate unique skillspot_id after 100 attempts';
        END IF;
    END LOOP;
    
    RETURN new_id;
END;
$$;

-- Check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND platform_role = 'platform_admin'
    );
$$;

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE user_id = $1 AND organization_id = $2 AND is_active = true
    );
$$;

-- Check if user is owner of organization
CREATE OR REPLACE FUNCTION public.is_org_owner(user_id UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = $2 AND owner_id = $1
    );
$$;

-- Get user role in organization
CREATE OR REPLACE FUNCTION public.get_user_org_role(user_id UUID, org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT r.name FROM public.organization_users ou
    JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = $1 AND ou.organization_id = $2 AND ou.is_active = true
    LIMIT 1;
$$;

-- Check if user has permission in organization
CREATE OR REPLACE FUNCTION public.has_org_permission(user_id UUID, org_id UUID, permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_users ou
        JOIN public.role_permissions rp ON rp.role_id = ou.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ou.user_id = $1 
          AND ou.organization_id = $2 
          AND ou.is_active = true
          AND p.code = $3
    ) OR public.is_org_owner($1, $2);
$$;

-- Check if user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(blocker_id UUID, blocked_id UUID, org_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.blacklists
        WHERE blocker_id = $1 
          AND blocked_id = $2
          AND (organization_id IS NULL OR organization_id = $3)
    );
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- Auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_cards_updated_at
    BEFORE UPDATE ON public.service_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_executors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklists ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ORGANIZATIONS POLICIES
CREATE POLICY "Organizations are viewable by everyone"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (is_active = true OR owner_id = auth.uid() OR public.is_org_member(auth.uid(), id));

CREATE POLICY "Organization owners can update their organization"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- ORGANIZATION REQUESTS POLICIES
CREATE POLICY "Users can view their own requests"
    ON public.organization_requests FOR SELECT
    TO authenticated
    USING (requester_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can create organization requests"
    ON public.organization_requests FOR INSERT
    TO authenticated
    WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Platform admins can update requests"
    ON public.organization_requests FOR UPDATE
    TO authenticated
    USING (public.is_platform_admin(auth.uid()))
    WITH CHECK (public.is_platform_admin(auth.uid()));

-- ROLES POLICIES
CREATE POLICY "Roles are viewable by org members"
    ON public.roles FOR SELECT
    TO authenticated
    USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Org owners can manage roles"
    ON public.roles FOR ALL
    TO authenticated
    USING (public.is_org_owner(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()))
    WITH CHECK (public.is_org_owner(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()));

-- PERMISSIONS POLICIES
CREATE POLICY "Permissions are viewable by everyone"
    ON public.permissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only platform admins can manage permissions"
    ON public.permissions FOR ALL
    TO authenticated
    USING (public.is_platform_admin(auth.uid()))
    WITH CHECK (public.is_platform_admin(auth.uid()));

-- ROLE PERMISSIONS POLICIES
CREATE POLICY "Role permissions are viewable by org members"
    ON public.role_permissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.roles r
            WHERE r.id = role_id
            AND (r.organization_id IS NULL OR public.is_org_member(auth.uid(), r.organization_id))
        )
    );

CREATE POLICY "Org owners can manage role permissions"
    ON public.role_permissions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.roles r
            WHERE r.id = role_id
            AND (public.is_org_owner(auth.uid(), r.organization_id) OR public.is_platform_admin(auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.roles r
            WHERE r.id = role_id
            AND (public.is_org_owner(auth.uid(), r.organization_id) OR public.is_platform_admin(auth.uid()))
        )
    );

-- ORGANIZATION USERS POLICIES
CREATE POLICY "Org users viewable by org members"
    ON public.organization_users FOR SELECT
    TO authenticated
    USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Org owners can manage org users"
    ON public.organization_users FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_org_owner(auth.uid(), organization_id) OR public.has_org_permission(auth.uid(), organization_id, 'users:invite'))
        AND user_id != auth.uid()
    );

CREATE POLICY "Org owners can update org users"
    ON public.organization_users FOR UPDATE
    TO authenticated
    USING (public.is_org_owner(auth.uid(), organization_id) OR public.has_org_permission(auth.uid(), organization_id, 'users:manage'))
    WITH CHECK (public.is_org_owner(auth.uid(), organization_id) OR public.has_org_permission(auth.uid(), organization_id, 'users:manage'));

CREATE POLICY "Org owners can delete org users"
    ON public.organization_users FOR DELETE
    TO authenticated
    USING (public.is_org_owner(auth.uid(), organization_id) OR public.has_org_permission(auth.uid(), organization_id, 'users:manage'));

-- SERVICES POLICIES
CREATE POLICY "Active services are viewable by everyone"
    ON public.services FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members with permission can manage services"
    ON public.services FOR ALL
    TO authenticated
    USING (public.is_org_owner(auth.uid(), organization_id) OR public.has_org_permission(auth.uid(), organization_id, 'services:manage'))
    WITH CHECK (public.is_org_owner(auth.uid(), organization_id) OR public.has_org_permission(auth.uid(), organization_id, 'services:manage'));

-- SERVICE CARDS POLICIES
CREATE POLICY "Service cards viewable by org members"
    ON public.service_cards FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.services s
            WHERE s.id = service_id
            AND public.is_org_member(auth.uid(), s.organization_id)
        )
    );

CREATE POLICY "Org members with permission can manage service cards"
    ON public.service_cards FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.services s
            WHERE s.id = service_id
            AND (public.is_org_owner(auth.uid(), s.organization_id) OR public.has_org_permission(auth.uid(), s.organization_id, 'services:manage'))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.services s
            WHERE s.id = service_id
            AND (public.is_org_owner(auth.uid(), s.organization_id) OR public.has_org_permission(auth.uid(), s.organization_id, 'services:manage'))
        )
    );

-- SERVICE EXECUTORS POLICIES
CREATE POLICY "Service executors viewable by org members"
    ON public.service_executors FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.services s
            WHERE s.id = service_id
            AND public.is_org_member(auth.uid(), s.organization_id)
        )
    );

CREATE POLICY "Org members with permission can manage service executors"
    ON public.service_executors FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.services s
            WHERE s.id = service_id
            AND (public.is_org_owner(auth.uid(), s.organization_id) OR public.has_org_permission(auth.uid(), s.organization_id, 'services:manage'))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.services s
            WHERE s.id = service_id
            AND (public.is_org_owner(auth.uid(), s.organization_id) OR public.has_org_permission(auth.uid(), s.organization_id, 'services:manage'))
        )
    );

-- SCHEDULES POLICIES
CREATE POLICY "Schedules viewable by org members and clients"
    ON public.schedules FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id) OR true);

CREATE POLICY "Users can manage their own schedules"
    ON public.schedules FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR public.is_org_owner(auth.uid(), organization_id))
    WITH CHECK (user_id = auth.uid() OR public.is_org_owner(auth.uid(), organization_id));

-- SCHEDULE EXCEPTIONS POLICIES
CREATE POLICY "Schedule exceptions viewable by org members"
    ON public.schedule_exceptions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage their own schedule exceptions"
    ON public.schedule_exceptions FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR public.is_org_owner(auth.uid(), organization_id))
    WITH CHECK (user_id = auth.uid() OR public.is_org_owner(auth.uid(), organization_id));

-- BOOKINGS POLICIES
CREATE POLICY "Users can view their own bookings and org bookings"
    ON public.bookings FOR SELECT
    TO authenticated
    USING (client_id = auth.uid() OR executor_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Clients can create bookings"
    ON public.bookings FOR INSERT
    TO authenticated
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients and org members can update bookings"
    ON public.bookings FOR UPDATE
    TO authenticated
    USING (client_id = auth.uid() OR executor_id = auth.uid() OR public.has_org_permission(auth.uid(), organization_id, 'bookings:manage'))
    WITH CHECK (client_id = auth.uid() OR executor_id = auth.uid() OR public.has_org_permission(auth.uid(), organization_id, 'bookings:manage'));

-- RATINGS POLICIES
CREATE POLICY "Ratings are viewable by everyone"
    ON public.ratings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create ratings for their bookings"
    ON public.ratings FOR INSERT
    TO authenticated
    WITH CHECK (
        rater_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id
            AND b.status = 'completed'
            AND (b.client_id = auth.uid() OR b.executor_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own ratings"
    ON public.ratings FOR UPDATE
    TO authenticated
    USING (rater_id = auth.uid())
    WITH CHECK (rater_id = auth.uid());

-- BLACKLISTS POLICIES
CREATE POLICY "Users can view blacklists they're involved in"
    ON public.blacklists FOR SELECT
    TO authenticated
    USING (blocker_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage their own blacklists"
    ON public.blacklists FOR ALL
    TO authenticated
    USING (blocker_id = auth.uid() OR (is_organization_wide AND public.has_org_permission(auth.uid(), organization_id, 'clients:block')))
    WITH CHECK (blocker_id = auth.uid() OR (is_organization_wide AND public.has_org_permission(auth.uid(), organization_id, 'clients:block')));

-- =============================================================================
-- 7. SEED DATA: Default Permissions
-- =============================================================================

INSERT INTO public.permissions (code, name, description, category) VALUES
    -- Bookings & Schedule
    ('bookings:view', 'Просмотр записей', 'Просмотр всех записей организации', 'Записи и расписание'),
    ('bookings:manage', 'Управление записями', 'Подтверждение и отмена записей', 'Записи и расписание'),
    ('schedule:view', 'Просмотр расписания', 'Просмотр расписания сотрудников', 'Записи и расписание'),
    ('schedule:manage', 'Управление расписанием', 'Редактирование расписания', 'Записи и расписание'),
    
    -- Services & Tech Cards
    ('services:view', 'Просмотр услуг', 'Просмотр каталога услуг', 'Услуги и технологические карты'),
    ('services:manage', 'Управление услугами', 'Создание и редактирование услуг', 'Услуги и технологические карты'),
    ('techcards:view', 'Просмотр техкарт', 'Просмотр технологических карт', 'Услуги и технологические карты'),
    ('techcards:manage', 'Управление техкартами', 'Создание и редактирование техкарт', 'Услуги и технологические карты'),
    
    -- Staff
    ('users:view', 'Просмотр сотрудников', 'Просмотр списка сотрудников', 'Исполнители и сотрудники'),
    ('users:invite', 'Приглашение сотрудников', 'Приглашение новых сотрудников', 'Исполнители и сотрудники'),
    ('users:manage', 'Управление сотрудниками', 'Назначение ролей и прав', 'Исполнители и сотрудники'),
    
    -- Clients
    ('clients:view', 'Просмотр клиентов', 'Просмотр базы клиентов', 'Клиенты'),
    ('clients:rate', 'Оценка клиентов', 'Возможность оценивать клиентов', 'Клиенты'),
    ('clients:block', 'Блокировка клиентов', 'Добавление в чёрный список', 'Клиенты'),
    
    -- Finance
    ('finance:view', 'Просмотр финансов', 'Просмотр финансовых отчётов', 'Финансы'),
    ('finance:manage', 'Управление финансами', 'Редактирование финансовых данных', 'Финансы'),
    
    -- Reports
    ('reports:view', 'Просмотр отчётов', 'Доступ к аналитике', 'Отчёты и аналитика'),
    
    -- Settings
    ('settings:view', 'Просмотр настроек', 'Просмотр настроек организации', 'Настройки бизнеса'),
    ('settings:manage', 'Управление настройками', 'Редактирование настроек', 'Настройки бизнеса');