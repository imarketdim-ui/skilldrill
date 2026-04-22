import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
}

/**
 * Загружает свободные слоты мастера на дату через RPC get_master_available_slots.
 * Учитывает рабочие часы, выходные, перерывы, отпуска, существующие записи и буфер.
 * Подписывается на изменения таблицы bookings для реалтайм-пересчёта.
 */
export function useAvailableSlots(
  masterId: string | null | undefined,
  date: string | null | undefined,
  durationMinutes: number | null | undefined,
) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!masterId || !date || !durationMinutes) {
      setSlots([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_master_available_slots', {
      _master_id: masterId,
      _date: date,
      _service_duration: durationMinutes,
    });
    setLoading(false);
    if (error) {
      console.error('get_master_available_slots error', error);
      setSlots([]);
      return;
    }
    setSlots((data ?? []) as AvailableSlot[]);
  }, [masterId, date, durationMinutes]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: пересчёт при изменениях bookings/lessons мастера
  useEffect(() => {
    if (!masterId || !date) return;
    const channel = supabase
      .channel(`avail-${masterId}-${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `executor_id=eq.${masterId}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lessons', filter: `teacher_id=eq.${masterId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [masterId, date, load]);

  return { slots, loading, reload: load };
}

/** Ближайшая свободная дата в окне 60 дней (RPC get_next_available_date). */
export async function fetchNextAvailableDate(masterId: string, fromDate?: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_next_available_date', {
    _master_id: masterId,
    _from_date: fromDate ?? new Date().toISOString().slice(0, 10),
  });
  if (error) {
    console.error('get_next_available_date error', error);
    return null;
  }
  return (data as string | null) ?? null;
}
