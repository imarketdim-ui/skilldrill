import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Plus, Percent, Trash2, Edit, Send, Users, Globe, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props { businessId: string; }

interface Promotion {
  id: string; name: string; description: string | null;
  discount_type: string; discount_value: number;
  applies_to: string; start_date: string | null; end_date: string | null;
  is_active: boolean; min_rating: number | null;
  required_tags: string[] | null; target_ids: string[] | null;
  created_at: string;
}

const COST_PER_CLIENT = 7;

const BusinessPromotions = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', discount_type: 'percent', discount_value: 10,
    applies_to: 'all', start_date: '', end_date: '', min_rating: '',
  });

  // Mailing dialog state
  const [mailingOpen, setMailingOpen] = useState(false);
  const [mailingPromoName, setMailingPromoName] = useState('');
  const [mailingTab, setMailingTab] = useState<'own' | 'skillspot'>('own');
  const [mailingMessage, setMailingMessage] = useState('');
  const [mailingTitle, setMailingTitle] = useState('');
  const [mailingFilter, setMailingFilter] = useState('all');
  const [skillspotFilter, setSkillspotFilter] = useState('all');
  const [skillspotCount, setSkillspotCount] = useState(100);
  const [includeOwnClients, setIncludeOwnClients] = useState(false);
  const [totalPlatformUsers, setTotalPlatformUsers] = useState(0);
  const [sending, setSending] = useState(false);

  const fetchPromotions = async () => {
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    setPromotions((data || []) as Promotion[]);
    setLoading(false);
  };

  useEffect(() => { fetchPromotions(); }, [businessId]);

  useEffect(() => {
    supabase.from('profiles').select('*', { count: 'exact', head: true }).then(({ count }) => {
      setTotalPlatformUsers(count || 0);
    });
  }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', discount_type: 'percent', discount_value: 10, applies_to: 'all', start_date: '', end_date: '', min_rating: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '',
      discount_type: p.discount_type, discount_value: p.discount_value,
      applies_to: p.applies_to,
      start_date: p.start_date ? p.start_date.split('T')[0] : '',
      end_date: p.end_date ? p.end_date.split('T')[0] : '',
      min_rating: p.min_rating?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      applies_to: form.applies_to,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      min_rating: form.min_rating ? Number(form.min_rating) : null,
      business_id: businessId,
      creator_id: user.id,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Акция обновлена' });
      } else {
        const { error } = await supabase.from('promotions').insert(payload);
        if (error) throw error;
        toast({ title: 'Акция создана' });
      }
      setDialogOpen(false);
      resetForm();
      fetchPromotions();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveAndMail = async () => {
    await handleSave();
    // Open mailing dialog for this promotion
    setMailingPromoName(form.name);
    setMailingTitle(`Акция: ${form.name}`);
    setMailingMessage(form.description ? `${form.name}\n\n${form.description}` : form.name);
    setMailingTab('own');
    setMailingFilter('all');
    setMailingOpen(true);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('promotions').update({ is_active: !active }).eq('id', id);
    fetchPromotions();
  };

  const deletePromotion = async (id: string) => {
    await supabase.from('promotions').delete().eq('id', id);
    toast({ title: 'Акция удалена' });
    fetchPromotions();
  };

  const openMailingForPromotion = (p: Promotion) => {
    setMailingPromoName(p.name);
    setMailingTitle(`Акция: ${p.name}`);
    setMailingMessage(p.description ? `${p.name}\n\n${p.description}` : p.name);
    setMailingTab('own');
    setMailingFilter('all');
    setSkillspotFilter('all');
    setSkillspotCount(100);
    setIncludeOwnClients(false);
    setMailingOpen(true);
  };

  const handleSendOwnFromPromo = async () => {
    if (!user || !mailingMessage.trim()) return;
    setSending(true);
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('client_id')
        .eq('organization_id', businessId);
      
      const clientIds = [...new Set((bookings || []).map(b => b.client_id))];
      if (clientIds.length === 0) {
        toast({ title: 'Нет клиентов для рассылки', variant: 'destructive' });
        setSending(false);
        return;
      }

      const { data: blacklisted } = await supabase
        .from('blacklists').select('blocked_id').eq('blocker_id', user.id);
      const blSet = new Set((blacklisted || []).map(b => b.blocked_id));
      const validClients = clientIds.filter(id => !blSet.has(id));

      const messages = validClients.map(id => ({
        sender_id: user.id, recipient_id: id,
        message: mailingMessage.trim(), chat_type: 'marketing',
      }));
      const { error } = await supabase.from('chat_messages').insert(messages);
      if (error) throw error;

      await supabase.from('marketing_campaigns').insert({
        creator_id: user.id, business_id: businessId,
        title: mailingTitle || 'Рассылка по акции',
        message: mailingMessage.trim(),
        target_type: 'own_clients', audience_filter: mailingFilter,
        status: 'sent', sent_count: validClients.length,
        sent_at: new Date().toISOString(),
      });

      toast({ title: 'Рассылка отправлена', description: `${validClients.length} получателей` });
      setMailingOpen(false);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const handleSubmitSkillspotFromPromo = async () => {
    if (!user || !mailingMessage.trim() || !mailingTitle.trim()) return;
    if (skillspotCount > totalPlatformUsers) {
      toast({ title: 'Превышен лимит', description: `Уменьшите количество. Зарегистрировано: ${totalPlatformUsers}`, variant: 'destructive' });
      return;
    }
    const totalCost = skillspotCount * COST_PER_CLIENT;
    const { data: balance } = await supabase.from('user_balances').select('main_balance').eq('user_id', user.id).single();
    if (!balance || balance.main_balance < totalCost) {
      toast({ title: 'Недостаточно средств', description: `Необходимо ${totalCost} ₽`, variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await supabase.from('user_balances').update({ main_balance: balance.main_balance - totalCost }).eq('user_id', user.id);
      await supabase.from('balance_transactions').insert({
        user_id: user.id, amount: -totalCost, type: 'campaign_hold',
        description: `Холд за рассылку: ${mailingTitle}`,
      });
      await supabase.from('marketing_campaigns').insert({
        creator_id: user.id, business_id: businessId,
        title: mailingTitle, message: mailingMessage.trim(),
        target_type: 'skillspot_clients', audience_filter: skillspotFilter,
        include_own_clients: includeOwnClients, target_count: skillspotCount,
        cost_per_client: COST_PER_CLIENT, total_cost: totalCost,
        hold_amount: totalCost, status: 'pending_moderation',
      });
      toast({ title: 'Заявка отправлена на модерацию', description: `Холд: ${totalCost} ₽` });
      setMailingOpen(false);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const skillspotCost = skillspotCount * COST_PER_CLIENT;
  const countExceeded = skillspotCount > totalPlatformUsers;

  const [promoTab, setPromoTab] = useState<'active' | 'archive' | 'templates'>('active');

  const activePromos = promotions.filter(p => p.is_active || (!p.end_date || new Date(p.end_date) >= new Date()));
  const archivedPromos = promotions.filter(p => !p.is_active && p.end_date && new Date(p.end_date) < new Date());

  const templates = [
    { name: 'Скидка новым клиентам', description: 'Скидка для первого визита', discount_type: 'percent', discount_value: 15, applies_to: 'new', duration_days: 30 },
    { name: 'Счастливые часы', description: 'Скидка в определённые часы', discount_type: 'percent', discount_value: 20, applies_to: 'all', duration_days: 14 },
    { name: 'VIP-привилегия', description: 'Особая скидка для VIP-клиентов', discount_type: 'percent', discount_value: 10, applies_to: 'vip', duration_days: 60 },
    { name: 'Возвращайтесь!', description: 'Скидка для давних клиентов', discount_type: 'fixed', discount_value: 500, applies_to: 'returning', duration_days: 14 },
  ];

  const createFromTemplate = (t: typeof templates[0]) => {
    const today = new Date();
    const end = new Date(today.getTime() + t.duration_days * 86400000);
    setForm({
      name: t.name, description: t.description, discount_type: t.discount_type, discount_value: t.discount_value,
      applies_to: t.applies_to, start_date: format(today, 'yyyy-MM-dd'), end_date: format(end, 'yyyy-MM-dd'), min_rating: '',
    });
    setEditing(null);
    setDialogOpen(true);
  };

  const renderPromoCard = (p: Promotion) => (
    <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{p.name}</p>
              <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Активна' : 'Неактивна'}</Badge>
              <Badge variant="outline">{p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value} ₽`}</Badge>
            </div>
            {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {p.start_date && <span>С {format(new Date(p.start_date), 'dd.MM.yyyy')}</span>}
              {p.end_date && <span>До {format(new Date(p.end_date), 'dd.MM.yyyy')}</span>}
              <span>Для: {p.applies_to === 'all' ? 'Всех' : p.applies_to === 'vip' ? 'VIP' : p.applies_to === 'new' ? 'Новых' : p.applies_to}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Создать рассылку" onClick={() => openMailingForPromotion(p)}><Send className="h-4 w-4" /></Button>
            <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deletePromotion(p.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Акции и скидки</h3>
        <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> Новая акция</Button>
      </div>

      <Tabs value={promoTab} onValueChange={v => setPromoTab(v as any)}>
        <TabsList>
          <TabsTrigger value="active">Активные{activePromos.length > 0 ? ` (${activePromos.length})` : ''}</TabsTrigger>
          <TabsTrigger value="archive">Архив{archivedPromos.length > 0 ? ` (${archivedPromos.length})` : ''}</TabsTrigger>
          <TabsTrigger value="templates">Типовые акции</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
      ) : promoTab === 'templates' ? (
        <div className="grid gap-3">
          {templates.map((t, i) => (
            <Card key={i} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => createFromTemplate(t)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{t.discount_type === 'percent' ? `${t.discount_value}%` : `${t.discount_value} ₽`}</Badge>
                      <Badge variant="secondary">{t.duration_days} дн.</Badge>
                      <Badge variant="secondary">{t.applies_to === 'all' ? 'Все' : t.applies_to === 'new' ? 'Новые' : t.applies_to === 'vip' ? 'VIP' : 'Возвращающиеся'}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Создать</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : promoTab === 'archive' ? (
        archivedPromos.length === 0 ? (
          <Card><CardContent className="text-center py-12 text-muted-foreground">Архив пуст</CardContent></Card>
        ) : (
          <div className="grid gap-3">{archivedPromos.map(renderPromoCard)}</div>
        )
      ) : activePromos.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Нет активных акций</p>
          <p className="text-sm text-muted-foreground mt-1">Создайте акцию или выберите из типовых</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">{activePromos.map(renderPromoCard)}</div>
      )}

      {/* Promotion Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать акцию' : 'Новая акция'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Скидка 20% новым клиентам" />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Подробности акции..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Тип скидки</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Процент (%)</SelectItem>
                    <SelectItem value="fixed">Фиксированная (₽)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Размер скидки</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Применяется к</Label>
              <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все клиенты</SelectItem>
                  <SelectItem value="new">Новые клиенты</SelectItem>
                  <SelectItem value="vip">VIP клиенты</SelectItem>
                  <SelectItem value="returning">Повторные</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Дата начала</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Дата окончания</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Мин. рейтинг клиента (необязательно)</Label>
              <Input type="number" value={form.min_rating} onChange={e => setForm(f => ({ ...f, min_rating: e.target.value }))} placeholder="Например, 60" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSave}>{editing ? 'Сохранить' : 'Создать акцию'}</Button>
              {!editing && (
                <Button variant="outline" className="gap-1" onClick={handleSaveAndMail}>
                  <Send className="h-4 w-4" /> Создать и разослать
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mailing Dialog for Promotion */}
      <Dialog open={mailingOpen} onOpenChange={setMailingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Рассылка: {mailingPromoName}</DialogTitle>
          </DialogHeader>

          <Tabs value={mailingTab} onValueChange={v => setMailingTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="own" className="flex-1 gap-1"><Users className="h-4 w-4" />Своим клиентам</TabsTrigger>
              <TabsTrigger value="skillspot" className="flex-1 gap-1"><Globe className="h-4 w-4" />Клиентам SkillSpot</TabsTrigger>
            </TabsList>

            <div className="space-y-4 pt-4">
              <div>
                <Label>Заголовок</Label>
                <Input value={mailingTitle} onChange={e => setMailingTitle(e.target.value)} />
              </div>
              <div>
                <Label>Текст сообщения *</Label>
                <Textarea value={mailingMessage} onChange={e => setMailingMessage(e.target.value)} className="min-h-[80px]" />
              </div>

              <TabsContent value="own" className="mt-0 space-y-3">
                <div>
                  <Label>Фильтр аудитории</Label>
                  <Select value={mailingFilter} onValueChange={setMailingFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все клиенты</SelectItem>
                      <SelectItem value="new">Новые</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="regular">Постоянные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">Бесплатно</Badge>
              </TabsContent>

              <TabsContent value="skillspot" className="mt-0 space-y-3">
                <div className="p-3 rounded-lg bg-muted border text-sm text-muted-foreground">
                  Рассылка клиентам платформы. Стоимость: <strong>{COST_PER_CLIENT} ₽/клиент</strong>. Заявка на модерации.
                </div>
                <div>
                  <Label>Параметры аудитории</Label>
                  <Select value={skillspotFilter} onValueChange={setSkillspotFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Вся база</SelectItem>
                      <SelectItem value="new">Новые</SelectItem>
                      <SelectItem value="stable">Стабильные</SelectItem>
                      <SelectItem value="high_rating">Высокий рейтинг</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="excOwn2" checked={!includeOwnClients} onCheckedChange={v => setIncludeOwnClients(!v)} />
                  <label htmlFor="excOwn2" className="text-sm cursor-pointer">Исключить своих клиентов</label>
                </div>
                <div>
                  <Label>Количество клиентов</Label>
                  <Input type="number" min={1} value={skillspotCount} onChange={e => setSkillspotCount(Number(e.target.value) || 0)} />
                  {countExceeded && (
                    <div className="flex items-center gap-1 mt-1 text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <p className="text-xs">Уменьшите количество. Зарегистрировано: {totalPlatformUsers}</p>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Стоимость:</span>
                    <span className="font-bold">{skillspotCost.toLocaleString()} ₽</span>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMailingOpen(false)}>Отмена</Button>
            {mailingTab === 'own' ? (
              <Button onClick={handleSendOwnFromPromo} disabled={!mailingMessage.trim() || sending} className="gap-1">
                <Send className="h-4 w-4" />{sending ? 'Отправка...' : 'Отправить'}
              </Button>
            ) : (
              <Button onClick={handleSubmitSkillspotFromPromo} disabled={!mailingMessage.trim() || !mailingTitle.trim() || sending || countExceeded || skillspotCount <= 0} className="gap-1">
                <Clock className="h-4 w-4" />{sending ? 'Отправка...' : 'На модерацию'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessPromotions;
