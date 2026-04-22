import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users, Megaphone, User, Globe, AlertTriangle, Clock, CheckCircle, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props { businessId: string; }

interface ClientInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  booking_count: number;
  last_visit: string | null;
  tags: string[];
}

const COST_PER_CLIENT = 7;

const BusinessMarketing = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Mailing dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mailingTab, setMailingTab] = useState<'own' | 'skillspot'>('own');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [sendPush, setSendPush] = useState(true);

  // Own clients targeting
  const [ownTarget, setOwnTarget] = useState<'all' | 'selected' | 'group'>('all');
  const [ownGroupFilter, setOwnGroupFilter] = useState('all');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // SkillSpot-wide targeting
  const [skillspotFilter, setSkillspotFilter] = useState('all');
  const [skillspotCount, setSkillspotCount] = useState(100);
  const [includeOwnClients, setIncludeOwnClients] = useState(false);
  const [totalPlatformUsers, setTotalPlatformUsers] = useState(0);

  // Linked promotion
  const [linkedPromotionId, setLinkedPromotionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchClients();
    fetchCampaigns();
    fetchPlatformUserCount();
  }, [user, businessId]);

  const fetchClients = async () => {
    setLoadingClients(true);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('client_id, scheduled_at')
      .eq('organization_id', businessId);

    if (!bookings || bookings.length === 0) { setClients([]); setLoadingClients(false); return; }

    const clientMap = new Map<string, { count: number; lastVisit: string | null }>();
    bookings.forEach(b => {
      const existing = clientMap.get(b.client_id);
      if (existing) {
        existing.count++;
        if (!existing.lastVisit || b.scheduled_at > existing.lastVisit) existing.lastVisit = b.scheduled_at;
      } else {
        clientMap.set(b.client_id, { count: 1, lastVisit: b.scheduled_at });
      }
    });

    const clientIds = [...clientMap.keys()];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', clientIds.slice(0, 500));

    const { data: tags } = await supabase
      .from('client_tags')
      .select('client_id, tag')
      .in('client_id', clientIds.slice(0, 500));

    const tagMap = new Map<string, string[]>();
    (tags || []).forEach(t => {
      const arr = tagMap.get(t.client_id) || [];
      arr.push(t.tag);
      tagMap.set(t.client_id, arr);
    });

    const { data: blacklisted } = await supabase
      .from('blacklists')
      .select('blocked_id')
      .eq('blocker_id', user!.id);
    const blSet = new Set((blacklisted || []).map(b => b.blocked_id));

    const result: ClientInfo[] = (profiles || [])
      .filter(p => !blSet.has(p.id))
      .map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
        booking_count: clientMap.get(p.id)?.count || 0,
        last_visit: clientMap.get(p.id)?.lastVisit || null,
        tags: tagMap.get(p.id) || [],
      }));

    setClients(result);
    setLoadingClients(false);
  };

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    const { data } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('creator_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setCampaigns(data || []);
    setLoadingCampaigns(false);
  };

  const fetchPlatformUserCount = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    setTotalPlatformUsers(count || 0);
  };

  const getFilteredOwnClients = () => {
    if (ownTarget === 'selected') return clients.filter(c => selectedClientIds.has(c.id));
    if (ownTarget === 'group') {
      switch (ownGroupFilter) {
        case 'new': return clients.filter(c => c.booking_count <= 1);
        case 'vip': return clients.filter(c => c.tags.includes('vip'));
        case 'regular': return clients.filter(c => c.booking_count >= 3);
        default: return clients;
      }
    }
    return clients;
  };

  const toggleClient = (id: string) => {
    const next = new Set(selectedClientIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedClientIds(next);
  };

  const selectAllClients = (select: boolean) => {
    if (select) setSelectedClientIds(new Set(clients.map(c => c.id)));
    else setSelectedClientIds(new Set());
  };

  const handleSendOwn = async () => {
    if (!user || !message.trim()) return;
    setSending(true);
    try {
      const targetClients = getFilteredOwnClients();
      if (targetClients.length === 0) {
        toast({ title: 'Нет получателей', variant: 'destructive' });
        setSending(false);
        return;
      }

      const messages = targetClients.map(c => ({
        sender_id: user.id,
        recipient_id: c.id,
        message: message.trim(),
        chat_type: 'marketing',
      }));

      const { error } = await supabase.from('chat_messages').insert(messages);
      if (error) throw error;

      // Save campaign record
      await supabase.from('marketing_campaigns').insert({
        creator_id: user.id,
        business_id: businessId,
        title: title.trim() || 'Рассылка клиентам',
        message: message.trim(),
        target_type: 'own_clients',
        audience_filter: ownTarget === 'group' ? ownGroupFilter : ownTarget,
        selected_client_ids: ownTarget === 'selected' ? [...selectedClientIds] : [],
        status: 'sent',
        sent_count: targetClients.length,
        sent_at: new Date().toISOString(),
      });

      toast({ title: 'Рассылка отправлена', description: `${targetClients.length} получателей` });
      setDialogOpen(false);
      resetDialog();
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const handleSubmitSkillspot = async () => {
    if (!user || !message.trim() || !title.trim()) return;
    
    if (skillspotCount > totalPlatformUsers) {
      toast({
        title: 'Превышен лимит',
        description: `Уменьшите количество пользователей. Зарегистрировано: ${totalPlatformUsers}`,
        variant: 'destructive',
      });
      return;
    }

    const totalCost = skillspotCount * COST_PER_CLIENT;

    // Check balance
    const { data: balance } = await supabase
      .from('user_balances')
      .select('main_balance')
      .eq('user_id', user.id)
      .single();

    if (!balance || balance.main_balance < totalCost) {
      toast({
        title: 'Недостаточно средств',
        description: `Необходимо ${totalCost} ₽ на балансе. Текущий баланс: ${balance?.main_balance || 0} ₽`,
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      // Hold amount from balance
      const { error: holdError } = await supabase
        .from('user_balances')
        .update({ main_balance: balance.main_balance - totalCost })
        .eq('user_id', user.id);
      if (holdError) throw holdError;

      // Record hold transaction
      await supabase.from('balance_transactions').insert({
        user_id: user.id,
        amount: -totalCost,
        type: 'campaign_hold',
        description: `Холд за рассылку: ${title.trim()}`,
      });

      // Create campaign
      const { error } = await supabase.from('marketing_campaigns').insert({
        creator_id: user.id,
        business_id: businessId,
        title: title.trim(),
        message: message.trim(),
        target_type: 'skillspot_clients',
        audience_filter: skillspotFilter,
        include_own_clients: includeOwnClients,
        target_count: skillspotCount,
        cost_per_client: COST_PER_CLIENT,
        total_cost: totalCost,
        hold_amount: totalCost,
        status: 'pending_moderation',
      });
      if (error) throw error;

      toast({
        title: 'Заявка на рассылку отправлена',
        description: `Сумма ${totalCost} ₽ захолдирована. Ожидайте одобрения модератора.`,
      });
      setDialogOpen(false);
      resetDialog();
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const resetDialog = () => {
    setMessage('');
    setTitle('');
    setOwnTarget('all');
    setOwnGroupFilter('all');
    setSelectedClientIds(new Set());
    setSkillspotFilter('all');
    setSkillspotCount(100);
    setIncludeOwnClients(false);
    setMailingTab('own');
  };

  const openDialogFromPromotion = (promotionName?: string) => {
    resetDialog();
    if (promotionName) setTitle(`Акция: ${promotionName}`);
    setDialogOpen(true);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'sent': return { label: 'Отправлена', variant: 'default' as const };
      case 'pending_moderation': return { label: 'На модерации', variant: 'secondary' as const };
      case 'approved': return { label: 'Одобрена', variant: 'default' as const };
      case 'rejected': return { label: 'Отклонена', variant: 'destructive' as const };
      case 'cancelled': return { label: 'Отменена', variant: 'outline' as const };
      default: return { label: 'Черновик', variant: 'outline' as const };
    }
  };

  const skillspotCost = skillspotCount * COST_PER_CLIENT;
  const countExceeded = skillspotCount > totalPlatformUsers;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Маркетинг
        </h3>
        <Button size="sm" onClick={() => { resetDialog(); setDialogOpen(true); }} className="gap-1">
          <Send className="h-4 w-4" /> Новая рассылка
        </Button>
      </div>

      {/* Tips */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium mb-3">Рассылки</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Своим клиентам</strong> — бесплатно, отправка конкретному клиенту или группе</li>
            <li>• <strong>Клиентам SkillSpot</strong> — платная рассылка ({COST_PER_CLIENT} ₽/клиент), на модерации</li>
            <li>• Клиенты из чёрного списка автоматически исключаются</li>
          </ul>
        </CardContent>
      </Card>

      {/* Campaign history */}
      <h4 className="font-medium">История рассылок</h4>
      {loadingCampaigns ? (
        <p className="text-center py-4 text-muted-foreground">Загрузка...</p>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Нет рассылок</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {campaigns.map(c => {
            const st = statusLabel(c.status);
            return (
              <Card key={c.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{c.title}</p>
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {c.target_type === 'skillspot_clients' && <Badge variant="outline"><Globe className="h-3 w-3 mr-1" />SkillSpot</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(c.created_at), 'dd.MM.yyyy HH:mm')}</span>
                        {c.sent_count > 0 && <span>{c.sent_count} получателей</span>}
                        {c.total_cost > 0 && <span>{c.total_cost} ₽</span>}
                      </div>
                      {c.moderator_comment && (
                        <p className="text-xs mt-2 px-2 py-1 rounded bg-muted">
                          Модератор: {c.moderator_comment}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mailing Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Новая рассылка</DialogTitle>
          </DialogHeader>

          <Tabs value={mailingTab} onValueChange={v => setMailingTab(v as 'own' | 'skillspot')} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="own" className="flex-1 gap-1"><Users className="h-4 w-4" />Свои клиенты</TabsTrigger>
              <TabsTrigger value="skillspot" className="flex-1 gap-1"><Globe className="h-4 w-4" />SkillSpot</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto space-y-4 pt-4">
              {/* Common fields */}
              <div>
                <Label>Заголовок</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название рассылки" />
              </div>
              <div>
                <Label>Текст сообщения *</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="min-h-[80px]"
                />
              </div>

              <TabsContent value="own" className="mt-0 space-y-4">
                <div>
                  <Label>Получатели</Label>
                  <Select value={ownTarget} onValueChange={v => setOwnTarget(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все клиенты ({clients.length})</SelectItem>
                      <SelectItem value="group">Группа (по фильтру)</SelectItem>
                      <SelectItem value="selected">Выбранные вручную</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ownTarget === 'group' && (
                  <div>
                    <Label>Фильтр группы</Label>
                    <Select value={ownGroupFilter} onValueChange={setOwnGroupFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="new">Новые (≤1 визит)</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="regular">Постоянные (3+ визитов)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Получателей: {getFilteredOwnClients().length}
                    </p>
                  </div>
                )}

                {ownTarget === 'selected' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Выберите клиентов ({selectedClientIds.size})</Label>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => selectAllClients(true)}>Все</Button>
                        <Button variant="ghost" size="sm" onClick={() => selectAllClients(false)}>Снять</Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-md p-2">
                      {loadingClients ? (
                        <p className="text-sm text-muted-foreground p-2">Загрузка...</p>
                      ) : clients.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">Нет клиентов</p>
                      ) : (
                        <div className="space-y-1">
                          {clients.map(c => (
                            <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                              <Checkbox
                                checked={selectedClientIds.has(c.id)}
                                onCheckedChange={() => toggleClient(c.id)}
                              />
                              <span className="text-sm flex-1 truncate">
                                {c.first_name || ''} {c.last_name || ''}{!c.first_name && !c.last_name ? 'Без имени' : ''}
                              </span>
                              <span className="text-xs text-muted-foreground">{c.booking_count} визитов</span>
                              {c.tags.includes('vip') && <Badge variant="secondary" className="text-[10px] px-1 py-0">VIP</Badge>}
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Получателей: <strong>{ownTarget === 'selected' ? selectedClientIds.size : getFilteredOwnClients().length}</strong>
                  </p>
                  <Badge variant="outline" className="text-green-600 border-green-600">Бесплатно</Badge>
                </div>
              </TabsContent>

              <TabsContent value="skillspot" className="mt-0 space-y-4">
                <div className="p-3 rounded-lg bg-muted border">
                  <p className="text-sm text-muted-foreground">
                    Рассылка клиентам платформы SkillSpot. Заявка отправляется на модерацию. Стоимость: <strong>{COST_PER_CLIENT} ₽ за клиента</strong>.
                  </p>
                </div>

                <div>
                  <Label>Параметры аудитории</Label>
                  <Select value={skillspotFilter} onValueChange={setSkillspotFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Вся база</SelectItem>
                      <SelectItem value="new">Новые пользователи</SelectItem>
                      <SelectItem value="stable">Стабильные клиенты</SelectItem>
                      <SelectItem value="high_rating">Высокий рейтинг</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="excludeOwn"
                    checked={!includeOwnClients}
                    onCheckedChange={v => setIncludeOwnClients(!v)}
                  />
                  <label htmlFor="excludeOwn" className="text-sm cursor-pointer">Исключить своих клиентов</label>
                </div>

                <div>
                  <Label>Количество клиентов</Label>
                  <Input
                    type="number"
                    min={1}
                    value={skillspotCount}
                    onChange={e => setSkillspotCount(Number(e.target.value) || 0)}
                  />
                  {countExceeded && (
                    <div className="flex items-center gap-1 mt-1 text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <p className="text-xs">
                        Уменьшите количество. Зарегистрировано: {totalPlatformUsers}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Стоимость рассылки:</span>
                    <span className="font-bold text-lg">{skillspotCost.toLocaleString()} ₽</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {skillspotCount} × {COST_PER_CLIENT} ₽ — сумма будет захолдирована с баланса
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            {mailingTab === 'own' ? (
              <Button
                onClick={handleSendOwn}
                disabled={!message.trim() || sending || (ownTarget === 'selected' && selectedClientIds.size === 0)}
                className="gap-1"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Отправка...' : 'Отправить'}
              </Button>
            ) : (
              <Button
                onClick={handleSubmitSkillspot}
                disabled={!message.trim() || !title.trim() || sending || countExceeded || skillspotCount <= 0}
                className="gap-1"
              >
                <Clock className="h-4 w-4" />
                {sending ? 'Отправка...' : 'На модерацию'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessMarketing;
