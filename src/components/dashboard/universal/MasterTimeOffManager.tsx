import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CalendarOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TimeOff {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

const MasterTimeOffManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('master_time_off')
      .select('id, start_date, end_date, reason')
      .eq('master_id', user.id)
      .order('start_date', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleAdd = async () => {
    if (!user || !start || !end) return;
    if (end < start) {
      toast({ title: 'Дата окончания раньше начала', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('master_time_off').insert({
      master_id: user.id,
      start_date: start,
      end_date: end,
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    setStart(''); setEnd(''); setReason('');
    toast({ title: 'Период добавлен' });
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('master_time_off').delete().eq('id', id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Удалено' });
    load();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5 text-primary" /> Выходные и отпуск
        </CardTitle>
        <CardDescription>
          Дни и периоды, в которые вы не принимаете записи. Эти даты автоматически скроются в каталоге и при бронировании.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">С</Label>
            <Input type="date" min={today} value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">По</Label>
            <Input type="date" min={start || today} value={end} onChange={e => setEnd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Причина (опц.)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Отпуск, болезнь..." />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={!start || !end || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Добавить период
        </Button>

        <div className="pt-2">
          <p className="text-sm font-medium mb-2">Запланированные периоды</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет запланированных выходных</p>
          ) : (
            <div className="space-y-2">
              {items.map(it => {
                const isPast = it.end_date < today;
                return (
                  <div key={it.id} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {format(parseISO(it.start_date), 'd MMM yyyy', { locale: ru })}
                          {it.start_date !== it.end_date && ` — ${format(parseISO(it.end_date), 'd MMM yyyy', { locale: ru })}`}
                        </span>
                        {isPast && <Badge variant="outline" className="text-[10px]">прошёл</Badge>}
                      </div>
                      {it.reason && <p className="text-xs text-muted-foreground truncate">{it.reason}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(it.id)} className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MasterTimeOffManager;
