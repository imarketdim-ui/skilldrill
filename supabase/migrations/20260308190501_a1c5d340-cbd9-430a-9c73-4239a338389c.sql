
-- Stage 3: Add extended admin roles
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'integrator';
