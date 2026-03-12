import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  bookings: any[];
}

const MasterTopServices = ({ bookings }: Props) => {
  const topServices = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    bookings.filter(b => b.status === 'completed').forEach(b => {
      const key = b.serviceId || b.serviceName;
      if (!map[key]) map[key] = { name: b.serviceName || 'Услуга', count: 0, revenue: 0 };
      map[key].count++;
      map[key].revenue += b.price || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [bookings]);

  if (topServices.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Топ услуг</CardTitle></CardHeader>
        <CardContent><p className="text-center py-8 text-muted-foreground">Нет данных</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Топ услуг</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topServices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" width={120} className="text-xs" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [value, 'Записей']} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {topServices.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                <span className="truncate">{s.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-medium">{s.count} зап.</span>
                <span className="text-muted-foreground ml-2">{s.revenue.toLocaleString()} ₽</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MasterTopServices;
