import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Banknote } from 'lucide-react';
import { format } from 'date-fns';

const categories = [
  'Аренда зала',
  'Оборудование',
  'Спортивное питание',
  'Транспорт',
  'Подписки и сертификация',
  'Маркетинг',
  'Прочее',
];

const FitnessExpenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: '', amount: 0, description: '', expense_date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => { if (user) fetchExpenses(); }, [user]);

  const fetchExpenses = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('teaching_expenses').select('*').eq('teacher_id', user.id).order('expense_date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !form.category || !form.amount) return;
    const { error } = await supabase.from('teaching_expenses').insert({
      teacher_id: user.id, category: form.category, amount: form.amount,
      description: form.description || null, expense_date: form.expense_date,
    });
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Расход добавлен' }); setIsOpen(false); setForm({ category: '', amount: 0, description: '', expense_date: format(new Date(), 'yyyy-MM-dd') }); fetchExpenses(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('teaching_expenses').delete().eq('id', id);
    toast({ title: 'Расход удалён' }); fetchExpenses();
  };

  const totalByCategory = categories.map(cat => ({ category: cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0) })).filter(c => c.total > 0);
  const grandTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Расходы</h3><p className="text-sm text-muted-foreground">Итого: {grandTotal.toLocaleString()} ₽</p></div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить расход</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый расход</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Категория *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Сумма (₽) *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Дата</Label><Input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Описание</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Добавить</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {totalByCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {totalByCategory.map(c => <Badge key={c.category} variant="secondary" className="text-sm">{c.category}: {c.total.toLocaleString()} ₽</Badge>)}
        </div>
      )}

      {loading ? <p className="text-center py-12 text-muted-foreground">Загрузка...</p> : expenses.length === 0 ? (
        <Card><CardContent className="text-center py-12"><Banknote className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">Нет расходов</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {expenses.map(e => (
            <Card key={e.id}><CardContent className="py-3"><div className="flex items-center justify-between">
              <div><div className="flex items-center gap-2"><Badge variant="outline">{e.category}</Badge><span className="text-sm text-muted-foreground">{e.expense_date}</span></div>{e.description && <p className="text-sm mt-1">{e.description}</p>}</div>
              <div className="flex items-center gap-2"><span className="font-bold">{Number(e.amount).toLocaleString()} ₽</span><Button size="icon" variant="ghost" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div></CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FitnessExpenses;
