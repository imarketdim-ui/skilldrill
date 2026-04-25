import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import ScheduleGrid from '../schedule/ScheduleGrid';
import ScheduleEventBlock from '../schedule/ScheduleEventBlock';
import { normalizeBooking, ScheduleEvent } from '../schedule/scheduleUtils';

interface Props {
  businessId: string;
}

const BusinessSchedule = ({ businessId }: Props) => {
  const [view, setView] = useState<'day' | 'week'>('day');
  const [masters, setMasters] = useState<{ id: string; name: string }[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    fetchData();
  }, [businessId, weekStart, view, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    let from: Date, to: Date;
    if (view === 'day') {
      from = new Date(currentDate);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(to.getDate() + 1);
    } else {
      from = weekStart;
      to = addDays(weekStart, 7);
    }
    const [mastersRes, bookingsRes] = await Promise.all([
      supabase
        .from('business_masters')
        .select('master_id, profile:profiles!business_masters_master_id_fkey(first_name, last_name)')
        .eq('business_id', businessId)
        .eq('status', 'accepted'),
      supabase
        .from('bookings')
        .select(
          '*, service:services!bookings_service_id_fkey(name, duration_minutes, price), client:profiles!bookings_client_id_fkey(first_name, last_name)',
        )
        .eq('organization_id', businessId)
        .gte('scheduled_at', from.toISOString())
        .lt('scheduled_at', to.toISOString())
        .order('scheduled_at'),
    ]);
    setMasters(
      (mastersRes.data || []).map((m: any) => ({
        id: m.master_id,
        name:
          `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Без имени',
      })),
    );
    setBookings(bookingsRes.data || []);
    setLoading(false);
  };

  const events: ScheduleEvent[] = useMemo(
    () => bookings.map(normalizeBooking),
    [bookings],
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const statusColor = (status: string) => {
    if (status === 'confirmed') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-200';
    if (status === 'completed') return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-muted text-muted-foreground';
  };
  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Ожидает',
      confirmed: 'Подтверждена',
      cancelled: 'Отменена',
      completed: 'Завершена',
      no_show: 'Неявка',
    };
    return map[status] || status;
  };

  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter(
    b => b.status === 'confirmed' || b.status === 'completed',
  ).length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Расписание</h2>
          <p className="text-muted-foreground">
            Шахматка по мастерам — наводите на запись для информации о клиенте
          </p>
        </div>
        <Tabs value={view} onValueChange={v => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="day">День</TabsTrigger>
            <TabsTrigger value="week">Неделя</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">
              {view === 'day' ? 'За день' : 'На неделе'}
            </p>
            <p className="text-2xl font-bold mt-1">{totalBookings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Подтверждено</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{confirmedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Ожидает</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Мастеров</p>
            <p className="text-2xl font-bold mt-1">{masters.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      {view === 'day' ? (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addDays(currentDate, -1))}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Пред. день
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {format(currentDate, 'EEEE, d MMMM yyyy', { locale: ru })}
            </span>
            {!isSameDay(currentDate, new Date()) && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                Сегодня
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            След. день <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Пред. неделя
          </Button>
          <span className="text-sm font-medium">
            {format(weekStart, 'd MMM', { locale: ru })} —{' '}
            {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ru })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            След. неделя <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
      ) : masters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Добавьте мастеров в команду для отображения расписания
            </p>
          </CardContent>
        </Card>
      ) : view === 'day' ? (
        <ScheduleGrid
          date={currentDate}
          columns={masters.map(m => ({
            id: m.id,
            title: m.name,
            subtitle: `${events.filter(e => e.columnId === m.id).length} записей`,
          }))}
          events={events}
          slotMinutes={30}
          rowHeight={36}
          dayStartHour={8}
          dayEndHour={22}
          renderEvent={(ev, geom) => (
            <ScheduleEventBlock event={ev} top={geom.top} height={geom.height} />
          )}
        />
      ) : (
        <div className="space-y-4">
          {masters.map(master => {
            const masterBookingsTotal = bookings.filter(b => b.executor_id === master.id).length;
            return (
              <Card key={master.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{master.name}</CardTitle>
                    <Badge variant="secondary">{masterBookingsTotal} записей</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1">
                    {days.map(day => {
                      const dayBookings = bookings.filter(
                        b => isSameDay(parseISO(b.scheduled_at), day) && b.executor_id === master.id,
                      );
                      const isToday = isSameDay(day, today);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`min-h-[80px] rounded-lg border p-1.5 cursor-pointer hover:bg-muted/40 ${
                            isToday ? 'border-primary bg-primary/5' : ''
                          }`}
                          onClick={() => {
                            setCurrentDate(day);
                            setView('day');
                          }}
                        >
                          <p
                            className={`text-xs font-medium mb-1 ${
                              isToday ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {format(day, 'EEE d', { locale: ru })}
                          </p>
                          {dayBookings.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/50">—</p>
                          ) : (
                            <div className="space-y-0.5">
                              {dayBookings.slice(0, 3).map(b => (
                                <div
                                  key={b.id}
                                  className={`text-[10px] p-1 rounded border ${statusColor(b.status)}`}
                                >
                                  <p className="font-medium truncate">
                                    {format(parseISO(b.scheduled_at), 'HH:mm')}
                                  </p>
                                  <p className="truncate">{b.service?.name || 'Услуга'}</p>
                                </div>
                              ))}
                              {dayBookings.length > 3 && (
                                <p className="text-[10px] text-muted-foreground">
                                  +{dayBookings.length - 3}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {bookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Все записи за неделю</CardTitle>
                <CardDescription>{bookings.length} записей</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {bookings.map(b => {
                    const master = masters.find(m => m.id === b.executor_id);
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                            <Clock className="h-3.5 w-3.5" />
                            {format(parseISO(b.scheduled_at), 'd MMM HH:mm', { locale: ru })}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {b.service?.name || 'Услуга'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {b.client?.first_name} {b.client?.last_name} →{' '}
                              {master?.name || 'Мастер'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {statusLabel(b.status)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessSchedule;
