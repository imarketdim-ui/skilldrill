import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Ticket, Trash2, Copy, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PromoCode {
  id: string; code: string; type: string; value: number;
  max_uses: number | null; current_uses: number;
  expires_at: string | null; is_active: boolean; created_at: string;
}

const AdminPromoCodes = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);

  const [form, setForm] = useState({
    code: '', type: 'trial_extension', value: 30, max_uses: '', expires_at: '',
  });

  const fetchCodes = async () => {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    setCodes((data || []) as PromoCode[]);
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SK-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const resetForm = () => {
    setForm({ code: '', type: 'trial_extension', value: 30, max_uses: '', expires_at: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); generateCode(); setDialogOpen(true); };

  const openEdit = (c: PromoCode) => {
    setEditing(c);
    setForm({
      code: c.code, type: c.type, value: c.value,
      max_uses: c.max_uses?.toString() || '',
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) return;
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: form.value,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('promo_codes').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Промокод обновлён' });
      } else {
        const { error } = await supabase.from('promo_codes').insert(payload);
        if (error) throw error;
        toast({ title: 'Промокод создан' });
      }
      setDialogOpen(false);
      resetForm();
      fetchCodes();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !active }).eq('id', id);
    fetchCodes();
  };

  const deleteCode = async (id: string) => {
    await supabase.from('promo_codes').delete().eq('id', id);
    toast({ title: 'Промокод удалён' });
    fetchCodes();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Скопировано', description: code });
  };

  const typeLabels: Record<string, string> = {
    trial_extension: 'Продление триала',
    discount: 'Скидка',
    bonus: 'Бонус',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Промокоды</h3>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Новый промокод
        </Button>
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
      ) : codes.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Нет промокодов</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {codes.map(c => (
            <Card key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono font-bold text-lg">{c.code}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyCode(c.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Badge variant={c.is_active ? 'default' : 'secondary'}>
                        {c.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                      <Badge variant="outline">{typeLabels[c.type] || c.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Значение: {c.value}</span>
                      <span>Использований: {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ''}</span>
                      {c.expires_at && <span>До {format(new Date(c.expires_at), 'dd.MM.yyyy')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCode(c.id)}>
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
            <DialogTitle>{editing ? 'Редактировать промокод' : 'Новый промокод'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Код *</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SK-XXXXXX" className="font-mono" />
                <Button variant="outline" size="sm" onClick={generateCode}>Сгенерировать</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Тип</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial_extension">Продление триала (дни)</SelectItem>
                    <SelectItem value="discount">Скидка (%)</SelectItem>
                    <SelectItem value="bonus">Бонус (₽)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Значение</Label>
                <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Макс. использований</Label>
                <Input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Без лимита" />
              </div>
              <div>
                <Label>Действует до</Label>
                <Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave}>{editing ? 'Сохранить' : 'Создать промокод'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPromoCodes;
