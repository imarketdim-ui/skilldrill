import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingCart, Plus, Package, Wallet, ArrowDownRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  businessId: string;
}

const BusinessProcurement = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    item_id: '',
    quantity: '',
    unit_price: '',
    register_id: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, [businessId]);

  const fetchData = async () => {
    setLoading(true);
    const [itemsRes, regsRes, txRes] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('business_id', businessId),
      supabase.from('cash_registers').select('*').eq('business_id', businessId).eq('is_active', true),
      supabase.from('inventory_transactions').select('*, item:inventory_items(name, unit)')
        .eq('type', 'procurement').order('created_at', { ascending: false }).limit(50),
    ]);
    setItems(itemsRes.data || []);
    setRegisters(regsRes.data || []);
    // Filter to business items
    const itemIds = (itemsRes.data || []).map(i => i.id);
    setTransactions((txRes.data || []).filter(t => itemIds.includes(t.item_id)));
    setLoading(false);
  };

  const totalSpent = transactions.reduce((s, t) => {
    const item = items.find(i => i.id === t.item_id);
    return s + (Math.abs(t.quantity_change) * (item?.price_per_unit || 0));
  }, 0);

  const handleProcure = async () => {
    if (!form.item_id || !form.quantity || !form.unit_price) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unit_price);
    const totalCost = quantity * unitPrice;
    const selectedRegister = registers.find(r => r.id === form.register_id);

    if (selectedRegister && selectedRegister.balance < totalCost) {
      toast({ title: 'Недостаточно средств в кассе', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // 1. Add inventory transaction (increase stock)
    const { error: txError } = await supabase.from('inventory_transactions').insert({
      item_id: form.item_id,
      type: 'procurement',
      quantity_change: quantity,
      description: form.description || `Закупка по ${unitPrice} ₽/ед.`,
      performed_by: user?.id,
    });

    if (txError) {
      toast({ title: 'Ошибка', description: txError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // 2. Update inventory item quantity and price
    const item = items.find(i => i.id === form.item_id);
    if (item) {
      await supabase.from('inventory_items').update({
        quantity: item.quantity + quantity,
        price_per_unit: unitPrice,
      }).eq('id', form.item_id);
    }

    // 3. If register selected, create expense transaction
    if (selectedRegister) {
      await supabase.from('cash_register_transactions').insert({
        register_id: selectedRegister.id,
        type: 'expense',
        category: 'procurement',
        amount: -totalCost,
        description: `Закупка: ${item?.name} x${quantity}`,
        performed_by: user?.id,
      });

      await supabase.from('cash_registers').update({
        balance: selectedRegister.balance - totalCost,
      }).eq('id', selectedRegister.id);
    }

    // 4. Also record in business_finances for reporting
    await supabase.from('business_finances').insert({
      business_id: businessId,
      type: 'expense',
      category: 'Материалы',
      sub_type: 'procurement',
      amount: totalCost,
      description: `Закупка: ${item?.name} x${quantity}`,
    });

    setSaving(false);
    toast({ title: 'Закупка оформлена' });
    setAddOpen(false);
    setForm({ item_id: '', quantity: '', unit_price: '', register_id: '', description: '' });
    fetchData();
  };

  const fmtNum = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> Закупки материалов
        </h3>
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={items.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Оформить закупку
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Потрачено за период</p>
            <p className="text-xl font-bold text-red-600">{fmtNum(totalSpent)} ₽</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Закупок</p>
            <p className="text-xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Позиций на складе</p>
            <p className="text-xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent procurements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Последние закупки</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Нет закупок. Добавьте товары на склад и оформите закупку.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {transactions.map(t => {
                const item = items.find(i => i.id === t.item_id);
                const cost = Math.abs(t.quantity_change) * (item?.price_per_unit || 0);
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item?.name || 'Товар'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(t.created_at), 'd MMM yyyy', { locale: ru })} ·
                          {t.quantity_change} {item?.unit || 'шт'}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600">−{fmtNum(cost)} ₽</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Procurement Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Оформить закупку</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Товар/материал</Label>
              <Select value={form.item_id} onValueChange={v => setForm(p => ({ ...p, item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите товар" /></SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Сначала добавьте товары в разделе «Склад»
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Количество</Label>
                <Input 
                  type="number" 
                  placeholder="10" 
                  value={form.quantity} 
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} 
                />
              </div>
              <div>
                <Label>Цена за ед.</Label>
                <Input 
                  type="number" 
                  placeholder="100" 
                  value={form.unit_price} 
                  onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} 
                />
              </div>
            </div>
            {form.quantity && form.unit_price && (
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-sm text-muted-foreground">Итого к оплате</p>
                <p className="text-lg font-bold">{fmtNum(Number(form.quantity) * Number(form.unit_price))} ₽</p>
              </div>
            )}
            <div>
              <Label>Оплата из кассы (опционально)</Label>
              <Select value={form.register_id} onValueChange={v => setForm(p => ({ ...p, register_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Не списывать" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не списывать</SelectItem>
                  {registers.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({fmtNum(r.balance)} ₽)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Комментарий</Label>
              <Input 
                placeholder="Поставщик, номер накладной..." 
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
              />
            </div>
            <Button onClick={handleProcure} disabled={saving} className="w-full">
              {saving ? 'Оформление...' : 'Оформить закупку'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessProcurement;
