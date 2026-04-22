import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Banknote, Plus, Pencil, Trash2, Calculator, Users, Loader2, History, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  businessId: string;
}

type SchemeType = 'fixed' | 'percent' | 'mixed' | 'piecework';

interface Scheme {
  id: string;
  business_id: string;
  master_id: string;
  scheme_type: SchemeType;
  fixed_amount: number;
  percent_value: number;
  deduct_materials: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  master?: { first_name: string | null; last_name: string | null; skillspot_id: string | null };
}

interface SalaryRecord {
  id: string;
  business_id: string;
  master_id: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  bonus_amount: number;
  penalty_amount: number;
  total_amount: number;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  master?: { first_name: string | null; last_name: string | null };
}

const SCHEME_LABELS: { [k in SchemeType]: string } = {
  fixed: 'Фиксированная',
  percent: '% с услуг',
  mixed: 'Смешанная (фикс + %)',
  piecework: 'Сдельная',
};

const BusinessSalaries = ({ businessId }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [masters, setMasters] = useState<any[]>([]);

  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [form, setForm] = useState({
    master_id: '',
    scheme_type: 'percent' as SchemeType,
    fixed_amount: '0',
    percent_value: '40',
    deduct_materials: false,
    notes: '',
  });

  // Calculation
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcMasterId, setCalcMasterId] = useState<string>('');
  const [calcPeriod, setCalcPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadAll();
  }, [businessId]);

  const loadAll = async () => {
    setLoading(true);
    const [schemesRes, recordsRes, mastersRes] = await Promise.all([
      supabase
        .from('salary_schemes' as any)
        .select('*, master:profiles!salary_schemes_master_id_fkey(first_name, last_name, skillspot_id)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      supabase
        .from('salary_records' as any)
        .select('*, master:profiles!salary_records_master_id_fkey(first_name, last_name)')
        .eq('business_id', businessId)
        .order('period_end', { ascending: false })
        .limit(100),
      supabase
        .from('business_masters')
        .select('master_id, profile:profiles!business_masters_master_id_fkey(first_name, last_name, skillspot_id)')
        .eq('business_id', businessId)
        .eq('status', 'accepted'),
    ]);
    setSchemes((schemesRes.data || []) as any);
    setRecords((recordsRes.data || []) as any);
    setMasters(
      (mastersRes.data || []).map((m: any) => ({
        master_id: m.master_id,
        name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Без имени',
        skillspot_id: m.profile?.skillspot_id,
      }))
    );
    setLoading(false);
  };

  const openNewScheme = () => {
    setEditingScheme(null);
    setForm({
      master_id: '',
      scheme_type: 'percent',
      fixed_amount: '0',
      percent_value: '40',
      deduct_materials: false,
      notes: '',
    });
    setSchemeOpen(true);
  };

  const openEditScheme = (s: Scheme) => {
    setEditingScheme(s);
    setForm({
      master_id: s.master_id,
      scheme_type: s.scheme_type,
      fixed_amount: String(s.fixed_amount || 0),
      percent_value: String(s.percent_value || 0),
      deduct_materials: s.deduct_materials,
      notes: s.notes || '',
    });
    setSchemeOpen(true);
  };

  const saveScheme = async () => {
    if (!form.master_id) {
      toast({ title: 'Выберите сотрудника', variant: 'destructive' });
      return;
    }
    const payload = {
      business_id: businessId,
      master_id: form.master_id,
      scheme_type: form.scheme_type,
      fixed_amount: Number(form.fixed_amount) || 0,
      percent_value: Number(form.percent_value) || 0,
      deduct_materials: form.deduct_materials,
      notes: form.notes || null,
      is_active: true,
    };
    if (editingScheme) {
      const { error } = await supabase
        .from('salary_schemes' as any)
        .update(payload)
        .eq('id', editingScheme.id);
      if (error) {
        toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Схема обновлена' });
    } else {
      const { error } = await supabase.from('salary_schemes' as any).insert(payload);
      if (error) {
        toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Схема создана' });
    }
    setSchemeOpen(false);
    loadAll();
  };

  const toggleScheme = async (s: Scheme) => {
    const { error } = await supabase
      .from('salary_schemes' as any)
      .update({ is_active: !s.is_active })
      .eq('id', s.id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    loadAll();
  };

  const deleteScheme = async (id: string) => {
    if (!confirm('Удалить схему оплаты?')) return;
    const { error } = await supabase.from('salary_schemes' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Удалено' });
    loadAll();
  };

  const calculateSalary = async () => {
    if (!calcMasterId) {
      toast({ title: 'Выберите сотрудника', variant: 'destructive' });
      return;
    }
    setCalculating(true);
    setCalcResult(null);
    try {
      const scheme = schemes.find((s) => s.master_id === calcMasterId && s.is_active);
      if (!scheme) {
        toast({ title: 'У сотрудника нет активной схемы оплаты', variant: 'destructive' });
        setCalculating(false);
        return;
      }

      const startISO = new Date(calcPeriod.start + 'T00:00:00').toISOString();
      const endISO = new Date(calcPeriod.end + 'T23:59:59').toISOString();

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, scheduled_at, services:service_id(price, name)')
        .eq('organization_id', businessId)
        .eq('executor_id', calcMasterId)
        .eq('status', 'completed')
        .gte('scheduled_at', startISO)
        .lte('scheduled_at', endISO);

      const completedCount = bookings?.length || 0;
      const grossRevenue = (bookings || []).reduce(
        (sum: number, b: any) => sum + Number(b.services?.price || 0),
        0
      );

      // Penalties via business_finances
      const { data: penalties } = await supabase
        .from('business_finances')
        .select('amount')
        .eq('business_id', businessId)
        .eq('master_id', calcMasterId)
        .eq('category', 'penalty')
        .gte('date', calcPeriod.start)
        .lte('date', calcPeriod.end);
      const penaltyTotal = (penalties || []).reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0
      );

      let baseAmount = 0;
      switch (scheme.scheme_type) {
        case 'fixed':
          baseAmount = Number(scheme.fixed_amount);
          break;
        case 'percent':
          baseAmount = (grossRevenue * Number(scheme.percent_value)) / 100;
          break;
        case 'mixed':
          baseAmount =
            Number(scheme.fixed_amount) + (grossRevenue * Number(scheme.percent_value)) / 100;
          break;
        case 'piecework':
          baseAmount = completedCount * Number(scheme.fixed_amount);
          break;
      }

      const totalAmount = Math.max(0, baseAmount - penaltyTotal);

      setCalcResult({
        scheme,
        completedCount,
        grossRevenue,
        baseAmount,
        penaltyTotal,
        totalAmount,
        bookings: bookings || [],
      });
    } catch (err: any) {
      toast({ title: 'Ошибка расчёта', description: err.message, variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  const saveSalaryRecord = async () => {
    if (!calcResult) return;
    const { error } = await supabase.from('salary_records' as any).insert({
      business_id: businessId,
      master_id: calcMasterId,
      period_start: calcPeriod.start,
      period_end: calcPeriod.end,
      base_amount: calcResult.baseAmount,
      bonus_amount: 0,
      penalty_amount: calcResult.penaltyTotal,
      total_amount: calcResult.totalAmount,
      created_by: user?.id,
      notes: `Авто-расчёт: ${calcResult.completedCount} услуг, выручка ${calcResult.grossRevenue} ₽`,
    });
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Запись о зарплате сохранена' });
    setCalcOpen(false);
    setCalcResult(null);
    loadAll();
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('salary_records' as any)
      .update({ paid_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Отмечено как выплачено' });
    loadAll();
  };

  const masterName = (id: string) => {
    const m = masters.find((x) => x.master_id === id);
    return m?.name || 'Сотрудник';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6" /> Зарплаты сотрудников
          </h2>
          <p className="text-sm text-muted-foreground">
            Схемы оплаты и расчёт выплат по завершённым услугам
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCalcOpen(true)}>
            <Calculator className="h-4 w-4 mr-2" />
            Рассчитать
          </Button>
          <Button onClick={openNewScheme}>
            <Plus className="h-4 w-4 mr-2" />
            Новая схема
          </Button>
        </div>
      </div>

      <Tabs defaultValue="schemes">
        <TabsList>
          <TabsTrigger value="schemes">
            <Users className="h-4 w-4 mr-1" />
            Схемы оплаты ({schemes.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" />
            История выплат ({records.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schemes" className="space-y-3 mt-4">
          {schemes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Схем оплаты пока нет</p>
                <p className="text-sm mt-1">Создайте схему для каждого сотрудника</p>
              </CardContent>
            </Card>
          ) : (
            schemes.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {s.master?.first_name} {s.master?.last_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {s.master?.skillspot_id}
                        </Badge>
                        <Badge variant={s.is_active ? 'default' : 'secondary'}>
                          {s.is_active ? 'Активна' : 'Отключена'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <Badge variant="secondary" className="mr-1">
                          {SCHEME_LABELS[s.scheme_type]}
                        </Badge>
                        {s.scheme_type === 'fixed' && (
                          <span>Оклад {Number(s.fixed_amount).toLocaleString()} ₽</span>
                        )}
                        {s.scheme_type === 'percent' && (
                          <span>
                            {s.percent_value}% с услуг
                            {s.deduct_materials && ' (за вычетом материалов)'}
                          </span>
                        )}
                        {s.scheme_type === 'mixed' && (
                          <span>
                            {Number(s.fixed_amount).toLocaleString()} ₽ + {s.percent_value}%
                          </span>
                        )}
                        {s.scheme_type === 'piecework' && (
                          <span>{Number(s.fixed_amount).toLocaleString()} ₽ за услугу</span>
                        )}
                      </div>
                      {s.notes && (
                        <p className="text-xs text-muted-foreground">{s.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={() => toggleScheme(s)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => openEditScheme(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteScheme(s.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {records.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>История выплат пуста</p>
              </CardContent>
            </Card>
          ) : (
            records.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {r.master?.first_name} {r.master?.last_name}
                        </span>
                        {r.paid_at ? (
                          <Badge variant="default">
                            Выплачено {format(new Date(r.paid_at), 'd MMM', { locale: ru })}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Ожидает выплаты</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Период: {format(new Date(r.period_start), 'd MMM', { locale: ru })} —{' '}
                        {format(new Date(r.period_end), 'd MMM yyyy', { locale: ru })}
                      </p>
                      <div className="text-xs text-muted-foreground space-x-2">
                        <span>База: {Number(r.base_amount).toLocaleString()} ₽</span>
                        {r.penalty_amount > 0 && (
                          <span className="text-destructive">
                            − {Number(r.penalty_amount).toLocaleString()} ₽ штрафы
                          </span>
                        )}
                      </div>
                      {r.notes && (
                        <p className="text-xs text-muted-foreground italic">{r.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold">
                        {Number(r.total_amount).toLocaleString()} ₽
                      </p>
                      {!r.paid_at && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(r.id)}>
                          Отметить выплату
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Scheme dialog */}
      <Dialog open={schemeOpen} onOpenChange={setSchemeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingScheme ? 'Редактировать схему' : 'Новая схема оплаты'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сотрудник *</Label>
              <Select
                value={form.master_id}
                onValueChange={(v) => setForm({ ...form, master_id: v })}
                disabled={!!editingScheme}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  {masters.map((m) => (
                    <SelectItem key={m.master_id} value={m.master_id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тип схемы *</Label>
              <Select
                value={form.scheme_type}
                onValueChange={(v: SchemeType) => setForm({ ...form, scheme_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCHEME_LABELS) as SchemeType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SCHEME_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(form.scheme_type === 'fixed' ||
              form.scheme_type === 'mixed' ||
              form.scheme_type === 'piecework') && (
              <div className="space-y-2">
                <Label>
                  {form.scheme_type === 'piecework' ? 'Сумма за услугу, ₽' : 'Фикс. часть, ₽'}
                </Label>
                <Input
                  type="number"
                  value={form.fixed_amount}
                  onChange={(e) => setForm({ ...form, fixed_amount: e.target.value })}
                />
              </div>
            )}

            {(form.scheme_type === 'percent' || form.scheme_type === 'mixed') && (
              <>
                <div className="space-y-2">
                  <Label>Процент с услуг, %</Label>
                  <Input
                    type="number"
                    value={form.percent_value}
                    onChange={(e) => setForm({ ...form, percent_value: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">За вычетом стоимости материалов</Label>
                  <Switch
                    checked={form.deduct_materials}
                    onCheckedChange={(v) => setForm({ ...form, deduct_materials: v })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Заметка</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Например: испытательный срок 3 месяца"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchemeOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveScheme}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculate dialog */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Расчёт зарплаты
            </DialogTitle>
            <DialogDescription>
              Базовая часть рассчитывается по завершённым услугам и активной схеме сотрудника.
              Штрафы вычитаются автоматически.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сотрудник *</Label>
              <Select value={calcMasterId} onValueChange={setCalcMasterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  {masters.map((m) => (
                    <SelectItem key={m.master_id} value={m.master_id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-2">
                <Label>С даты *</Label>
                <Input
                  type="date"
                  value={calcPeriod.start}
                  onChange={(e) => setCalcPeriod({ ...calcPeriod, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>По дату *</Label>
                <Input
                  type="date"
                  value={calcPeriod.end}
                  onChange={(e) => setCalcPeriod({ ...calcPeriod, end: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={calculateSalary}
              disabled={calculating}
              className="w-full"
              variant="secondary"
            >
              {calculating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              Рассчитать
            </Button>

            {calcResult && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Завершённых услуг</span>
                    <span className="font-medium">{calcResult.completedCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Выручка</span>
                    <span className="font-medium">
                      {Number(calcResult.grossRevenue).toLocaleString()} ₽
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Базовая часть</span>
                    <span className="font-medium">
                      {Number(calcResult.baseAmount).toLocaleString()} ₽
                    </span>
                  </div>
                  {calcResult.penaltyTotal > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Штрафы</span>
                      <span className="font-medium">
                        − {Number(calcResult.penaltyTotal).toLocaleString()} ₽
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">К выплате</span>
                    <span className="text-xl font-bold">
                      {Number(calcResult.totalAmount).toLocaleString()} ₽
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalcOpen(false)}>
              Закрыть
            </Button>
            {calcResult && (
              <Button onClick={saveSalaryRecord}>
                <Calendar className="h-4 w-4 mr-2" />
                Сохранить запись
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessSalaries;
