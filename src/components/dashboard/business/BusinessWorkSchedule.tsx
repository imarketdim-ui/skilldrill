import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { normalizeMasterScheduleSettings } from '@/lib/serviceSchedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BusinessDaySchedule as SharedBusinessDaySchedule,
  findBusinessScheduleConflicts,
  formatScheduleConflictMessage,
} from '@/lib/masterScheduleConflicts';

interface Props { businessId: string; }

interface DaySchedule extends SharedBusinessDaySchedule {}

const presets = [
  { label: 'Будние дни', value: 'weekdays' },
  { label: 'Все дни', value: 'alldays' },
  { label: 'Выходные', value: 'weekends' },
  { label: 'Ручной', value: 'custom' },
];

const BusinessWorkSchedule = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [masters, setMasters] = useState<any[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<string>('');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({});
  const [editDay, setEditDay] = useState<string | null>(null);
  const [dayForm, setDayForm] = useState<DaySchedule>({ status: 'work', start: '09:00', end: '18:00' });
  const [defaultHours, setDefaultHours] = useState({ start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' });
  const [personalSettings, setPersonalSettings] = useState<any | null>(null);

  useEffect(() => {
    supabase.from('business_masters')
      .select('master_id, profile:profiles!business_masters_master_id_fkey(first_name, last_name)')
      .eq('business_id', businessId).eq('status', 'accepted')
      .then(({ data }) => {
        const list = (data || []).map((m: any) => ({
          id: m.master_id,
          name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Без имени',
        }));
        setMasters(list);
        if (list.length > 0 && !selectedMaster) setSelectedMaster(list[0].id);
      });
  }, [businessId]);

  useEffect(() => {
    if (!selectedMaster) return;
    const key = `work_schedule_${businessId}_${selectedMaster}_${format(month, 'yyyy-MM')}`;
    const saved = localStorage.getItem(key);
    if (saved) try { setSchedule(JSON.parse(saved)); } catch { setSchedule({}); }
    else setSchedule({});

    supabase
      .from('master_profiles')
      .select('work_days, work_hours_config, break_config')
      .eq('user_id', selectedMaster)
      .maybeSingle()
      .then(({ data }) => {
        setPersonalSettings(
          data
            ? normalizeMasterScheduleSettings(data.work_days, data.work_hours_config, data.break_config)
            : null,
        );
      });
  }, [selectedMaster, month, businessId]);

  const scheduleConflicts = useMemo(
    () =>
      selectedMaster
        ? findBusinessScheduleConflicts({
            masterId: selectedMaster,
            businessId,
            schedule,
            personalSettings,
          })
        : [],
    [businessId, personalSettings, schedule, selectedMaster],
  );

  const saveSchedule = async (updated: Record<string, DaySchedule>) => {
    if (!selectedMaster) return false;
    const { data: profile } = await supabase
      .from('master_profiles')
      .select('work_days, work_hours_config, break_config')
      .eq('user_id', selectedMaster)
      .maybeSingle();

    const personalSettings = profile
      ? normalizeMasterScheduleSettings(profile.work_days, profile.work_hours_config, profile.break_config)
      : null;

    const conflicts = findBusinessScheduleConflicts({
      masterId: selectedMaster,
      businessId,
      schedule: updated,
      personalSettings,
    });

    if (conflicts.length > 0) {
      toast({
        title: 'Есть пересечение расписаний',
        description: formatScheduleConflictMessage(conflicts[0]),
        variant: 'destructive',
      });
      return false;
    }

    setSchedule(updated);
    const key = `work_schedule_${businessId}_${selectedMaster}_${format(month, 'yyyy-MM')}`;
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  };

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

  const applyPreset = async (preset: string) => {
    const newSchedule: Record<string, DaySchedule> = {};
    days.forEach(d => {
      const key = format(d, 'yyyy-MM-dd');
      const dow = getDay(d); // 0=Sun, 6=Sat
      const isWeekend = dow === 0 || dow === 6;
      if (preset === 'weekdays') newSchedule[key] = isWeekend ? { status: 'off' } : { status: 'work', ...defaultHours };
      else if (preset === 'alldays') newSchedule[key] = { status: 'work', ...defaultHours };
      else if (preset === 'weekends') newSchedule[key] = isWeekend ? { status: 'work', ...defaultHours } : { status: 'off' };
    });
    const saved = await saveSchedule(newSchedule);
    if (!saved) return;
    toast({ title: 'Пресет применён' });
  };

  const toggleDay = async (dateKey: string) => {
    const current = schedule[dateKey];
    if (!current || current.status === 'off') {
      await saveSchedule({ ...schedule, [dateKey]: { status: 'work', ...defaultHours } });
    } else {
      await saveSchedule({ ...schedule, [dateKey]: { status: 'off' } });
    }
  };

  const openDayEdit = (dateKey: string) => {
    const current = schedule[dateKey] || { status: 'work', ...defaultHours };
    setDayForm(current);
    setEditDay(dateKey);
  };

  const saveDayEdit = async () => {
    if (!editDay) return;
    const saved = await saveSchedule({ ...schedule, [editDay]: dayForm });
    if (!saved) return;
    setEditDay(null);
    toast({ title: 'День обновлён' });
  };

  const getDayColor = (dateKey: string) => {
    const s = schedule[dateKey];
    if (!s || s.status === 'off') return 'bg-muted/50 text-muted-foreground';
    if (s.status === 'custom') return 'bg-accent/20 text-accent-foreground border-accent';
    return 'bg-primary/10 text-primary border-primary/30';
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const firstDayOffset = (getDay(days[0]) + 6) % 7; // Monday-based

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" /> График работы</h2>

      <div className="flex items-center gap-3 flex-wrap">
        {masters.length > 0 && (
          <Select value={selectedMaster} onValueChange={setSelectedMaster}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Выберите мастера" /></SelectTrigger>
            <SelectContent>
              {masters.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium min-w-[120px] text-center">{format(month, 'LLLL yyyy', { locale: ru })}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {scheduleConflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Есть пересечение расписаний</AlertTitle>
          <AlertDescription>
            <div className="space-y-1">
              <p>Этот график пересекается с личным кабинетом мастера или его расписанием в другой организации.</p>
              <ul className="list-disc pl-4">
                {scheduleConflicts.slice(0, 5).map(conflict => (
                  <li key={`${conflict.date}-${conflict.start}-${conflict.end}`}>
                    {formatScheduleConflictMessage(conflict)}
                  </li>
                ))}
              </ul>
              {scheduleConflicts.length > 5 && <p>И ещё {scheduleConflicts.length - 5} пересечений.</p>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Пресеты</CardTitle>
          <CardDescription>Быстрое заполнение графика</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {presets.filter(p => p.value !== 'custom').map(p => (
            <Button key={p.value} variant="outline" size="sm" onClick={() => applyPreset(p.value)}>{p.label}</Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Рабочее время по умолчанию</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Начало</Label>
              <Input type="time" value={defaultHours.start} onChange={e => setDefaultHours(p => ({ ...p, start: e.target.value }))} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Конец</Label>
              <Input type="time" value={defaultHours.end} onChange={e => setDefaultHours(p => ({ ...p, end: e.target.value }))} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Перерыв с</Label>
              <Input type="time" value={defaultHours.breakStart} onChange={e => setDefaultHours(p => ({ ...p, breakStart: e.target.value }))} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Перерыв до</Label>
              <Input type="time" value={defaultHours.breakEnd} onChange={e => setDefaultHours(p => ({ ...p, breakEnd: e.target.value }))} className="h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chess grid */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(d => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>)}
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(d => {
              const key = format(d, 'yyyy-MM-dd');
              const s = schedule[key];
              const isWork = s && s.status !== 'off';
              return (
                <button
                  key={key}
                  className={`aspect-square rounded-lg border text-xs flex flex-col items-center justify-center gap-0.5 transition-colors hover:ring-2 hover:ring-primary/30 ${getDayColor(key)}`}
                  onClick={() => toggleDay(key)}
                  onDoubleClick={() => openDayEdit(key)}
                  title="Клик — вкл/выкл, двойной клик — настройки"
                >
                  <span className="font-bold">{format(d, 'd')}</span>
                  {isWork && s?.start && <span className="text-[9px]">{s.start}-{s.end}</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Клик — вкл/выкл рабочий день · Двойной клик — настроить время</p>
        </CardContent>
      </Card>

      <Dialog open={!!editDay} onOpenChange={() => setEditDay(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Настроить день {editDay}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Начало</Label><Input type="time" value={dayForm.start || ''} onChange={e => setDayForm(p => ({ ...p, start: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Конец</Label><Input type="time" value={dayForm.end || ''} onChange={e => setDayForm(p => ({ ...p, end: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Перерыв с</Label><Input type="time" value={dayForm.breakStart || ''} onChange={e => setDayForm(p => ({ ...p, breakStart: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Перерыв до</Label><Input type="time" value={dayForm.breakEnd || ''} onChange={e => setDayForm(p => ({ ...p, breakEnd: e.target.value }))} /></div>
            </div>
            {editDay && (() => {
              const previewConflicts = selectedMaster
                ? findBusinessScheduleConflicts({
                    masterId: selectedMaster,
                    businessId,
                    schedule: { ...schedule, [editDay]: dayForm },
                    personalSettings,
                  })
                : [];
              return previewConflicts.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTitle>Пересечение в этом дне</AlertTitle>
                  <AlertDescription>{formatScheduleConflictMessage(previewConflicts[0])}</AlertDescription>
                </Alert>
              ) : null;
            })()}
            <Button className="w-full" onClick={saveDayEdit}>Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessWorkSchedule;
