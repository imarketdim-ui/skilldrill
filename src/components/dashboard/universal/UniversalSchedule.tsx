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
import { Plus, ChevronLeft, ChevronRight, Trash2, Coffee, Clock, Settings2, CheckCircle, XCircle, ArrowRightLeft, Star, Search, User } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths, differenceInHours, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CategoryConfig } from './categoryConfig';
import MasterTimeOffManager from './MasterTimeOffManager';

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

const noShowReasons = [
  'Не предупредил', 'Болезнь', 'Забыл', 'Пробки / опоздание', 'Другое',
];

const rejectReasons = [
  'Изменилось расписание', 'Рейтинг клиента', 'Занят', 'Болезнь', 'Другое',
];

interface Props { config: CategoryConfig; }

interface ServiceOption {
  id: string; name: string; duration_minutes: number; price: number;
}

const addMinutesToTime = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const DAY_LABELS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAY_NUMS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1..Sun=0

interface WorkHoursEntry { start: string; end: string; }
interface BreakEntry { start: string; end: string; }

const UniversalSchedule = ({ config }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBreakOpen, setIsBreakOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  const [breakDuration, setBreakDuration] = useState(15);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  
  // DB-backed schedule settings
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [workHoursConfig, setWorkHoursConfig] = useState<Record<string, WorkHoursEntry>>({});
  const [breakConfig, setBreakConfig] = useState<Record<string, BreakEntry[]>>({});
  const [usePerDayHours, setUsePerDayHours] = useState(false);
  
  // Status/review dialogs
  const [statusDialog, setStatusDialog] = useState<{ id: string; action: 'no_show' | 'reject' | 'reschedule' } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [formData, setFormData] = useState({
    service_id: '', title: '', description: '',
    lesson_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '', end_time: '',
    lesson_type: 'individual' as 'individual' | 'group',
    max_participants: 1, price: 0,
    recurrence: 'none', recurrence_end: '', day_of_week: 1,
    recurrence_interval: 7,
    client_mode: 'list' as 'list' | 'id' | 'manual',
    client_id: '', client_skillspot_id: '', client_name: '', client_phone: '',
  });

  const [breakData, setBreakData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '12:00', end_time: '13:00',
  });

  useEffect(() => {
    if (!user) return;
    supabase.from('services').select('id, name, duration_minutes, price')
      .eq('master_id', user.id).eq('is_active', true)
      .then(({ data }) => setServices((data || []).map(s => ({
        id: s.id, name: s.name, duration_minutes: s.duration_minutes || 60, price: Number(s.price) || 0,
      }))));
    // Fetch clients for booking dialog
    supabase.from('lesson_bookings')
      .select('student_id, lessons!inner(teacher_id), profiles:student_id(id, first_name, last_name, skillspot_id, phone)')
      .eq('lessons.teacher_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        const unique = new Map<string, any>();
        data.forEach(b => {
          const p = b.profiles as any;
          if (p && !unique.has(p.id)) unique.set(p.id, p);
        });
        setClients(Array.from(unique.values()));
      });
    // Load schedule settings from DB
    supabase.from('master_profiles').select('work_days, work_hours_config, break_config')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (Array.isArray(data.work_days) && data.work_days.length > 0) setWorkDays(data.work_days);
        const whc = data.work_hours_config as any;
        if (whc && typeof whc === 'object') {
          if (whc.default) { setWorkStart(whc.default.start || '09:00'); setWorkEnd(whc.default.end || '18:00'); }
          if (whc.perDay && Object.keys(whc.perDay).length > 0) { setWorkHoursConfig(whc.perDay); setUsePerDayHours(true); }
          if (whc.slotDuration) setSlotDuration(whc.slotDuration);
          if (whc.breakDuration !== undefined) setBreakDuration(whc.breakDuration);
        }
        const bc = data.break_config as any;
        if (bc && typeof bc === 'object' && !Array.isArray(bc)) setBreakConfig(bc);
      });
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

  const getAvailableSlots = useMemo(() => {
    const selectedService = services.find(s => s.id === formData.service_id);
    if (!selectedService || !formData.lesson_date) return [];
    const duration = selectedService.duration_minutes;
    const slotStep = Math.max(15, Math.min(slotDuration, duration));
    const dayItems = items.filter(w => w.lesson_date === formData.lesson_date);
    const blocked = dayItems.map(w => ({
      start: timeToMinutes(w.start_time?.slice(0, 5) || '00:00'),
      end: timeToMinutes(w.end_time?.slice(0, 5) || '00:00') + breakDuration,
    }));
    const wsMin = timeToMinutes(workStart), weMin = timeToMinutes(workEnd);
    const slots: string[] = [];
    for (let t = wsMin; t + duration <= weMin; t += slotStep) {
      if (!blocked.some(b => t < b.end && (t + duration) > b.start)) {
        slots.push(`${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, [formData.service_id, formData.lesson_date, services, items, workStart, workEnd, slotDuration, breakDuration]);

  const onServiceChange = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    if (svc) setFormData(p => ({ ...p, service_id: serviceId, title: svc.name, price: svc.price, start_time: '', end_time: '' }));
  };

  const onSlotSelect = (slot: string) => {
    const svc = services.find(s => s.id === formData.service_id);
    if (!svc) return;
    setFormData(p => ({ ...p, start_time: slot, end_time: addMinutesToTime(slot, svc.duration_minutes) }));
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

      // Resolve client
      let resolvedClientId: string | null = null;
      if (formData.client_mode === 'list' && formData.client_id) {
        resolvedClientId = formData.client_id;
      } else if (formData.client_mode === 'id' && formData.client_skillspot_id) {
        const { data: found } = await supabase.from('profiles').select('id').eq('skillspot_id', formData.client_skillspot_id).maybeSingle();
        if (found) resolvedClientId = found.id;
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
        const start = new Date(formData.lesson_date), end = new Date(formData.recurrence_end);
        const batch: any[] = [];
        let d = new Date(start);
        const interval = formData.recurrence === 'custom' ? formData.recurrence_interval : 1;
        while (d <= end) {
          const match = formData.recurrence === 'weekly' ? d.getDay() === formData.day_of_week
            : formData.recurrence === 'daily' ? true
            : formData.recurrence === 'monthly' ? d.getDate() === start.getDate() : true;
          if (match) batch.push({
            teacher_id: user.id, title: formData.title, description: formData.description || null,
            lesson_date: format(d, 'yyyy-MM-dd'), start_time: formData.start_time, end_time: formData.end_time,
            lesson_type: formData.lesson_type, max_participants: formData.max_participants,
            price: formData.price, recurring_pattern_id: pattern.id,
          });
          d = addDays(d, formData.recurrence === 'weekly' ? 7 : formData.recurrence === 'monthly' ? 30 : interval);
        }
        let conflictCount = 0;
        const safeBatch = [];
        for (const item of batch) {
          if (await checkConflicts(item.lesson_date, item.start_time, item.end_time)) conflictCount++;
          else safeBatch.push(item);
        }
        if (safeBatch.length > 0) {
          const { error } = await supabase.from('lessons').insert(safeBatch as any);
          if (error) throw error;
        }
        toast({ title: 'Серия создана', description: `Создано ${safeBatch.length} записей${conflictCount > 0 ? `, пропущено ${conflictCount}` : ''}` });
      } else {
        const { data: lesson, error } = await supabase.from('lessons').insert({
          teacher_id: user.id, title: formData.title, description: formData.description || null,
          lesson_date: formData.lesson_date, start_time: formData.start_time, end_time: formData.end_time,
          lesson_type: formData.lesson_type, max_participants: formData.max_participants, price: formData.price,
        }).select('id').single();
        if (error) throw error;

        // Create booking for the client if known
        if (resolvedClientId && lesson) {
          await supabase.from('lesson_bookings').insert({
            lesson_id: lesson.id, student_id: resolvedClientId, status: 'confirmed',
          });
          // Send notification
          await supabase.from('notifications').insert({
            user_id: resolvedClientId, type: 'booking',
            title: 'Новая запись',
            message: `Вы записаны на «${formData.title}» ${formData.lesson_date} в ${formData.start_time}`,
            related_id: lesson.id,
          });
        }
        toast({ title: 'Запись создана' });
      }
      setIsCreateOpen(false);
      setFormData({ service_id: '', title: '', description: '', lesson_date: format(new Date(), 'yyyy-MM-dd'), start_time: '', end_time: '', lesson_type: 'individual', max_participants: 1, price: 0, recurrence: 'none', recurrence_end: '', day_of_week: 1, recurrence_interval: 7, client_mode: 'list', client_id: '', client_skillspot_id: '', client_name: '', client_phone: '' });
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddBreak = async () => {
    if (!user) return;
    try {
      const hasConflict = await checkConflicts(breakData.date, breakData.start_time, breakData.end_time);
      if (hasConflict) { toast({ title: 'Конфликт', variant: 'destructive' }); return; }
      const { error } = await supabase.from('lessons').insert({
        teacher_id: user.id, title: 'Перерыв', lesson_date: breakData.date,
        start_time: breakData.start_time, end_time: breakData.end_time,
        lesson_type: 'individual' as const, max_participants: 0, price: 0, status: 'cancelled' as const, notes: 'break',
      });
      if (error) throw error;
      toast({ title: 'Перерыв добавлен' });
      setIsBreakOpen(false); fetchItems();
    } catch (err: any) { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('lessons').delete().eq('id', id);
    toast({ title: 'Удалено' }); fetchItems();
  };

  const handleUpdateStatus = async (id: string, status: 'scheduled' | 'completed' | 'cancelled' | 'no_show') => {
    await supabase.from('lessons').update({ status }).eq('id', id);
    // Notify client
    const item = items.find(w => w.id === id);
    if (item) {
      const booking = (item.lesson_bookings as any[])?.[0];
      if (booking?.student_id) {
        const msgs: Record<string, string> = {
          completed: `Запись «${item.title}» ${item.lesson_date} отмечена как завершённая`,
          cancelled: `Запись «${item.title}» ${item.lesson_date} отклонена мастером`,
          no_show: `Неявка на «${item.title}» ${item.lesson_date}`,
        };
        if (msgs[status]) {
          await supabase.from('notifications').insert({
            user_id: booking.student_id, type: 'booking_status', title: status === 'completed' ? 'Запись завершена' : status === 'cancelled' ? 'Запись отклонена' : 'Неявка',
            message: msgs[status], related_id: id,
          });
        }
      }
    }
    fetchItems();
  };

  const handleNoShowWithReason = async () => {
    if (!statusDialog) return;
    await supabase.from('lessons').update({ status: 'no_show', notes: statusReason || null }).eq('id', statusDialog.id);
    const item = items.find(w => w.id === statusDialog.id);
    const booking = (item?.lesson_bookings as any[])?.[0];
    if (booking?.student_id) {
      await supabase.from('notifications').insert({
        user_id: booking.student_id, type: 'no_show', title: 'Неявка',
        message: `Вы не пришли на «${item?.title}» ${item?.lesson_date}`, related_id: statusDialog.id,
      });
    }
    setStatusDialog(null); setStatusReason(''); fetchItems();
    toast({ title: 'Статус обновлён' });
  };

  const handleReject = async () => {
    if (!statusDialog) return;
    await handleUpdateStatus(statusDialog.id, 'cancelled');
    setStatusDialog(null); setStatusReason('');
    toast({ title: 'Запись отклонена' });
  };

  const handleReschedule = async () => {
    if (!statusDialog || !rescheduleDate || !rescheduleTime) return;
    const item = items.find(w => w.id === statusDialog.id);
    if (!item) return;
    const svc = services.find(s => s.name === item.title);
    const duration = svc?.duration_minutes || 60;
    const newEnd = addMinutesToTime(rescheduleTime, duration);

    // Update the lesson
    await supabase.from('lessons').update({
      lesson_date: rescheduleDate, start_time: rescheduleTime, end_time: newEnd, notes: `Перенесено: ${statusReason}`,
    }).eq('id', statusDialog.id);

    // Notify client
    const booking = (item.lesson_bookings as any[])?.[0];
    if (booking?.student_id) {
      await supabase.from('notifications').insert({
        user_id: booking.student_id, type: 'reschedule', title: 'Перенос записи',
        message: `Мастер предлагает перенести «${item.title}» на ${rescheduleDate} в ${rescheduleTime}`,
        related_id: statusDialog.id,
      });
    }

    setStatusDialog(null); setStatusReason(''); setRescheduleDate(''); setRescheduleTime('');
    fetchItems();
    toast({ title: 'Запись перенесена', description: 'Клиенту отправлено уведомление' });
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

  // Check if session ended and within 24h review window
  const canReview = (w: any) => {
    if (w.status !== 'completed') return false;
    const endDateTime = new Date(`${w.lesson_date}T${w.end_time}`);
    const hoursSince = differenceInHours(new Date(), endDateTime);
    return hoursSince >= 0 && hoursSince <= 24;
  };

  // Check if session time passed but still scheduled
  const isOverdue = (w: any) => {
    if (w.status !== 'scheduled') return false;
    const endDateTime = new Date(`${w.lesson_date}T${w.end_time}`);
    return isAfter(new Date(), endDateTime);
  };

  const renderCard = (w: any, compact = false) => {
    const brk = isBreak(w);
    const booking = (w.lesson_bookings as any[])?.[0];
    const clientName = booking?.profiles ? `${booking.profiles.first_name || ''} ${booking.profiles.last_name || ''}`.trim() : null;
    const overdue = isOverdue(w);
    const reviewable = canReview(w);

    return (
      <div key={w.id} className={`p-3 rounded-lg border ${brk ? statusColors.break : overdue ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700' : statusColors[w.status] || 'bg-muted'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {brk && <Coffee className="h-3.5 w-3.5" />}
              <p className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{w.title}</p>
            </div>
            <p className="text-xs mt-0.5">{w.start_time?.slice(0, 5)} – {w.end_time?.slice(0, 5)}</p>
            {!brk && !compact && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] h-5">
                  {w.lesson_type === 'group' ? `Группа (${w.current_participants}/${w.max_participants})` : 'Индивид.'}
                </Badge>
                <span className="text-xs font-medium">{Number(w.price).toLocaleString()} ₽</span>
                {clientName && <span className="text-xs text-muted-foreground">· {clientName}</span>}
              </div>
            )}
          </div>
          {!compact && (
            <div className="flex gap-0.5 shrink-0">
              {overdue && !brk && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => handleUpdateStatus(w.id, 'completed')}>
                    <CheckCircle className="h-3 w-3" /> Состоялась
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setStatusDialog({ id: w.id, action: 'no_show' })}>
                    <XCircle className="h-3 w-3" /> Не состоялась
                  </Button>
                </>
              )}
              {w.status === 'scheduled' && !brk && !overdue && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUpdateStatus(w.id, 'completed')}>✓</Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setStatusDialog({ id: w.id, action: 'reject' })}>
                    <XCircle className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setStatusDialog({ id: w.id, action: 'reschedule' })}>
                    <ArrowRightLeft className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(w.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
              {reviewable && (
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                  <Star className="h-3 w-3" /> Оценить
                </Button>
              )}
              {brk && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(w.id)}><Trash2 className="h-3 w-3" /></Button>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // DAY VIEW - detailed list with time slots
  const renderDayView = () => {
    const dayItems = getForDate(currentDate).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    if (dayItems.length === 0) return <Card><CardContent className="py-12 text-center text-muted-foreground">Нет записей на этот день</CardContent></Card>;
    return <div className="space-y-2">{dayItems.map(w => renderCard(w))}</div>;
  };

  // WEEK VIEW - vertical list of days with summary, click → day
  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
    return (
      <div className="space-y-2">
        {days.map(day => {
          const dayItems = getForDate(day);
          const sessions = dayItems.filter(w => !isBreak(w));
          const breaks = dayItems.filter(isBreak);
          const today = isSameDay(day, new Date());
          const totalRevenue = sessions.reduce((s, w) => s + Number(w.price || 0), 0);
          return (
            <Card
              key={day.toISOString()}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${today ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => { setCurrentDate(day); setView('day'); }}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${today ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <span className="text-[10px] leading-none font-medium">{daysOfWeek[day.getDay() === 0 ? 6 : day.getDay() - 1]}</span>
                      <span className="text-sm font-bold leading-none">{format(day, 'd')}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{format(day, 'd MMMM', { locale: ru })}</p>
                      {sessions.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {sessions.length} {sessions.length === 1 ? 'запись' : sessions.length < 5 ? 'записи' : 'записей'}
                          {breaks.length > 0 && ` · ${breaks.length} перерыв`}
                          {sessions[0]?.start_time && ` · ${sessions[0].start_time.slice(0, 5)} – ${sessions[sessions.length - 1]?.end_time?.slice(0, 5)}`}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Нет записей</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {totalRevenue > 0 && <span className="text-sm font-semibold">{totalRevenue.toLocaleString()} ₽</span>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {/* Show first 2 sessions as compact preview */}
                {sessions.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {sessions.slice(0, 3).map(w => (
                      <Badge key={w.id} variant="secondary" className="text-[10px] gap-1">
                        {w.start_time?.slice(0, 5)} {w.title}
                      </Badge>
                    ))}
                    {sessions.length > 3 && <Badge variant="outline" className="text-[10px]">+{sessions.length - 3}</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // MONTH VIEW - grid with count badges, click → day
  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {daysOfWeek.map(d => <div key={d} className="text-center font-medium text-xs text-muted-foreground pb-1">{d}</div>)}
      {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) }).map(day => {
        const dayItems = getForDate(day);
        const isCurrent = day.getMonth() === currentDate.getMonth();
        const today = isSameDay(day, new Date());
        const sessions = dayItems.filter(w => !isBreak(w));
        return (
          <div
            key={day.toISOString()}
            className={`min-h-[56px] p-1 rounded border text-xs cursor-pointer hover:border-primary/50 transition-colors ${!isCurrent ? 'opacity-40' : ''} ${today ? 'border-primary bg-primary/5' : 'border-border'}`}
            onClick={() => { setCurrentDate(day); setView('day'); }}
          >
            <p className={`font-medium ${today ? 'text-primary' : ''}`}>{format(day, 'd')}</p>
            {sessions.length > 0 && <Badge variant="secondary" className="text-[9px] h-4 mt-0.5">{sessions.length}</Badge>}
          </div>
        );
      })}
    </div>
  );

  const selectedService = services.find(s => s.id === formData.service_id);
  const filteredClients = clients.filter(c => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (c.first_name || '').toLowerCase().includes(q) || (c.last_name || '').toLowerCase().includes(q) || c.skillspot_id?.includes(q);
  });

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
            <Settings2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Редактировать расписание</span>
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
                <Button className="w-full" onClick={handleAddBreak}>Добавить перерыв</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Записать клиента</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Записать клиента</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Client selection */}
                <div className="space-y-2">
                  <Label>Клиент</Label>
                  <Tabs value={formData.client_mode} onValueChange={v => setFormData(p => ({ ...p, client_mode: v as any }))}>
                    <TabsList className="h-8 w-full">
                      <TabsTrigger value="list" className="text-xs flex-1">Из списка</TabsTrigger>
                      <TabsTrigger value="id" className="text-xs flex-1">По ID</TabsTrigger>
                      <TabsTrigger value="manual" className="text-xs flex-1">Вручную</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {formData.client_mode === 'list' && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Поиск клиента..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                      </div>
                      <div className="max-h-32 overflow-y-auto border rounded space-y-0.5 p-1">
                        {filteredClients.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">Нет клиентов</p>
                        ) : filteredClients.map(c => (
                          <button key={c.id} type="button"
                            className={`w-full text-left p-1.5 rounded text-xs flex items-center gap-2 hover:bg-muted ${formData.client_id === c.id ? 'bg-primary/10 border border-primary/30' : ''}`}
                            onClick={() => setFormData(p => ({ ...p, client_id: c.id }))}
                          >
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{c.first_name} {c.last_name}</span>
                            <span className="text-muted-foreground ml-auto">{c.skillspot_id}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.client_mode === 'id' && (
                    <Input placeholder="SkillSpot ID (напр. AB1234)" value={formData.client_skillspot_id} onChange={e => setFormData(p => ({ ...p, client_skillspot_id: e.target.value.toUpperCase() }))} className="h-8 text-xs" />
                  )}
                  {formData.client_mode === 'manual' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Имя" value={formData.client_name} onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))} className="h-8 text-xs" />
                      <Input placeholder="Телефон" value={formData.client_phone} onChange={e => setFormData(p => ({ ...p, client_phone: e.target.value }))} className="h-8 text-xs" />
                    </div>
                  )}
                  {formData.client_mode === 'manual' && (
                    <p className="text-xs text-muted-foreground">⚠️ Без привязки к аккаунту уведомления не работают</p>
                  )}
                </div>

                {/* Service selection */}
                {services.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Услуга *</Label>
                    <Select value={formData.service_id} onValueChange={onServiceChange}>
                      <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} · {s.duration_minutes} мин · {s.price.toLocaleString()} ₽</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.service_id && (
                      <div className="space-y-2">
                        <Label>Цена (₽)</Label>
                        <Input type="text" inputMode="numeric" value={formData.price || ''} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value.replace(/[^\d]/g, '')) }))} className="h-8" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Название *</Label>
                    <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Название услуги" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Дата</Label><Input type="date" value={formData.lesson_date} onChange={e => setFormData(p => ({ ...p, lesson_date: e.target.value, start_time: '', end_time: '' }))} /></div>
                  <div className="space-y-2"><Label>Тип</Label>
                    <Select value={formData.lesson_type} onValueChange={v => setFormData(p => ({ ...p, lesson_type: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="individual">Индивидуально</SelectItem><SelectItem value="group">Группа</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Time slots */}
                {formData.service_id && formData.lesson_date ? (
                  <div className="space-y-2">
                    <Label>Доступное время <span className="text-muted-foreground font-normal">({selectedService?.duration_minutes} мин)</span></Label>
                    {getAvailableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Нет доступных слотов</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {getAvailableSlots.map(slot => (
                          <Button key={slot} variant={formData.start_time === slot ? 'default' : 'outline'} size="sm" className="h-9 text-xs" onClick={() => onSlotSelect(slot)}>{slot}</Button>
                        ))}
                      </div>
                    )}
                    {formData.start_time && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formData.start_time} – {formData.end_time}</p>}
                  </div>
                ) : !formData.service_id ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Начало</Label><Input type="time" value={formData.start_time} onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Конец</Label><Input type="time" value={formData.end_time} onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))} /></div>
                  </div>
                ) : null}

                {!formData.service_id && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Цена (₽)</Label><Input type="text" inputMode="numeric" value={formData.price || ''} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value.replace(/[^\d]/g, '')) || 0 }))} /></div>
                    {formData.lesson_type === 'group' && <div className="space-y-2"><Label>Макс. участников</Label><Input type="text" inputMode="numeric" value={formData.max_participants || ''} onChange={e => setFormData(p => ({ ...p, max_participants: Number(e.target.value.replace(/[^\d]/g, '')) || 1 }))} /></div>}
                  </div>
                )}

                {formData.lesson_type === 'group' && formData.service_id && (
                  <div className="space-y-2"><Label>Макс. участников</Label><Input type="text" inputMode="numeric" value={formData.max_participants || ''} onChange={e => setFormData(p => ({ ...p, max_participants: Number(e.target.value.replace(/[^\d]/g, '')) || 1 }))} /></div>
                )}

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
                  <div className="space-y-2"><Label>День недели</Label>
                    <Select value={String(formData.day_of_week)} onValueChange={v => setFormData(p => ({ ...p, day_of_week: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map((d,i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {formData.recurrence === 'custom' && (
                  <div className="space-y-2"><Label>Каждые (дней)</Label><Input type="text" inputMode="numeric" value={formData.recurrence_interval || ''} onChange={e => setFormData(p => ({ ...p, recurrence_interval: Number(e.target.value.replace(/[^\d]/g, '')) || 1 }))} /></div>
                )}
                {formData.recurrence !== 'none' && (
                  <div className="space-y-2"><Label>Повторять до</Label><Input type="date" value={formData.recurrence_end} onChange={e => setFormData(p => ({ ...p, recurrence_end: e.target.value }))} /></div>
                )}
                <div className="space-y-2"><Label>Комментарий</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Заметка к записи..." /></div>
                <Button className="w-full" onClick={handleCreate} disabled={!formData.start_time}>Создать запись</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Settings dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Настройки расписания</DialogTitle></DialogHeader>
          <div className="space-y-5">
            {/* Work days */}
            <div className="space-y-2">
              <Label>Рабочие дни</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_NUMS.map((dayNum, idx) => (
                  <button key={dayNum} type="button"
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${workDays.includes(dayNum) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}
                    onClick={() => setWorkDays(prev => prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum].sort((a, b) => DAY_NUMS.indexOf(a) - DAY_NUMS.indexOf(b)))}
                  >{DAY_LABELS[idx].slice(0, 2)}</button>
                ))}
              </div>
            </div>

            {/* Default work hours */}
            <div className="space-y-2">
              <Label>Рабочее время (по умолчанию)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} />
                <Input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} />
              </div>
            </div>

            {/* Per-day hours toggle */}
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Индивидуальные часы для каждого дня</Label>
              <button type="button" className={`w-10 h-5 rounded-full transition-colors ${usePerDayHours ? 'bg-primary' : 'bg-muted'}`} onClick={() => setUsePerDayHours(!usePerDayHours)}>
                <div className={`w-4 h-4 rounded-full bg-background shadow transition-transform ${usePerDayHours ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {usePerDayHours && (
              <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                {DAY_NUMS.filter(d => workDays.includes(d)).map((dayNum, idx) => {
                  const dayKey = String(dayNum);
                  const entry = workHoursConfig[dayKey] || { start: workStart, end: workEnd };
                  return (
                    <div key={dayNum} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-8">{DAY_LABELS[DAY_NUMS.indexOf(dayNum)].slice(0, 2)}</span>
                      <Input type="time" value={entry.start} onChange={e => setWorkHoursConfig(prev => ({ ...prev, [dayKey]: { ...entry, start: e.target.value } }))} className="h-8 text-xs" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input type="time" value={entry.end} onChange={e => setWorkHoursConfig(prev => ({ ...prev, [dayKey]: { ...entry, end: e.target.value } }))} className="h-8 text-xs" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Breaks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Перерывы (обед и др.)</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                  const key = 'all';
                  setBreakConfig(prev => ({
                    ...prev,
                    [key]: [...(prev[key] || []), { start: '13:00', end: '14:00' }],
                  }));
                }}>+ Добавить</Button>
              </div>
              {(breakConfig['all'] || []).map((brk, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input type="time" value={brk.start} onChange={e => {
                    const arr = [...(breakConfig['all'] || [])];
                    arr[i] = { ...arr[i], start: e.target.value };
                    setBreakConfig(prev => ({ ...prev, all: arr }));
                  }} className="h-8 text-xs" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input type="time" value={brk.end} onChange={e => {
                    const arr = [...(breakConfig['all'] || [])];
                    arr[i] = { ...arr[i], end: e.target.value };
                    setBreakConfig(prev => ({ ...prev, all: arr }));
                  }} className="h-8 text-xs" />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                    const arr = (breakConfig['all'] || []).filter((_, j) => j !== i);
                    setBreakConfig(prev => ({ ...prev, all: arr }));
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>

            <div className="space-y-2"><Label>Длительность шага слота (мин)</Label>
              <Select value={String(slotDuration)} onValueChange={v => setSlotDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[15, 30, 45, 60].map(m => <SelectItem key={m} value={String(m)}>{m} мин</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Буфер между записями (мин)</Label>
              <Select value={String(breakDuration)} onValueChange={v => setBreakDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[0, 5, 10, 15, 20, 30].map(m => <SelectItem key={m} value={String(m)}>{m === 0 ? 'Без буфера' : `${m} мин`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={async () => {
              if (timeToMinutes(workEnd) <= timeToMinutes(workStart)) { toast({ title: 'Ошибка', description: 'Время окончания должно быть позже начала', variant: 'destructive' }); return; }
              if (!user) return;
              const whc: Record<string, unknown> = { default: { start: workStart, end: workEnd }, slotDuration, breakDuration };
              if (usePerDayHours) whc.perDay = workHoursConfig;
              // Serialize break config to plain objects for JSON compatibility
              const bcPlain: Record<string, Array<{start: string; end: string}>> = {};
              for (const [k, v] of Object.entries(breakConfig)) { bcPlain[k] = v.map(b => ({ start: b.start, end: b.end })); }
              const { error } = await supabase.from('master_profiles').update({
                work_days: workDays,
                work_hours_config: whc as any,
                break_config: bcPlain as any,
              }).eq('user_id', user.id);
              if (error) { toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }); return; }
              setIsSettingsOpen(false); toast({ title: 'Настройки сохранены в профиль' });
            }} className="w-full">Сохранить</Button>

            <MasterTimeOffManager />
          </div>
        </DialogContent>
      </Dialog>

      {/* No-show reason dialog */}
      <Dialog open={statusDialog?.action === 'no_show'} onOpenChange={() => { setStatusDialog(null); setStatusReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Причина неявки</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {noShowReasons.map(r => (
                <Button key={r} variant={statusReason === r ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setStatusReason(r)}>{r}</Button>
              ))}
            </div>
            <Button className="w-full" onClick={handleNoShowWithReason}>Подтвердить</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={statusDialog?.action === 'reject'} onOpenChange={() => { setStatusDialog(null); setStatusReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Причина отклонения</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {rejectReasons.map(r => (
                <Button key={r} variant={statusReason === r ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setStatusReason(r)}>{r}</Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Клиент увидит, что запись отклонена, без указания причины</p>
            <Button className="w-full" variant="destructive" onClick={handleReject}>Отклонить</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={statusDialog?.action === 'reschedule'} onOpenChange={() => { setStatusDialog(null); setStatusReason(''); setRescheduleDate(''); setRescheduleTime(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Перенести запись</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">⚠️ Рекомендуется предварительно согласовать перенос с клиентом в чате</p>
            <div className="space-y-2"><Label>Причина</Label><Input value={statusReason} onChange={e => setStatusReason(e.target.value)} placeholder="Причина переноса" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Новая дата</Label><Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Новое время</Label><Input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} /></div>
            </div>
            <Button className="w-full" onClick={handleReschedule} disabled={!rescheduleDate || !rescheduleTime}>Перенести</Button>
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
