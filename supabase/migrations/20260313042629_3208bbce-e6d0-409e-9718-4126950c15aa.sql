
-- Wrap all trigger creation in idempotent blocks

-- 1. check_booking_spam
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_booking_spam') THEN
    CREATE TRIGGER trg_check_booking_spam
      BEFORE INSERT ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.check_booking_spam();
  END IF;
END$$;

-- 2. deactivate_master_services_on_leave
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_deactivate_master_services_on_leave') THEN
    CREATE TRIGGER trg_deactivate_master_services_on_leave
      AFTER UPDATE OR DELETE ON public.business_masters
      FOR EACH ROW
      EXECUTE FUNCTION public.deactivate_master_services_on_leave();
  END IF;
END$$;

-- 3. check_booking_blacklist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_booking_blacklist') THEN
    CREATE TRIGGER trg_check_booking_blacklist
      BEFORE INSERT ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.check_booking_blacklist();
  END IF;
END$$;

-- 4. check_booking_overlap
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_booking_overlap') THEN
    CREATE TRIGGER trg_check_booking_overlap
      BEFORE INSERT OR UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.check_booking_overlap();
  END IF;
END$$;

-- 5. check_booking_limits
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_booking_limits') THEN
    CREATE TRIGGER trg_check_booking_limits
      BEFORE INSERT ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.check_booking_limits();
  END IF;
END$$;

-- 6. auto_confirm_vip_booking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_confirm_vip') THEN
    CREATE TRIGGER trg_auto_confirm_vip
      BEFORE INSERT ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_confirm_vip_booking();
  END IF;
END$$;

-- 7. auto_deduct_inventory_on_complete
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_deduct_inventory') THEN
    CREATE TRIGGER trg_auto_deduct_inventory
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_deduct_inventory_on_complete();
  END IF;
END$$;

-- 8. auto_finance_on_booking_complete
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_finance_on_complete') THEN
    CREATE TRIGGER trg_auto_finance_on_complete
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_finance_on_booking_complete();
  END IF;
END$$;

-- 9. award_bonus_on_booking_complete
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_award_bonus_booking') THEN
    CREATE TRIGGER trg_award_bonus_booking
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.award_bonus_on_booking_complete();
  END IF;
END$$;

-- 10. award_referral_bonus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_award_referral_bonus') THEN
    CREATE TRIGGER trg_award_referral_bonus
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.award_referral_bonus();
  END IF;
END$$;

-- 11. recalc_score triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalc_score_booking') THEN
    CREATE TRIGGER trg_recalc_score_booking
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.recalc_score_on_booking();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalc_score_blacklist') THEN
    CREATE TRIGGER trg_recalc_score_blacklist
      AFTER INSERT OR UPDATE OR DELETE ON public.blacklists
      FOR EACH ROW
      EXECUTE FUNCTION public.recalc_score_on_blacklist();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalc_score_dispute') THEN
    CREATE TRIGGER trg_recalc_score_dispute
      AFTER UPDATE ON public.disputes
      FOR EACH ROW
      EXECUTE FUNCTION public.recalc_score_on_dispute();
  END IF;
END$$;

-- 12. Lesson triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_lesson_participants') THEN
    CREATE TRIGGER trg_update_lesson_participants
      AFTER INSERT OR UPDATE OR DELETE ON public.lesson_bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_lesson_participants();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_lesson_overlap') THEN
    CREATE TRIGGER trg_check_lesson_overlap
      BEFORE INSERT OR UPDATE ON public.lessons
      FOR EACH ROW
      EXECUTE FUNCTION public.check_lesson_overlap();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_lesson_booking_blacklist') THEN
    CREATE TRIGGER trg_check_lesson_booking_blacklist
      BEFORE INSERT ON public.lesson_bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.check_lesson_booking_blacklist();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_award_bonus_lesson') THEN
    CREATE TRIGGER trg_award_bonus_lesson
      AFTER UPDATE ON public.lesson_bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.award_bonus_on_lesson_complete();
  END IF;
END$$;

-- 13. Cross-org schedule overlap
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_cross_org_overlap') THEN
    CREATE TRIGGER trg_check_cross_org_overlap
      BEFORE INSERT OR UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.check_cross_org_schedule_overlap();
  END IF;
END$$;

-- 14. Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
