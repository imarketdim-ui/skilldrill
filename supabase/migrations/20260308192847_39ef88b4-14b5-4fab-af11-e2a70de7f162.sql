-- Trigger: award bonus points when a booking is completed
CREATE OR REPLACE FUNCTION public.award_bonus_on_booking_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id uuid;
  _points integer := 10;
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    _client_id := NEW.client_id;

    -- Insert bonus transaction
    INSERT INTO bonus_transactions (user_id, type, amount, source, description, reference_id)
    VALUES (_client_id, 'earn', _points, 'booking_complete', 'Бонус за завершённую запись', NEW.id);

    -- Update bonus balance
    INSERT INTO bonus_points (user_id, balance, total_earned)
    VALUES (_client_id, _points, _points)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = bonus_points.balance + _points,
        total_earned = bonus_points.total_earned + _points,
        updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bonus_on_booking_complete ON bookings;
CREATE TRIGGER trg_bonus_on_booking_complete
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION award_bonus_on_booking_complete();

-- Trigger: award bonus points when a lesson_booking is completed
CREATE OR REPLACE FUNCTION public.award_bonus_on_lesson_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _student_id uuid;
  _points integer := 10;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    _student_id := NEW.student_id;

    INSERT INTO bonus_transactions (user_id, type, amount, source, description, reference_id)
    VALUES (_student_id, 'earn', _points, 'booking_complete', 'Бонус за завершённое занятие', NEW.id);

    INSERT INTO bonus_points (user_id, balance, total_earned)
    VALUES (_student_id, _points, _points)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = bonus_points.balance + _points,
        total_earned = bonus_points.total_earned + _points,
        updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bonus_on_lesson_complete ON lesson_bookings;
CREATE TRIGGER trg_bonus_on_lesson_complete
  AFTER UPDATE ON lesson_bookings
  FOR EACH ROW
  EXECUTE FUNCTION award_bonus_on_lesson_complete();

-- Trigger: award bonus on referral (first completed booking by referred user)
CREATE OR REPLACE FUNCTION public.award_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id uuid;
  _already_awarded boolean;
  _points integer := 50;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Check if client has a referrer
    SELECT referred_by INTO _referrer_id FROM profiles WHERE id = NEW.client_id;
    
    IF _referrer_id IS NOT NULL THEN
      -- Check if referral bonus was already given for this client
      SELECT EXISTS(
        SELECT 1 FROM bonus_transactions
        WHERE user_id = _referrer_id AND source = 'referral' AND reference_id = NEW.client_id
      ) INTO _already_awarded;
      
      IF NOT _already_awarded THEN
        INSERT INTO bonus_transactions (user_id, type, amount, source, description, reference_id)
        VALUES (_referrer_id, 'earn', _points, 'referral', 'Бонус за приглашённого клиента', NEW.client_id);

        INSERT INTO bonus_points (user_id, balance, total_earned)
        VALUES (_referrer_id, _points, _points)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = bonus_points.balance + _points,
            total_earned = bonus_points.total_earned + _points,
            updated_at = now();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_bonus ON bookings;
CREATE TRIGGER trg_referral_bonus
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION award_referral_bonus();