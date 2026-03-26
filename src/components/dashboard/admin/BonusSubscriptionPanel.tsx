import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  stats: { masters: number; businesses: number; networks: number };
  onNavigate?: (view: string) => void;
}

const ENTITY_TYPES = [
  { value: 'master', label: 'Мастер', table: 'master_profiles', idField: 'user_id' },
  { value: 'business', label: 'Бизнес', table: 'business_locations', idField: 'owner_id' },
  { value: 'network', label: 'Сеть', table: 'networks', idField: 'owner_id' },
];

const DURATIONS = [
  { value: '7', label: '7 дней' },
  { value: '14', label: '14 дней' },
  { value: '30', label: '1 месяц' },
];

const BonusSubscriptionPanel = ({ stats, onNavigate }: Props) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [entityType, setEntityType] = useState('master');
  const [duration, setDuration] = useState('14');
  const [submitting, setSubmitting] = useState(false);

  const searchEntity = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    setSearchResult(null);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, skillspot_id')
      .eq('skillspot_id', searchId.trim().toUpperCase())
      .maybeSingle();

    if (!profile) {
      toast({ title: 'Пользователь не найден', variant: 'destructive' });
      setSearching(false);
      return;
    }

    const cfg = ENTITY_TYPES.find(e => e.value === entityType)!;
    const selectFields = entityType === 'master'
      ? 'id, subscription_status, trial_start_date, trial_days'
      : 'id, subscription_status, trial_start_date, trial_days, name';
    const { data: entity } = await supabase
      .from(cfg.table as any)
      .select(selectFields)
      .eq(cfg.idField, profile.id)
      .maybeSingle();

    if (entity) {
      const entityName = entityType === 'master'
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : (entity as any).name;
      setSearchResult({ id: (entity as any).id, subscription_status: (entity as any).subscription_status, name: entityName, profile });
    } else {
      setSearchResult({ profile, notFound: true });
    }
    setSearching(false);
  };

  const activateBonus = async () => {
    if (!searchResult || searchResult.notFound || submitting) return;
    setSubmitting(true);

    const cfg = ENTITY_TYPES.find(e => e.value === entityType)!;
    const days = Number(duration);

    try {
      const { error } = await supabase
        .from(cfg.table as any)
        .update({
          subscription_status: 'active',
          trial_start_date: new Date().toISOString(),
          trial_days: days,
        } as any)
        .eq('id', searchResult.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: searchResult.profile.id,
        type: 'bonus_subscription',
        title: 'Бонусная подписка активирована',
        message: `Вам предоставлена бонусная подписка на ${days} дней.`,
      });

      toast({ title: 'Бонусная подписка активирована', description: `${days} дней для ${searchResult.profile.first_name} ${searchResult.profile.last_name}` });
      setDialogOpen(false);
      setSearchResult(null);
      setSearchId('');
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Подписки</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Gift className="h-4 w-4" /> Бонусная подписка</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Активировать бонусную подписку</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Тип сущности</Label>
                  <Select value={entityType} onValueChange={v => { setEntityType(v); setSearchResult(null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SkillSpot ID владельца</Label>
                  <div className="flex gap-2">
                    <Input placeholder="AB1234" value={searchId} onChange={e => setSearchId(e.target.value)} />
                    <Button onClick={searchEntity} disabled={searching}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {searchResult && !searchResult.notFound && (
                  <div className="p-3 rounded-lg border space-y-2">
                    <p className="font-medium">{searchResult.profile.first_name} {searchResult.profile.last_name}</p>
                    {searchResult.name && <p className="text-sm text-muted-foreground">{searchResult.name}</p>}
                    <Badge variant="secondary">{searchResult.subscription_status}</Badge>
                  </div>
                )}
                {searchResult?.notFound && (
                  <p className="text-sm text-destructive">У этого пользователя нет профиля типа «{ENTITY_TYPES.find(e => e.value === entityType)?.label}»</p>
                )}
                <div className="space-y-2">
                  <Label>Длительность</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={activateBonus} disabled={!searchResult || searchResult.notFound || submitting}>
                  {submitting ? 'Активация...' : 'Активировать'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <button
            className="p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            onClick={() => onNavigate?.('sub_masters')}
          >
            <p className="font-medium">Мастера</p>
            <p className="text-sm text-muted-foreground">690 ₽/мес</p>
            <p className="text-2xl font-bold mt-2">{stats.masters}</p>
            {onNavigate && <p className="text-xs text-muted-foreground mt-1">Подробнее →</p>}
          </button>
          <button
            className="p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            onClick={() => onNavigate?.('sub_businesses')}
          >
            <p className="font-medium">Бизнесы</p>
            <p className="text-sm text-muted-foreground">от 2 490 ₽/мес</p>
            <p className="text-2xl font-bold mt-2">{stats.businesses}</p>
            {onNavigate && <p className="text-xs text-muted-foreground mt-1">Подробнее →</p>}
          </button>
          <button
            className="p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            onClick={() => onNavigate?.('sub_networks')}
          >
            <p className="font-medium">Сети</p>
            <p className="text-sm text-muted-foreground">от 6 490 ₽/мес</p>
            <p className="text-2xl font-bold mt-2">{stats.networks}</p>
            {onNavigate && <p className="text-xs text-muted-foreground mt-1">Подробнее →</p>}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BonusSubscriptionPanel;
