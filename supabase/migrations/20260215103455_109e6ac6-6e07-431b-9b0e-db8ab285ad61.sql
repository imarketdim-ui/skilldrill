
-- =============================================
-- Teaching Module: Enums
-- =============================================

DO $$ BEGIN
  CREATE TYPE public.lesson_type AS ENUM ('individual', 'group');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lesson_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid', 'credited');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.no_show_category AS ENUM ('day_before', 'more_than_3_hours', 'more_than_1_hour', 'less_than_1_hour', 'no_warning');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- Teaching Module: recurring_patterns
-- =============================================

CREATE TABLE IF NOT EXISTS public.recurring_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  lesson_type public.lesson_type NOT NULL DEFAULT 'individual',
  recurrence_type public.recurrence_type NOT NULL DEFAULT 'weekly',
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month integer CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_time time NOT NULL,
  end_time time NOT NULL,
  start_date date NOT NULL,
  end_date date,
  price numeric NOT NULL DEFAULT 0,
  max_participants integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own patterns" ON public.recurring_patterns
  FOR ALL USING (teacher_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (teacher_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "Students see assigned patterns" ON public.recurring_patterns
  FOR SELECT USING (student_id = auth.uid() OR student_id IS NULL);

-- =============================================
-- Teaching Module: lessons
-- =============================================

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  lesson_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  lesson_type public.lesson_type NOT NULL DEFAULT 'individual',
  max_participants integer NOT NULL DEFAULT 1,
  current_participants integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  status public.lesson_status NOT NULL DEFAULT 'scheduled',
  recurring_pattern_id uuid REFERENCES public.recurring_patterns(id) ON DELETE SET NULL,
  is_modified boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read lessons" ON public.lessons
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers manage own lessons" ON public.lessons
  FOR ALL USING (teacher_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (teacher_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE INDEX idx_lessons_teacher ON public.lessons(teacher_id);
CREATE INDEX idx_lessons_date ON public.lessons(lesson_date);
CREATE INDEX idx_lessons_status ON public.lessons(status);

-- =============================================
-- Teaching Module: lesson_bookings
-- =============================================

CREATE TABLE IF NOT EXISTS public.lesson_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.booking_status NOT NULL DEFAULT 'pending',
  booked_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  no_show_category public.no_show_category,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students create own bookings" ON public.lesson_bookings
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students and teachers view bookings" ON public.lesson_bookings
  FOR SELECT USING (
    student_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_bookings.lesson_id AND l.teacher_id = auth.uid())
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Students and teachers update bookings" ON public.lesson_bookings
  FOR UPDATE USING (
    student_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_bookings.lesson_id AND l.teacher_id = auth.uid())
    OR is_platform_admin(auth.uid())
  );

CREATE INDEX idx_lesson_bookings_lesson ON public.lesson_bookings(lesson_id);
CREATE INDEX idx_lesson_bookings_student ON public.lesson_bookings(student_id);

-- =============================================
-- Teaching Module: teaching_payments
-- =============================================

CREATE TABLE IF NOT EXISTS public.teaching_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.lesson_bookings(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teaching_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage payments" ON public.teaching_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lesson_bookings lb
      JOIN public.lessons l ON l.id = lb.lesson_id
      WHERE lb.id = teaching_payments.booking_id AND l.teacher_id = auth.uid()
    ) OR is_platform_admin(auth.uid())
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lesson_bookings lb
      JOIN public.lessons l ON l.id = lb.lesson_id
      WHERE lb.id = teaching_payments.booking_id AND l.teacher_id = auth.uid()
    ) OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Students view own payments" ON public.teaching_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lesson_bookings lb
      WHERE lb.id = teaching_payments.booking_id AND lb.student_id = auth.uid()
    )
  );

-- =============================================
-- Teaching Module: teaching_expenses
-- =============================================

CREATE TABLE IF NOT EXISTS public.teaching_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teaching_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own expenses" ON public.teaching_expenses
  FOR ALL USING (teacher_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (teacher_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "Admins read all expenses" ON public.teaching_expenses
  FOR SELECT USING (is_platform_admin(auth.uid()));

CREATE INDEX idx_teaching_expenses_teacher ON public.teaching_expenses(teacher_id);

-- =============================================
-- Notifications (general)
-- =============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  related_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System creates notifications" ON public.notifications
  FOR INSERT WITH CHECK (is_platform_admin(auth.uid()) OR auth.uid() IS NOT NULL);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE OR REPLACE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_recurring_patterns_updated_at
  BEFORE UPDATE ON public.recurring_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_lesson_bookings_updated_at
  BEFORE UPDATE ON public.lesson_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_teaching_payments_updated_at
  BEFORE UPDATE ON public.teaching_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_teaching_expenses_updated_at
  BEFORE UPDATE ON public.teaching_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Function: Auto-update lesson participants count
-- =============================================

CREATE OR REPLACE FUNCTION public.update_lesson_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'confirmed') THEN
    UPDATE public.lessons SET current_participants = current_participants + 1 WHERE id = NEW.lesson_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('pending', 'confirmed') AND NEW.status IN ('cancelled', 'rejected') THEN
      UPDATE public.lessons SET current_participants = GREATEST(current_participants - 1, 0) WHERE id = NEW.lesson_id;
    ELSIF OLD.status IN ('cancelled', 'rejected') AND NEW.status IN ('pending', 'confirmed') THEN
      UPDATE public.lessons SET current_participants = current_participants + 1 WHERE id = NEW.lesson_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status IN ('pending', 'confirmed') THEN
    UPDATE public.lessons SET current_participants = GREATEST(current_participants - 1, 0) WHERE id = OLD.lesson_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_update_lesson_participants
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_lesson_participants();

-- =============================================
-- Function: Check if student is blacklisted by teacher
-- =============================================

CREATE OR REPLACE FUNCTION public.is_teaching_blacklisted(_student_id uuid, _teacher_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blacklists
    WHERE blocker_id = _teacher_id AND blocked_id = _student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
