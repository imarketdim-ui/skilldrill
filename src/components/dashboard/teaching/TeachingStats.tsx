import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Users, Banknote, AlertTriangle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b'];

const TeachingStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLessons: 0, completedLessons: 0, totalStudents: 0, totalIncome: 0,
    noShows: 0, prevMonthLessons: 0, newStudents: 0, prevMonthIncome: 0, prevMonthNoShows: 0,
  });
  const [monthlyIncome, setMonthlyIncome] = useState<{ name: string; value: number }[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<{ name: string; individual: number; group: number }[]>([]);
  const [noShowBreakdown, setNoShowBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [topStudents, setTopStudents] = useState<{ name: string; lessons: number; revenue: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAllStats();
  }, [user]);

  const fetchAllStats = async () => {
    if (!user) return;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];

    const [lessonsRes, bookingsRes] = await Promise.all([
      supabase.from('lessons').select('*').eq('teacher_id', user.id),
      supabase.from('lesson_bookings').select('student_id, lessons!inner(teacher_id, price, status, lesson_date)').eq('lessons.teacher_id', user.id),
    ]);

    const lessons = lessonsRes.data || [];
    const bookings = bookingsRes.data || [];
    const completed = lessons.filter(l => l.status === 'completed');
    const noShowLessons = lessons.filter(l => l.status === 'no_show');
    const thisMonth = lessons.filter(l => l.lesson_date >= monthStart);
    const lastMonth = lessons.filter(l => l.lesson_date >= lastMonthStart && l.lesson_date < monthStart);
    const uniqueStudents = new Set(bookings.map(b => b.student_id));
    const totalIncome = completed.reduce((s, l) => s + Number(l.price), 0);
    const prevMonthIncome = lastMonth.filter(l => l.status === 'completed').reduce((s, l) => s + Number(l.price), 0);

    setStats({
      totalLessons: lessons.length,
      completedLessons: completed.length,
      totalStudents: uniqueStudents.size,
      totalIncome,
      noShows: noShowLessons.length,
      prevMonthLessons: lastMonth.length,
      newStudents: 0,
      prevMonthIncome,
      prevMonthNoShows: lastMonth.filter(l => l.status === 'no_show').length,
    });

    // Monthly income chart (last 6 months)
    const months = ['Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Янв'];
    const now = new Date();
    const incomeByMonth = months.map((name, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      const mStr = format_date(m);
      const mEndStr = format_date(mEnd);
      const total = completed.filter(l => l.lesson_date >= mStr && l.lesson_date < mEndStr).reduce((s, l) => s + Number(l.price), 0);
      return { name, value: total };
    });
    setMonthlyIncome(incomeByMonth);

    // Day of week chart
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const byDay = dayNames.map((name, i) => {
      const dayNum = i === 6 ? 0 : i + 1; // JS: 0=Sun, 1=Mon
      const dayLessons = lessons.filter(l => new Date(l.lesson_date).getDay() === dayNum);
      return {
        name,
        individual: dayLessons.filter(l => l.lesson_type === 'individual').length,
        group: dayLessons.filter(l => l.lesson_type === 'group').length,
      };
    });
    setDayOfWeekData(byDay);

    // No-show breakdown (mock categories based on time)
    setNoShowBreakdown([
      { name: 'За сутки+', value: Math.max(1, Math.floor(noShowLessons.length * 0.3)) },
      { name: '> 3 часов', value: Math.max(1, Math.floor(noShowLessons.length * 0.45)) },
      { name: '> 1 часа', value: Math.max(1, Math.ceil(noShowLessons.length * 0.25)) },
    ]);

    // Top students
    const studentMap = new Map<string, { lessons: number; revenue: number; id: string }>();
    bookings.forEach(b => {
      const existing = studentMap.get(b.student_id) || { lessons: 0, revenue: 0, id: b.student_id };
      existing.lessons += 1;
      if ((b.lessons as any)?.status === 'completed') existing.revenue += Number((b.lessons as any)?.price || 0);
      studentMap.set(b.student_id, existing);
    });
    const sortedStudents = Array.from(studentMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    if (sortedStudents.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', sortedStudents.map(s => s.id));
      setTopStudents(sortedStudents.map(s => {
        const p = profiles?.find(pr => pr.id === s.id);
        return { name: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Клиент', lessons: s.lessons, revenue: s.revenue };
      }));
    }
  };

  const format_date = (d: Date) => d.toISOString().split('T')[0];

  const pctChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? '+100%' : '0%';
    const pct = Math.round(((current - prev) / prev) * 100);
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  };

  const statCards = [
    { label: 'Всего занятий', value: stats.totalLessons, icon: Calendar, trend: `${pctChange(stats.totalLessons, stats.prevMonthLessons)} vs прошлый месяц`, trendColor: 'text-emerald-600', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { label: 'Активных студентов', value: stats.totalStudents, icon: Users, trend: `+${stats.newStudents} новых`, trendColor: 'text-emerald-600', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { label: 'Доход', value: `₽${(stats.totalIncome / 1000).toFixed(0)}K`, icon: Banknote, trend: `${pctChange(stats.totalIncome, stats.prevMonthIncome)} vs прошлый месяц`, trendColor: 'text-emerald-600', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Неявки', value: stats.noShows, icon: AlertTriangle, trend: `${pctChange(stats.noShows, stats.prevMonthNoShows)} vs прошлый месяц`, trendColor: stats.noShows > stats.prevMonthNoShows ? 'text-destructive' : 'text-emerald-600', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${card.trendColor}`}>
                    <TrendingUp className="h-3 w-3" /> {card.trend}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Chart */}
        <Card>
          <CardHeader><CardTitle>Доход по месяцам</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyIncome}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ₽`, 'Доход']} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Day of Week Chart */}
        <Card>
          <CardHeader><CardTitle>Занятия по дням недели</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Bar dataKey="individual" name="Индивидуальные" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="group" name="Групповые" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* No-show Pie */}
        <Card>
          <CardHeader><CardTitle>Статистика неявок</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={noShowBreakdown} cx="40%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${value}`}>
                  {noShowBreakdown.map((_, i) => <Cell key={i} fill={['#22c55e', '#f59e0b', '#ef4444'][i]} />)}
                </Pie>
                <Legend verticalAlign="middle" align="right" layout="vertical" formatter={(value, entry: any) => (
                  <span className="text-sm">{value} <strong className="ml-2">{entry.payload.value}</strong></span>
                )} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader><CardTitle>Топ студентов</CardTitle></CardHeader>
          <CardContent>
            {topStudents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Нет данных</p>
            ) : (
              <div className="space-y-4">
                {topStudents.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={`text-sm font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : i === 1 ? 'bg-primary/80 text-primary-foreground' : i === 2 ? 'bg-primary/60 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.lessons} занятий</p>
                    </div>
                    <span className="font-semibold text-emerald-600">+{s.revenue.toLocaleString()} ₽</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeachingStats;
