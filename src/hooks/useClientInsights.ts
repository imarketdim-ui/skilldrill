import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ClientInsights {
  loading: boolean;
  profile: { id: string; first_name?: string; last_name?: string; skillspot_id?: string; phone?: string; avatar_url?: string } | null;
  vip: boolean;
  notes: string[];
  totalBookings: number;
  completed: number;
  cancelled: number;
  noShow: number;
  ltv: number;
  averageCheck: number;
  lastVisit: Date | null;
  favouriteServices: { name: string; count: number }[];
}

const empty: ClientInsights = {
  loading: false,
  profile: null,
  vip: false,
  notes: [],
  totalBookings: 0,
  completed: 0,
  cancelled: 0,
  noShow: 0,
  ltv: 0,
  averageCheck: 0,
  lastVisit: null,
  favouriteServices: [],
};

const cache = new Map<string, ClientInsights>();

/**
 * Собирает агрегированные данные о клиенте для hover-карточки.
 * Лениво — только когда `enabled === true` (первый ховер).
 */
export function useClientInsights(clientId: string | null | undefined, enabled: boolean) {
  const { user } = useAuth();
  const [data, setData] = useState<ClientInsights>(empty);

  useEffect(() => {
    if (!enabled || !clientId) return;
    const cacheKey = `${user?.id || 'anon'}:${clientId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }
    let cancelled = false;
    setData({ ...empty, loading: true });

    (async () => {
      const [profileRes, tagsRes, bookingsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, skillspot_id, phone, avatar_url')
          .eq('id', clientId)
          .maybeSingle(),
        user
          ? supabase
              .from('client_tags')
              .select('tag, note, created_at')
              .eq('client_id', clientId)
              .eq('tagger_id', user.id)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('bookings')
          .select('id, status, scheduled_at, services!bookings_service_id_fkey(name, price)')
          .eq('client_id', clientId)
          .order('scheduled_at', { ascending: false })
          .limit(200),
      ]);

      if (cancelled) return;

      const tags = (tagsRes.data || []) as any[];
      const vip = tags.some(t => t.tag === 'vip');
      const notes = tags
        .filter(t => t.tag === 'note' && t.note)
        .slice(0, 3)
        .map(t => t.note as string);

      const bookings = (bookingsRes.data || []) as any[];
      const completed = bookings.filter(b => b.status === 'completed').length;
      const cancelled_ = bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected').length;
      const noShow = bookings.filter(b => b.status === 'no_show').length;
      const ltv = bookings
        .filter(b => b.status === 'completed')
        .reduce((s, b) => s + (Number(b.services?.price) || 0), 0);
      const averageCheck = completed > 0 ? Math.round(ltv / completed) : 0;
      const lastCompleted = bookings.find(b => b.status === 'completed');
      const lastVisit = lastCompleted ? new Date(lastCompleted.scheduled_at) : null;

      const serviceCounts = new Map<string, number>();
      for (const b of bookings) {
        const name = b.services?.name;
        if (!name) continue;
        serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
      }
      const favouriteServices = [...serviceCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const result: ClientInsights = {
        loading: false,
        profile: profileRes.data as any,
        vip,
        notes,
        totalBookings: bookings.length,
        completed,
        cancelled: cancelled_,
        noShow,
        ltv,
        averageCheck,
        lastVisit,
        favouriteServices,
      };
      cache.set(cacheKey, result);
      setData(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, enabled, user?.id]);

  return data;
}
