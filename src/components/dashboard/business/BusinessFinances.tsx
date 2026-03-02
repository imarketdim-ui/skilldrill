import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Plus, ArrowUpRight, ArrowDownRight,
  BarChart3, Users, Calendar, Loader2
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const expenseCategories = [
  'Аренда', 'Зарплата', 'Материалы', 'Реклама', 'Коммунальные', 'Оборудование', 'Налоги', 'Другое'
];
const incomeCategories = [
  'Услуги', 'Продажа товаров', 'Другое'
];

interface Props {
  businessId: string;
}

const BusinessFinances = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');
  const [finances, setFinances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<'income' | 'expense'>('expense');
  const [form, setForm] = useState({ amount: '', category: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), master_id: '' });
  const [masters, setMasters] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState('month');

  useEffect(() => { fetchData(); }, [businessId]);

  const fetchData = async () => {
    setLoading(true);
    const [finRes, masterRes] = await Promise.all([
      supabase.from('business_finances').select('*').eq('business_id', businessId).order('date', { ascending: false }),
      supabase.from('business_masters')
        .select('master_id, profile:profiles!business_masters_master_id_fkey(first_name, last_name, skillspot_id)')
        .eq('business_id', businessId).eq('status', 'accepted'),
    ]);
    setFinances(finRes.data || []);
    setMasters((masterRes.data || []).map((m: any) => ({
      id: m.master_id,
      name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim(),
      skillspot_id: m.profile?.skillspot_id,
    })));
    setLoading(false);
  };

  const filteredFinances = useMemo(() => {
    const now = new Date();
    let from: Date;
    if (period === 'week') from = subDays(now, 7);
    else if (period === 'month') from = startOfMonth(now);
    else from = new Date(now.getFullYear(), 0, 1);
    return finances.filter(f => new Date(f.date) >= from);
  }, [finances, period]);

  const totals = useMemo(() => {
    const income = filteredFinances.filter(f => f.type === 'income').reduce((s, f) => s + Number(f.amount), 0);
    const expense = filteredFinances.filter(f => f.type === 'expense').reduce((s, f) => s + Number(f.amount), 0);
    return { income, expense, profit: income - expense };
  }, [filteredFinances]);

  const masterBreakdown = useMemo(() => {
    const map: Record<string, { name: string; income: number; expense: number }> = {};
    filteredFinances.forEach(f => {
      if (!f.master_id) return;
      const m = masters.find(m => m.id === f.master_id);
      if (!map[f.master_id]) map[f.master_id] = { name: m?.name || 'Неизвестный', income: 0, expense: 0 };
      if (f.type === 'income') map[f.master_id].income += Number(f.amount);
      else map[f.master_id].expense += Number(f.amount);
    });
    return Object.entries(map).map(([id, v]) => ({ id, ...v, profit: v.income - v.expense }));
  }, [filteredFinances, masters]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredFinances.forEach(f => {
      const key = `${f.type === 'income' ? '📈' : '📉'} ${f.category}`;
      map[key] = (map[key] || 0) + Number(f.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredFinances]);

  const openAdd = (type: 'income' | 'expense') => {
    setAddType(type);
    setForm({ amount: '', category: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), master_id: '' });
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.category) {
      toast({ title: 'Заполните сумму и категорию', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('business_finances').insert({
      business_id: businessId,
      type: addType,
      amount: Number(form.amount),
      category: form.category,
      description: form.description || null,
      date: form.date,
      master_id: form.master_id || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: addType === 'income' ? 'Доход добавлен' : 'Расход добавлен' });
      setAddOpen(false);
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5" /> Финансы
        </h2>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="year">Год</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => openAdd('income')}>
            <ArrowUpRight className="h-4 w-4 mr-1 text-green-600" /> Доход
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAdd('expense')}>
            <ArrowDownRight className="h-4 w-4 mr-1 text-red-600" /> Расход
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{totals.income.toLocaleString()} ₽</p>
            <p className="text-sm text-muted-foreground">Доходы</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingDown className="h-5 w-5 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{totals.expense.toLocaleString()} ₽</p>
            <p className="text-sm text-muted-foreground">Расходы</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Wallet className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.profit.toLocaleString()} ₽</p>
            <p className="text-sm text-muted-foreground">Прибыль</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{filteredFinances.length}</p>
            <p className="text-sm text-muted-foreground">Операций</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Движение ДДС</TabsTrigger>
          <TabsTrigger value="masters">По мастерам</TabsTrigger>
          <TabsTrigger value="categories">По категориям</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Движение денежных средств</CardTitle>
              <CardDescription>{filteredFinances.length} операций за период</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
              ) : filteredFinances.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Нет операций за выбранный период</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredFinances.map(f => {
                    const master = f.master_id ? masters.find(m => m.id === f.master_id) : null;
                    return (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${f.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {f.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{f.category}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(f.date), 'd MMM yyyy', { locale: ru })}
                              {f.description && ` · ${f.description}`}
                              {master && ` · ${master.name}`}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${f.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {f.type === 'income' ? '+' : '−'}{Number(f.amount).toLocaleString()} ₽
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="masters">
          <Card>
            <CardHeader><CardTitle className="text-base">Прибыль по мастерам</CardTitle></CardHeader>
            <CardContent>
              {masterBreakdown.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Нет данных по мастерам</p>
              ) : (
                <div className="space-y-3">
                  {masterBreakdown.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Доходы: {m.income.toLocaleString()} ₽ · Расходы: {m.expense.toLocaleString()} ₽
                        </p>
                      </div>
                      <span className={`font-bold text-sm ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.profit.toLocaleString()} ₽
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader><CardTitle className="text-base">Разбивка по категориям</CardTitle></CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Нет данных</p>
              ) : (
                <div className="space-y-2">
                  {categoryBreakdown.map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm">{cat}</span>
                      <span className="font-bold text-sm">{amount.toLocaleString()} ₽</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add operation dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addType === 'income' ? 'Добавить доход' : 'Добавить расход'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сумма (₽) *</Label>
              <Input type="text" inputMode="numeric" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '') }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Категория *</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  {(addType === 'income' ? incomeCategories : expenseCategories).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            {masters.length > 0 && (
              <div className="space-y-2">
                <Label>Мастер (необязательно)</Label>
                <Select value={form.master_id} onValueChange={v => setForm(p => ({ ...p, master_id: v === '_none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Общий" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Общий</SelectItem>
                    {masters.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Добавить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessFinances;
