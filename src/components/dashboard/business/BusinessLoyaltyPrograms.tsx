import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Award, Plus, Pencil, Trash2, Users, Loader2, Gift, Percent, Coins, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

interface Props { businessId: string }

interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  program_type: 'cashback' | 'points' | 'discount' | 'subscription';
  is_active: boolean;
  config: any;
  created_at: string;
}

interface Membership {
  id: string;
  client_id: string;
  program_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  joined_at: string;
  client_name?: string;
}

const TYPE_META = {
  cashback: { icon: Coins, label: 'Кэшбэк', color: 'bg-amber-500/10 text-amber-700' },
  points: { icon: Award, label: 'Баллы', color: 'bg-purple-500/10 text-purple-700' },
  discount: { icon: Percent, label: 'Скидка', color: 'bg-green-500/10 text-green-700' },
  subscription: { icon: CalendarClock, label: 'Абонемент', color: 'bg-blue-500/10 text-blue-700' },
} as const;

const BusinessLoyaltyPrograms = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Record<string, Membership[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyProgram | null>(null);
  const [tab, setTab] = useState<'programs' | 'members'>('programs');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'cashback' | 'points' | 'discount' | 'subscription'>('cashback');
  const [percent, setPercent] = useState(5);
  const [pointsPerRuble, setPointsPerRuble] = useState(1);
  const [validityDays, setValidityDays] = useState(30);
  const [visitsCount, setVisitsCount] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPrograms(); }, [businessId]);

  const fetchPrograms = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    setPrograms((data as any) || []);
    setLoading(false);
  };

  const fetchMembers = async (programId: string) => {
    const { data: m } = await supabase
      .from('loyalty_memberships')
      .select('*')
      .eq('program_id', programId)
      .order('joined_at', { ascending: false });

    if (!m || m.length === 0) {
      setMemberships(prev => ({ ...prev, [programId]: [] }));
      return;
    }
    const clientIds = m.map((x: any) => x.client_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', clientIds);

    const enriched = m.map((x: any) => {
      const p = profiles?.find(pr => pr.id === x.client_id);
      return { ...x, client_name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Клиент' : 'Клиент' };
    });
    setMemberships(prev => ({ ...prev, [programId]: enriched }));
  };

  const openCreate = () => {
    setEditing(null);
    setName(''); setType('cashback'); setPercent(5); setPointsPerRuble(1); setValidityDays(30); setVisitsCount(10);
    setDialogOpen(true);
  };

  const openEdit = (p: LoyaltyProgram) => {
    setEditing(p);
    setName(p.name);
    setType(p.program_type);
    setPercent(p.config?.percent ?? 5);
    setPointsPerRuble(p.config?.points_per_ruble ?? 1);
    setValidityDays(p.config?.validity_days ?? 30);
    setVisitsCount(p.config?.visits_count ?? 10);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Введите название программы', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const config: any = {};
    if (type === 'cashback' || type === 'discount') config.percent = percent;
    if (type === 'points') config.points_per_ruble = pointsPerRuble;
    if (type === 'subscription') { config.validity_days = validityDays; config.visits_count = visitsCount; }

    const payload = { business_id: businessId, name: name.trim(), program_type: type, config, is_active: true };
    const { error } = editing
      ? await supabase.from('loyalty_programs').update(payload).eq('id', editing.id)
      : await supabase.from('loyalty_programs').insert(payload);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Программа обновлена' : 'Программа создана' });
      setDialogOpen(false);
      fetchPrograms();
    }
    setSaving(false);
  };

  const toggleActive = async (p: LoyaltyProgram) => {
    await supabase.from('loyalty_programs').update({ is_active: !p.is_active }).eq('id', p.id);
    fetchPrograms();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить программу лояльности? Все участники потеряют баллы.')) return;
    await supabase.from('loyalty_programs').delete().eq('id', id);
    toast({ title: 'Программа удалена' });
    fetchPrograms();
  };

  const renderConfigSummary = (p: LoyaltyProgram) => {
    if (p.program_type === 'cashback') return `${p.config?.percent || 0}% кэшбэка с каждого визита`;
    if (p.program_type === 'discount') return `Скидка ${p.config?.percent || 0}% постоянным клиентам`;
    if (p.program_type === 'points') return `${p.config?.points_per_ruble || 1} балл за рубль`;
    if (p.program_type === 'subscription') return `${p.config?.visits_count || 0} визитов на ${p.config?.validity_days || 0} дней`;
    return '';
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6" /> Программы лояльности
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Удерживайте клиентов через кэшбэк, баллы, скидки и абонементы
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Новая программа
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="programs">Программы ({programs.length})</TabsTrigger>
          <TabsTrigger value="members">Участники</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4 mt-4">
          {programs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Программ лояльности ещё нет</p>
                <p className="text-sm mt-1">Создайте первую, чтобы поощрять постоянных клиентов</p>
              </CardContent>
            </Card>
          ) : (
            programs.map(p => {
              const meta = TYPE_META[p.program_type];
              const Icon = meta.icon;
              return (
                <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${meta.color} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{p.name}</h3>
                        <Badge variant="secondary">{meta.label}</Badge>
                        {!p.is_active && <Badge variant="outline">Отключена</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{renderConfigSummary(p)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Создана: {format(new Date(p.created_at), 'dd.MM.yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      <Button size="icon" variant="ghost" onClick={() => { setSelectedProgramId(p.id); fetchMembers(p.id); setTab('members'); }}>
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Label>Программа:</Label>
            <Select value={selectedProgramId || ''} onValueChange={(v) => { setSelectedProgramId(v); fetchMembers(v); }}>
              <SelectTrigger className="w-[300px]"><SelectValue placeholder="Выберите программу..." /></SelectTrigger>
              <SelectContent>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedProgramId && (
            <Card>
              <CardHeader><CardTitle className="text-base">Участники программы</CardTitle></CardHeader>
              <CardContent>
                {(memberships[selectedProgramId] || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Пока нет участников</p>
                ) : (
                  <div className="space-y-2">
                    {memberships[selectedProgramId].map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{m.client_name}</p>
                          <p className="text-xs text-muted-foreground">с {format(new Date(m.joined_at), 'dd.MM.yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{m.balance.toLocaleString('ru-RU')}</p>
                          <p className="text-xs text-muted-foreground">всего: {m.total_earned}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Редактировать программу' : 'Новая программа лояльности'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Например: VIP-кэшбэк" />
            </div>
            <div>
              <Label>Тип программы</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashback">Кэшбэк (% возврата)</SelectItem>
                  <SelectItem value="points">Баллы за визиты</SelectItem>
                  <SelectItem value="discount">Постоянная скидка</SelectItem>
                  <SelectItem value="subscription">Абонемент (N визитов)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(type === 'cashback' || type === 'discount') && (
              <div>
                <Label>Процент</Label>
                <Input type="number" min={1} max={100} value={percent} onChange={e => setPercent(parseInt(e.target.value) || 0)} />
              </div>
            )}
            {type === 'points' && (
              <div>
                <Label>Баллов за 1 ₽</Label>
                <Input type="number" min={0.1} step={0.1} value={pointsPerRuble} onChange={e => setPointsPerRuble(parseFloat(e.target.value) || 0)} />
              </div>
            )}
            {type === 'subscription' && (
              <>
                <div>
                  <Label>Количество визитов</Label>
                  <Input type="number" min={1} value={visitsCount} onChange={e => setVisitsCount(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Срок действия (дней)</Label>
                  <Input type="number" min={1} value={validityDays} onChange={e => setValidityDays(parseInt(e.target.value) || 0)} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessLoyaltyPrograms;
