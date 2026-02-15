import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Banknote, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const TeachingDashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalLessons: 0, totalStudents: 0, monthIncome: 0, upcoming: 0 });
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Fetch stats
    Promise.all([
      supabase.from('lessons').select('id', { count: 'exact' }).eq('teacher_id', user.id),
      supabase.from('lesson_bookings').select('student_id').eq('status', 'confirmed')
        .in('lesson_id', []),
      supabase.from('lessons').select('*').eq('teacher_id', user.id).eq('status', 'scheduled')
        .gte('lesson_date', today).order('lesson_date').order('start_time').limit(5),
      supabase.from('lessons').select('id', { count: 'exact' }).eq('teacher_id', user.id)
        .eq('status', 'scheduled').gte('lesson_date', today),
      supabase.from('teaching_payments').select('amount, booking_id, status')
        .eq('status', 'paid'),
    ]).then(([lessonsRes, _studentsRes, upcomingRes, upcomingCountRes, _paymentsRes]) => {
      setStats({
        totalLessons: lessonsRes.count || 0,
        totalStudents: 0,
        monthIncome: 0,
        upcoming: upcomingCountRes.count || 0,
      });
      setUpcomingLessons(upcomingRes.data || []);
    });

    // Fetch unique students count
    supabase.from('lesson_bookings')
      .select('student_id, lesson_id')
      .then(({ data }) => {
        if (data) {
          const uniqueStudents = new Set(data.map(b => b.student_id));
          setStats(prev => ({ ...prev, totalStudents: uniqueStudents.size }));
        }
      });

    // Fetch month income
    supabase.from('lessons')
      .select('id, price')
      .eq('teacher_id', user.id)
      .eq('status', 'completed')
      .gte('lesson_date', monthStart)
      .then(({ data }) => {
        if (data) {
          const income = data.reduce((sum, l) => sum + Number(l.price), 0);
          setStats(prev => ({ ...prev, monthIncome: income }));
        }
      });

    // Recent bookings as events
    supabase.from('lesson_bookings')
      .select('*, lessons!inner(title, teacher_id, lesson_date), profiles:student_id(first_name, last_name)')
      .eq('lessons.teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setRecentEvents(data || []);
      });
  }, [user]);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Ожидание</Badge>;
      case 'confirmed': return <Badge className="bg-primary text-primary-foreground">Подтверждено</Badge>;
      case 'cancelled': return <Badge variant="destructive">Отменено</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalLessons}</p>
                <p className="text-sm text-muted-foreground">Всего занятий</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Клиентов</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.monthIncome.toLocaleString()} ₽</p>
                <p className="text-sm text-muted-foreground">Доход за месяц</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
                <p className="text-sm text-muted-foreground">Предстоящих</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Lessons */}
      <Card>
        <CardHeader>
          <CardTitle>Ближайшие занятия</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingLessons.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Нет предстоящих занятий</p>
          ) : (
            <div className="space-y-3">
              {upcomingLessons.map(lesson => (
                <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{lesson.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(lesson.lesson_date), 'd MMMM, EEEE', { locale: ru })} · {lesson.start_time?.slice(0, 5)} – {lesson.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {lesson.lesson_type === 'group' ? 'Групповое' : 'Индивидуальное'}
                    </Badge>
                    <span className="font-semibold">{Number(lesson.price).toLocaleString()} ₽</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Последние события</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Нет событий</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">
                      {(event.profiles as any)?.first_name || 'Клиент'} {(event.profiles as any)?.last_name || ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(event.lessons as any)?.title}
                    </p>
                  </div>
                  {statusLabel(event.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeachingDashboardHome;
