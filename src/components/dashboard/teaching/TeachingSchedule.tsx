import { useState, useEffect, useCallback } from 'react';
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
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

const daysOfWeekShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const recurrenceLabels: Record<string, string> = {
  none: 'Без повторения', daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно',
};
const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

const statusColors: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary border-primary/30',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-accent/20 text-accent-foreground border-accent/30',
};

const TeachingSchedule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', lesson_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '10:00', end_time: '11:00', lesson_type: 'individual' as 'individual' | 'group',
    max_participants: 1, price: 0, recurrence: 'none', recurrence_end: '', day_of_week: 1,
  });

  const fetchLessons = useCallback(async () => {
    if (!user) return;
    let startDate: Date, endDate: Date;
    if (view === 'day') { startDate = currentDate; endDate = currentDate; }
    else if (view === 'week') { startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); endDate = endOfWeek(currentDate, { weekStartsOn: 1 }); }
    else { startDate = startOfMonth(currentDate); endDate = endOfMonth(currentDate); }

    const { data } = await supabase.from('lessons').select('*')
      .eq('teacher_id', user.id)
      .gte('lesson_date', format(startDate, 'yyyy-MM-dd'))
      .lte('lesson_date', format(endDate, 'yyyy-MM-dd'))
      .order('lesson_date').order('start_time');
    setLessons(data || []);
  }, [user, currentDate, view]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const navigate = (dir: number) => {
    if (view === 'day') setCurrentDate(prev => addDays(prev, dir));
    else if (view === 'week') setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const handleCreateLesson = async () => {
    if (!user || !formData.title) return;
    try {
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
        const items: any[] = [];
        let d = new Date(start);
        while (d <= end) {
          const match = formData.recurrence === 'weekly' ? d.getDay() === formData.day_of_week
            : formData.recurrence === 'daily' ? true : d.getDate() === start.getDate();
          if (match) {
            items.push({
              teacher_id: user.id, title: formData.title, description: formData.description || null,
              lesson_date: format(d, 'yyyy-MM-dd'), start_time: formData.start_time, end_time: formData.end_time,
              lesson_type: formData.lesson_type, max_participants: formData.max_participants,
              price: formData.price, recurring_pattern_id: pattern.id,
            });
          }
          d = addDays(d, 1);
        }
        if (items.length > 0) {
          const { error } = await supabase.from('lessons').insert(items);
          if (error) throw error;
        }
        toast({ title: 'Серия занятий создана', description: `Создано ${items.length} занятий` });
      } else {
        const { error } = await supabase.from('lessons').insert({
          teacher_id: user.id, title: formData.title, description: formData.description || null,
          lesson_date: formData.lesson_date, start_time: formData.start_time, end_time: formData.end_time,
          lesson_type: formData.lesson_type, max_participants: formData.max_participants, price: formData.price,
        });
        if (error) throw error;
        toast({ title: 'Занятие создано' });
      }
      setIsCreateOpen(false);
      resetForm();
      fetchLessons();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteLesson = async (lessonId: string, deleteAll = false) => {
    try {
      if (deleteAll) {
        const lesson = lessons.find(l => l.id === lessonId);
        if (lesson?.recurring_pattern_id) {
          await supabase.from('lessons').delete().eq('recurring_pattern_id', lesson.recurring_pattern_id).eq('status', 'scheduled');
          await supabase.from('recurring_patterns').update({ is_active: false }).eq('id', lesson.recurring_pattern_id);
        }
      } else {
        await supabase.from('lessons').delete().eq('id', lessonId);
      }
      toast({ title: 'Занятие удалено' });
      fetchLessons();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (lessonId: string, status: 'scheduled' | 'completed' | 'cancelled' | 'no_show') => {
    await supabase.from('lessons').update({ status }).eq('id', lessonId);
    fetchLessons();
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', lesson_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '10:00', end_time: '11:00', lesson_type: 'individual', max_participants: 1,
      price: 0, recurrence: 'none', recurrence_end: '', day_of_week: 1 });
  };

  const getLessonsForDate = (date: Date) => lessons.filter(l => isSameDay(new Date(l.lesson_date), date));

  const getNavLabel = () => {
    if (view === 'day') return format(currentDate, 'd MMMM yyyy', { locale: ru });
    if (view === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(s, 'd MMM', { locale: ru })} – ${format(e, 'd MMM yyyy', { locale: ru })}`;
    }
    return format(currentDate, 'LLLL yyyy', { locale: ru });
  };

  // Week timetable view matching the reference
  const renderWeekTimetable = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });

    return (
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
              <div className="p-3 flex items-center justify-center text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              {days.map((day, i) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={i} className={`p-3 text-center border-l ${isToday ? 'bg-primary/5' : ''}`}>
                    <p className="text-sm font-medium text-muted-foreground">{daysOfWeekShort[i]}</p>
                    <p className={`text-xl font-bold ${isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</p>
                  </div>
                );
              })}
            </div>

            {/* Time rows */}
            {hours.map(hour => {
              const timeStr = `${hour.toString().padStart(2, '0')}:00`;
              return (
                <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0 min-h-[60px]">
                  <div className="p-2 text-sm text-muted-foreground text-right pr-4 pt-1">{timeStr}</div>
                  {days.map((day, di) => {
                    const dayLessons = getLessonsForDate(day).filter(l => {
                      const h = parseInt(l.start_time?.split(':')[0] || '0');
                      return h === hour;
                    });
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={di} className={`border-l p-1 relative ${isToday ? 'bg-primary/5' : ''}`}>
                        {dayLessons.map(l => (
                          <div
                            key={l.id}
                            className={`text-xs p-1.5 rounded border mb-1 cursor-pointer hover:opacity-80 ${statusColors[l.status] || 'bg-muted'}`}
                            onClick={() => {
                              if (l.status === 'scheduled') handleUpdateStatus(l.id, 'completed');
                            }}
                          >
                            <p className="font-semibold truncate">{l.title}</p>
                            <p>{l.start_time?.slice(0, 5)} – {l.end_time?.slice(0, 5)}</p>
                            <p className="opacity-75">{Number(l.price).toLocaleString()} ₽</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Day view
  const renderDayView = () => {
    const dayLessons = getLessonsForDate(currentDate);
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">{format(currentDate, 'd MMMM, EEEE', { locale: ru })}</h3>
          </div>
          {hours.map(hour => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            const hourLessons = dayLessons.filter(l => parseInt(l.start_time?.split(':')[0] || '0') === hour);
            return (
              <div key={hour} className="flex border-b last:border-b-0 min-h-[60px]">
                <div className="w-20 p-2 text-sm text-muted-foreground text-right pr-4 pt-1 shrink-0">{timeStr}</div>
                <div className="flex-1 border-l p-1">
                  {hourLessons.map(l => (
                    <div key={l.id} className={`p-3 rounded border mb-1 ${statusColors[l.status] || 'bg-muted'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{l.title}</p>
                          <p className="text-sm">{l.start_time?.slice(0, 5)} – {l.end_time?.slice(0, 5)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {l.lesson_type === 'group' ? `Группа (${l.current_participants}/${l.max_participants})` : 'Индивид.'}
                            </Badge>
                            <span className="text-sm font-medium">{Number(l.price).toLocaleString()} ₽</span>
                          </div>
                        </div>
                        {l.status === 'scheduled' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(l.id, 'completed')}>✓</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(l.id, 'cancelled')}>✕</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteLesson(l.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  // Month view
  const renderMonthView = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const startW = startOfWeek(start, { weekStartsOn: 1 });
    const endW = endOfWeek(end, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startW, end: endW });

    return (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {daysOfWeekShort.map(d => (
              <div key={d} className="text-center font-medium text-xs text-muted-foreground pb-2">{d}</div>
            ))}
            {days.map(day => {
              const dayLessons = getLessonsForDate(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={`min-h-[70px] p-1.5 rounded-lg border text-xs ${!isCurrentMonth ? 'opacity-40' : ''} ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <p className={`font-medium ${isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</p>
                  {dayLessons.slice(0, 2).map(l => (
                    <div key={l.id} className={`p-0.5 rounded mt-0.5 ${statusColors[l.status] || 'bg-muted'}`}>
                      <p className="truncate">{l.start_time?.slice(0, 5)} {l.title}</p>
                    </div>
                  ))}
                  {dayLessons.length > 2 && <p className="text-muted-foreground mt-0.5">+{dayLessons.length - 2}</p>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Расписание</h2>
          <p className="text-sm text-muted-foreground">Управляйте своими занятиями</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Добавить занятие</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Новое занятие</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Математика 10 класс" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Дата</Label><Input type="date" value={formData.lesson_date} onChange={e => setFormData(p => ({ ...p, lesson_date: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select value={formData.lesson_type} onValueChange={v => setFormData(p => ({ ...p, lesson_type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Индивидуальное</SelectItem>
                      <SelectItem value="group">Групповое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Начало</Label><Input type="time" value={formData.start_time} onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Конец</Label><Input type="time" value={formData.end_time} onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Цена (₽)</Label><Input type="text" inputMode="numeric" value={formData.price || ''} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value.replace(/[^\d]/g, '')) || 0 }))} /></div>
                {formData.lesson_type === 'group' && (
                  <div className="space-y-2"><Label>Макс. участников</Label><Input type="text" inputMode="numeric" value={formData.max_participants || ''} onChange={e => setFormData(p => ({ ...p, max_participants: Number(e.target.value.replace(/[^\d]/g, '')) || 1 }))} /></div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Повторение</Label>
                <Select value={formData.recurrence} onValueChange={v => setFormData(p => ({ ...p, recurrence: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {formData.recurrence === 'weekly' && (
                <div className="space-y-2">
                  <Label>День недели</Label>
                  <Select value={String(formData.day_of_week)} onValueChange={v => setFormData(p => ({ ...p, day_of_week: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map((d,i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {formData.recurrence !== 'none' && (
                <div className="space-y-2"><Label>Повторять до</Label><Input type="date" value={formData.recurrence_end} onChange={e => setFormData(p => ({ ...p, recurrence_end: e.target.value }))} /></div>
              )}
              <div className="space-y-2"><Label>Описание</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Описание занятия..." /></div>
              <Button className="w-full" onClick={handleCreateLesson}>Создать</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="font-semibold text-lg ml-2">{getNavLabel()}</span>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="day">День</TabsTrigger>
            <TabsTrigger value="week">Неделя</TabsTrigger>
            <TabsTrigger value="month">Месяц</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Views */}
      {view === 'week' && renderWeekTimetable()}
      {view === 'day' && renderDayView()}
      {view === 'month' && renderMonthView()}
    </div>
  );
};

export default TeachingSchedule;
