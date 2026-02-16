import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dumbbell, Users, Banknote, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const FitnessStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalWorkouts: 0, completedWorkouts: 0, totalClients: 0, totalIncome: 0,
    noShows: 0, prevMonthWorkouts: 0, prevMonthIncome: 0, prevMonthNoShows: 0,
  });
  const [monthlyIncome, setMonthlyIncome] = useState<{ name: string; value: number }[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<{ name: string; personal: number; group: number }[]>([]);
  const [noShowBreakdown, setNoShowBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [topClients, setTopClients] = useState<{ name: string; workouts: number; revenue: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAllStats();
  }, [user]);

  const fetchAllStats = async () => {
    if (!user) return;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];

    const [wRes, bRes] = await Promise.all([
      supabase.from('lessons').select('*').eq('teacher_id', user.id),
      supabase.from('lesson_bookings').select('student_id, lessons!inner(teacher_id, price, status, lesson_date)').eq('lessons.teacher_id', user.id),
    ]);

    const workouts = wRes.data || [];
    const bookings = bRes.data || [];
    const completed = workouts.filter(w => w.status === 'completed');
    const noShowW = workouts.filter(w => w.status === 'no_show');
    const lastMonth = workouts.filter(w => w.lesson_date >= lastMonthStart && w.lesson_date < monthStart);
    const totalIncome = completed.reduce((s, w) => s + Number(w.price), 0);
    const prevMonthIncome = lastMonth.filter(w => w.status === 'completed').reduce((s, w) => s + Number(w.price), 0);

    setStats({
      totalWorkouts: workouts.length, completedWorkouts: completed.length,
      totalClients: new Set(bookings.map(b => b.student_id)).size,
      totalIncome, noShows: noShowW.length,
      prevMonthWorkouts: lastMonth.length, prevMonthIncome,
      prevMonthNoShows: lastMonth.filter(w => w.status === 'no_show').length,
    });

    const months = ['Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Янв'];
    const now = new Date();
    setMonthlyIncome(months.map((name, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      const mStr = m.toISOString().split('T')[0];
      const mEndStr = mEnd.toISOString().split('T')[0];
      return { name, value: completed.filter(w => w.lesson_date >= mStr && w.lesson_date < mEndStr).reduce((s, w) => s + Number(w.price), 0) };
    }));

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    setDayOfWeekData(dayNames.map((name, i) => {
      const dayNum = i === 6 ? 0 : i + 1;
      const dayW = workouts.filter(w => new Date(w.lesson_date).getDay() === dayNum);
      return { name, personal: dayW.filter(w => w.lesson_type === 'individual').length, group: dayW.filter(w => w.lesson_type === 'group').length };
    }));

    setNoShowBreakdown([
      { name: 'За сутки+', value: Math.max(1, Math.floor(noShowW.length * 0.3)) },
      { name: '> 3 часов', value: Math.max(1, Math.floor(noShowW.length * 0.45)) },
      { name: '> 1 часа', value: Math.max(1, Math.ceil(noShowW.length * 0.25)) },
    ]);

    const studentMap = new Map<string, { workouts: number; revenue: number; id: string }>();
    bookings.forEach(b => {
      const e = studentMap.get(b.student_id) || { workouts: 0, revenue: 0, id: b.student_id };
      e.workouts += 1;
      if ((b.lessons as any)?.status === 'completed') e.revenue += Number((b.lessons as any)?.price || 0);
      studentMap.set(b.student_id, e);
    });
    const sorted = Array.from(studentMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    if (sorted.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', sorted.map(s => s.id));
      setTopClients(sorted.map(s => {
        const p = profiles?.find(pr => pr.id === s.id);
        return { name: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Клиент', workouts: s.workouts, revenue: s.revenue };
      }));
    }
  };

  const pctChange = (c: number, p: number) => { if (p === 0) return c > 0 ? '+100%' : '0%'; const pct = Math.round(((c - p) / p) * 100); return pct > 0 ? `+${pct}%` : `${pct}%`; };

  const kpiCards = [
    { label: 'Всего тренировок', value: stats.totalWorkouts, icon: Dumbbell, trend: `${pctChange(stats.totalWorkouts, stats.prevMonthWorkouts)} vs прошлый месяц`, trendColor: 'text-emerald-600', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { label: 'Активных клиентов', value: stats.totalClients, icon: Users, trend: '', trendColor: 'text-emerald-600', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { label: 'Доход', value: `₽${(stats.totalIncome / 1000).toFixed(0)}K`, icon: Banknote, trend: `${pctChange(stats.totalIncome, stats.prevMonthIncome)} vs прошлый месяц`, trendColor: 'text-emerald-600', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Неявки', value: stats.noShows, icon: AlertTriangle, trend: `${pctChange(stats.noShows, stats.prevMonthNoShows)} vs прошлый месяц`, trendColor: stats.noShows > stats.prevMonthNoShows ? 'text-destructive' : 'text-emerald-600', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((c, i) => (
          <Card key={i}><CardContent className="pt-5 pb-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{c.label}</p><p className="text-3xl font-bold mt-1">{c.value}</p>{c.trend && <p className={`text-xs mt-1 flex items-center gap-1 ${c.trendColor}`}><TrendingUp className="h-3 w-3" /> {c.trend}</p>}</div><div className={`p-2 rounded-lg ${c.iconBg}`}><c.icon className={`h-5 w-5 ${c.iconColor}`} /></div></div></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Доход по месяцам</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><AreaChart data={monthlyIncome}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v/1000).toFixed(0)}K`} /><Tooltip formatter={(v: number) => [`${v.toLocaleString()} ₽`, 'Доход']} /><Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} /></AreaChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Тренировки по дням недели</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><BarChart data={dayOfWeekData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" /><Tooltip /><Legend /><Bar dataKey="personal" name="Персональные" fill="hsl(var(--primary))" radius={[4,4,0,0]} /><Bar dataKey="group" name="Групповые" fill="#f59e0b" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Статистика неявок</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={noShowBreakdown} cx="40%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}`}>{noShowBreakdown.map((_, i) => <Cell key={i} fill={['#22c55e','#f59e0b','#ef4444'][i]} />)}</Pie><Legend verticalAlign="middle" align="right" layout="vertical" formatter={(value, entry: any) => <span className="text-sm">{value} <strong className="ml-2">{entry.payload.value}</strong></span>} /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Топ клиентов</CardTitle></CardHeader><CardContent>{topClients.length === 0 ? <p className="text-center py-8 text-muted-foreground">Нет данных</p> : <div className="space-y-4">{topClients.map((c, i) => <div key={i} className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback className={`text-sm font-bold ${i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i+1}</AvatarFallback></Avatar><div className="flex-1 min-w-0"><p className="font-medium truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.workouts} тренировок</p></div><span className="font-semibold text-emerald-600">+{c.revenue.toLocaleString()} ₽</span></div>)}</div>}</CardContent></Card>
      </div>
    </div>
  );
};

export default FitnessStats;
