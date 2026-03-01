import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, TrendingDown, CalendarDays, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const categories = ['Аренда зала', 'Оборудование', 'Спортивное питание', 'Транспорт', 'Подписки и сертификация', 'Маркетинг', 'Прочее'];

const FitnessExpenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: '', amount: '', description: '', expense_date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => { if (user) fetchExpenses(); }, [user]);

  const fetchExpenses = async () => {
    if (!user) return; setLoading(true);
    const { data } = await supabase.from('teaching_expenses').select('*').eq('teacher_id', user.id).order('expense_date', { ascending: false });
    setExpenses(data || []); setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !form.category || !Number(form.amount)) return;
    const { error } = await supabase.from('teaching_expenses').insert({ teacher_id: user.id, category: form.category, amount: Number(form.amount), description: form.description || null, expense_date: form.expense_date });
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Расход добавлен' }); setIsOpen(false); setForm({ category: '', amount: '', description: '', expense_date: format(new Date(), 'yyyy-MM-dd') }); fetchExpenses(); }
  };

  const handleDelete = async (id: string) => { await supabase.from('teaching_expenses').delete().eq('id', id); toast({ title: 'Расход удалён' }); fetchExpenses(); };

  const grandTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const now = new Date();
  const monthTotal = expenses.filter(e => { const d = new Date(e.expense_date); return d >= startOfMonth(now) && d <= endOfMonth(now); }).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Расходы</h2><p className="text-sm text-muted-foreground">Учёт затрат на деятельность</p></div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Добавить расход</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый расход</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Категория *</Label><Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Сумма (₽) *</Label><Input type="text" inputMode="numeric" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value.replace(/[^\d.]/g, '') }))} /></div>
                <div className="space-y-2"><Label>Дата</Label><Input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Описание</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Добавить</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="pt-5 pb-5"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-destructive/10"><TrendingDown className="h-5 w-5 text-destructive" /></div><div><p className="text-3xl font-bold">{grandTotal.toLocaleString()} ₽</p><p className="text-sm text-muted-foreground">Всего расходов</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-amber-100"><CalendarDays className="h-5 w-5 text-amber-600" /></div><div><p className="text-3xl font-bold">{monthTotal.toLocaleString()} ₽</p><p className="text-sm text-muted-foreground">За текущий месяц</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>История расходов</CardTitle><CardDescription>Все записи о расходах</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : expenses.length === 0 ? <p className="text-center py-8 text-muted-foreground">Нет расходов</p> : (
            <div className="space-y-2">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div><div className="flex items-center gap-2"><Badge variant="outline">{e.category}</Badge><span className="text-sm text-muted-foreground">{e.expense_date}</span></div>{e.description && <p className="text-sm mt-1 text-muted-foreground">{e.description}</p>}</div>
                  <div className="flex items-center gap-3"><span className="font-bold text-lg">{Number(e.amount).toLocaleString()} ₽</span><Button size="icon" variant="ghost" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FitnessExpenses;
