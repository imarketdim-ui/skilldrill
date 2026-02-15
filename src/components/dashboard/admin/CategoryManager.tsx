import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FolderTree, Plus, Pencil, Trash2, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CategoryManager = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; type: 'category' | 'subcategory'; item?: any; parentId?: string }>({ open: false, mode: 'create', type: 'category' });
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [masterCounts, setMasterCounts] = useState<Record<string, number>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [catRes, subRes, mpRes] = await Promise.all([
      supabase.from('service_categories').select('*').order('name'),
      supabase.from('service_subcategories').select('*').order('name'),
      supabase.from('master_profiles').select('category_id').eq('is_active', true),
    ]);
    setCategories(catRes.data || []);
    setSubcategories(subRes.data || []);

    // Count masters per category
    const counts: Record<string, number> = {};
    (mpRes.data || []).forEach((mp: any) => {
      if (mp.category_id) {
        counts[mp.category_id] = (counts[mp.category_id] || 0) + 1;
      }
    });
    setMasterCounts(counts);
    setLoading(false);
  };

  const openCreate = (type: 'category' | 'subcategory', parentId?: string) => {
    setDialog({ open: true, mode: 'create', type, parentId });
    setFormName('');
    setFormDescription('');
  };

  const openEdit = (type: 'category' | 'subcategory', item: any) => {
    setDialog({ open: true, mode: 'edit', type, item });
    setFormName(item.name);
    setFormDescription(item.description || '');
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      if (dialog.type === 'category') {
        if (dialog.mode === 'create') {
          const { error } = await supabase.from('service_categories').insert({ name: formName, description: formDescription || null });
          if (error) throw error;
          toast({ title: 'Категория создана' });
        } else {
          const { error } = await supabase.from('service_categories').update({ name: formName, description: formDescription || null }).eq('id', dialog.item.id);
          if (error) throw error;
          toast({ title: 'Категория обновлена' });
        }
      } else {
        if (dialog.mode === 'create') {
          const { error } = await supabase.from('service_subcategories').insert({
            category_id: dialog.parentId,
            name: formName,
            description: formDescription || null,
          });
          if (error) throw error;
          toast({ title: 'Подкатегория создана' });
        } else {
          const { error } = await supabase.from('service_subcategories').update({ name: formName, description: formDescription || null }).eq('id', dialog.item.id);
          if (error) throw error;
          toast({ title: 'Подкатегория обновлена' });
        }
      }
      setDialog({ open: false, mode: 'create', type: 'category' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleDelete = async (type: 'category' | 'subcategory', item: any) => {
    if (type === 'category') {
      const count = masterCounts[item.id] || 0;
      if (count > 0) {
        toast({ title: 'Невозможно удалить', description: `В категории ${count} активных мастеров`, variant: 'destructive' });
        return;
      }
      // Check subcategories
      const subs = subcategories.filter(s => s.category_id === item.id);
      if (subs.length > 0) {
        toast({ title: 'Сначала удалите подкатегории', variant: 'destructive' });
        return;
      }
    }

    try {
      const table = type === 'category' ? 'service_categories' : 'service_subcategories';
      const { error } = await supabase.from(table).delete().eq('id', item.id);
      if (error) throw error;
      toast({ title: `${type === 'category' ? 'Категория' : 'Подкатегория'} удалена` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" /> Категории и подкатегории
          </CardTitle>
          <Button size="sm" onClick={() => openCreate('category')}>
            <Plus className="h-4 w-4 mr-1" /> Категория
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const subs = subcategories.filter(s => s.category_id === cat.id);
                const count = masterCounts[cat.id] || 0;
                const canDelete = count === 0 && subs.length === 0;

                return (
                  <Collapsible key={cat.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        <span className="font-medium">{cat.name}</span>
                        <Badge variant="outline" className="text-xs">{subs.length} подкат.</Badge>
                        {count > 0 && <Badge variant="secondary" className="text-xs">{count} мастеров</Badge>}
                      </CollapsibleTrigger>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openCreate('subcategory', cat.id)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit('category', cat)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete('category', cat)} disabled={!canDelete}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-1">
                        {subs.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                            <div>
                              <p className="text-sm font-medium">{sub.name}</p>
                              {sub.description && <p className="text-xs text-muted-foreground">{sub.description}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit('subcategory', sub)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete('subcategory', sub)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {subs.length === 0 && <p className="text-xs text-muted-foreground p-2">Нет подкатегорий</p>}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'create' ? 'Создать' : 'Редактировать'} {dialog.type === 'category' ? 'категорию' : 'подкатегорию'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Название</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Название..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Описание</label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Описание..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(prev => ({ ...prev, open: false }))}>Отмена</Button>
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

export default CategoryManager;
