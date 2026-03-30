import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Save, Settings2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { businessId: string; }

interface PenaltySettings {
  no_show_amount: number;
  late_cancel_amount: number;
  reschedule_amount: number;
  enabled: boolean;
}

const defaultSettings: PenaltySettings = { no_show_amount: 500, late_cancel_amount: 300, reschedule_amount: 0, enabled: false };

const BusinessPenalties = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PenaltySettings>(defaultSettings);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(`penalty_settings_${businessId}`);
    if (saved) try { setSettings(JSON.parse(saved)); } catch {}
    fetchPenalties();
  }, [businessId]);

  const fetchPenalties = async () => {
    const { data } = await supabase
      .from('business_finances')
      .select('*, master:profiles!business_finances_master_id_fkey(first_name, last_name)')
      .eq('business_id', businessId)
      .eq('category', 'penalty')
      .order('date', { ascending: false })
      .limit(50);
    setPenalties(data || []);
    setLoading(false);
  };

  const saveSettings = () => {
    localStorage.setItem(`penalty_settings_${businessId}`, JSON.stringify(settings));
    toast({ title: 'Настройки штрафов сохранены' });
  };

  const totalPenalties = penalties.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6" /> Штрафы клиентов</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> Настройки штрафов</CardTitle>
          <CardDescription>Суммы штрафов за нарушения клиентов</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Штрафы включены</Label>
            <Switch checked={settings.enabled} onCheckedChange={v => setSettings(p => ({ ...p, enabled: v }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Неявка (₽)</Label>
              <Input type="number" value={settings.no_show_amount} onChange={e => setSettings(p => ({ ...p, no_show_amount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Поздняя отмена (₽)</Label>
              <Input type="number" value={settings.late_cancel_amount} onChange={e => setSettings(p => ({ ...p, late_cancel_amount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Перенос (₽)</Label>
              <Input type="number" value={settings.reschedule_amount} onChange={e => setSettings(p => ({ ...p, reschedule_amount: Number(e.target.value) }))} />
            </div>
          </div>
          <Button onClick={saveSettings} size="sm"><Save className="h-4 w-4 mr-1" /> Сохранить</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">История штрафов</CardTitle>
          <CardDescription>Всего начислено: {totalPenalties.toLocaleString()} ₽</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-center py-8">Загрузка...</p> :
           penalties.length === 0 ? <p className="text-muted-foreground text-center py-8">Штрафов пока нет</p> : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {penalties.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{p.description || 'Штраф'}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(p.date), 'd MMM yyyy', { locale: ru })}</p>
                  </div>
                  <Badge variant="destructive">{Number(p.amount).toLocaleString()} ₽</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessPenalties;
