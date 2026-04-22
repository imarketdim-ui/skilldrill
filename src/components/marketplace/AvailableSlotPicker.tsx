import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarClock } from 'lucide-react';
import { useAvailableSlots, fetchNextAvailableDate } from '@/hooks/useAvailableSlots';
import { useToast } from '@/hooks/use-toast';

interface Props {
  masterId: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  selected?: string; // HH:mm
  onSelect: (time: string) => void;
  onJumpToDate?: (date: string) => void;
}

/**
 * Грид кнопок с реально свободным временем мастера.
 * Время рендерится только из ответа RPC get_master_available_slots.
 */
const AvailableSlotPicker = ({
  masterId,
  date,
  durationMinutes,
  selected,
  onSelect,
  onJumpToDate,
}: Props) => {
  const { slots, loading } = useAvailableSlots(masterId, date, durationMinutes);
  const { toast } = useToast();

  const times = useMemo(
    () =>
      slots.map((s) => {
        const d = new Date(s.slot_start);
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        return `${hh}:${mm}`;
      }),
    [slots],
  );

  const handleNextAvailable = async () => {
    const next = await fetchNextAvailableDate(masterId, date);
    if (!next) {
      toast({ title: 'В ближайшие 60 дней свободных дат нет', variant: 'destructive' });
      return;
    }
    if (onJumpToDate) onJumpToDate(next);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Загрузка свободного времени…
      </div>
    );
  }

  if (times.length === 0) {
    return (
      <div className="space-y-3 py-2">
        <p className="text-sm text-muted-foreground">На выбранную дату нет свободных слотов.</p>
        <Button variant="outline" size="sm" onClick={handleNextAvailable} type="button">
          <CalendarClock className="w-4 h-4 mr-2" /> Ближайшая свободная дата
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {times.map((t) => (
        <Button
          key={t}
          type="button"
          size="sm"
          variant={selected === t ? 'default' : 'outline'}
          onClick={() => onSelect(t)}
        >
          {t}
        </Button>
      ))}
    </div>
  );
};

export default AvailableSlotPicker;
