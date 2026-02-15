import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const recurrenceLabels: Record<string, string> = {
  none: 'Без повторения',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary border-primary/30',
  completed: 'bg-emerald/20 text-emerald-dark border-emerald/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  no_show: 'bg-accent/20 text-accent-foreground border-accent/30',
};

const TeachingSchedule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    lesson_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '10:00',
    end_time: '11:00',
    lesson_type: 'individual' as 'individual' | 'group',
    max_participants: 1,
    price: 0,
    recurrence: 'none',
    recurrence_end: '',
    day_of_week: 1,
  });

  const fetchLessons = useCallback(async () => {
    if (!user) return;
    let startDate: Date, endDate: Date;

    if (view === 'day') {
      startDate = currentDate;
      endDate = currentDate;
    } else if (view === 'week') {
      startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    }

    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('teacher_id', user.id)
      .gte('lesson_date', format(startDate, 'yyyy-MM-dd'))
      .lte('lesson_date', format(endDate, 'yyyy-MM-dd'))
      .order('lesson_date')
      .order('start_time');

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
        // Create recurring pattern first
        const { data: pattern, error: patternErr } = await supabase
          .from('recurring_patterns')
          .insert({
            teacher_id: user.id,
            title: formData.title,
            lesson_type: formData.lesson_type,
            recurrence_type: formData.recurrence as any,
            day_of_week: formData.day_of_week,
            start_time: formData.start_time,
            end_time: formData.end_time,
            start_date: formData.lesson_date,
            end_date: formData.recurrence_end,
            price: formData.price,
            max_participants: formData.max_participants,
            description: formData.description || null,
          })
          .select()
          .single();

        if (patternErr) throw patternErr;

        // Generate lessons for the pattern
        const start = new Date(formData.lesson_date);
        const end = new Date(formData.recurrence_end);
        const lessonsToCreate: any[] = [];
        let d = new Date(start);

        while (d <= end) {
          const dayMatch = formData.recurrence === 'weekly'
            ? d.getDay() === formData.day_of_week
            : formData.recurrence === 'daily'
              ? true
              : d.getDate() === start.getDate();

          if (dayMatch) {
            lessonsToCreate.push({
              teacher_id: user.id,
              title: formData.title,
              description: formData.description || null,
              lesson_date: format(d, 'yyyy-MM-dd'),
              start_time: formData.start_time,
              end_time: formData.end_time,
              lesson_type: formData.lesson_type,
              max_participants: formData.max_participants,
              price: formData.price,
              recurring_pattern_id: pattern.id,
            });
          }
          d = addDays(d, 1);
        }

        if (lessonsToCreate.length > 0) {
          const { error } = await supabase.from('lessons').insert(lessonsToCreate);
          if (error) throw error;
        }

        toast({ title: 'Серия занятий создана', description: `Создано ${lessonsToCreate.length} занятий` });
      } else {
        const { error } = await supabase.from('lessons').insert({
          teacher_id: user.id,
          title: formData.title,
          description: formData.description || null,
          lesson_date: formData.lesson_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          lesson_type: formData.lesson_type,
          max_participants: formData.max_participants,
          price: formData.price,
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
    setFormData({
      title: '', description: '', lesson_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '10:00', end_time: '11:00', lesson_type: 'individual',
      max_participants: 1, price: 0, recurrence: 'none', recurrence_end: '', day_of_week: 1,
    });
  };

  const getLessonsForDate = (date: Date) => lessons.filter(l => isSameDay(new Date(l.lesson_date), date));

  const renderDayView = () => {
    const dayLessons = getLessonsForDate(currentDate);
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{format(currentDate, 'd MMMM, EEEE', { locale: ru })}</h3>
        {dayLessons.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">Нет занятий на этот день</p>
        ) : dayLessons.map(lesson => renderLessonCard(lesson))}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });

    return (
      <div className="grid grid-cols-7 gap-2">
        {daysOfWeek.map(d => (
          <div key={d} className="text-center font-medium text-sm text-muted-foreground pb-2">{d}</div>
        ))}
        {days.map(day => {
          const dayLessons = getLessonsForDate(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={`min-h-[100px] p-2 rounded-lg border ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <p className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</p>
              {dayLessons.map(l => (
                <div key={l.id} className={`text-xs p-1 rounded mb-1 border ${statusColors[l.status] || 'bg-muted'}`}>
                  <p className="font-medium truncate">{l.title}</p>
                  <p>{l.start_time?.slice(0, 5)}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const startWeek = startOfWeek(start, { weekStartsOn: 1 });
    const endWeek = endOfWeek(end, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startWeek, end: endWeek });

    return (
      <div className="grid grid-cols-7 gap-1">
        {daysOfWeek.map(d => (
          <div key={d} className="text-center font-medium text-xs text-muted-foreground pb-1">{d}</div>
        ))}
        {days.map(day => {
          const dayLessons = getLessonsForDate(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={`min-h-[60px] p-1 rounded border text-xs ${!isCurrentMonth ? 'opacity-40' : ''} ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <p className="font-medium">{format(day, 'd')}</p>
              {dayLessons.length > 0 && (
                <Badge variant="secondary" className="text-[10px] mt-0.5">{dayLessons.length}</Badge>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderLessonCard = (lesson: any) => (
    <div key={lesson.id} className={`p-4 rounded-lg border ${statusColors[lesson.status] || 'bg-muted'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{lesson.title}</p>
          <p className="text-sm">{lesson.start_time?.slice(0, 5)} – {lesson.end_time?.slice(0, 5)}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {lesson.lesson_type === 'group' ? `Группа (${lesson.current_participants}/${lesson.max_participants})` : 'Индивидуальное'}
            </Badge>
            <span className="text-sm font-medium">{Number(lesson.price).toLocaleString()} ₽</span>
          </div>
          {lesson.description && <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>}
        </div>
        <div className="flex gap-1">
          {lesson.status === 'scheduled' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(lesson.id, 'completed' as const)}>✓</Button>
              <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(lesson.id, 'cancelled' as const)}>✕</Button>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteLesson(lesson.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const getNavLabel = () => {
    if (view === 'day') return format(currentDate, 'd MMMM yyyy', { locale: ru });
    if (view === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(s, 'd MMM', { locale: ru })} – ${format(e, 'd MMM yyyy', { locale: ru })}`;
    }
    return format(currentDate, 'LLLL yyyy', { locale: ru });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold min-w-[200px] text-center">{getNavLabel()}</span>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="day">День</TabsTrigger>
              <TabsTrigger value="week">Неделя</TabsTrigger>
              <TabsTrigger value="month">Месяц</TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Создать занятие</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Новое занятие</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Название *</Label>
                  <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Математика 10 класс" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Дата</Label>
                    <Input type="date" value={formData.lesson_date} onChange={e => setFormData(p => ({ ...p, lesson_date: e.target.value }))} />
                  </div>
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
                  <div className="space-y-2">
                    <Label>Начало</Label>
                    <Input type="time" value={formData.start_time} onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Конец</Label>
                    <Input type="time" value={formData.end_time} onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Цена (₽)</Label>
                    <Input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))} />
                  </div>
                  {formData.lesson_type === 'group' && (
                    <div className="space-y-2">
                      <Label>Макс. участников</Label>
                      <Input type="number" min={2} value={formData.max_participants} onChange={e => setFormData(p => ({ ...p, max_participants: Number(e.target.value) }))} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Повторение</Label>
                  <Select value={formData.recurrence} onValueChange={v => setFormData(p => ({ ...p, recurrence: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(recurrenceLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.recurrence === 'weekly' && (
                  <div className="space-y-2">
                    <Label>День недели</Label>
                    <Select value={String(formData.day_of_week)} onValueChange={v => setFormData(p => ({ ...p, day_of_week: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.recurrence !== 'none' && (
                  <div className="space-y-2">
                    <Label>Дата окончания серии</Label>
                    <Input type="date" value={formData.recurrence_end} onChange={e => setFormData(p => ({ ...p, recurrence_end: e.target.value }))} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Дополнительная информация..." />
                </div>
                <Button className="w-full" onClick={handleCreateLesson}>Создать</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeachingSchedule;
