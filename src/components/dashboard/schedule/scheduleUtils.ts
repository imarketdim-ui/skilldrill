/**
 * Утилиты для шахматки расписания (YClients-style).
 * Нормализуют bookings/lessons в общий формат, считают позиции и раскладывают пересечения.
 */

export interface ScheduleEvent {
  id: string;
  columnId: string;
  start: Date;
  end: Date;
  status: string;
  title: string;
  subtitle?: string;
  clientId?: string | null;
  clientName?: string;
  servicePrice?: number;
  raw?: any;
  /** Заполняется packOverlaps */
  column?: number;
  totalColumns?: number;
}

/**
 * Нормализация bookings (services).
 */
export function normalizeBooking(b: any): ScheduleEvent {
  const start = new Date(b.scheduled_at);
  const duration = b.duration_minutes || b.service?.duration_minutes || 60;
  const end = new Date(start.getTime() + duration * 60_000);
  const clientName =
    [b.client?.first_name, b.client?.last_name].filter(Boolean).join(' ') || 'Клиент';
  return {
    id: b.id,
    columnId: b.executor_id || 'unassigned',
    start,
    end,
    status: b.status || 'pending',
    title: b.service?.name || 'Услуга',
    subtitle: clientName,
    clientId: b.client_id || null,
    clientName,
    servicePrice: Number(b.service?.price ?? b.price ?? 0) || 0,
    raw: b,
  };
}

/**
 * Нормализация lessons (мастер-расписание).
 */
export function normalizeLesson(l: any, columnId?: string): ScheduleEvent {
  const date: string = l.lesson_date;
  const startStr: string = (l.start_time || '00:00').slice(0, 5);
  const endStr: string = (l.end_time || startStr).slice(0, 5);
  const start = new Date(`${date}T${startStr}:00`);
  const end = new Date(`${date}T${endStr}:00`);
  const booking = (l.lesson_bookings as any[])?.[0];
  const clientProfile = booking?.profiles;
  const clientName = clientProfile
    ? [clientProfile.first_name, clientProfile.last_name].filter(Boolean).join(' ')
    : '';
  return {
    id: l.id,
    columnId: columnId || l.teacher_id || 'self',
    start,
    end,
    status: l.notes === 'break' ? 'break' : (l.status || 'scheduled'),
    title: l.title || 'Запись',
    subtitle: clientName || (l.notes === 'break' ? 'Перерыв' : ''),
    clientId: booking?.student_id || null,
    clientName,
    servicePrice: Number(l.price) || 0,
    raw: l,
  };
}

/**
 * Раскладка пересекающихся событий по столбцам внутри ресурса.
 * Greedy interval-graph coloring.
 */
export function packOverlaps(events: ScheduleEvent[]): ScheduleEvent[] {
  const grouped = new Map<string, ScheduleEvent[]>();
  for (const ev of events) {
    if (!grouped.has(ev.columnId)) grouped.set(ev.columnId, []);
    grouped.get(ev.columnId)!.push(ev);
  }
  const result: ScheduleEvent[] = [];
  for (const list of grouped.values()) {
    const sorted = [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
    const lanes: Date[] = []; // конец последнего события в lane
    const placed: Array<{ ev: ScheduleEvent; lane: number }> = [];
    for (const ev of sorted) {
      let lane = lanes.findIndex(end => end <= ev.start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(ev.end);
      } else {
        lanes[lane] = ev.end;
      }
      placed.push({ ev, lane });
    }
    // Группируем по «кластерам» пересечений, чтобы totalColumns был локальным.
    // Простой способ: сканируем линию событий и группируем по непрерывным пересечениям.
    const clusters: Array<{ items: typeof placed; maxLane: number }> = [];
    let currentEnd = -Infinity;
    let current: typeof placed = [];
    for (const p of [...placed].sort((a, b) => a.ev.start.getTime() - b.ev.start.getTime())) {
      if (p.ev.start.getTime() >= currentEnd) {
        if (current.length) clusters.push({ items: current, maxLane: Math.max(...current.map(x => x.lane)) });
        current = [p];
        currentEnd = p.ev.end.getTime();
      } else {
        current.push(p);
        currentEnd = Math.max(currentEnd, p.ev.end.getTime());
      }
    }
    if (current.length) clusters.push({ items: current, maxLane: Math.max(...current.map(x => x.lane)) });

    for (const c of clusters) {
      const total = c.maxLane + 1;
      for (const { ev, lane } of c.items) {
        result.push({ ...ev, column: lane, totalColumns: total });
      }
    }
  }
  return result;
}

/**
 * Расчёт top/height блока в пикселях.
 */
export function computePosition(
  ev: ScheduleEvent,
  dayStart: Date,
  slotMinutes: number,
  rowHeight: number,
) {
  const startMin = (ev.start.getTime() - dayStart.getTime()) / 60_000;
  const durationMin = (ev.end.getTime() - ev.start.getTime()) / 60_000;
  const top = (startMin / slotMinutes) * rowHeight;
  const height = Math.max(28, (durationMin / slotMinutes) * rowHeight);
  return { top, height };
}

export function getDayStats(events: ScheduleEvent[]) {
  const completed = events.filter(e => e.status === 'completed').length;
  const revenue = events
    .filter(e => e.status === 'completed' || e.status === 'confirmed')
    .reduce((s, e) => s + (e.servicePrice || 0), 0);
  return { count: events.length, completed, revenue };
}

export function buildTimeSlots(dayStartHour: number, dayEndHour: number, slotMinutes: number) {
  const slots: { label: string; minutes: number }[] = [];
  for (let m = dayStartHour * 60; m < dayEndHour * 60; m += slotMinutes) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push({
      label: `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`,
      minutes: m,
    });
  }
  return slots;
}

export function makeDayStart(date: Date, dayStartHour: number) {
  const d = new Date(date);
  d.setHours(dayStartHour, 0, 0, 0);
  return d;
}

export const STATUS_BG: Record<string, string> = {
  pending: 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200',
  confirmed: 'bg-indigo-100 border-indigo-300 text-indigo-900 hover:bg-indigo-200',
  scheduled: 'bg-indigo-100 border-indigo-300 text-indigo-900 hover:bg-indigo-200',
  in_progress: 'bg-blue-100 border-blue-300 text-blue-900 hover:bg-blue-200',
  completed: 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200',
  cancelled: 'bg-muted border-border text-muted-foreground hover:bg-muted/80',
  rejected: 'bg-muted border-border text-muted-foreground hover:bg-muted/80',
  no_show: 'bg-rose-100 border-rose-300 text-rose-900 hover:bg-rose-200',
  break: 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200',
};
