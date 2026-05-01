CREATE OR REPLACE FUNCTION public.deactivate_master_services_on_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (OLD.status = 'accepted' AND NEW.status <> 'accepted') THEN
    WITH affected AS (
      SELECT
        s.id,
        ARRAY(
          SELECT value::uuid
          FROM jsonb_array_elements_text(COALESCE(s.tech_card->'assigned_master_ids', '[]'::jsonb))
          WHERE value::uuid <> COALESCE(NEW.master_id, OLD.master_id)
        ) AS remaining_master_ids
      FROM public.services s
      WHERE s.business_id = COALESCE(NEW.business_id, OLD.business_id)
        AND (
          s.master_id = COALESCE(NEW.master_id, OLD.master_id)
          OR COALESCE(s.tech_card->'assigned_master_ids', '[]'::jsonb) ? COALESCE(NEW.master_id, OLD.master_id)::text
        )
    )
    UPDATE public.services s
    SET
      master_id = CASE
        WHEN cardinality(a.remaining_master_ids) > 0 THEN a.remaining_master_ids[1]
        ELSE NULL
      END,
      is_active = CASE
        WHEN cardinality(a.remaining_master_ids) > 0 THEN s.is_active
        ELSE false
      END,
      tech_card = jsonb_set(
        COALESCE(s.tech_card, '{}'::jsonb),
        '{assigned_master_ids}',
        to_jsonb(COALESCE(a.remaining_master_ids, ARRAY[]::uuid[])),
        true
      ),
      updated_at = now()
    FROM affected a
    WHERE s.id = a.id;

    RETURN COALESCE(OLD, NEW);
  END IF;

  RETURN NEW;
END;
$$;
