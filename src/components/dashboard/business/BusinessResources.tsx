import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, DoorOpen } from 'lucide-react';

interface Props {
  businessId: string;
}

interface ResourceItem {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  is_active: boolean;
}

export default function BusinessResources({ businessId }: Props) {
  const { toast } = useToast();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: '1',
    is_active: true,
  });

  const load = async () => {
    const { data } = await supabase
      .from('resources')
      .select('id, name, description, capacity, is_active')
      .eq('organization_id', businessId)
      .order('name');
    setResources((data || []) as ResourceItem[]);
  };

  useEffect(() => {
    load();
  }, [businessId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', capacity: '1', is_active: true });
    setOpen(true);
  };

  const openEdit = (resource: ResourceItem) => {
    setEditing(resource);
    setForm({
      name: resource.name,
      description: resource.description || '',
      capacity: String(resource.capacity || 1),
      is_active: resource.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Введите название', variant: 'destructive' });
      return;
    }

    const payload = {
      organization_id: businessId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      capacity: Math.max(1, Number(form.capacity) || 1),
      is_active: form.is_active,
    };

    const query = editing
      ? supabase.from('resources').update(payload).eq('id', editing.id)
      : supabase.from('resources').insert(payload);
    const { error } = await query;

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: editing ? 'Ресурс обновлён' : 'Ресурс добавлен' });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Ресурс удалён' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ресурсы</h2>
          <p className="text-sm text-muted-foreground">Кабинеты, залы и оборудование для конфликт-контроля</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <DoorOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Ресурсы ещё не добавлены
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map(resource => (
            <Card key={resource.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-3">
                  <span>{resource.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(resource)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(resource.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">{resource.description || 'Описание не указано'}</p>
                <p>Вместимость: {resource.capacity}</p>
                <p className={resource.is_active ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {resource.is_active ? 'Активен' : 'Скрыт из публичной записи'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Редактировать ресурс' : 'Новый ресурс'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Вместимость</Label>
              <Input type="number" min={1} value={form.capacity} onChange={event => setForm(current => ({ ...current, capacity: event.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Показывать в записи</p>
                <p className="text-xs text-muted-foreground">Неактивные ресурсы не будут доступны клиентам</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={checked => setForm(current => ({ ...current, is_active: checked }))} />
            </div>
            <Button className="w-full" onClick={save}>{editing ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
