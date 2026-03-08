import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Check, Clock, AlertCircle } from 'lucide-react';

interface PaymentRecord {
  id: string;
  source: 'teaching' | 'booking';
  clientName: string;
  serviceName: string;
  date: string;
  amount: number;
  status: string; // paid, unpaid, credited
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  unpaid: { label: 'Не оплачено', variant: 'destructive' },
  paid: { label: 'Оплачено', variant: 'default' },
  credited: { label: 'Засчитано', variant: 'secondary' },
  completed: { label: 'Завершено', variant: 'default' },
};

const UniversalPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchPayments(); }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    setLoading(true);
    const records: PaymentRecord[] = [];

    // Fetch teaching payments
    const { data: tp } = await supabase
      .from('teaching_payments')
      .select(`*, lesson_bookings!inner(student_id, lessons!inner(title, lesson_date, start_time, teacher_id), profiles:student_id(first_name, last_name))`)
      .eq('lesson_bookings.lessons.teacher_id', user.id)
      .order('created_at', { ascending: false });

    (tp || []).forEach(p => {
      const booking = p.lesson_bookings as any;
      records.push({
        id: p.id,
        source: 'teaching',
        clientName: `${booking?.profiles?.first_name || ''} ${booking?.profiles?.last_name || ''}`.trim() || 'Клиент',
        serviceName: booking?.lessons?.title || 'Занятие',
        date: booking?.lessons?.lesson_date || '',
        amount: Number(p.amount),
        status: p.status,
      });
    });

    // Fetch completed marketplace bookings as payment records
    const { data: bk } = await supabase
      .from('bookings')
      .select('id, status, scheduled_at, services!bookings_service_id_fkey(name, price), profiles!bookings_client_id_fkey(first_name, last_name)')
      .eq('executor_id', user.id)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false });

    (bk || []).forEach(b => {
      const svc = b.services as any;
      const prof = b.profiles as any;
      records.push({
        id: b.id,
        source: 'booking',
        clientName: `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Клиент',
        serviceName: svc?.name || 'Услуга',
        date: b.scheduled_at?.split('T')[0] || '',
        amount: Number(svc?.price || 0),
        status: 'paid',
      });
    });

    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPayments(records);
    setLoading(false);
  };

  const updateTeachingPaymentStatus = async (id: string, status: string) => {
    const upd: any = { status };
    if (status === 'paid') upd.paid_at = new Date().toISOString();
    const { error } = await supabase.from('teaching_payments').update(upd).eq('id', id);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Статус обновлён' }); fetchPayments(); }
  };

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const totals = useMemo(() => ({
    paid: payments.filter(p => p.status === 'paid' || p.status === 'completed').reduce((s, p) => s + p.amount, 0),
    unpaid: payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0),
    credited: payments.filter(p => p.status === 'credited').reduce((s, p) => s + p.amount, 0),
  }), [payments]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Оплачено</span></div><p className="text-2xl font-bold mt-1">{totals.paid.toLocaleString()} ₽</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-sm text-muted-foreground">Не оплачено</span></div><p className="text-2xl font-bold mt-1">{totals.unpaid.toLocaleString()} ₽</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Засчитано</span></div><p className="text-2xl font-bold mt-1">{totals.credited.toLocaleString()} ₽</p></CardContent></Card>
      </div>
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Все ({payments.length})</TabsTrigger>
          <TabsTrigger value="unpaid">Не оплачено</TabsTrigger>
          <TabsTrigger value="paid">Оплачено</TabsTrigger>
          <TabsTrigger value="credited">Засчитано</TabsTrigger>
        </TabsList>
      </Tabs>
      {loading ? <p className="text-center py-12 text-muted-foreground">Загрузка...</p> : filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12"><CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">Нет оплат</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const st = statusLabels[p.status] || statusLabels.unpaid;
            return (
              <Card key={p.id}><CardContent className="py-3"><div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.clientName}</p>
                  <p className="text-sm text-muted-foreground">{p.serviceName} · {p.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{p.amount.toLocaleString()} ₽</span>
                  <Badge variant={st.variant}>{st.label}</Badge>
                  {p.status === 'unpaid' && p.source === 'teaching' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateTeachingPaymentStatus(p.id, 'paid')}>Оплачено</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateTeachingPaymentStatus(p.id, 'credited')}>Засчитать</Button>
                    </div>
                  )}
                </div>
              </div></CardContent></Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UniversalPayments;
