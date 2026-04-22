import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addMonths, endOfMonth, format, startOfMonth, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  masterId: string;
  onSelectDate?: (dateISO: string) => void;
}

type DayState = 'free' | 'partial' | 'busy';

/**
 * Виджет «Календарь занятости мастера» (месяц).
 * Зелёный — есть слоты, серый — день полностью занят/выходной.
 */
const MasterAvailabilityCalendar = ({ masterId, onSelectDate }: Props) => {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, DayState>>({});

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const arr: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) arr.push(d);
    return arr;
  }, [month]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const today = new Date();
      const results: Record<string, DayState> = {};
      await Promise.all(
        days.map(async (d) => {
          if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
            results[format(d, 'yyyy-MM-dd')] = 'busy';
            return;
          }
          const iso = format(d, 'yyyy-MM-dd');
          const { data } = await supabase.rpc('has_master_availability_on_date', {
            _master_id: masterId,
            _date: iso,
          });
          results[iso] = data ? 'free' : 'busy';
        }),
      );
      if (!cancelled) {
        setStatuses(results);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [masterId, month]);

  const firstDayOffset = (startOfMonth(month).getDay() + 6) % 7; // Пн=0
  const blanks = Array.from({ length: firstDayOffset });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Календарь занятости</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(month, 'LLLL yyyy', { locale: ru })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1 text-[10px] text-muted-foreground text-center">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => <div key={`b-${i}`} />)}
              {days.map((d) => {
                const iso = format(d, 'yyyy-MM-dd');
                const st = statuses[iso] || 'busy';
                const isToday = isSameDay(d, new Date());
                const dayStyles =
                  st === 'free'
                    ? 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                    : 'bg-muted text-muted-foreground cursor-not-allowed';
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={st !== 'free'}
                    onClick={() => st === 'free' && onSelectDate?.(iso)}
                    className={cn(
                      'h-8 rounded text-xs font-medium transition-colors',
                      dayStyles,
                      isToday && 'ring-1 ring-primary',
                    )}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
              <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-primary/10" /> Свободно</div>
              <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-muted" /> Занято</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MasterAvailabilityCalendar;
