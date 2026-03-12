
-- Add payment fields to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

-- Add tinkoff terminal key to business_locations (encrypted via app-level)
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS tinkoff_terminal_key text;
