import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, Package, FileText, Settings2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  businessId: string;
}

const writeOffReasons = [
  { value: 'service', label: 'По услуге (тех.карта)' },
  { value: 'sale', label: 'Продажа клиенту' },
  { value: 'inventory', label: 'Инвентаризация' },
  { value: 'expired', label: 'Истёк срок годности' },
  { value: 'damaged', label: 'Порча/брак' },
  { value: 'other', label: 'Прочее' },
];

const BusinessWriteOffs = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [writeOffs, setWriteOffs] = useState<any[]>([]);
  const [pendingFromServices, setPendingFromServices] = useState<any[]>([]);
  const [autoWriteOff, setAutoWriteOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState({
    item_id: '',
    quantity: '',
    reason: 'other',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, [businessId]);

  const fetchData = async () => {
    setLoading(true);
    
    const [itemsRes, writeOffsRes, businessRes] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('business_id', businessId),
      supabase.from('inventory_transactions').select('*, item:inventory_items(name, unit, price_per_unit)')
        .in('type', ['writeoff', 'sale', 'usage'])
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('business_locations').select('auto_writeoff_enabled').eq('id', businessId).single(),
    ]);
    
    setItems(itemsRes.data || []);
    setAutoWriteOff(businessRes.data?.auto_writeoff_enabled || false);
    
    // Filter write-offs to this business's items
    const itemIds = (itemsRes.data || []).map(i => i.id);
    setWriteOffs((writeOffsRes.data || []).filter(t => itemIds.includes(t.item_id)));

    // Fetch pending write-offs from completed bookings with tech cards
    // (simplified: just show recent completed bookings)
    const { data: completedBookings } = await supabase
      .from('bookings')
      .select('id, scheduled_at, service:services(name, tech_card)')
      .eq('organization_id', businessId)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .limit(10);

    // Filter bookings that have tech cards with materials
    const pending = (completedBookings || [])
      .filter((b: any) => b.service?.tech_card?.materials?.length > 0)
      .map((b: any) => ({
        booking_id: b.id,
        service_name: b.service?.name,
        scheduled_at: b.scheduled_at,
        materials: b.service?.tech_card?.materials || [],
      }));
    
    setPendingFromServices(pending);
    setLoading(false);
  };

  const handleWriteOff = async () => {
    if (!form.item_id || !form.quantity) {
      toast({ title: 'Выберите товар и количество', variant: 'destructive' });
      return;
    }

    const quantity = Number(form.quantity);
    const item = items.find(i => i.id === form.item_id);

    if (item && quantity > item.quantity) {
      toast({ title: 'Недостаточно товара на складе', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('inventory_transactions').insert({
      item_id: form.item_id,
      type: form.reason === 'sale' ? 'sale' : 'writeoff',
      quantity_change: -quantity,
      description: `${writeOffReasons.find(r => r.value === form.reason)?.label}: ${form.description || ''}`.trim(),
      performed_by: user?.id,
    });

    if (!error && item) {
      await supabase.from('inventory_items').update({
        quantity: item.quantity - quantity,
      }).eq('id', form.item_id);
    }

    setSaving(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Списание выполнено' });
      setAddOpen(false);
      setForm({ item_id: '', quantity: '', reason: 'other', description: '' });
      fetchData();
    }
  };

  const handleWriteOffFromService = async (pending: any) => {
    setSaving(true);
    
    for (const material of pending.materials) {
      const item = items.find(i => i.name.toLowerCase() === material.name?.toLowerCase());
      if (!item) continue;

      const qty = Number(material.quantity) || 1;
      if (qty > item.quantity) continue;

      await supabase.from('inventory_transactions').insert({
        item_id: item.id,
        type: 'usage',
        quantity_change: -qty,
        description: `Услуга: ${pending.service_name}`,
        performed_by: user?.id,
      });

      await supabase.from('inventory_items').update({
        quantity: item.quantity - qty,
      }).eq('id', item.id);
    }

    setSaving(false);
    toast({ title: 'Материалы списаны по услуге' });
    fetchData();
  };

  const toggleAutoWriteOff = async (enabled: boolean) => {
    const { error } = await supabase
      .from('business_locations')
      .update({ auto_writeoff_enabled: enabled })
      .eq('id', businessId);
    
    if (!error) {
      setAutoWriteOff(enabled);
      toast({ title: enabled ? 'Автосписание включено' : 'Автосписание отключено' });
    }
  };

  const totalWrittenOff = writeOffs.reduce((s, w) => {
    const cost = Math.abs(w.quantity_change) * (w.item?.price_per_unit || 0);
    return s + cost;
  }, 0);

  const fmtNum = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trash2 className="h-5 w-5" /> Списания материалов
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> Настройки
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Списать вручную
          </Button>
        </div>
      </div>

      {/* Auto write-off status */}
      <Card className={autoWriteOff ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}>
        <CardContent className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {autoWriteOff ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <p className="font-medium text-sm">
                {autoWriteOff ? 'Автосписание включено' : 'Ручное списание'}
              </p>
              <p className="text-xs text-muted-foreground">
                {autoWriteOff 
                  ? 'Материалы списываются автоматически при завершении услуги' 
                  : 'Списывайте материалы вручную после оказания услуг'}
              </p>
            </div>
          </div>
          <Badge variant={autoWriteOff ? 'default' : 'secondary'}>
            {autoWriteOff ? 'Авто' : 'Вручную'}
          </Badge>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Списано за период</p>
            <p className="text-xl font-bold text-red-600">{fmtNum(totalWrittenOff)} ₽</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Операций</p>
            <p className="text-xl font-bold">{writeOffs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Ожидают списания</p>
            <p className="text-xl font-bold text-amber-600">{pendingFromServices.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending write-offs from services */}
      {!autoWriteOff && pendingFromServices.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Ожидают списания по услугам
            </CardTitle>
            <CardDescription>Материалы из технологических карт завершённых услуг</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingFromServices.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50">
                <div>
                  <p className="text-sm font-medium">{p.service_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(p.scheduled_at), 'd MMM yyyy', { locale: ru })} ·
                    {p.materials.length} материал(ов)
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleWriteOffFromService(p)} disabled={saving}>
                  Списать
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent write-offs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">История списаний</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : writeOffs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Нет списаний за выбранный период</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {writeOffs.map(w => {
                const cost = Math.abs(w.quantity_change) * (w.item?.price_per_unit || 0);
                return (
                  <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{w.item?.name || 'Товар'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(w.created_at), 'd MMM yyyy', { locale: ru })} ·
                          {Math.abs(w.quantity_change)} {w.item?.unit || 'шт'}
                          {w.description && ` · ${w.description}`}
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

      {/* Manual Write-off Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Списать материал</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Товар/материал</Label>
              <Select value={form.item_id} onValueChange={v => setForm(p => ({ ...p, item_id: v }))}>
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
              <Label>Причина</Label>
              <Select value={form.reason} onValueChange={v => setForm(p => ({ ...p, reason: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {writeOffReasons.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Комментарий</Label>
              <Input 
                placeholder="Дополнительная информация" 
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
              />
            </div>
            <Button onClick={handleWriteOff} disabled={saving} className="w-full">
              {saving ? 'Списание...' : 'Списать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Настройки списания</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Автоматическое списание</p>
                <p className="text-sm text-muted-foreground">
                  Списывать материалы из тех.карты при завершении услуги
                </p>
              </div>
              <Switch checked={autoWriteOff} onCheckedChange={toggleAutoWriteOff} />
            </div>
            <p className="text-xs text-muted-foreground">
              При включённом автосписании материалы будут автоматически списываться со склада
              при изменении статуса записи на «Завершено», если у услуги заполнена технологическая карта.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessWriteOffs;
