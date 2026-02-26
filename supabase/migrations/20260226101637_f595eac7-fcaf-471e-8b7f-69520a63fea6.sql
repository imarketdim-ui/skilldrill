-- Add work_photos to services table for service card photos
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS work_photos jsonb DEFAULT '[]'::jsonb;
