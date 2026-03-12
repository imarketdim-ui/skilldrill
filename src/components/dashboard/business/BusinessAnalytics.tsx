import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, TrendingUp, Download, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  businessId: string;
}

const BusinessAnalytics = ({ businessId }: Props) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [bRes, mRes] = await Promise.all([
        supabase.from('bookings')
          .select('*, services(name, price), profiles:client_id(first_name, last_name)')
          .eq('organization_id', businessId)
          .order('scheduled_at', { ascending: false }),
        supabase.from('business_masters')
          .select('master_id, profile:profiles!business_masters_master_id_fkey(first_name, last_name)')
          .eq('business_id', businessId).eq('status', 'accepted'),
      ]);
      setBookings(bRes.data || []);
      setMasters((mRes.data || []).map((m: any) => ({
        id: m.master_id,
        name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim(),
      })));
      setLoading(false);
    };
    fetch();
  }, [businessId]);

  const filtered = useMemo(() => {
    const now = new Date();
    let from: Date;
    if (period === 'week') from = subDays(now, 7);
    else if (period === 'month') from = startOfMonth(now);
    else from = new Date(now.getFullYear(), 0, 1);
    return bookings.filter(b => new Date(b.scheduled_at) >= from);
  }, [bookings, period]);

  const totalRevenue = useMemo(() =>
    filtered.filter(b => b.status === 'completed').reduce((s, b) => s + (b.services?.price || 0), 0),
  [filtered]);

  // Team efficiency: revenue and count per master
  const teamEfficiency = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; count: number; avgRating: number }> = {};
    filtered.filter(b => b.status === 'completed').forEach(b => {
      if (!map[b.executor_id]) {
        const m = masters.find(m => m.id === b.executor_id);
        map[b.executor_id] = { name: m?.name || 'Мастер', revenue: 0, count: 0, avgRating: 0 };
      }
      map[b.executor_id].revenue += b.services?.price || 0;
      map[b.executor_id].count++;
    });
    return Object.entries(map).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, masters]);

  // Client retention: % of clients who booked more than once
  const retention = useMemo(() => {
    const clientCounts: Record<string, number> = {};
    filtered.forEach(b => {
      clientCounts[b.client_id] = (clientCounts[b.client_id] || 0) + 1;
    });
    const total = Object.keys(clientCounts).length;
    const returning = Object.values(clientCounts).filter(c => c > 1).length;
    return total > 0 ? Math.round((returning / total) * 100) : 0;
  }, [filtered]);

  const exportData = (fmt: 'csv' | 'json') => {
    const rows = filtered.map(b => ({
      date: b.scheduled_at,
      client: `${(b.profiles as any)?.first_name || ''} ${(b.profiles as any)?.last_name || ''}`.trim(),
      service: b.services?.name || '',
      price: b.services?.price || 0,
      status: b.status,
      is_paid: b.is_paid ? 'Да' : 'Нет',
    }));

    let content: string;
    let mime: string;
    let ext: string;

    if (fmt === 'csv') {
      const header = 'Дата,Клиент,Услуга,Цена,Статус,Оплачено\n';
      content = header + rows.map(r => `${r.date},${r.client},${r.service},${r.price},${r.status},${r.is_paid}`).join('\n');
      mime = 'text/csv';
      ext = 'csv';
    } else {
      content = JSON.stringify(rows, null, 2);
      mime = 'application/json';
      ext = 'json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${period}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-center py-10 text-muted-foreground">Загрузка аналитики...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Аналитика
        </h2>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="year">Год</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportData('json')}>
            <Download className="h-4 w-4 mr-1" /> JSON
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{totalRevenue.toLocaleString()} ₽</p>
            <p className="text-xs text-muted-foreground">Общая выручка</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{new Set(filtered.map(b => b.client_id)).size}</p>
            <p className="text-xs text-muted-foreground">Уникальных клиентов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-xl font-bold">{retention}%</p>
            <p className="text-xs text-muted-foreground">Удержание клиентов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-xl font-bold">{filtered.filter(b => b.status === 'completed').length}</p>
            <p className="text-xs text-muted-foreground">Завершённых записей</p>
          </CardContent>
        </Card>
      </div>

      {/* Team efficiency */}
      {teamEfficiency.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Эффективность команды</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ₽`, 'Выручка']} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {teamEfficiency.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{i + 1}</Badge>
                    <span>{m.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{m.revenue.toLocaleString()} ₽</span>
                    <span className="text-muted-foreground ml-2">({m.count} зап.)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction log */}
      <Card>
        <CardHeader><CardTitle className="text-base">Финансовый отчёт</CardTitle></CardHeader>
        <CardContent>
          {filtered.filter(b => b.status === 'completed').length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Нет завершённых записей за период</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.filter(b => b.status === 'completed').map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{b.services?.name || 'Услуга'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.scheduled_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                      {' · '}
                      {(b.profiles as any)?.first_name} {(b.profiles as any)?.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.is_paid && <Badge variant="secondary" className="text-xs">Оплачено</Badge>}
                    <span className="font-medium">{(b.services?.price || 0).toLocaleString()} ₽</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessAnalytics;
