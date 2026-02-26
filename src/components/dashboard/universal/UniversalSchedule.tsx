import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, ChevronLeft, ChevronRight, Trash2, Coffee, Clock, Settings2 } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CategoryConfig } from './categoryConfig';

const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const timeSlots = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

const statusColors: Record<string, string> = {
  scheduled: 'bg-primary/15 text-primary border-primary/20',
  completed: 'bg-primary/10 text-primary border-primary/15',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/20',
  no_show: 'bg-accent/15 text-accent-foreground border-accent/20',
  break: 'bg-muted text-muted-foreground border-border',
};

interface Props { config: CategoryConfig; }

interface ServiceOption {
  id: string; name: string; duration_minutes: number; price: number;
}

// Helper: add minutes to HH:MM
const addMinutesToTime = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
};

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const UniversalSchedule = ({ config }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBreakOpen, setIsBreakOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slotDuration, setSlotDuration] = useState(60);
  const [breakDuration, setBreakDuration] = useState(15);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [workStart] = useState('09:00');
  const [workEnd] = useState('18:00');

  const [formData, setFormData] = useState({
    service_id: '', title: '', description: '',
    lesson_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '', end_time: '',
    lesson_type: 'individual' as 'individual' | 'group',
    max_participants: 1, price: 0,
    recurrence: 'none', recurrence_end: '', day_of_week: 1,
    recurrence_interval: 7,
  });

  const [breakData, setBreakData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '12:00', end_time: '13:00',
  });

  // Fetch services for dropdown
  useEffect(() => {
    if (!user) return;
    supabase.from('services').select('id, name, duration_minutes, price')
      .eq('master_id', user.id).eq('is_active', true)
      .then(({ data }) => setServices((data || []).map(s => ({
        id: s.id, name: s.name, duration_minutes: s.duration_minutes || 60, price: Number(s.price) || 0,
      }))));
  }, [user]);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    let startDate: Date, endDate: Date;
    if (view === 'day') { startDate = currentDate; endDate = currentDate; }
    else if (view === 'week') { startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); endDate = endOfWeek(currentDate, { weekStartsOn: 1 }); }
    else { startDate = startOfMonth(currentDate); endDate = endOfMonth(currentDate); }
    const { data } = await supabase.from('lessons').select('*, lesson_bookings(student_id, status, profiles:student_id(first_name, last_name))')
      .eq('teacher_id', user.id)
      .gte('lesson_date', format(startDate, 'yyyy-MM-dd'))
      .lte('lesson_date', format(endDate, 'yyyy-MM-dd'))
      .order('lesson_date').order('start_time');
    setItems(data || []);
  }, [user, currentDate, view]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const navigate = (dir: number) => {
    if (view === 'day') setCurrentDate(prev => addDays(prev, dir));
    else if (view === 'week') setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  // Compute available slots for a given date and service duration
  const getAvailableSlots = useMemo(() => {
    const selectedService = services.find(s => s.id === formData.service_id);
    if (!selectedService || !formData.lesson_date) return [];

    const duration = selectedService.duration_minutes;
    const minSlot = Math.min(...services.map(s => s.duration_minutes), 30);
    const slotStep = minSlot; // Generate slots by minimum service duration

    const dayItems = items.filter(w => w.lesson_date === formData.lesson_date);
    // Blocked intervals: existing lessons + breaks
    const blocked: { start: number; end: number }[] = dayItems.map(w => ({
      start: timeToMinutes(w.start_time?.slice(0, 5) || '00:00'),
      end: timeToMinutes(w.end_time?.slice(0, 5) || '00:00'),
    }));

    const wsMin = timeToMinutes(workStart);
    const weMin = timeToMinutes(workEnd);
    const slots: string[] = [];

    for (let t = wsMin; t + duration <= weMin; t += slotStep) {
      const slotStart = t;
      const slotEnd = t + duration;
      // Check if this slot overlaps any blocked interval
      const overlaps = blocked.some(b => slotStart < b.end && slotEnd > b.start);
      if (!overlaps) {
        const hh = Math.floor(t / 60).toString().padStart(2, '0');
        const mm = (t % 60).toString().padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  }, [formData.service_id, formData.lesson_date, services, items, workStart, workEnd]);

  const onServiceChange = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      setFormData(p => ({
        ...p, service_id: serviceId, title: svc.name, price: svc.price,
        start_time: '', end_time: '',
      }));
    }
  };

  const onSlotSelect = (slot: string) => {
    const svc = services.find(s => s.id === formData.service_id);
    if (!svc) return;
    setFormData(p => ({
      ...p, start_time: slot,
      end_time: addMinutesToTime(slot, svc.duration_minutes),
    }));
  };

  const checkConflicts = async (date: string, startTime: string, endTime: string, excludeId?: string) => {
    if (!user) return false;
    let query = supabase.from('lessons').select('id')
      .eq('teacher_id', user.id).eq('lesson_date', date)
      .lt('start_time', endTime).gt('end_time', startTime);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query;
    return (data?.length || 0) > 0;
  };

  const handleCreate = async () => {
    if (!user || !formData.title || !formData.start_time || !formData.end_time) return;
    try {
      const hasConflict = await checkConflicts(formData.lesson_date, formData.start_time, formData.end_time);
      if (hasConflict) {
        toast({ title: 'Конфликт', description: 'На это время уже есть запись', variant: 'destructive' });
        return;
      }

      if (formData.recurrence !== 'none' && formData.recurrence_end) {
        const { data: pattern, error: patternErr } = await supabase.from('recurring_patterns').insert({
          teacher_id: user.id, title: formData.title, lesson_type: formData.lesson_type,
          recurrence_type: formData.recurrence as any, day_of_week: formData.day_of_week,
          start_time: formData.start_time, end_time: formData.end_time,
          start_date: formData.lesson_date, end_date: formData.recurrence_end,
          price: formData.price, max_participants: formData.max_participants,
          description: formData.description || null,
        }).select().single();
        if (patternErr) throw patternErr;
        const start = new Date(formData.lesson_date);
        const end = new Date(formData.recurrence_end);
        const batch: any[] = [];
        let d = new Date(start);
        const interval = formData.recurrence === 'custom' ? formData.recurrence_interval : 1;
        while (d <= end) {
          const match = formData.recurrence === 'weekly' ? d.getDay() === formData.day_of_week
            : formData.recurrence === 'daily' ? true
            : formData.recurrence === 'monthly' ? d.getDate() === start.getDate()
            : true;
          if (match) {
            batch.push({
              teacher_id: user.id, title: formData.title, description: formData.description || null,
              lesson_date: format(d, 'yyyy-MM-dd'), start_time: formData.start_time, end_time: formData.end_time,
              lesson_type: formData.lesson_type, max_participants: formData.max_participants,
              price: formData.price, recurring_pattern_id: pattern.id,
            });
          }
          d = addDays(d, formData.recurrence === 'weekly' ? 7 : formData.recurrence === 'monthly' ? 30 : interval);
        }
        let conflictCount = 0;
        const safeBatch = [];
        for (const item of batch) {
          const conflict = await checkConflicts(item.lesson_date, item.start_time, item.end_time);
          if (conflict) { conflictCount++; } else { safeBatch.push(item); }
        }
        if (safeBatch.length > 0) {
          const { error } = await supabase.from('lessons').insert(safeBatch as any);
          if (error) throw error;
        }
        toast({ title: 'Серия создана', description: `Создано ${safeBatch.length} записей${conflictCount > 0 ? `, пропущено ${conflictCount} из-за конфликтов` : ''}` });
      } else {
        const { error } = await supabase.from('lessons').insert({
          teacher_id: user.id, title: formData.title, description: formData.description || null,
          lesson_date: formData.lesson_date, start_time: formData.start_time, end_time: formData.end_time,
          lesson_type: formData.lesson_type, max_participants: formData.max_participants, price: formData.price,
        });
        if (error) throw error;
        toast({ title: 'Запись создана' });
      }
      setIsCreateOpen(false);
      setFormData({ service_id: '', title: '', description: '', lesson_date: format(new Date(), 'yyyy-MM-dd'), start_time: '', end_time: '', lesson_type: 'individual', max_participants: 1, price: 0, recurrence: 'none', recurrence_end: '', day_of_week: 1, recurrence_interval: 7 });
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddBreak = async () => {
    if (!user) return;
    try {
      const hasConflict = await checkConflicts(breakData.date, breakData.start_time, breakData.end_time);
      if (hasConflict) {
        toast({ title: 'Конфликт', description: 'На это время уже есть запись', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('lessons').insert({
        teacher_id: user.id, title: 'Перерыв', lesson_date: breakData.date,
        start_time: breakData.start_time, end_time: breakData.end_time,
        lesson_type: 'individual' as const, max_participants: 0, price: 0, status: 'cancelled' as const,
        notes: 'break',
      });
      if (error) throw error;
      toast({ title: 'Перерыв добавлен' });
      setIsBreakOpen(false);
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('lessons').delete().eq('id', id);
    toast({ title: 'Удалено' }); fetchItems();
  };

  const handleUpdateStatus = async (id: string, status: 'scheduled' | 'completed' | 'cancelled' | 'no_show') => {
    await supabase.from('lessons').update({ status }).eq('id', id);
    fetchItems();
  };

  const getForDate = (date: Date) => items.filter(w => isSameDay(new Date(w.lesson_date), date));

  const getNavLabel = () => {
    if (view === 'day') return format(currentDate, 'd MMMM yyyy, EEEE', { locale: ru });
    if (view === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(s, 'd MMM', { locale: ru })} – ${format(e, 'd MMM yyyy', { locale: ru })}`;
    }
    return format(currentDate, 'LLLL yyyy', { locale: ru });
  };

  const isBreak = (w: any) => w.notes === 'break' || (w.status === 'cancelled' && w.max_participants === 0);

  const renderCard = (w: any) => {
    const brk = isBreak(w);
    const booking = (w.lesson_bookings as any[])?.[0];
    const clientName = booking?.profiles ? `${booking.profiles.first_name || ''} ${booking.profiles.last_name || ''}`.trim() : null;
    return (
      <div key={w.id} className={`p-3 rounded-lg border ${brk ? statusColors.break : statusColors[w.status] || 'bg-muted'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {brk && <Coffee className="h-3.5 w-3.5" />}
              <p className="font-semibold text-sm">{w.title}</p>
            </div>
            <p className="text-xs mt-0.5">{w.start_time?.slice(0, 5)} – {w.end_time?.slice(0, 5)}</p>
            {!brk && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] h-5">
                  {w.lesson_type === 'group' ? `Группа (${w.current_participants}/${w.max_participants})` : 'Индивид.'}
                </Badge>
                <span className="text-xs font-medium">{Number(w.price).toLocaleString()} ₽</span>
                {clientName && <span className="text-xs text-muted-foreground">· {clientName}</span>}
              </div>
            )}
          </div>
          {w.status === 'scheduled' && !brk && (
            <div className="flex gap-0.5 shrink-0">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUpdateStatus(w.id, 'completed')}>✓</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUpdateStatus(w.id, 'no_show')}>⊘</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(w.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          )}
          {brk && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(w.id)}><Trash2 className="h-3 w-3" /></Button>}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayItems = getForDate(currentDate);
    return (
      <div className="space-y-1">
        {timeSlots.map(slot => {
          const slotItems = dayItems.filter(w => w.start_time?.slice(0, 5) === slot);
          return (
            <div key={slot} className="flex gap-2 min-h-[40px]">
              <div className="w-14 shrink-0 text-xs text-muted-foreground pt-1 text-right pr-2 border-r">{slot}</div>
              <div className="flex-1 space-y-1">{slotItems.length > 0 ? slotItems.map(renderCard) : null}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
    return (
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(day => {
          const dayItems = getForDate(day);
          const today = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className="min-h-[120px]">
              <div className={`text-center py-1.5 rounded-t-lg text-xs font-medium ${today ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <p>{daysOfWeek[day.getDay() === 0 ? 6 : day.getDay() - 1]}</p>
                <p className="text-sm font-bold">{format(day, 'd')}</p>
              </div>
              <div className="space-y-0.5 p-1 border border-t-0 rounded-b-lg min-h-[80px]">
                {dayItems.map(w => {
                  const brk = isBreak(w);
                  return (
                    <div key={w.id} className={`text-[10px] p-1.5 rounded border ${brk ? statusColors.break : statusColors[w.status] || 'bg-muted'}`}>
                      <p className="font-medium truncate">{brk ? '☕ Перерыв' : w.title}</p>
                      <p>{w.start_time?.slice(0, 5)}–{w.end_time?.slice(0, 5)}</p>
                      {!brk && w.price > 0 && <p className="opacity-75">{Number(w.price).toLocaleString()} ₽</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {daysOfWeek.map(d => <div key={d} className="text-center font-medium text-xs text-muted-foreground pb-1">{d}</div>)}
      {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) }).map(day => {
        const dayItems = getForDate(day);
        const isCurrent = day.getMonth() === currentDate.getMonth();
        const today = isSameDay(day, new Date());
        const breaks = dayItems.filter(isBreak);
        const sessions = dayItems.filter(w => !isBreak(w));
        return (
          <div key={day.toISOString()} className={`min-h-[56px] p-1 rounded border text-xs ${!isCurrent ? 'opacity-40' : ''} ${today ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <p className={`font-medium ${today ? 'text-primary' : ''}`}>{format(day, 'd')}</p>
            {sessions.length > 0 && <Badge variant="secondary" className="text-[9px] h-4 mt-0.5">{sessions.length} зап.</Badge>}
            {breaks.length > 0 && <Badge variant="outline" className="text-[9px] h-4 mt-0.5">☕{breaks.length}</Badge>}
          </div>
        );
      })}
    </div>
  );

  const selectedService = services.find(s => s.id === formData.service_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-sm min-w-[180px] text-center">{getNavLabel()}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs h-6 px-2">День</TabsTrigger>
              <TabsTrigger value="week" className="text-xs h-6 px-2">Неделя</TabsTrigger>
              <TabsTrigger value="month" className="text-xs h-6 px-2">Месяц</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setIsSettingsOpen(true)}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>

          <Dialog open={isBreakOpen} onOpenChange={setIsBreakOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1"><Coffee className="h-3.5 w-3.5" /> Перерыв</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Добавить перерыв</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Дата</Label><Input type="date" value={breakData.date} onChange={e => setBreakData(p => ({ ...p, date: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Начало</Label><Input type="time" value={breakData.start_time} onChange={e => setBreakData(p => ({ ...p, start_time: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Конец</Label><Input type="time" value={breakData.end_time} onChange={e => setBreakData(p => ({ ...p, end_time: e.target.value }))} /></div>
                </div>
                <p className="text-xs text-muted-foreground">Перерыв блокирует тайм-слот</p>
                <Button className="w-full" onClick={handleAddBreak}>Добавить перерыв</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Создать запись</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Создать запись</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Service selection */}
                {services.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Услуга *</Label>
                    <Select value={formData.service_id} onValueChange={onServiceChange}>
                      <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} · {s.duration_minutes} мин · {s.price.toLocaleString()} ₽
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Название *</Label>
                    <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Название услуги" />
                  </div>
                )}

                {/* Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Дата</Label>
                    <Input type="date" value={formData.lesson_date} onChange={e => setFormData(p => ({ ...p, lesson_date: e.target.value, start_time: '', end_time: '' }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Тип</Label>
                    <Select value={formData.lesson_type} onValueChange={v => setFormData(p => ({ ...p, lesson_type: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Индивидуально</SelectItem>
                        <SelectItem value="group">Группа</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Smart time slots */}
                {formData.service_id && formData.lesson_date ? (
                  <div className="space-y-2">
                    <Label>Доступное время <span className="text-muted-foreground font-normal">({selectedService?.duration_minutes} мин)</span></Label>
                    {getAvailableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Нет доступных слотов на эту дату</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {getAvailableSlots.map(slot => (
                          <Button
                            key={slot}
                            variant={formData.start_time === slot ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => onSlotSelect(slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                    {formData.start_time && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formData.start_time} – {formData.end_time}
                      </p>
                    )}
                  </div>
                ) : !formData.service_id ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Начало</Label><Input type="time" value={formData.start_time} onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Конец</Label><Input type="time" value={formData.end_time} onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))} /></div>
                  </div>
                ) : null}

                {!formData.service_id && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Цена (₽)</Label><Input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))} /></div>
                    {formData.lesson_type === 'group' && (
                      <div className="space-y-2"><Label>Макс. участников</Label><Input type="number" min={2} value={formData.max_participants} onChange={e => setFormData(p => ({ ...p, max_participants: Number(e.target.value) }))} /></div>
                    )}
                  </div>
                )}

                {formData.lesson_type === 'group' && formData.service_id && (
                  <div className="space-y-2"><Label>Макс. участников</Label><Input type="number" min={2} value={formData.max_participants} onChange={e => setFormData(p => ({ ...p, max_participants: Number(e.target.value) }))} /></div>
                )}

                {/* Recurrence */}
                <div className="space-y-2">
                  <Label>Повторение</Label>
                  <Select value={formData.recurrence} onValueChange={v => setFormData(p => ({ ...p, recurrence: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Разовая запись</SelectItem>
                      <SelectItem value="weekly">Раз в неделю</SelectItem>
                      <SelectItem value="monthly">Раз в месяц</SelectItem>
                      <SelectItem value="custom">Каждые N дней</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.recurrence === 'weekly' && (
                  <div className="space-y-2">
                    <Label>День недели</Label>
                    <Select value={String(formData.day_of_week)} onValueChange={v => setFormData(p => ({ ...p, day_of_week: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map((d,i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.recurrence === 'custom' && (
                  <div className="space-y-2"><Label>Каждые (дней)</Label><Input type="number" min={1} value={formData.recurrence_interval} onChange={e => setFormData(p => ({ ...p, recurrence_interval: Number(e.target.value) }))} /></div>
                )}
                {formData.recurrence !== 'none' && (
                  <>
                    <div className="space-y-2"><Label>Повторять до</Label><Input type="date" value={formData.recurrence_end} onChange={e => setFormData(p => ({ ...p, recurrence_end: e.target.value }))} /></div>
                    <p className="text-xs text-muted-foreground">⚠️ Система проверит конфликты и пропустит занятые слоты</p>
                  </>
                )}
                <div className="space-y-2"><Label>Описание</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleCreate} disabled={!formData.start_time}>Создать</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Settings dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Настройки расписания</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Длительность тайм-слота (мин)</Label>
              <Select value={String(slotDuration)} onValueChange={v => setSlotDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map(m => <SelectItem key={m} value={String(m)}>{m} мин</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Перерыв между записями (мин)</Label>
              <Select value={String(breakDuration)} onValueChange={v => setBreakDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15, 20, 30].map(m => <SelectItem key={m} value={String(m)}>{m === 0 ? 'Без перерыва' : `${m} мин`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setIsSettingsOpen(false); toast({ title: 'Настройки сохранены' }); }} className="w-full">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}
    </div>
  );
};

export default UniversalSchedule;
