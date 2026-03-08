import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedBooking {
  id: string;
  source: 'booking' | 'lesson';
  clientId: string;
  clientName: string;
  clientFirstName: string | null;
  clientLastName: string | null;
  date: string; // ISO date
  startTime: string | null;
  endTime: string | null;
  price: number;
  status: string;
  serviceName: string;
  durationMinutes: number | null;
  type: 'individual' | 'group' | null;
  organizationId: string | null;
}

export function useUnifiedBookings(masterId: string | undefined) {
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!masterId) return;
    setLoading(true);

    const [bRes, lRes] = await Promise.all([
      // Marketplace bookings where user is executor
      supabase.from('bookings')
        .select('id, status, scheduled_at, duration_minutes, service_id, organization_id, client_id, services!bookings_service_id_fkey(name, price), profiles!bookings_client_id_fkey(first_name, last_name)')
        .eq('executor_id', masterId)
        .order('scheduled_at', { ascending: false })
        .limit(500),
      // Lesson bookings where user is teacher
      supabase.from('lessons')
        .select('id, title, lesson_date, start_time, end_time, price, status, lesson_type, lesson_bookings(id, student_id, status, profiles:student_id(first_name, last_name))')
        .eq('teacher_id', masterId)
        .order('lesson_date', { ascending: false })
        .limit(500),
    ]);

    const unified: UnifiedBooking[] = [];

    // Normalize marketplace bookings
    (bRes.data || []).forEach(b => {
      const svc = b.services as any;
      const prof = b.profiles as any;
      const scheduledAt = new Date(b.scheduled_at);
      unified.push({
        id: b.id,
        source: 'booking',
        clientId: b.client_id,
        clientName: `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Клиент',
        clientFirstName: prof?.first_name || null,
        clientLastName: prof?.last_name || null,
        date: b.scheduled_at,
        startTime: scheduledAt.toTimeString().slice(0, 5),
        endTime: null,
        price: Number(svc?.price || 0),
        status: b.status,
        serviceName: svc?.name || 'Услуга',
        durationMinutes: b.duration_minutes,
        type: 'individual',
        organizationId: b.organization_id,
      });
    });

    // Normalize lessons (each lesson_booking = one unified booking)
    (lRes.data || []).forEach(lesson => {
      const lbs = (lesson.lesson_bookings as any[]) || [];
      if (lbs.length === 0) {
        // Lesson with no bookings — still show as session
        unified.push({
          id: lesson.id,
          source: 'lesson',
          clientId: '',
          clientName: lesson.title,
          clientFirstName: null,
          clientLastName: null,
          date: `${lesson.lesson_date}T${lesson.start_time}`,
          startTime: lesson.start_time,
          endTime: lesson.end_time,
          price: Number(lesson.price),
          status: lesson.status,
          serviceName: lesson.title,
          durationMinutes: null,
          type: lesson.lesson_type === 'group' ? 'group' : 'individual',
          organizationId: null,
        });
      } else {
        lbs.forEach(lb => {
          const sp = lb.profiles as any;
          unified.push({
            id: lb.id,
            source: 'lesson',
            clientId: lb.student_id,
            clientName: `${sp?.first_name || ''} ${sp?.last_name || ''}`.trim() || 'Клиент',
            clientFirstName: sp?.first_name || null,
            clientLastName: sp?.last_name || null,
            date: `${lesson.lesson_date}T${lesson.start_time}`,
            startTime: lesson.start_time,
            endTime: lesson.end_time,
            price: Number(lesson.price),
            status: lb.status || lesson.status,
            serviceName: lesson.title,
            durationMinutes: null,
            type: lesson.lesson_type === 'group' ? 'group' : 'individual',
            organizationId: null,
          });
        });
      }
    });

    // Sort by date descending
    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setBookings(unified);
    setLoading(false);
  }, [masterId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { bookings, loading, refetch: fetch };
}

// Helper: get unique clients from unified bookings
export function getUniqueClients(bookings: UnifiedBooking[]) {
  const map = new Map<string, { id: string; firstName: string | null; lastName: string | null; count: number; completed: number; noShows: number; cancellations: number; ltv: number; firstDate: string | null; lastDate: string | null }>();
  bookings.forEach(b => {
    if (!b.clientId) return;
    const existing = map.get(b.clientId);
    if (existing) {
      existing.count++;
      if (b.status === 'completed') { existing.completed++; existing.ltv += b.price; }
      if (b.status === 'no_show') existing.noShows++;
      if (b.status === 'cancelled') existing.cancellations++;
      if (!existing.firstDate || b.date < existing.firstDate) existing.firstDate = b.date;
      if (!existing.lastDate || b.date > existing.lastDate) existing.lastDate = b.date;
    } else {
      map.set(b.clientId, {
        id: b.clientId,
        firstName: b.clientFirstName,
        lastName: b.clientLastName,
        count: 1,
        completed: b.status === 'completed' ? 1 : 0,
        noShows: b.status === 'no_show' ? 1 : 0,
        cancellations: b.status === 'cancelled' ? 1 : 0,
        ltv: b.status === 'completed' ? b.price : 0,
        firstDate: b.date,
        lastDate: b.date,
      });
    }
  });
  return Array.from(map.values());
}
