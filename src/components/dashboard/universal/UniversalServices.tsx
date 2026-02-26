import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Clock, Tag, Package } from 'lucide-react';
import { CategoryConfig } from './categoryConfig';

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  hashtags: string[];
  is_active: boolean;
  work_photos: string[];
}

interface Props { config: CategoryConfig; }

const UniversalServices = ({ config }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', price: 0, duration_minutes: 60,
    hashtags: '', is_active: true,
  });

  useEffect(() => { if (user) fetchServices(); }, [user]);

  const fetchServices = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('services')
      .select('*').eq('master_id', user.id).order('created_at', { ascending: false });
    setServices((data || []).map(s => ({
      ...s,
      hashtags: (s.hashtags as string[]) || [],
      work_photos: ((s as any).work_photos as string[]) || [],
    })));
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', price: 0, duration_minutes: 60, hashtags: '', is_active: true });
    setIsOpen(true);
  };

  const openEdit = (s: ServiceItem) => {
    setEditingId(s.id);
    setForm({
      name: s.name, description: s.description || '',
      price: s.price || 0, duration_minutes: s.duration_minutes || 60,
      hashtags: s.hashtags.join(', '), is_active: s.is_active,
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    const tags = form.hashtags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price,
      duration_minutes: form.duration_minutes,
      hashtags: tags,
      is_active: form.is_active,
      master_id: user.id,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from('services').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Услуга обновлена' });
      } else {
        const { error } = await supabase.from('services').insert(payload);
        if (error) throw error;
        toast({ title: 'Услуга создана' });
      }
      setIsOpen(false);
      fetchServices();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Услуга удалена' }); fetchServices(); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('services').update({ is_active: active }).eq('id', id);
    fetchServices();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Услуги</h2>
          <p className="text-sm text-muted-foreground">{services.length} услуг</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Добавить услугу</Button>
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">Вы ещё не добавили услуги</p>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Создать первую услугу</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map(s => (
            <Card key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Switch checked={s.is_active} onCheckedChange={v => toggleActive(s.id, v)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                <div className="flex items-center gap-4 text-sm">
                  {s.price != null && <span className="font-bold">{Number(s.price).toLocaleString()} ₽</span>}
                  {s.duration_minutes && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} мин
                    </span>
                  )}
                </div>
                {s.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.hashtags.map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        <Tag className="h-2.5 w-2.5 mr-0.5" />{t}
                      </Badge>
                    ))}
                  </div>
                )}
                {!s.is_active && <Badge variant="outline" className="text-xs">Неактивна</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать услугу' : 'Новая услуга'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Например: Стрижка мужская" />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Подробное описание услуги..." className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Цена (₽) *</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Длительность (мин) *</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Хештеги (через запятую)</Label>
              <Input value={form.hashtags} onChange={e => setForm(p => ({ ...p, hashtags: e.target.value }))} placeholder="красота, стрижка, барбер" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Активна</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editingId ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UniversalServices;
