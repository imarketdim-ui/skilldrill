import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Check, X, AlertTriangle, Download, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const FitnessPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchPayments(); }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('teaching_payments')
      .select(`*, lesson_bookings!inner(student_id, lessons!inner(title, lesson_date, start_time, lesson_type, teacher_id), profiles:student_id(first_name, last_name))`)
      .eq('lesson_bookings.lessons.teacher_id', user.id).order('created_at', { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const upd: any = { status }; if (status === 'paid') upd.paid_at = new Date().toISOString();
    const { error } = await supabase.from('teaching_payments').update(upd).eq('id', id);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Статус обновлён' }); fetchPayments(); }
  };

  const totals = {
    paid: payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
    unpaid: payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + Number(p.amount), 0),
    credited: payments.filter(p => p.status === 'credited').reduce((s, p) => s + Number(p.amount), 0),
  };

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const b = p.lesson_bookings as any;
    return `${b?.profiles?.first_name || ''} ${b?.profiles?.last_name || ''}`.toLowerCase().includes(q);
  });

  const getInitials = (f?: string, l?: string) => `${(f || '')[0] || ''}${(l || '')[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Оплаты</h2><p className="text-sm text-muted-foreground">Учёт платежей за тренировки</p></div><Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Экспорт</Button></div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5 pb-5"><div className="flex items-center gap-2 mb-1"><Check className="h-4 w-4 text-emerald-600" /><span className="text-sm text-emerald-600 font-medium">Оплачено</span></div><p className="text-3xl font-bold">{totals.paid.toLocaleString()} ₽</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><div className="flex items-center gap-2 mb-1"><X className="h-4 w-4 text-destructive" /><span className="text-sm text-destructive font-medium">Не оплачено</span></div><p className="text-3xl font-bold">{totals.unpaid.toLocaleString()} ₽</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-sm text-amber-600 font-medium">Засчитано</span></div><p className="text-3xl font-bold">{totals.credited.toLocaleString()} ₽</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск по клиенту..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Фильтры</Button>
      </div>

      {loading ? <p className="text-center py-12 text-muted-foreground">Загрузка...</p> : filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12"><CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">Нет оплат</p></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Клиент</TableHead><TableHead>Дата</TableHead><TableHead>Тип</TableHead><TableHead>Сумма</TableHead><TableHead>Статус</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(p => {
            const b = p.lesson_bookings as any; const l = b?.lessons; const s = b?.profiles;
            return (
              <TableRow key={p.id}>
                <TableCell><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(s?.first_name, s?.last_name)}</AvatarFallback></Avatar><span className="font-medium">{s?.first_name || 'Клиент'} {s?.last_name || ''}</span></div></TableCell>
                <TableCell className="text-muted-foreground">{l?.lesson_date ? format(new Date(l.lesson_date), 'd MMM', { locale: ru }) : '—'}, {l?.start_time?.slice(0, 5)}</TableCell>
                <TableCell><Badge variant={l?.lesson_type === 'group' ? 'secondary' : 'outline'} className="text-xs">{l?.lesson_type === 'group' ? 'Групповая' : 'Персон.'}</Badge></TableCell>
                <TableCell className="font-semibold">{Number(p.amount).toLocaleString()} ₽</TableCell>
                <TableCell>
                  {p.status === 'paid' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1"><Check className="h-3 w-3" /> Оплачено</Badge>}
                  {p.status === 'unpaid' && <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> Не оплачено</Badge>}
                  {p.status === 'credited' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><AlertTriangle className="h-3 w-3" /> Засчитано</Badge>}
                </TableCell>
                <TableCell className="text-right">{p.status === 'unpaid' && <Button size="sm" onClick={() => updateStatus(p.id, 'paid')}>Оплачено</Button>}</TableCell>
              </TableRow>
            );
          })}
        </TableBody></Table></CardContent></Card>
      )}
    </div>
  );
};

export default FitnessPayments;
