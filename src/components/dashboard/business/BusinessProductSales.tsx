import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingBag, Plus, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  businessId: string;
}

const BusinessProductSales = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    item_id: '',
    quantity: '1',
    unit_price: '',
    register_id: '',
    client_name: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, [businessId]);

  const fetchData = async () => {
    setLoading(true);
    const [itemsRes, regsRes, salesRes] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('business_id', businessId),
      supabase.from('cash_registers').select('*').eq('business_id', businessId).eq('is_active', true),
      supabase.from('product_sales').select('*, item:inventory_items(name, unit)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }).limit(50),
    ]);
    setItems(itemsRes.data || []);
    setRegisters(regsRes.data || []);
    setSales(salesRes.data || []);
    setLoading(false);
  };

  const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total_price), 0);

  const handleSale = async () => {
    if (!form.item_id || !form.quantity || !form.unit_price) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unit_price);
    const totalPrice = quantity * unitPrice;
    const item = items.find(i => i.id === form.item_id);

    if (item && quantity > item.quantity) {
      toast({ title: 'Недостаточно товара на складе', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // 1. Create sale record
    const { error: saleError } = await supabase.from('product_sales').insert({
      business_id: businessId,
      item_id: form.item_id,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      register_id: form.register_id || null,
      sold_by: user?.id,
      notes: form.client_name || null,
    });

    if (saleError) {
      toast({ title: 'Ошибка', description: saleError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // 2. Write off from inventory
    await supabase.from('inventory_transactions').insert({
      item_id: form.item_id,
      type: 'sale',
      quantity_change: -quantity,
      description: `Продажа${form.client_name ? `: ${form.client_name}` : ''}`,
      performed_by: user?.id,
    });

    // 3. Update inventory quantity
    if (item) {
      await supabase.from('inventory_items').update({
        quantity: item.quantity - quantity,
      }).eq('id', form.item_id);
    }

    // 4. Add income to register if selected
    const selectedRegister = registers.find(r => r.id === form.register_id);
    if (selectedRegister) {
      await supabase.from('cash_register_transactions').insert({
        register_id: selectedRegister.id,
        type: 'income',
        category: 'product_sale',
        amount: totalPrice,
        description: `Продажа: ${item?.name} x${quantity}`,
        performed_by: user?.id,
      });

      await supabase.from('cash_registers').update({
        balance: selectedRegister.balance + totalPrice,
      }).eq('id', selectedRegister.id);
    }

    // 5. Record in business_finances
    await supabase.from('business_finances').insert({
      business_id: businessId,
      type: 'income',
      category: 'Продажа товаров',
      sub_type: 'product_sale',
      amount: totalPrice,
      description: `Продажа: ${item?.name} x${quantity}`,
    });

    setSaving(false);
    toast({ title: 'Продажа оформлена' });
    setAddOpen(false);
    setForm({ item_id: '', quantity: '1', unit_price: '', register_id: '', client_name: '' });
    fetchData();
  };

  // Auto-fill price when item selected
  const handleItemChange = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    setForm(p => ({
      ...p,
      item_id: itemId,
      unit_price: item ? String(item.price_per_unit * 1.5) : '', // 50% markup default
    }));
  };

  const fmtNum = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" /> Продажа товаров
        </h3>
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={items.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Оформить продажу
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Выручка от продаж</p>
            <p className="text-xl font-bold text-green-600">{fmtNum(totalRevenue)} ₽</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Продаж</p>
            <p className="text-xl font-bold">{sales.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent sales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Последние продажи</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Нет продаж. Добавьте товары и оформите первую продажу.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sale.item?.name || 'Товар'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(sale.created_at), 'd MMM yyyy HH:mm', { locale: ru })} ·
                        {sale.quantity} {sale.item?.unit || 'шт'}
                        {sale.notes && ` · ${sale.notes}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">+{fmtNum(Number(sale.total_price))} ₽</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Sale Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Оформить продажу</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Товар</Label>
              <Select value={form.item_id} onValueChange={handleItemChange}>
                <SelectTrigger><SelectValue placeholder="Выберите товар" /></SelectTrigger>
                <SelectContent>
                  {items.filter(i => i.quantity > 0).map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Количество</Label>
                <Input 
                  type="number" 
                  placeholder="1" 
                  value={form.quantity} 
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} 
                />
              </div>
              <div>
                <Label>Цена продажи</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={form.unit_price} 
                  onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} 
                />
              </div>
            </div>
            {form.quantity && form.unit_price && (
              <div className="p-3 rounded-lg bg-green-50 text-center">
                <p className="text-sm text-muted-foreground">Итого</p>
                <p className="text-lg font-bold text-green-600">{fmtNum(Number(form.quantity) * Number(form.unit_price))} ₽</p>
              </div>
            )}
            <div>
              <Label>Касса (опционально)</Label>
              <Select value={form.register_id} onValueChange={v => setForm(p => ({ ...p, register_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Не записывать в кассу" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не записывать</SelectItem>
                  {registers.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Покупатель (опционально)</Label>
              <Input 
                placeholder="Имя клиента или комментарий" 
                value={form.client_name} 
                onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} 
              />
            </div>
            <Button onClick={handleSale} disabled={saving} className="w-full">
              {saving ? 'Оформление...' : 'Оформить продажу'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessProductSales;
