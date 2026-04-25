import { useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ScheduleEvent,
  buildTimeSlots,
  computePosition,
  makeDayStart,
  packOverlaps,
} from './scheduleUtils';

export interface ScheduleColumn {
  id: string;
  title: string;
  subtitle?: string;
}

export interface ScheduleGridProps {
  date: Date;
  columns: ScheduleColumn[];
  events: ScheduleEvent[];
  slotMinutes?: number;
  rowHeight?: number;
  dayStartHour?: number;
  dayEndHour?: number;
  onEmptyClick?: (columnId: string, time: Date) => void;
  renderEvent: (event: ScheduleEvent, geom: { top: number; height: number }) => React.ReactNode;
}

export default function ScheduleGrid({
  date,
  columns,
  events,
  slotMinutes = 30,
  rowHeight = 36,
  dayStartHour = 8,
  dayEndHour = 22,
  onEmptyClick,
  renderEvent,
}: ScheduleGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dayStart = useMemo(() => makeDayStart(date, dayStartHour), [date, dayStartHour]);
  const slots = useMemo(
    () => buildTimeSlots(dayStartHour, dayEndHour, slotMinutes),
    [dayStartHour, dayEndHour, slotMinutes],
  );
  const totalHeight = slots.length * rowHeight;
  const packed = useMemo(() => packOverlaps(events), [events]);

  // Auto-scroll to current hour on mount/date change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const now = new Date();
    const sameDay =
      now.getFullYear() === date.getFullYear() &&
      now.getMonth() === date.getMonth() &&
      now.getDate() === date.getDate();
    const targetHour = sameDay ? now.getHours() : 9;
    const top = Math.max(0, (targetHour - dayStartHour - 1) * (60 / slotMinutes) * rowHeight);
    el.scrollTo({ top, behavior: 'smooth' });
  }, [date, dayStartHour, slotMinutes, rowHeight]);

  // Now-line position
  const nowLineTop = useMemo(() => {
    const now = new Date();
    const sameDay =
      now.getFullYear() === date.getFullYear() &&
      now.getMonth() === date.getMonth() &&
      now.getDate() === date.getDate();
    if (!sameDay) return null;
    const minutes = (now.getTime() - dayStart.getTime()) / 60_000;
    if (minutes < 0 || minutes > (dayEndHour - dayStartHour) * 60) return null;
    return (minutes / slotMinutes) * rowHeight;
  }, [date, dayStart, dayEndHour, dayStartHour, slotMinutes, rowHeight]);

  const handleColumnClick = (e: React.MouseEvent, columnId: string) => {
    if (!onEmptyClick) return;
    if ((e.target as HTMLElement).closest('[data-event-block]')) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromStart = Math.floor(y / rowHeight) * slotMinutes;
    const time = new Date(dayStart.getTime() + minutesFromStart * 60_000);
    onEmptyClick(columnId, time);
  };

  const eventsByColumn = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const ev of packed) {
      if (!map.has(ev.columnId)) map.set(ev.columnId, []);
      map.get(ev.columnId)!.push(ev);
    }
    return map;
  }, [packed]);

  const colWidth = `minmax(140px, 1fr)`;
  const gridTemplate = `64px ${columns.map(() => colWidth).join(' ')}`;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Sticky header */}
      <div
        className="grid border-b bg-muted/40 sticky top-0 z-20"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="p-2 text-xs text-muted-foreground border-r">Время</div>
        {columns.map(col => (
          <div key={col.id} className="p-2 border-r last:border-r-0">
            <p className="text-sm font-semibold truncate">{col.title}</p>
            {col.subtitle && (
              <p className="text-[11px] text-muted-foreground truncate">{col.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Scroll body */}
      <div ref={containerRef} className="overflow-auto" style={{ maxHeight: '70vh' }}>
        <div
          className="grid relative"
          style={{ gridTemplateColumns: gridTemplate, height: totalHeight }}
        >
          {/* Time column */}
          <div className="border-r relative">
            {slots.map((s, i) => (
              <div
                key={s.minutes}
                className={`absolute left-0 right-0 px-1.5 text-[10px] text-muted-foreground ${
                  i % 2 === 0 ? 'font-medium' : 'opacity-70'
                }`}
                style={{ top: i * rowHeight - 6, height: rowHeight }}
              >
                {s.label}
              </div>
            ))}
          </div>

          {/* Resource columns */}
          {columns.map(col => {
            const colEvents = eventsByColumn.get(col.id) || [];
            return (
              <div
                key={col.id}
                className="border-r last:border-r-0 relative cursor-pointer"
                onClick={e => handleColumnClick(e, col.id)}
              >
                {/* Slot lines */}
                {slots.map((s, i) => (
                  <div
                    key={s.minutes}
                    className={`absolute left-0 right-0 ${
                      i % 2 === 0 ? 'border-t border-border' : 'border-t border-border/40'
                    } hover:bg-primary/5`}
                    style={{ top: i * rowHeight, height: rowHeight }}
                  />
                ))}

                {/* Events */}
                {colEvents.map(ev => {
                  const { top, height } = computePosition(ev, dayStart, slotMinutes, rowHeight);
                  return (
                    <div key={ev.id} data-event-block>
                      {renderEvent(ev, { top, height })}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Now line */}
          {nowLineTop !== null && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: nowLineTop }}
            >
              <div className="h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <div className="absolute -left-12 -top-2 px-1 text-[10px] font-mono text-rose-600 bg-background rounded border border-rose-200">
                  {format(new Date(), 'HH:mm', { locale: ru })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
