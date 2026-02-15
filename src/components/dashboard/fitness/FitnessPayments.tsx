import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Check, Clock, AlertCircle } from 'lucide-react';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  unpaid: { label: 'Не оплачено', variant: 'destructive' },
  paid: { label: 'Оплачено', variant: 'default' },
  credited: { label: 'Засчитано', variant: 'secondary' },
};

const FitnessPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchPayments(); }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('teaching_payments')
      .select(`*, lesson_bookings!inner(student_id, lessons!inner(title, lesson_date, start_time, teacher_id), profiles:student_id(first_name, last_name))`)
      .eq('lesson_bookings.lessons.teacher_id', user.id)
      .order('created_at', { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const upd: any = { status };
    if (status === 'paid') upd.paid_at = new Date().toISOString();
    const { error } = await supabase.from('teaching_payments').update(upd).eq('id', id);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Статус обновлён' }); fetchPayments(); }
  };

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const totals = {
    paid: payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
    unpaid: payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + Number(p.amount), 0),
    credited: payments.filter(p => p.status === 'credited').reduce((s, p) => s + Number(p.amount), 0),
  };

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
            const booking = p.lesson_bookings as any;
            const st = statusLabels[p.status] || statusLabels.unpaid;
            return (
              <Card key={p.id}><CardContent className="py-3"><div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{booking?.profiles?.first_name || 'Клиент'} {booking?.profiles?.last_name || ''}</p>
                  <p className="text-sm text-muted-foreground">{booking?.lessons?.title} · {booking?.lessons?.lesson_date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{Number(p.amount).toLocaleString()} ₽</span>
                  <Badge variant={st.variant}>{st.label}</Badge>
                  {p.status === 'unpaid' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'paid')}>Оплачено</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(p.id, 'credited')}>Засчитать</Button>
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

export default FitnessPayments;
