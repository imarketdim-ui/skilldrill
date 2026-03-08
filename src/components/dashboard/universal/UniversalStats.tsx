import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, BarChart3, Banknote, Calendar, Clock } from 'lucide-react';
import { CategoryConfig } from './categoryConfig';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

interface Props { config: CategoryConfig; }

const UniversalStats = ({ config }: Props) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0, completedSessions: 0, cancelledSessions: 0, noShowSessions: 0,
    totalClients: 0, totalIncome: 0, totalExpenses: 0, avgPrice: 0, completionRate: 0,
    totalWorkHours: 0,
  });
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; sessions: number; clients: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [sRes, bRes, eRes] = await Promise.all([
        supabase.from('lessons').select('*').eq('teacher_id', user.id),
        supabase.from('lesson_bookings').select('student_id, lesson_id, lessons!inner(teacher_id, lesson_date, price, status)').eq('lessons.teacher_id', user.id),
        supabase.from('teaching_expenses').select('amount').eq('teacher_id', user.id),
      ]);
      const sessions = sRes.data || [];
      const bookings = bRes.data || [];
      const expenses = eRes.data || [];
      const completed = sessions.filter(s => s.status === 'completed');
      const totalIncome = completed.reduce((s, l) => s + Number(l.price), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

      // Calculate total work hours from completed sessions
      const totalWorkMinutes = completed.reduce((s, l) => {
        const start = l.start_time;
        const end = l.end_time;
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          return s + (eh * 60 + em) - (sh * 60 + sm);
        }
        return s;
      }, 0);

      setStats({
        totalSessions: sessions.length,
        completedSessions: completed.length,
        cancelledSessions: sessions.filter(s => s.status === 'cancelled').length,
        noShowSessions: sessions.filter(s => s.status === 'no_show').length,
        totalClients: new Set(bookings.map(b => b.student_id)).size,
        totalIncome, totalExpenses,
        avgPrice: completed.length > 0 ? Math.round(totalIncome / completed.length) : 0,
        completionRate: sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0,
        totalWorkHours: Math.round(totalWorkMinutes / 60),
      });

      // Monthly breakdown (last 6 months)
      const now = new Date();
      const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
      const monthly = months.map(m => {
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        const mSessions = completed.filter(s => {
          const d = new Date(s.lesson_date);
          return d >= mStart && d <= mEnd;
        });
        const mBookings = bookings.filter(b => {
          const d = new Date((b.lessons as any)?.lesson_date);
          return d >= mStart && d <= mEnd;
        });
        return {
          month: format(m, 'LLL', { locale: ru }),
          income: mSessions.reduce((s, l) => s + Number(l.price), 0),
          sessions: mSessions.length,
          clients: new Set(mBookings.map(b => b.student_id)).size,
        };
      });
      setMonthlyData(monthly);
    };
    fetchStats();
  }, [user]);

  const IconComponent = config.icon;
  const cards = [
    { icon: IconComponent, label: `Всего ${config.sessionNamePlural}`, value: stats.totalSessions, color: 'text-primary' },
    { icon: Calendar, label: 'Завершено', value: stats.completedSessions, color: 'text-primary' },
    { icon: Users, label: config.clientNamePlural, value: stats.totalClients, color: 'text-primary' },
    { icon: Clock, label: 'Часов работы', value: stats.totalWorkHours, color: 'text-primary' },
    { icon: TrendingUp, label: 'Доход', value: `${stats.totalIncome.toLocaleString()} ₽`, color: 'text-primary' },
    { icon: TrendingDown, label: 'Расходы', value: `${stats.totalExpenses.toLocaleString()} ₽`, color: 'text-destructive' },
    { icon: Banknote, label: 'Прибыль', value: `${(stats.totalIncome - stats.totalExpenses).toLocaleString()} ₽`, color: 'text-primary' },
    { icon: BarChart3, label: 'Ср. цена', value: `${stats.avgPrice.toLocaleString()} ₽`, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Статистика</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Card key={i}><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><c.icon className={`h-5 w-5 ${c.color}`} /></div>
            <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-muted-foreground">{c.label}</p></div>
          </div></CardContent></Card>
        ))}
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader><CardTitle>Статусы</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/10"><p className="text-2xl font-bold">{stats.completedSessions}</p><p className="text-sm text-muted-foreground">Завершено</p></div>
            <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold">{stats.totalSessions - stats.completedSessions - stats.cancelledSessions - stats.noShowSessions}</p><p className="text-sm text-muted-foreground">Запланировано</p></div>
            <div className="text-center p-4 rounded-lg bg-destructive/10"><p className="text-2xl font-bold">{stats.cancelledSessions}</p><p className="text-sm text-muted-foreground">Отменено</p></div>
            <div className="text-center p-4 rounded-lg bg-accent/10"><p className="text-2xl font-bold">{stats.noShowSessions}</p><p className="text-sm text-muted-foreground">Неявка</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly income chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Доход по месяцам</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ₽`, 'Доход']} />
                  <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly clients chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Загрузка по месяцам</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" name="Сессии" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="clients" name="Клиенты" stroke="hsl(var(--accent-foreground))" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion rate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Процент завершения</p>
            <p className="text-2xl font-bold">{stats.completionRate}%</p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.completionRate}%` }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UniversalStats;
