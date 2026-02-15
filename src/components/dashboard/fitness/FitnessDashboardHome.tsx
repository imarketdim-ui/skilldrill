import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Users, Banknote, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const FitnessDashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalWorkouts: 0, totalClients: 0, monthIncome: 0, upcoming: 0 });
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    Promise.all([
      supabase.from('lessons').select('id', { count: 'exact' }).eq('teacher_id', user.id),
      supabase.from('lessons').select('*').eq('teacher_id', user.id).eq('status', 'scheduled')
        .gte('lesson_date', today).order('lesson_date').order('start_time').limit(5),
      supabase.from('lessons').select('id', { count: 'exact' }).eq('teacher_id', user.id)
        .eq('status', 'scheduled').gte('lesson_date', today),
    ]).then(([allRes, upcomingRes, upcomingCountRes]) => {
      setStats(prev => ({
        ...prev,
        totalWorkouts: allRes.count || 0,
        upcoming: upcomingCountRes.count || 0,
      }));
      setUpcomingWorkouts(upcomingRes.data || []);
    });

    supabase.from('lesson_bookings')
      .select('student_id, lesson_id, lessons!inner(teacher_id)')
      .eq('lessons.teacher_id', user.id)
      .then(({ data }) => {
        if (data) {
          const unique = new Set(data.map(b => b.student_id));
          setStats(prev => ({ ...prev, totalClients: unique.size }));
        }
      });

    supabase.from('lessons')
      .select('id, price')
      .eq('teacher_id', user.id)
      .eq('status', 'completed')
      .gte('lesson_date', monthStart)
      .then(({ data }) => {
        if (data) {
          setStats(prev => ({ ...prev, monthIncome: data.reduce((s, l) => s + Number(l.price), 0) }));
        }
      });

    supabase.from('lesson_bookings')
      .select('*, lessons!inner(title, teacher_id, lesson_date), profiles:student_id(first_name, last_name)')
      .eq('lessons.teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentEvents(data || []));
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Dumbbell, value: stats.totalWorkouts, label: 'Всего тренировок', color: 'text-primary' },
          { icon: Users, value: stats.totalClients, label: 'Клиентов', color: 'text-primary' },
          { icon: Banknote, value: `${stats.monthIncome.toLocaleString()} ₽`, label: 'Доход за месяц', color: 'text-primary' },
          { icon: Clock, value: stats.upcoming, label: 'Предстоящих', color: 'text-primary' },
        ].map((card, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Ближайшие тренировки</CardTitle></CardHeader>
        <CardContent>
          {upcomingWorkouts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Нет предстоящих тренировок</p>
          ) : (
            <div className="space-y-3">
              {upcomingWorkouts.map(w => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{w.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(w.lesson_date), 'd MMMM, EEEE', { locale: ru })} · {w.start_time?.slice(0, 5)} – {w.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {w.lesson_type === 'group' ? `Группа (${w.current_participants}/${w.max_participants})` : 'Персональная'}
                    </Badge>
                    <span className="font-semibold">{Number(w.price).toLocaleString()} ₽</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Последние события</CardTitle></CardHeader>
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
                    <p className="text-sm text-muted-foreground">{(event.lessons as any)?.title}</p>
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

export default FitnessDashboardHome;
