import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ListChecks, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ReasonManager = () => {
  const { toast } = useToast();
  const [reasons, setReasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; item?: any }>({ open: false, mode: 'create' });
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadReasons(); }, []);

  const loadReasons = async () => {
    setLoading(true);
    const { data } = await supabase.from('revocation_reasons').select('*').order('name');
    setReasons(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setDialog({ open: true, mode: 'create' });
    setFormName('');
    setFormDescription('');
  };

  const openEdit = (item: any) => {
    setDialog({ open: true, mode: 'edit', item });
    setFormName(item.name);
    setFormDescription(item.description || '');
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      if (dialog.mode === 'create') {
        const { error } = await supabase.from('revocation_reasons').insert({ name: formName, description: formDescription || null });
        if (error) throw error;
        toast({ title: 'Причина создана' });
      } else {
        const { error } = await supabase.from('revocation_reasons').update({ name: formName, description: formDescription || null }).eq('id', dialog.item.id);
        if (error) throw error;
        toast({ title: 'Причина обновлена' });
      }
      setDialog({ open: false, mode: 'create' });
      loadReasons();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('revocation_reasons').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Причина деактивирована' });
      loadReasons();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Причины аннулирования
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Добавить
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {reasons.filter(r => r.is_active).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.mode === 'create' ? 'Новая причина' : 'Редактировать причину'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Название причины..." />
            <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Описание..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: 'create' })}>Отмена</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {dialog.mode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReasonManager;
