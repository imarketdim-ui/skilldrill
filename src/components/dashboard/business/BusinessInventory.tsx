import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Package, AlertTriangle, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BusinessProcurement from './BusinessProcurement';
import BusinessWriteOffs from './BusinessWriteOffs';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  price_per_unit: number;
  category: string | null;
  notes: string | null;
}

interface InventoryMovement {
  id: string;
  type: string;
  quantity_change: number;
  created_at: string;
  description: string | null;
  item?: { name: string | null; unit: string | null } | null;
}

interface Props {
  businessId: string;
}

const units = ['шт', 'мл', 'г', 'кг', 'л', 'м', 'упак'];

const BusinessInventory = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', unit: 'шт', quantity: '', min_quantity: '', price_per_unit: '', category: '', notes: '',
  });

  useEffect(() => { fetchItems(); }, [businessId]);

  const fetchItems = async () => {
    setLoading(true);
    const [itemsRes, movementsRes] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .order('name'),
      supabase
        .from('inventory_transactions')
        .select('id, type, quantity_change, created_at, description, item:inventory_items!inner(name, unit, business_id)')
        .eq('item.business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setItems((itemsRes.data || []) as InventoryItem[]);
    setMovements((movementsRes.data || []) as InventoryMovement[]);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', unit: 'шт', quantity: '', min_quantity: '', price_per_unit: '', category: '', notes: '' });
    setIsOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      unit: item.unit,
      quantity: String(item.quantity),
      min_quantity: String(item.min_quantity),
      price_per_unit: String(item.price_per_unit),
      category: item.category || '',
      notes: item.notes || '',
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      unit: form.unit,
      quantity: Number(form.quantity) || 0,
      min_quantity: Number(form.min_quantity) || 0,
      price_per_unit: Number(form.price_per_unit) || 0,
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Позиция обновлена' });
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload);
        if (error) throw error;
        toast({ title: 'Позиция добавлена' });
      }
      setIsOpen(false);
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
    toast({ title: 'Позиция удалена' });
    fetchItems();
  };

  const lowStockItems = items.filter(i => i.quantity <= i.min_quantity && i.min_quantity > 0);
  const totalValue = items.reduce((s, i) => s + i.quantity * i.price_per_unit, 0);

  const filtered = items.filter(i => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
  });

  const procurementTotal = movements.filter(m => m.type === 'procurement').reduce((sum, movement) => sum + Math.max(0, Number(movement.quantity_change || 0)), 0);
  const writeoffTotal = movements.filter(m => m.type === 'writeoff').reduce((sum, movement) => sum + Math.abs(Math.min(0, Number(movement.quantity_change || 0))), 0);

  const exportMovements = () => {
    const lines = [
      'Дата,Тип,Позиция,Количество,Описание',
      ...movements.map(movement => [
        new Date(movement.created_at).toISOString(),
        movement.type,
        movement.item?.name || '',
        movement.quantity_change,
        movement.description || '',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_movements_${businessId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Остатки</TabsTrigger>
          <TabsTrigger value="procurement">Закупки</TabsTrigger>
          <TabsTrigger value="writeoffs">Списания</TabsTrigger>
          <TabsTrigger value="reports">Отчёты</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Склад</h2>
                <p className="text-sm text-muted-foreground">{items.length} позиций · на {totalValue.toLocaleString()} ₽</p>
              </div>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
            </div>

            {lowStockItems.length > 0 && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-3 px-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm">Низкий остаток: {lowStockItems.map(i => i.name).join(', ')}</span>
                </CardContent>
              </Card>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="pl-10" />
            </div>

            {loading ? (
              <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">Склад пуст</p>
                  <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Добавить позицию</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(item => (
                  <Card key={item.id} className={item.quantity <= item.min_quantity && item.min_quantity > 0 ? 'border-destructive/30' : ''}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          {item.category && <Badge variant="outline" className="text-xs mt-0.5">{item.category}</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 text-sm">
                        <span className={`font-bold text-lg ${item.quantity <= item.min_quantity && item.min_quantity > 0 ? 'text-destructive' : ''}`}>
                          {item.quantity}
                        </span>
                        <span className="text-muted-foreground">{item.unit}</span>
                        {item.min_quantity > 0 && (
                          <span className="text-xs text-muted-foreground">мин: {item.min_quantity}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.price_per_unit.toLocaleString()} ₽/{item.unit}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="procurement">
          <BusinessProcurement businessId={businessId} />
        </TabsContent>

        <TabsContent value="writeoffs">
          <BusinessWriteOffs businessId={businessId} />
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Отчёты по складу</h2>
                <p className="text-sm text-muted-foreground">Движение товаров и критические остатки</p>
              </div>
              <Button variant="outline" onClick={exportMovements}>Экспорт CSV</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Приход</p>
                  <p className="text-2xl font-bold">{procurementTotal}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Списание</p>
                  <p className="text-2xl font-bold">{writeoffTotal}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Низкий остаток</p>
                  <p className="text-2xl font-bold">{lowStockItems.length}</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Последние движения</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет операций</p>
                ) : movements.map(movement => (
                  <div key={movement.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{movement.item?.name || 'Позиция'}</p>
                      <p className="text-xs text-muted-foreground">{movement.type} · {movement.description || 'Без комментария'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{movement.quantity_change}</p>
                      <p className="text-xs text-muted-foreground">{new Date(movement.created_at).toLocaleString('ru-RU')}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать' : 'Новая позиция'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Краска для волос" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Единица</Label>
                <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Категория</Label>
                <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Расходники" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Мин. остаток</Label>
                <Input type="number" value={form.min_quantity} onChange={e => setForm(p => ({ ...p, min_quantity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Цена/ед (₽)</Label>
                <Input type="number" value={form.price_per_unit} onChange={e => setForm(p => ({ ...p, price_per_unit: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave}>{editingId ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessInventory;
