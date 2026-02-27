
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars storage policies
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Chat improvements: delivery status and attachments
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_delivered boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_type text;

-- Master profile enhancements
ALTER TABLE public.master_profiles
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS auto_booking_policy text DEFAULT 'all';

-- Profile reminder settings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reminder_minutes integer DEFAULT 60;

-- Booking enhancements
ALTER TABLE public.lesson_bookings
ADD COLUMN IF NOT EXISTS reminder_minutes integer,
ADD COLUMN IF NOT EXISTS reschedule_reason text;
