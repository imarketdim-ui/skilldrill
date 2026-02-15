import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, TrendingUp, TrendingDown, Users, BarChart3, Banknote, Calendar } from 'lucide-react';

const FitnessStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalWorkouts: 0, completedWorkouts: 0, cancelledWorkouts: 0, noShowWorkouts: 0,
    totalClients: 0, totalIncome: 0, totalExpenses: 0, avgPrice: 0, completionRate: 0,
  });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [wRes, bRes, eRes] = await Promise.all([
        supabase.from('lessons').select('*').eq('teacher_id', user.id),
        supabase.from('lesson_bookings').select('student_id, lesson_id, lessons!inner(teacher_id)').eq('lessons.teacher_id', user.id),
        supabase.from('teaching_expenses').select('amount').eq('teacher_id', user.id),
      ]);
      const workouts = wRes.data || [];
      const bookings = bRes.data || [];
      const expenses = eRes.data || [];
      const completed = workouts.filter(w => w.status === 'completed');
      const totalIncome = completed.reduce((s, w) => s + Number(w.price), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

      setStats({
        totalWorkouts: workouts.length,
        completedWorkouts: completed.length,
        cancelledWorkouts: workouts.filter(w => w.status === 'cancelled').length,
        noShowWorkouts: workouts.filter(w => w.status === 'no_show').length,
        totalClients: new Set(bookings.map(b => b.student_id)).size,
        totalIncome, totalExpenses,
        avgPrice: completed.length > 0 ? Math.round(totalIncome / completed.length) : 0,
        completionRate: workouts.length > 0 ? Math.round((completed.length / workouts.length) * 100) : 0,
      });
    };
    fetchStats();
  }, [user]);

  const cards = [
    { icon: Dumbbell, label: 'Всего тренировок', value: stats.totalWorkouts, color: 'text-primary' },
    { icon: Calendar, label: 'Проведено', value: stats.completedWorkouts, color: 'text-primary' },
    { icon: Users, label: 'Клиентов', value: stats.totalClients, color: 'text-primary' },
    { icon: TrendingUp, label: 'Доход', value: `${stats.totalIncome.toLocaleString()} ₽`, color: 'text-primary' },
    { icon: TrendingDown, label: 'Расходы', value: `${stats.totalExpenses.toLocaleString()} ₽`, color: 'text-destructive' },
    { icon: Banknote, label: 'Прибыль', value: `${(stats.totalIncome - stats.totalExpenses).toLocaleString()} ₽`, color: 'text-primary' },
    { icon: BarChart3, label: 'Ср. цена тренировки', value: `${stats.avgPrice.toLocaleString()} ₽`, color: 'text-muted-foreground' },
    { icon: Calendar, label: '% завершения', value: `${stats.completionRate}%`, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Статистика</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Card key={i}><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><c.icon className={`h-5 w-5 ${c.color}`} /></div>
            <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-muted-foreground">{c.label}</p></div>
          </div></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Статусы тренировок</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/10"><p className="text-2xl font-bold">{stats.completedWorkouts}</p><p className="text-sm text-muted-foreground">Проведено</p></div>
            <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold">{stats.totalWorkouts - stats.completedWorkouts - stats.cancelledWorkouts - stats.noShowWorkouts}</p><p className="text-sm text-muted-foreground">Запланировано</p></div>
            <div className="text-center p-4 rounded-lg bg-destructive/10"><p className="text-2xl font-bold">{stats.cancelledWorkouts}</p><p className="text-sm text-muted-foreground">Отменено</p></div>
            <div className="text-center p-4 rounded-lg bg-accent/10"><p className="text-2xl font-bold">{stats.noShowWorkouts}</p><p className="text-sm text-muted-foreground">Неявка</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FitnessStats;
