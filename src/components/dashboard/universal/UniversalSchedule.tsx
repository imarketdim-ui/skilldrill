import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInHours,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ArrowRightLeft,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Plus,
  Search,
  Settings2,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import ClientHoverCard from '../schedule/ClientHoverCard';
import MasterTimeOffManager from './MasterTimeOffManager';
import { CategoryConfig } from './categoryConfig';
import AppointmentDetailDialog from '../schedule/AppointmentDetailDialog';
import {
  addMinutesToTime,
  buildSyntheticBreakItems,
  MasterScheduleSettings,
  normalizeMasterScheduleSettings,
  serializeMasterScheduleSettings,
  timeToMinutes,
} from '@/lib/serviceSchedule';
import {
  findSoloScheduleConflicts,
  formatScheduleConflictMessage,
} from '@/lib/masterScheduleConflicts';

interface Props {
  config: CategoryConfig;
}

interface ServiceOption {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface ClientOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  skillspot_id: string | null;
}

interface ResourceOption {
  id: string;
  name: string;
  capacity: number;
}

const dayLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const dayKeys = ['0', '1', '2', '3', '4', '5', '6'];

const noShowReasons = ['Не предупредил', 'Болезнь', 'Забыл', 'Опоздание', 'Другое'];
const rejectReasons = ['Занято', 'Конфликт по ресурсу', 'Изменилось расписание', 'Другое'];

const statusTone: Record<string, string> = {
  pending: 'bg-amber-50 border-amber-200 text-amber-900',
  confirmed: 'bg-primary/10 border-primary/20 text-primary',
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  cancelled: 'bg-muted border-border text-muted-foreground',
  rejected: 'bg-muted border-border text-muted-foreground',
  no_show: 'bg-rose-50 border-rose-200 text-rose-900',
  break: 'bg-slate-50 border-slate-200 text-slate-700',
};

const statusLabel: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена',
  rejected: 'Отклонена',
  no_show: 'Неявка',
  break: 'Перерыв',
};

const defaultSettings: MasterScheduleSettings = {
  workDays: [1, 2, 3, 4, 5],
  defaultHours: { start: '09:00', end: '18:00' },
  perDayHours: {},
  breakConfig: {},
  slotDuration: 30,
  bufferMinutes: 0,
};

const UniversalSchedule = ({ config }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [masterProfile, setMasterProfile] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBreakOpen, setIsBreakOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [statusDialog, setStatusDialog] = useState<{ id: string; action: 'no_show' | 'reject' | 'reschedule' } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [settings, setSettings] = useState<MasterScheduleSettings>(defaultSettings);
  const [usePerDayHours, setUsePerDayHours] = useState(false);

  const [formData, setFormData] = useState({
    service_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    recurrence: 'none',
    recurrence_end: '',
    recurrence_interval: 7,
    client_mode: 'list' as 'list' | 'id' | 'manual',
    client_id: '',
    client_skillspot_id: '',
    client_name: '',
    client_phone: '',
    notes: '',
    resource_id: 'none',
  });

  const [breakData, setBreakData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '13:00',
    end_time: '14:00',
  });

  const selectedService = services.find(service => service.id === formData.service_id) || null;

  const fetchBaseData = async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, serviceRes] = await Promise.all([
      supabase
        .from('master_profiles')
        .select('id, user_id, business_id, work_days, work_hours_config, break_config')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('services')
        .select('id, name, duration_minutes, price')
        .eq('master_id', user.id)
        .eq('is_active', true),
    ]);

    const profile = profileRes.data;
    setMasterProfile(profile);
    setServices(
      (serviceRes.data || []).map(service => ({
        id: service.id,
        name: service.name,
        duration_minutes: service.duration_minutes || 60,
        price: Number(service.price) || 0,
      })),
    );

    const normalized = normalizeMasterScheduleSettings(
      profile?.work_days,
      profile?.work_hours_config,
      profile?.break_config,
    );
    if (profile?.business_id) {
      const { data: business } = await supabase
        .from('business_locations')
        .select('buffer_minutes')
        .eq('id', profile.business_id)
        .maybeSingle();
      if (business?.buffer_minutes !== undefined && business?.buffer_minutes !== null) {
        normalized.bufferMinutes = Number(business.buffer_minutes) || 0;
      }
    }
    setSettings(normalized);
    setUsePerDayHours(Object.keys(normalized.perDayHours).length > 0);

    if (profile?.business_id) {
      const { data } = await supabase
        .from('resources')
        .select('id, name, capacity')
        .eq('organization_id', profile.business_id)
        .eq('is_active', true)
        .order('name');
      setResources((data || []) as ResourceOption[]);
    } else {
      setResources([]);
    }

    setLoading(false);
  };

  const fetchKnownClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('client_id, client:profiles!bookings_client_id_fkey(id, first_name, last_name, phone, skillspot_id)')
      .eq('executor_id', user.id)
      .order('scheduled_at', { ascending: false })
      .limit(500);

    const unique = new Map<string, ClientOption>();
    (data || []).forEach((booking: any) => {
      const client = booking.client;
      if (client?.id && !unique.has(client.id)) {
        unique.set(client.id, client);
      }
    });
    setClients(Array.from(unique.values()));
  };

  const fetchItems = async () => {
    if (!user) return;
    const range =
      view === 'day'
        ? { start: currentDate, end: currentDate }
        : view === 'week'
          ? { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }
          : { start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) };

    const { data } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        scheduled_at,
        duration_minutes,
        notes,
        cancellation_reason,
        client_id,
        executor_id,
        resource_id,
        service_id,
        service:services!bookings_service_id_fkey(name, price, duration_minutes),
        client:profiles!bookings_client_id_fkey(first_name, last_name, email, phone, skillspot_id),
        resource:resources(name)
      `)
      .eq('executor_id', user.id)
      .gte('scheduled_at', new Date(format(range.start, "yyyy-MM-dd'T'00:00:00")).toISOString())
      .lte('scheduled_at', new Date(format(range.end, "yyyy-MM-dd'T'23:59:59")).toISOString())
      .order('scheduled_at');

    const syntheticBreaks = buildSyntheticBreakItems(
      user.id,
      settings,
      range.start,
      range.end,
    );

    setItems([...(data || []), ...syntheticBreaks]);
  };

  useEffect(() => {
    fetchBaseData();
    fetchKnownClients();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user, currentDate, view, settings]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!user || !selectedService || !formData.date) {
        setAvailableSlots([]);
        return;
      }

      const { data, error } = await supabase.rpc('get_master_available_slots', {
        _master_id: user.id,
        _date: formData.date,
        _service_duration: selectedService.duration_minutes,
      });

      if (error) {
        setAvailableSlots([]);
        return;
      }

      let slots = ((data || []) as any[]).map(slot =>
        new Date(slot.slot_start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      );

      if (formData.resource_id && formData.resource_id !== 'none') {
        const filtered: string[] = [];
        for (const slot of slots) {
          const startTime = new Date(`${formData.date}T${slot}:00`).toISOString();
          const { data: available } = await supabase.rpc('check_availability', {
            _master_id: user.id,
            _resource_id: formData.resource_id,
            _start_time: startTime,
            _duration_minutes: selectedService.duration_minutes,
          });
          if (available) filtered.push(slot);
        }
        slots = filtered;
      }

      setAvailableSlots(slots);
    };

    loadSlots();
  }, [user, selectedService, formData.date, formData.resource_id]);

  const persistSettings = async (nextSettings: MasterScheduleSettings) => {
    if (!user) return false;
    const conflicts = findSoloScheduleConflicts(user.id, nextSettings);
    if (conflicts.length > 0) {
      toast({
        title: 'Есть пересечение расписаний',
        description: formatScheduleConflictMessage(conflicts[0]),
        variant: 'destructive',
      });
      return false;
    }

    const payload = serializeMasterScheduleSettings(nextSettings, usePerDayHours);
    const { error } = await supabase
      .from('master_profiles')
      .update(payload as any)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return false;
    }

    if (masterProfile?.business_id) {
      await supabase
        .from('business_locations')
        .update({ buffer_minutes: nextSettings.bufferMinutes })
        .eq('id', masterProfile.business_id);
    }

    setSettings(nextSettings);
    return true;
  };

  const resolveClientId = async () => {
    if (formData.client_mode === 'list' && formData.client_id) {
      return formData.client_id;
    }

    if (formData.client_mode === 'id' && formData.client_skillspot_id.trim()) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('skillspot_id', formData.client_skillspot_id.trim().toUpperCase())
        .maybeSingle();
      return data?.id || null;
    }

    if (formData.client_mode === 'manual' && formData.client_phone.trim()) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', formData.client_phone.trim())
        .maybeSingle();
      return data?.id || null;
    }

    return null;
  };

  const buildRecurrenceDates = () => {
    if (formData.recurrence === 'none') return [formData.date];
    if (!formData.recurrence_end) return [formData.date];

    const start = new Date(formData.date);
    const end = new Date(formData.recurrence_end);
    const dates: string[] = [];
    let cursor = new Date(start);

    while (cursor <= end) {
      dates.push(format(cursor, 'yyyy-MM-dd'));
      if (formData.recurrence === 'weekly') cursor = addDays(cursor, 7);
      else if (formData.recurrence === 'monthly') cursor = addMonths(cursor, 1);
      else cursor = addDays(cursor, Math.max(1, Number(formData.recurrence_interval) || 1));
    }

    return dates;
  };

  const handleCreate = async () => {
    if (!user || !selectedService || !formData.start_time || !formData.date) return;

    const clientId = await resolveClientId();
    if (!clientId) {
      toast({
        title: 'Клиент не найден',
        description: 'Для внутренней записи клиент должен иметь зарегистрированный профиль.',
        variant: 'destructive',
      });
      return;
    }

    const dates = buildRecurrenceDates();
    const createdIds: string[] = [];
    const skipped: string[] = [];

    for (const date of dates) {
      const scheduledAt = new Date(`${date}T${formData.start_time}:00`).toISOString();
      const { data: available } = await supabase.rpc('check_availability', {
        _master_id: user.id,
        _resource_id: formData.resource_id !== 'none' ? formData.resource_id : null,
        _start_time: scheduledAt,
        _duration_minutes: selectedService.duration_minutes,
      });

      if (!available) {
        skipped.push(date);
        continue;
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          organization_id: masterProfile?.business_id || null,
          service_id: selectedService.id,
          executor_id: user.id,
          client_id: clientId,
          resource_id: formData.resource_id !== 'none' ? formData.resource_id : null,
          scheduled_at: scheduledAt,
          duration_minutes: selectedService.duration_minutes,
          status: 'confirmed',
          notes: formData.notes || null,
        })
        .select('id')
        .single();

      if (error) {
        skipped.push(date);
        continue;
      }

      createdIds.push(data.id);
      await supabase.from('notifications').insert({
        user_id: clientId,
        type: 'booking',
        title: 'Новая запись',
        message: `Вы записаны на «${selectedService.name}» ${date} в ${formData.start_time}`,
        related_id: data.id,
      });
    }

    toast({
      title: createdIds.length > 0 ? 'Записи созданы' : 'Не удалось создать запись',
      description: createdIds.length > 0
        ? skipped.length > 0
          ? `Создано ${createdIds.length}, пропущено ${skipped.length}`
          : `Создано ${createdIds.length}`
        : 'Проверьте расписание, ресурс или отпуск мастера',
      variant: createdIds.length > 0 ? 'default' : 'destructive',
    });

    setIsCreateOpen(false);
    setFormData({
      service_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      recurrence: 'none',
      recurrence_end: '',
      recurrence_interval: 7,
      client_mode: 'list',
      client_id: '',
      client_skillspot_id: '',
      client_name: '',
      client_phone: '',
      notes: '',
      resource_id: 'none',
    });
    await fetchItems();
    await fetchKnownClients();
  };

  const handleAddBreak = async () => {
    if (timeToMinutes(breakData.end_time) <= timeToMinutes(breakData.start_time)) {
      toast({ title: 'Некорректный интервал', variant: 'destructive' });
      return;
    }
    const dayKey = String(new Date(breakData.date).getDay());
    const nextSettings: MasterScheduleSettings = {
      ...settings,
      breakConfig: {
        ...settings.breakConfig,
        [dayKey]: [
          ...(settings.breakConfig[dayKey] || []),
          { start: breakData.start_time, end: breakData.end_time },
        ],
      },
    };
    const saved = await persistSettings(nextSettings);
    if (!saved) return;
    toast({ title: 'Перерыв добавлен' });
    setIsBreakOpen(false);
    await fetchItems();
  };

  const removeBreak = async (item: any) => {
    const key = item.rawBreakKey;
    const nextSettings: MasterScheduleSettings = {
      ...settings,
      breakConfig: {
        ...settings.breakConfig,
        [key]: (settings.breakConfig[key] || []).filter((_, index) => index !== item.rawBreakIndex),
      },
    };
    const saved = await persistSettings(nextSettings);
    if (!saved) return;
    toast({ title: 'Перерыв удалён' });
    await fetchItems();
  };

  const updateBookingStatus = async (bookingId: string, payload: Record<string, any>, successTitle: string) => {
    const { error } = await supabase.from('bookings').update(payload).eq('id', bookingId);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: successTitle });
    setStatusDialog(null);
    setStatusReason('');
    setRescheduleDate('');
    setRescheduleTime('');
    await fetchItems();
  };

  const handleNoShow = async () => {
    if (!statusDialog?.id) return;
    await updateBookingStatus(
      statusDialog.id,
      { status: 'no_show', cancellation_reason: statusReason || 'Неявка клиента' },
      'Клиент отмечен как неявившийся',
    );
  };

  const handleReject = async () => {
    if (!statusDialog?.id) return;
    await updateBookingStatus(
      statusDialog.id,
      { status: 'rejected', cancellation_reason: statusReason || 'Отклонено мастером' },
      'Запись отклонена',
    );
  };

  const handleReschedule = async () => {
    if (!statusDialog?.id || !rescheduleDate || !rescheduleTime) return;
    const item = items.find(current => current.id === statusDialog.id);
    const duration = Number(item?.duration_minutes || item?.service?.duration_minutes || 60);
    const scheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
    const { data: available } = await supabase.rpc('check_availability', {
      _master_id: user?.id,
      _resource_id: item?.resource_id || null,
      _start_time: scheduledAt,
      _duration_minutes: duration,
    });

    if (!available) {
      toast({ title: 'Слот недоступен', variant: 'destructive' });
      return;
    }

    await updateBookingStatus(
      statusDialog.id,
      {
        scheduled_at: scheduledAt,
        notes: [item?.notes, statusReason ? `Перенос: ${statusReason}` : null].filter(Boolean).join('\n'),
      },
      'Запись перенесена',
    );
  };

  const navigate = (direction: number) => {
    if (view === 'day') setCurrentDate(previous => addDays(previous, direction));
    else if (view === 'week') setCurrentDate(previous => (direction > 0 ? addWeeks(previous, 1) : subWeeks(previous, 1)));
    else setCurrentDate(previous => (direction > 0 ? addMonths(previous, 1) : subMonths(previous, 1)));
  };

  const navLabel = useMemo(() => {
    if (view === 'day') return format(currentDate, 'd MMMM yyyy, EEEE', { locale: ru });
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: ru })} – ${format(end, 'd MMM yyyy', { locale: ru })}`;
    }
    return format(currentDate, 'LLLL yyyy', { locale: ru });
  }, [currentDate, view]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const query = clientSearch.trim().toLowerCase();
    return clients.filter(client =>
      `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase().includes(query)
      || (client.skillspot_id || '').toLowerCase().includes(query),
    );
  }, [clients, clientSearch]);

  const visibleItems = useMemo(() => {
    const sorted = [...items].sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime());
    if (view === 'day') return sorted.filter(item => isSameDay(new Date(item.scheduled_at), currentDate));
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return sorted.filter(item => {
        const date = new Date(item.scheduled_at);
        return date >= start && date <= end;
      });
    }
    return sorted.filter(item => new Date(item.scheduled_at).getMonth() === currentDate.getMonth());
  }, [items, currentDate, view]);

  const isBreak = (item: any) => item.rawSource === 'break_config';
  const canReview = (item: any) => {
    if (item.status !== 'completed') return false;
    const endTime = new Date(new Date(item.scheduled_at).getTime() + Number(item.duration_minutes || 0) * 60_000);
    const hoursSince = differenceInHours(new Date(), endTime);
    return hoursSince >= 0 && hoursSince <= 24;
  };
  const isOverdue = (item: any) => {
    if (isBreak(item) || !['pending', 'confirmed', 'in_progress'].includes(item.status)) return false;
    const endTime = new Date(new Date(item.scheduled_at).getTime() + Number(item.duration_minutes || 0) * 60_000);
    return isAfter(new Date(), endTime);
  };

  const renderBookingCard = (item: any, compact = false) => {
    const start = new Date(item.scheduled_at);
    const end = new Date(start.getTime() + Number(item.duration_minutes || 0) * 60_000);
    const itemIsBreak = isBreak(item);
    const overdue = isOverdue(item);
    const reviewable = canReview(item);
    const tone = overdue && !itemIsBreak
      ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
      : statusTone[item.status] || statusTone.pending;
    const clientName = item.client
      ? [item.client.first_name, item.client.last_name].filter(Boolean).join(' ')
      : null;

    const content = (
      <button
        type="button"
        className={`w-full rounded-lg border p-3 text-left transition-colors hover:border-primary/40 ${tone}`}
        onClick={() => {
          if (itemIsBreak) return;
          setSelectedItem(item);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {itemIsBreak && <Coffee className="h-3.5 w-3.5" />}
              <p className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
                {itemIsBreak ? 'Перерыв' : item.service?.name || 'Запись'}
              </p>
            </div>
            <p className="text-xs mt-0.5">
              {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
            </p>
            {!compact && (
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                {!itemIsBreak && clientName && <span>{clientName}</span>}
                {!itemIsBreak && item.resource?.name && <span>· {item.resource.name}</span>}
                {!itemIsBreak && <span>· {Number(item.service?.price || 0).toLocaleString()} ₽</span>}
              </div>
            )}
          </div>
          {!compact && (
            <div className="flex flex-wrap gap-1 justify-end">
              <Badge variant={item.status === 'completed' ? 'outline' : item.status === 'pending' ? 'secondary' : item.status === 'confirmed' ? 'default' : 'destructive'}>
                {statusLabel[item.status] || item.status}
              </Badge>
              {overdue && !itemIsBreak && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={event => {
                      event.stopPropagation();
                      updateBookingStatus(item.id, { status: 'completed' }, 'Запись завершена');
                    }}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" /> Состоялась
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={event => {
                      event.stopPropagation();
                      setStatusDialog({ id: item.id, action: 'no_show' });
                    }}
                  >
                    <XCircle className="h-3 w-3 mr-1" /> Не состоялась
                  </Button>
                </>
              )}
              {!itemIsBreak && !overdue && ['pending', 'confirmed'].includes(item.status) && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={event => {
                      event.stopPropagation();
                      updateBookingStatus(item.id, { status: 'completed' }, 'Запись завершена');
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={event => {
                      event.stopPropagation();
                      setStatusDialog({ id: item.id, action: 'reject' });
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={event => {
                      event.stopPropagation();
                      setStatusDialog({ id: item.id, action: 'reschedule' });
                    }}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {itemIsBreak && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={event => {
                    event.stopPropagation();
                    removeBreak(item);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {reviewable && (
                <Badge variant="outline">Можно оценить</Badge>
              )}
            </div>
          )}
        </div>
      </button>
    );

    if (!itemIsBreak && item.client_id) {
      return (
        <ClientHoverCard key={item.id} clientId={item.client_id} fallbackName={clientName || undefined}>
          {content}
        </ClientHoverCard>
      );
    }

    return <div key={item.id}>{content}</div>;
  };

  const renderDayView = () => {
    if (visibleItems.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Нет записей на этот день
          </CardContent>
        </Card>
      );
    }
    return <div className="space-y-2">{visibleItems.map(item => renderBookingCard(item))}</div>;
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return (
      <div className="space-y-2">
        {days.map(day => {
          const dayItems = items.filter(item => isSameDay(new Date(item.scheduled_at), day));
          const sessions = dayItems.filter(item => !isBreak(item));
          const breaks = dayItems.filter(item => isBreak(item));
          const revenue = sessions
            .filter(item => item.status === 'completed' || item.status === 'confirmed')
            .reduce((sum, item) => sum + Number(item.service?.price || 0), 0);
          const today = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className={`cursor-pointer transition-colors hover:border-primary/40 ${today ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => {
                setCurrentDate(day);
                setView('day');
              }}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${today ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <span className="text-[10px] leading-none font-medium">{dayLabels[day.getDay()]}</span>
                      <span className="text-sm font-bold leading-none">{format(day, 'd')}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{format(day, 'd MMMM', { locale: ru })}</p>
                      <p className="text-xs text-muted-foreground">
                        {sessions.length} записей{breaks.length > 0 ? ` · ${breaks.length} перерыв` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {revenue > 0 && <span className="text-sm font-semibold">{revenue.toLocaleString()} ₽</span>}
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {sessions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sessions.slice(0, 3).map(item => (
                      <Badge key={item.id} variant="secondary" className="text-[10px]">
                        {format(new Date(item.scheduled_at), 'HH:mm')} {item.service?.name}
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

  const renderMonthView = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return (
      <div className="grid grid-cols-7 gap-1">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
          <div key={day} className="pb-1 text-center text-xs font-medium text-muted-foreground">{day}</div>
        ))}
        {eachDayOfInterval({ start, end }).map(day => {
          const dayItems = items.filter(item => isSameDay(new Date(item.scheduled_at), day) && !isBreak(item));
          const currentMonth = day.getMonth() === currentDate.getMonth();
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`min-h-[60px] rounded border p-1 text-left text-xs transition-colors hover:border-primary/40 ${currentMonth ? 'opacity-100' : 'opacity-40'} ${isSameDay(day, new Date()) ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => {
                setCurrentDate(day);
                setView('day');
              }}
            >
              <p className="font-medium">{format(day, 'd')}</p>
              {dayItems.length > 0 && (
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {dayItems.length}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <p className="py-12 text-center text-muted-foreground">Загрузка расписания...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[200px] text-center text-sm font-semibold">{navLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>
            Сегодня
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={view} onValueChange={value => setView(value as 'day' | 'week' | 'month')}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="h-6 px-2 text-xs">День</TabsTrigger>
              <TabsTrigger value="week" className="h-6 px-2 text-xs">Неделя</TabsTrigger>
              <TabsTrigger value="month" className="h-6 px-2 text-xs">Месяц</TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Расписание</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Настройки расписания</DialogTitle></DialogHeader>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Рабочие дни</Label>
                  <div className="flex flex-wrap gap-2">
                    {dayKeys.map(key => {
                      const dayNum = Number(key);
                      const active = settings.workDays.includes(dayNum);
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                          onClick={() => {
                            setSettings(current => ({
                              ...current,
                              workDays: active
                                ? current.workDays.filter(value => value !== dayNum)
                                : [...current.workDays, dayNum].sort(),
                            }));
                          }}
                        >
                          {dayLabels[dayNum]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Рабочее время по умолчанию</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="time"
                      value={settings.defaultHours.start}
                      onChange={event => setSettings(current => ({
                        ...current,
                        defaultHours: { ...current.defaultHours, start: event.target.value },
                      }))}
                    />
                    <Input
                      type="time"
                      value={settings.defaultHours.end}
                      onChange={event => setSettings(current => ({
                        ...current,
                        defaultHours: { ...current.defaultHours, end: event.target.value },
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Индивидуальные часы по дням</Label>
                  <Button variant="outline" size="sm" onClick={() => setUsePerDayHours(previous => !previous)}>
                    {usePerDayHours ? 'Выключить' : 'Включить'}
                  </Button>
                </div>

                {usePerDayHours && (
                  <div className="space-y-2 rounded-lg border p-3">
                    {settings.workDays.map(dayNum => {
                      const dayKey = String(dayNum);
                      const entry = settings.perDayHours[dayKey] || settings.defaultHours;
                      return (
                        <div key={dayKey} className="grid grid-cols-[48px_1fr_1fr] items-center gap-2">
                          <span className="text-xs font-medium">{dayLabels[dayNum]}</span>
                          <Input
                            type="time"
                            value={entry.start}
                            onChange={event => setSettings(current => ({
                              ...current,
                              perDayHours: {
                                ...current.perDayHours,
                                [dayKey]: { ...entry, start: event.target.value },
                              },
                            }))}
                          />
                          <Input
                            type="time"
                            value={entry.end}
                            onChange={event => setSettings(current => ({
                              ...current,
                              perDayHours: {
                                ...current.perDayHours,
                                [dayKey]: { ...entry, end: event.target.value },
                              },
                            }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Шаг слота</Label>
                  <Select
                    value={String(settings.slotDuration)}
                    onValueChange={value => setSettings(current => ({ ...current, slotDuration: Number(value) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[15, 30, 45, 60].map(value => <SelectItem key={value} value={String(value)}>{value} мин</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Буфер между визитами</Label>
                  <Select
                    value={String(settings.bufferMinutes)}
                    onValueChange={value => setSettings(current => ({ ...current, bufferMinutes: Number(value) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 5, 10, 15, 20, 30].map(value => (
                        <SelectItem key={value} value={String(value)}>
                          {value === 0 ? 'Без буфера' : `${value} мин`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Базовые перерывы</Label>
                  <div className="space-y-2 rounded-lg border p-3">
                    {(settings.breakConfig.all || []).map((entry, index) => (
                      <div key={`all-${index}`} className="grid grid-cols-[1fr_1fr_32px] gap-2">
                        <Input
                          type="time"
                          value={entry.start}
                          onChange={event => setSettings(current => ({
                            ...current,
                            breakConfig: {
                              ...current.breakConfig,
                              all: (current.breakConfig.all || []).map((currentEntry, currentIndex) =>
                                currentIndex === index ? { ...currentEntry, start: event.target.value } : currentEntry,
                              ),
                            },
                          }))}
                        />
                        <Input
                          type="time"
                          value={entry.end}
                          onChange={event => setSettings(current => ({
                            ...current,
                            breakConfig: {
                              ...current.breakConfig,
                              all: (current.breakConfig.all || []).map((currentEntry, currentIndex) =>
                                currentIndex === index ? { ...currentEntry, end: event.target.value } : currentEntry,
                              ),
                            },
                          }))}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSettings(current => ({
                            ...current,
                            breakConfig: {
                              ...current.breakConfig,
                              all: (current.breakConfig.all || []).filter((_, currentIndex) => currentIndex !== index),
                            },
                          }))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(current => ({
                        ...current,
                        breakConfig: {
                          ...current.breakConfig,
                          all: [...(current.breakConfig.all || []), { start: '13:00', end: '14:00' }],
                        },
                      }))}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Добавить
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={async () => {
                    if (timeToMinutes(settings.defaultHours.end) <= timeToMinutes(settings.defaultHours.start)) {
                      toast({ title: 'Ошибка', description: 'Окончание должно быть позже начала', variant: 'destructive' });
                      return;
                    }
                    const saved = await persistSettings(settings);
                    if (!saved) return;
                    setIsSettingsOpen(false);
                    toast({ title: 'Настройки сохранены' });
                  }}
                >
                  Сохранить
                </Button>

                <MasterTimeOffManager />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isBreakOpen} onOpenChange={setIsBreakOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Coffee className="h-3.5 w-3.5" /> Перерыв
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Добавить перерыв</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Input type="date" value={breakData.date} onChange={event => setBreakData(current => ({ ...current, date: event.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Начало</Label>
                    <Input type="time" value={breakData.start_time} onChange={event => setBreakData(current => ({ ...current, start_time: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Конец</Label>
                    <Input type="time" value={breakData.end_time} onChange={event => setBreakData(current => ({ ...current, end_time: event.target.value }))} />
                  </div>
                </div>
                <Button className="w-full" onClick={handleAddBreak}>Добавить перерыв</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1" /> Записать клиента
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Создать запись</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Клиент</Label>
                  <Tabs value={formData.client_mode} onValueChange={value => setFormData(current => ({ ...current, client_mode: value as 'list' | 'id' | 'manual' }))}>
                    <TabsList className="h-8 w-full">
                      <TabsTrigger value="list" className="flex-1 text-xs">Из базы</TabsTrigger>
                      <TabsTrigger value="id" className="flex-1 text-xs">По ID</TabsTrigger>
                      <TabsTrigger value="manual" className="flex-1 text-xs">По телефону</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {formData.client_mode === 'list' && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-8" placeholder="Поиск клиента" value={clientSearch} onChange={event => setClientSearch(event.target.value)} />
                      </div>
                      <div className="max-h-36 overflow-y-auto rounded border p-1">
                        {filteredClients.length === 0 ? (
                          <p className="py-2 text-center text-xs text-muted-foreground">Клиенты не найдены</p>
                        ) : (
                          filteredClients.map(client => (
                            <button
                              key={client.id}
                              type="button"
                              className={`flex w-full items-center gap-2 rounded p-2 text-left text-xs hover:bg-muted ${formData.client_id === client.id ? 'bg-primary/10 border border-primary/20' : ''}`}
                              onClick={() => setFormData(current => ({ ...current, client_id: client.id }))}
                            >
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="flex-1">{client.first_name} {client.last_name}</span>
                              <span className="text-muted-foreground">{client.skillspot_id}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {formData.client_mode === 'id' && (
                    <Input
                      placeholder="SkillSpot ID"
                      value={formData.client_skillspot_id}
                      onChange={event => setFormData(current => ({ ...current, client_skillspot_id: event.target.value.toUpperCase() }))}
                    />
                  )}

                  {formData.client_mode === 'manual' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Имя (для заметки)"
                        value={formData.client_name}
                        onChange={event => setFormData(current => ({ ...current, client_name: event.target.value }))}
                      />
                      <Input
                        placeholder="Телефон"
                        value={formData.client_phone}
                        onChange={event => setFormData(current => ({ ...current, client_phone: event.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Услуга</Label>
                  <Select value={formData.service_id} onValueChange={value => setFormData(current => ({ ...current, service_id: value, start_time: '', end_time: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} · {service.duration_minutes} мин · {service.price.toLocaleString()} ₽
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Дата</Label>
                    <Input type="date" value={formData.date} onChange={event => setFormData(current => ({ ...current, date: event.target.value, start_time: '', end_time: '' }))} />
                  </div>
                  {resources.length > 0 && (
                    <div className="space-y-2">
                      <Label>Ресурс</Label>
                        <Select value={formData.resource_id} onValueChange={value => setFormData(current => ({ ...current, resource_id: value, start_time: '', end_time: '' }))}>
                          <SelectTrigger><SelectValue placeholder="Без ресурса" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без ресурса</SelectItem>
                          {resources.map(resource => (
                            <SelectItem key={resource.id} value={resource.id}>{resource.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {selectedService && (
                  <div className="space-y-2">
                    <Label>Доступное время</Label>
                    {availableSlots.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">Нет доступных слотов</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                        {availableSlots.map(slot => (
                          <Button
                            key={slot}
                            variant={formData.start_time === slot ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => setFormData(current => ({
                              ...current,
                              start_time: slot,
                              end_time: addMinutesToTime(slot, selectedService.duration_minutes),
                            }))}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                    {formData.start_time && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formData.start_time} – {formData.end_time}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Повторение</Label>
                  <Select value={formData.recurrence} onValueChange={value => setFormData(current => ({ ...current, recurrence: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Разовая запись</SelectItem>
                      <SelectItem value="weekly">Раз в неделю</SelectItem>
                      <SelectItem value="monthly">Раз в месяц</SelectItem>
                      <SelectItem value="custom">Каждые N дней</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrence === 'custom' && (
                  <div className="space-y-2">
                    <Label>Интервал в днях</Label>
                    <Input
                      type="number"
                      value={formData.recurrence_interval}
                      onChange={event => setFormData(current => ({ ...current, recurrence_interval: Number(event.target.value) || 1 }))}
                    />
                  </div>
                )}

                {formData.recurrence !== 'none' && (
                  <div className="space-y-2">
                    <Label>Повторять до</Label>
                    <Input type="date" value={formData.recurrence_end} onChange={event => setFormData(current => ({ ...current, recurrence_end: event.target.value }))} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Комментарий</Label>
                  <Textarea value={formData.notes} onChange={event => setFormData(current => ({ ...current, notes: event.target.value }))} placeholder="Комментарий к визиту" />
                </div>

                <Button className="w-full" onClick={handleCreate} disabled={!formData.start_time || !selectedService}>
                  Создать запись
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}

      <Dialog open={statusDialog?.action === 'no_show'} onOpenChange={() => { setStatusDialog(null); setStatusReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Причина неявки</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {noShowReasons.map(reason => (
                <Button key={reason} variant={statusReason === reason ? 'default' : 'outline'} size="sm" onClick={() => setStatusReason(reason)}>
                  {reason}
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={handleNoShow}>Подтвердить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialog?.action === 'reject'} onOpenChange={() => { setStatusDialog(null); setStatusReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Причина отклонения</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {rejectReasons.map(reason => (
                <Button key={reason} variant={statusReason === reason ? 'default' : 'outline'} size="sm" onClick={() => setStatusReason(reason)}>
                  {reason}
                </Button>
              ))}
            </div>
            <Button className="w-full" variant="destructive" onClick={handleReject}>Отклонить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialog?.action === 'reschedule'} onOpenChange={() => { setStatusDialog(null); setStatusReason(''); setRescheduleDate(''); setRescheduleTime(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Перенести запись</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Причина</Label>
              <Input value={statusReason} onChange={event => setStatusReason(event.target.value)} placeholder="Причина переноса" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Новая дата</Label>
                <Input type="date" value={rescheduleDate} onChange={event => setRescheduleDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Новое время</Label>
                <Input type="time" value={rescheduleTime} onChange={event => setRescheduleTime(event.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleReschedule} disabled={!rescheduleDate || !rescheduleTime}>
              Перенести
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AppointmentDetailDialog
        booking={selectedItem}
        open={!!selectedItem}
        onOpenChange={open => {
          if (!open) setSelectedItem(null);
        }}
        onUpdated={async () => {
          await fetchItems();
          setSelectedItem(null);
        }}
      />
    </div>
  );
};

export default UniversalSchedule;
