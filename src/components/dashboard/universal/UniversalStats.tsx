import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, BarChart3, Banknote, Calendar } from 'lucide-react';
import { CategoryConfig } from './categoryConfig';

interface Props { config: CategoryConfig; }

const UniversalStats = ({ config }: Props) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0, completedSessions: 0, cancelledSessions: 0, noShowSessions: 0,
    totalClients: 0, totalIncome: 0, totalExpenses: 0, avgPrice: 0, completionRate: 0,
  });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [sRes, bRes, eRes] = await Promise.all([
        supabase.from('lessons').select('*').eq('teacher_id', user.id),
        supabase.from('lesson_bookings').select('student_id, lesson_id, lessons!inner(teacher_id)').eq('lessons.teacher_id', user.id),
        supabase.from('teaching_expenses').select('amount').eq('teacher_id', user.id),
      ]);
      const sessions = sRes.data || [];
      const bookings = bRes.data || [];
      const expenses = eRes.data || [];
      const completed = sessions.filter(s => s.status === 'completed');
      const totalIncome = completed.reduce((s, l) => s + Number(l.price), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      setStats({
        totalSessions: sessions.length,
        completedSessions: completed.length,
        cancelledSessions: sessions.filter(s => s.status === 'cancelled').length,
        noShowSessions: sessions.filter(s => s.status === 'no_show').length,
        totalClients: new Set(bookings.map(b => b.student_id)).size,
        totalIncome, totalExpenses,
        avgPrice: completed.length > 0 ? Math.round(totalIncome / completed.length) : 0,
        completionRate: sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0,
      });
    };
    fetchStats();
  }, [user]);

  const IconComponent = config.icon;
  const cards = [
    { icon: IconComponent, label: `Всего ${config.sessionNamePlural}`, value: stats.totalSessions, color: 'text-primary' },
    { icon: Calendar, label: 'Завершено', value: stats.completedSessions, color: 'text-primary' },
    { icon: Users, label: config.clientNamePlural, value: stats.totalClients, color: 'text-primary' },
    { icon: TrendingUp, label: 'Доход', value: `${stats.totalIncome.toLocaleString()} ₽`, color: 'text-primary' },
    { icon: TrendingDown, label: 'Расходы', value: `${stats.totalExpenses.toLocaleString()} ₽`, color: 'text-destructive' },
    { icon: Banknote, label: 'Прибыль', value: `${(stats.totalIncome - stats.totalExpenses).toLocaleString()} ₽`, color: 'text-primary' },
    { icon: BarChart3, label: 'Ср. цена', value: `${stats.avgPrice.toLocaleString()} ₽`, color: 'text-muted-foreground' },
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
        <CardHeader><CardTitle>Статусы</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/10"><p className="text-2xl font-bold">{stats.completedSessions}</p><p className="text-sm text-muted-foreground">Завершено</p></div>
            <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold">{stats.totalSessions - stats.completedSessions - stats.cancelledSessions - stats.noShowSessions}</p><p className="text-sm text-muted-foreground">Запланировано</p></div>
            <div className="text-center p-4 rounded-lg bg-destructive/10"><p className="text-2xl font-bold">{stats.cancelledSessions}</p><p className="text-sm text-muted-foreground">Отменено</p></div>
            <div className="text-center p-4 rounded-lg bg-accent/10"><p className="text-2xl font-bold">{stats.noShowSessions}</p><p className="text-sm text-muted-foreground">Неявка</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UniversalStats;
