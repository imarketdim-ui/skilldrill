import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedBookings, getUniqueClients } from '@/hooks/useUnifiedBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, Banknote, Calendar, Clock } from 'lucide-react';
import { CategoryConfig } from './categoryConfig';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import MasterTopServices from './MasterTopServices';
import MasterReviewsWidget from './MasterReviewsWidget';

interface Props { config: CategoryConfig; }

const UniversalStats = ({ config }: Props) => {
  const { user } = useAuth();
  const { bookings, loading } = useUnifiedBookings(user?.id);
  const [period, setPeriod] = useState('all');

  const filtered = useMemo(() => {
    if (period === 'all') return bookings;
    const now = new Date();
    let from: Date;
    if (period === 'today') from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === 'week') from = subDays(now, 7);
    else from = startOfMonth(now);
    return bookings.filter(b => new Date(b.date) >= from);
  }, [bookings, period]);

  const stats = useMemo(() => {
    const completed = filtered.filter(b => b.status === 'completed');
    const cancelled = filtered.filter(b => b.status === 'cancelled');
    const noShow = filtered.filter(b => b.status === 'no_show');
    const clients = getUniqueClients(filtered);
    const totalIncome = completed.reduce((s, b) => s + b.price, 0);

    let totalWorkMinutes = 0;
    completed.forEach(b => {
      if (b.startTime && b.endTime) {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        totalWorkMinutes += (eh * 60 + em) - (sh * 60 + sm);
      } else if (b.durationMinutes) {
        totalWorkMinutes += b.durationMinutes;
      }
    });

    return {
      totalSessions: filtered.length,
      completedSessions: completed.length,
      cancelledSessions: cancelled.length,
      noShowSessions: noShow.length,
      totalClients: clients.length,
      totalIncome,
      avgPrice: completed.length > 0 ? Math.round(totalIncome / completed.length) : 0,
      completionRate: filtered.length > 0 ? Math.round((completed.length / filtered.length) * 100) : 0,
      totalWorkHours: Math.round(totalWorkMinutes / 60),
    };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    const completed = bookings.filter(b => b.status === 'completed');
    return months.map(m => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const mCompleted = completed.filter(b => {
        const d = new Date(b.date);
        return d >= mStart && d <= mEnd;
      });
      const mAll = bookings.filter(b => {
        const d = new Date(b.date);
        return d >= mStart && d <= mEnd;
      });
      const clientIds = new Set(mAll.filter(b => b.clientId).map(b => b.clientId));
      return {
        month: format(m, 'LLL', { locale: ru }),
        income: mCompleted.reduce((s, b) => s + b.price, 0),
        sessions: mCompleted.length,
        clients: clientIds.size,
      };
    });
  }, [bookings]);

  const IconComponent = config.icon;
  const cards = [
    { icon: IconComponent, label: `Всего ${config.sessionNamePlural}`, value: stats.totalSessions, color: 'text-primary' },
    { icon: Calendar, label: 'Завершено', value: stats.completedSessions, color: 'text-primary' },
    { icon: Users, label: config.clientNamePlural, value: stats.totalClients, color: 'text-primary' },
    { icon: Clock, label: 'Часов работы', value: stats.totalWorkHours, color: 'text-primary' },
    { icon: TrendingUp, label: 'Доход', value: `${stats.totalIncome.toLocaleString()} ₽`, color: 'text-primary' },
    { icon: Banknote, label: 'Ср. цена', value: `${stats.avgPrice.toLocaleString()} ₽`, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Статистика</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Сегодня</SelectItem>
            <SelectItem value="week">Неделя</SelectItem>
            <SelectItem value="month">Месяц</SelectItem>
            <SelectItem value="all">Всё время</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/10"><p className="text-2xl font-bold">{stats.completedSessions}</p><p className="text-sm text-muted-foreground">Завершено</p></div>
            <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold">{stats.totalSessions - stats.completedSessions - stats.cancelledSessions - stats.noShowSessions}</p><p className="text-sm text-muted-foreground">Запланировано</p></div>
            <div className="text-center p-4 rounded-lg bg-destructive/10"><p className="text-2xl font-bold">{stats.cancelledSessions}</p><p className="text-sm text-muted-foreground">Отменено</p></div>
            <div className="text-center p-4 rounded-lg bg-accent/10"><p className="text-2xl font-bold">{stats.noShowSessions}</p><p className="text-sm text-muted-foreground">Неявка</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <MasterTopServices bookings={filtered} />
        <MasterReviewsWidget />
      </div>

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