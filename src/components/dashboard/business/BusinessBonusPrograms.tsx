import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Gift, Plus, Trash2, Percent, Cake, Star, Clock, ShoppingBag, Loader2 } from 'lucide-react';

interface Props { businessId: string; }

interface BonusProgram {
  id: string; name: string; type: string; value: number; description: string | null;
  conditions: string | null; is_active: boolean;
}

const programTypes = [
  { value: 'birthday', label: 'День рождения', icon: Cake, desc: 'Скидка в день рождения клиента' },
  { value: 'holiday', label: 'Праздничная', icon: Star, desc: 'Скидка в праздничные дни' },
  { value: 'early_booking', label: 'Ранняя запись', icon: Clock, desc: 'Скидка за запись заранее' },
  { value: 'cashback', label: 'Кэшбэк', icon: Percent, desc: 'Возврат % от стоимости бонусами' },
  { value: 'nth_free', label: 'Каждая N-я бесплатно', icon: Gift, desc: 'Каждая N-я процедура бесплатно' },
  { value: 'referral', label: 'За рекомендацию', icon: ShoppingBag, desc: 'Бонус за приведённого клиента' },
];

const BusinessBonusPrograms = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<BonusProgram[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'cashback', value: 5, description: '', conditions: '' });

  useEffect(() => {
    fetchPrograms();
  }, [businessId]);

  const fetchPrograms = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bonus_programs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    setPrograms((data || []) as BonusProgram[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { toast({ title: 'Введите название', variant: 'destructive' }); return; }
    const { error } = await supabase.from('bonus_programs').insert({
      business_id: businessId,
      name: form.name,
      type: form.type,
      value: form.value,
      description: form.description || null,
      conditions: form.conditions || null,
      is_active: true,
    });
    if (error) { toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Программа добавлена' });
    setDialogOpen(false);
    setForm({ name: '', type: 'cashback', value: 5, description: '', conditions: '' });
    fetchPrograms();
  };

  const toggle = async (id: string, current: boolean) => {
    await supabase.from('bonus_programs').update({ is_active: !current }).eq('id', id);
    setPrograms(p => p.map(pr => pr.id === id ? { ...pr, is_active: !current } : pr));
  };

  const remove = async (id: string) => {
    await supabase.from('bonus_programs').delete().eq('id', id);
    setPrograms(p => p.filter(pr => pr.id !== id));
    toast({ title: 'Программа удалена' });
  };

  const getTypeInfo = (type: string) => programTypes.find(t => t.value === type);

  // Bonus payment settings stored in business_settings
  const [bonusSettings, setBonusSettings] = useState({ maxServicePercent: 50, maxProductPercent: 30, allowSplit: true });
  useEffect(() => {
    supabase.from('business_settings').select('booking').eq('business_id', businessId).maybeSingle()
      .then(({ data }) => {
        if (data?.booking && (data.booking as any).bonus_settings) {
          setBonusSettings((data.booking as any).bonus_settings);
        }
      });
  }, [businessId]);

  const saveBonusSettings = async () => {
    const { data: existing } = await supabase.from('business_settings').select('id, booking').eq('business_id', businessId).maybeSingle();
    const booking = { ...(existing?.booking as any || {}), bonus_settings: bonusSettings };
    await supabase.from('business_settings').upsert({ business_id: businessId, booking, updated_at: new Date().toISOString() });
    toast({ title: 'Настройки оплаты бонусами сохранены' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Gift className="h-6 w-6" /> Бонусные программы</h2>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
      </div>

      {programs.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">
          <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Нет бонусных программ</p>
          <Button className="mt-4" variant="outline" onClick={() => setDialogOpen(true)}>Создать первую</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {programs.map(p => {
            const typeInfo = getTypeInfo(p.type);
            const Icon = typeInfo?.icon || Gift;
            return (
              <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        <Badge variant="outline" className="text-xs">{typeInfo?.label || p.type}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={p.is_active} onCheckedChange={() => toggle(p.id, p.is_active)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{p.value}{p.type === 'nth_free' ? '-я бесплатно' : '%'}</p>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  {p.conditions && <p className="text-xs text-muted-foreground">Условия: {p.conditions}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bonus payment settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Оплата бонусами</CardTitle>
          <CardDescription>Настройки использования бонусов при оплате</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Макс. % оплаты за услуги</Label>
              <Input type="number" value={bonusSettings.maxServicePercent} onChange={e => setBonusSettings(p => ({ ...p, maxServicePercent: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Макс. % оплаты за товары</Label>
              <Input type="number" value={bonusSettings.maxProductPercent} onChange={e => setBonusSettings(p => ({ ...p, maxProductPercent: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Раздельная оплата (рубли + бонусы)</Label>
            <Switch checked={bonusSettings.allowSplit} onCheckedChange={v => setBonusSettings(p => ({ ...p, allowSplit: v }))} />
          </div>
          <Button size="sm" onClick={saveBonusSettings}>Сохранить настройки</Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая бонусная программа</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Например: Кэшбэк 5%" />
            </div>
            <div className="space-y-2">
              <Label>Тип программы</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {programTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.type === 'nth_free' ? 'Каждая N-я процедура' : 'Значение (%)'}</Label>
              <Input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Условия</Label>
              <Input value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} placeholder="Мин. чек 1000₽, только новые клиенты..." />
            </div>
            <Button className="w-full" onClick={handleAdd}>Создать программу</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessBonusPrograms;
