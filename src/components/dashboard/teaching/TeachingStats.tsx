import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Users, Calendar, Banknote, BookOpen } from 'lucide-react';

const TeachingStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    cancelledLessons: 0,
    noShowLessons: 0,
    totalStudents: 0,
    totalIncome: 0,
    totalExpenses: 0,
    avgLessonPrice: 0,
    completionRate: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [lessonsRes, bookingsRes, expensesRes] = await Promise.all([
        supabase.from('lessons').select('*').eq('teacher_id', user.id),
        supabase.from('lesson_bookings').select('student_id, lesson_id, lessons!inner(teacher_id)').eq('lessons.teacher_id', user.id),
        supabase.from('teaching_expenses').select('amount').eq('teacher_id', user.id),
      ]);

      const lessons = lessonsRes.data || [];
      const bookings = bookingsRes.data || [];
      const expenses = expensesRes.data || [];

      const completed = lessons.filter(l => l.status === 'completed');
      const cancelled = lessons.filter(l => l.status === 'cancelled');
      const noShow = lessons.filter(l => l.status === 'no_show');
      const totalIncome = completed.reduce((s, l) => s + Number(l.price), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const uniqueStudents = new Set(bookings.map(b => b.student_id));

      setStats({
        totalLessons: lessons.length,
        completedLessons: completed.length,
        cancelledLessons: cancelled.length,
        noShowLessons: noShow.length,
        totalStudents: uniqueStudents.size,
        totalIncome,
        totalExpenses,
        avgLessonPrice: completed.length > 0 ? Math.round(totalIncome / completed.length) : 0,
        completionRate: lessons.length > 0 ? Math.round((completed.length / lessons.length) * 100) : 0,
      });
    };

    fetchStats();
  }, [user]);

  const statCards = [
    { icon: Calendar, label: 'Всего занятий', value: stats.totalLessons, color: 'text-primary' },
    { icon: BookOpen, label: 'Проведено', value: stats.completedLessons, color: 'text-primary' },
    { icon: Users, label: 'Студентов', value: stats.totalStudents, color: 'text-primary' },
    { icon: TrendingUp, label: 'Доход', value: `${stats.totalIncome.toLocaleString()} ₽`, color: 'text-primary' },
    { icon: TrendingDown, label: 'Расходы', value: `${stats.totalExpenses.toLocaleString()} ₽`, color: 'text-destructive' },
    { icon: Banknote, label: 'Прибыль', value: `${(stats.totalIncome - stats.totalExpenses).toLocaleString()} ₽`, color: 'text-primary' },
    { icon: BarChart3, label: 'Ср. цена занятия', value: `${stats.avgLessonPrice.toLocaleString()} ₽`, color: 'text-muted-foreground' },
    { icon: Calendar, label: '% завершения', value: `${stats.completionRate}%`, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Статистика</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
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

      {/* Lesson Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Статусы занятий</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <p className="text-2xl font-bold">{stats.completedLessons}</p>
              <p className="text-sm text-muted-foreground">Проведено</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{stats.totalLessons - stats.completedLessons - stats.cancelledLessons - stats.noShowLessons}</p>
              <p className="text-sm text-muted-foreground">Запланировано</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-destructive/10">
              <p className="text-2xl font-bold">{stats.cancelledLessons}</p>
              <p className="text-sm text-muted-foreground">Отменено</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-accent/10">
              <p className="text-2xl font-bold">{stats.noShowLessons}</p>
              <p className="text-sm text-muted-foreground">Неявка</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeachingStats;
