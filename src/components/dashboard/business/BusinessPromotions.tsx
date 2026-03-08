import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Percent, Tag, Trash2, Edit, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props { businessId: string; }

interface Promotion {
  id: string; name: string; description: string | null;
  discount_type: string; discount_value: number;
  applies_to: string; start_date: string | null; end_date: string | null;
  is_active: boolean; min_rating: number | null;
  required_tags: string[] | null; target_ids: string[] | null;
  created_at: string;
}

const BusinessPromotions = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', discount_type: 'percent', discount_value: 10,
    applies_to: 'all', start_date: '', end_date: '', min_rating: '',
  });

  const fetchPromotions = async () => {
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    setPromotions((data || []) as Promotion[]);
    setLoading(false);
  };

  useEffect(() => { fetchPromotions(); }, [businessId]);

  const resetForm = () => {
    setForm({ name: '', description: '', discount_type: 'percent', discount_value: 10, applies_to: 'all', start_date: '', end_date: '', min_rating: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '',
      discount_type: p.discount_type, discount_value: p.discount_value,
      applies_to: p.applies_to,
      start_date: p.start_date ? p.start_date.split('T')[0] : '',
      end_date: p.end_date ? p.end_date.split('T')[0] : '',
      min_rating: p.min_rating?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      applies_to: form.applies_to,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      min_rating: form.min_rating ? Number(form.min_rating) : null,
      business_id: businessId,
      creator_id: user.id,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Акция обновлена' });
      } else {
        const { error } = await supabase.from('promotions').insert(payload);
        if (error) throw error;
        toast({ title: 'Акция создана' });
      }
      setDialogOpen(false);
      resetForm();
      fetchPromotions();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('promotions').update({ is_active: !active }).eq('id', id);
    fetchPromotions();
  };

  const deletePromotion = async (id: string) => {
    await supabase.from('promotions').delete().eq('id', id);
    toast({ title: 'Акция удалена' });
    fetchPromotions();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Акции и скидки</h3>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Новая акция
        </Button>
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
      ) : promotions.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Нет акций</p>
          <p className="text-sm text-muted-foreground mt-1">Создайте первую акцию для привлечения клиентов</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {promotions.map(p => (
            <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{p.name}</p>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>
                        {p.is_active ? 'Активна' : 'Неактивна'}
                      </Badge>
                      <Badge variant="outline">
                        {p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value} ₽`}
                      </Badge>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {p.start_date && <span>С {format(new Date(p.start_date), 'dd.MM.yyyy')}</span>}
                      {p.end_date && <span>До {format(new Date(p.end_date), 'dd.MM.yyyy')}</span>}
                      <span>Для: {p.applies_to === 'all' ? 'Всех' : p.applies_to === 'vip' ? 'VIP' : p.applies_to === 'new' ? 'Новых' : p.applies_to}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deletePromotion(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать акцию' : 'Новая акция'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Скидка 20% новым клиентам" />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Подробности акции..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Тип скидки</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Процент (%)</SelectItem>
                    <SelectItem value="fixed">Фиксированная (₽)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Размер скидки</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Применяется к</Label>
              <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все клиенты</SelectItem>
                  <SelectItem value="new">Новые клиенты</SelectItem>
                  <SelectItem value="vip">VIP клиенты</SelectItem>
                  <SelectItem value="returning">Повторные</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Дата начала</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Дата окончания</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Мин. рейтинг клиента (необязательно)</Label>
              <Input type="number" value={form.min_rating} onChange={e => setForm(f => ({ ...f, min_rating: e.target.value }))} placeholder="Например, 60" />
            </div>
            <Button className="w-full" onClick={handleSave}>{editing ? 'Сохранить' : 'Создать акцию'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessPromotions;
