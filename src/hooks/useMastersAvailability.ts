import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Батч-проверка доступности списка мастеров на дату.
 * Возвращает Set user_id мастеров, у которых есть свободные слоты.
 */
export function useMastersAvailability(masterUserIds: string[], date: string | null) {
  const [availableSet, setAvailableSet] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || masterUserIds.length === 0) {
      setAvailableSet(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      masterUserIds.map(async (id) => {
        const { data } = await supabase.rpc('has_master_availability_on_date', {
          _master_id: id,
          _date: date,
        });
        return { id, ok: !!data };
      }),
    ).then((results) => {
      if (cancelled) return;
      setAvailableSet(new Set(results.filter((r) => r.ok).map((r) => r.id)));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [masterUserIds.join(','), date]);

  return { availableSet, loading };
}
