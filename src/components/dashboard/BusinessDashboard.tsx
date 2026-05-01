import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Users, ClipboardList, Calendar, DollarSign, Settings,
  ArrowRightLeft, UserPlus, AlertTriangle, MessageSquare, LayoutDashboard,
  CreditCard, Package, Percent, Megaphone, BarChart3, Bell, Database,
  PanelLeftClose, PanelLeftOpen, Wallet, Briefcase, Plus, Trash2, Shield,
  Search, User, Merge, Gift, Ticket, Globe, Award, Lock, Banknote, DoorOpen
} from 'lucide-react';
import { TIER_LABELS, getRequiredTier, tierAllowsSection } from '@/lib/tierSections';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ProfileCompletionCheck from './ProfileCompletionCheck';
import SubscriptionManager from './SubscriptionManager';
import SubscriptionPaywall from './SubscriptionPaywall';
import SectionHub from './SectionHub';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import BusinessMasters from './business/BusinessMasters';
import BusinessServices from './business/BusinessServices';
import BusinessSettings from './business/BusinessSettings';
import BusinessFinances from './business/BusinessFinances';
import SupportChat from './SupportChat';
import BusinessSchedule from './business/BusinessSchedule';
import BusinessInventory from './business/BusinessInventory';
import BusinessBookingDetail from './business/BusinessBookingDetail';
import BusinessPromotions from './business/BusinessPromotions';
import BusinessMarketing from './business/BusinessMarketing';
import BusinessCashRegisters from './business/BusinessCashRegisters';
import BusinessProcurement from './business/BusinessProcurement';
import BusinessWriteOffs from './business/BusinessWriteOffs';
import BusinessProductSales from './business/BusinessProductSales';
import TeachingChats from './teaching/TeachingChats';
import BusinessAnalytics from './business/BusinessAnalytics';
import BusinessOnboardingTour from '../onboarding/BusinessOnboardingTour';
import RolePermissionsEditor from './business/RolePermissionsEditor';
import BusinessPenalties from './business/BusinessPenalties';
import BusinessBonusPrograms from './business/BusinessBonusPrograms';
import BusinessGiftCertificates from './business/BusinessGiftCertificates';
import BusinessNotificationSettings from './business/BusinessNotificationSettings';
import BusinessWorkSchedule from './business/BusinessWorkSchedule';
import BusinessBookingSettings from './business/BusinessBookingSettings';
import BusinessEmployeeGroups from './business/BusinessEmployeeGroups';
import BusinessSalaries from './business/BusinessSalaries';
import BusinessLoyaltyPrograms from './business/BusinessLoyaltyPrograms';
import { fetchBusinessSettingsSections, updateBusinessSettingsSection } from '@/lib/businessSettings';
import BusinessResources from './business/BusinessResources';
import { classifyClientSegment, ClientSegment } from '@/lib/clientSegmentation';

// ── Notifications with real counter ──
const BusinessNotifications = ({ businessId }: { businessId?: string }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tab, setTab] = useState<'active' | 'archive'>('active');

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !businessId) return;
      // Strict business scope: only notifications for THIS business cabinet
      const query: any = supabase.from('notifications').select('*');
      const res = await query
        .eq('user_id', user.id)
        .eq('cabinet_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications(res.data || []);
    };
    fetch();
  }, [businessId]);

  const markRead = async (n: any) => {
    if (n.is_read) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
  };

  const active = notifications.filter(n => !n.is_read);
  const archive = notifications;
  const displayed = tab === 'active' ? active : archive;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Уведомления</CardTitle>
        <Tabs value={tab} onValueChange={v => setTab(v as any)} className="mt-2">
          <TabsList>
            <TabsTrigger value="active">Активные{active.length > 0 ? ` (${active.length})` : ''}</TabsTrigger>
            <TabsTrigger value="archive">Архив{archive.length > 0 ? ` (${archive.length})` : ''}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">
            {tab === 'active' ? 'Нет активных уведомлений' : 'Архив пуст'}
          </p>
        ) : (
          <div className="space-y-3">
            {displayed.map((n: any) => (
              <div
                key={n.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${n.is_read ? 'hover:border-muted-foreground/30' : 'border-primary/30 bg-primary/5 hover:border-primary/50'}`}
                onClick={() => markRead(n)}
              >
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('ru-RU')}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Client Type Directory ──
const ClientTypeDirectory = ({ businessId }: { businessId: string }) => {
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const { toast } = useToast();
  const systemTypes = ['VIP', 'Постоянный', 'Новый', 'Спящий', 'Неактивный', 'ЧС'];

  useEffect(() => {
    fetchTypes();
  }, [businessId]);

  const fetchTypes = async () => {
    try {
      const data = await fetchBusinessSettingsSections(businessId);
      const crm = (data?.crm as any) || {};
      setCustomTypes((crm.client_types as string[]) || []);
    } catch (error: any) {
      toast({ title: 'Не удалось загрузить типы клиентов', description: error.message, variant: 'destructive' });
    }
  };

  const saveTypes = async (types: string[]) => {
    setCustomTypes(types);
    const existing = await fetchBusinessSettingsSections(businessId);
    const crm = { ...((existing?.crm as any) || {}), client_types: types };
    await updateBusinessSettingsSection(businessId, 'crm', crm);
  };

  const addType = async () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (systemTypes.includes(trimmed) || customTypes.includes(trimmed)) {
      toast({ title: 'Такой тип уже существует', variant: 'destructive' });
      return;
    }
    try {
      await saveTypes([...customTypes, trimmed]);
    } catch (error: any) {
      toast({ title: 'Не удалось сохранить тип клиента', description: error.message, variant: 'destructive' });
      return;
    }
    setNewType('');
    toast({ title: 'Тип добавлен' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Справочник: Типы клиентов</h2>
      <Card>
        <CardHeader><CardTitle className="text-base">Системные типы</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {systemTypes.map(t => <Badge key={t} variant="secondary" className="text-sm">{t}</Badge>)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Пользовательские типы</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Новый тип клиента..." value={newType} onChange={e => setNewType(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addType())} />
            <Button onClick={addType} size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
          </div>
          {customTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет пользовательских типов</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {customTypes.map(t => (
                <Badge key={t} variant="outline" className="text-sm gap-1 pr-1">
                  {t}
                  <button onClick={async () => {
                    try {
                      await saveTypes(customTypes.filter(x => x !== t));
                      toast({ title: 'Тип удалён' });
                    } catch (error: any) {
                      toast({ title: 'Не удалось удалить тип', description: error.message, variant: 'destructive' });
                    }
                  }} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ── Products & Materials Directory ──
const ProductsDirectory = ({ businessId }: { businessId: string }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('inventory_items').select('*').eq('business_id', businessId).order('name')
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [businessId]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Справочник: Товары и материалы</h2>
      <p className="text-muted-foreground">Товары и материалы из складского учёта. Управление — в разделе ERP → Склад.</p>
      {loading ? <p className="text-center py-8 text-muted-foreground">Загрузка...</p> : items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Нет товаров. Добавьте в разделе «Склад».</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category || 'Без категории'} · {item.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{Number(item.quantity)} {item.unit}</p>
                  <p className="text-xs text-muted-foreground">{Number(item.price_per_unit).toLocaleString()} ₽/{item.unit}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Cash Registers Directory ──
const CashRegistersDirectory = ({ businessId }: { businessId: string }) => {
  return <BusinessCashRegisters businessId={businessId} />;
};

// ── Positions / Roles Directory ──
const PositionsDirectory = ({ businessId }: { businessId: string }) => {
  return <RolePermissionsEditor businessId={businessId} />;
};

// ── Business Clients - aggregated from bookings + chats + manual ──
const BusinessClients = ({ businessId, onOpenChat }: { businessId: string; onOpenChat?: (clientId: string) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addManualOpen, setAddManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', phone: '', birthday: '', gender: '', source: '', sourceCustom: '', comment: '' });
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<any>(null);
  const [mergeSkillspotId, setMergeSkillspotId] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Client groups
  const [clientGroups, setClientGroups] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem(`client_groups_${businessId}`);
    if (saved) try { setClientGroups(JSON.parse(saved)); } catch {}
  }, [businessId]);

  const sourceOptions = ['Instagram', 'Авито', 'Рекомендация', 'Сайт', 'Яндекс Карты', '2ГИС', 'Другое'];

  useEffect(() => { if (user) fetchClients(); }, [user, businessId]);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('client_id, scheduled_at, status, services:service_id(price)')
      .eq('organization_id', businessId)
      .order('scheduled_at', { ascending: false });

    const { data: chatMessages } = await supabase
      .from('chat_messages')
      .select('sender_id, recipient_id, created_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(500);

    const { data: manualClients } = await supabase
      .from('client_tags')
      .select('client_id, note, created_at')
      .eq('tagger_id', user.id)
      .eq('tag', 'manual_client')
      .eq('business_id', businessId);

    const clientMap = new Map<string, any>();

    (bookings || []).forEach((b: any) => {
      if (b.client_id === user.id) return;
      if (!clientMap.has(b.client_id)) {
        clientMap.set(b.client_id, { id: b.client_id, sources: new Set(['booking']), visitCount: 0, lastVisit: b.scheduled_at, revenue: 0, noShowCount: 0 });
      }
      const c = clientMap.get(b.client_id);
      c.sources.add('booking');
      c.visitCount++;
      if (b.status === 'no_show') c.noShowCount = (c.noShowCount || 0) + 1;
      if (b.status === 'completed') c.revenue += Number((b.services as any)?.price || 0);
      if (new Date(b.scheduled_at) > new Date(c.lastVisit)) c.lastVisit = b.scheduled_at;
    });

    (chatMessages || []).forEach((m: any) => {
      const contactId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (contactId === user.id) return;
      if (!clientMap.has(contactId)) {
        clientMap.set(contactId, { id: contactId, sources: new Set(['chat']), visitCount: 0, lastVisit: m.created_at, revenue: 0 });
      } else {
        clientMap.get(contactId).sources.add('chat');
      }
    });

    (manualClients || []).forEach((mc: any) => {
      if (!clientMap.has(mc.client_id)) {
        let noteData: any = {};
        try { noteData = JSON.parse(mc.note || '{}'); } catch {}
        clientMap.set(mc.client_id, { id: mc.client_id, sources: new Set(['manual']), visitCount: 0, lastVisit: mc.created_at, revenue: 0, note: mc.note, manualData: noteData });
      } else {
        clientMap.get(mc.client_id).sources.add('manual');
      }
    });

    const ids = Array.from(clientMap.keys());
    if (ids.length > 0) {
      const [{ data: profiles }, { data: scores }] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, phone, email, skillspot_id').in('id', ids),
        supabase.from('user_scores_master_view').select('user_id, total_score, status').in('user_id', ids),
      ]);
      const scoreMap = new Map((scores || []).map((score: any) => [score.user_id, score]));
      (profiles || []).forEach(p => {
        const c = clientMap.get(p.id);
        if (c) {
          c.name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Без имени';
          c.phone = p.phone || '—';
          c.email = p.email;
          c.skillspot_id = p.skillspot_id;
          c.score = scoreMap.get(p.id)?.total_score || null;
          c.scoreStatus = scoreMap.get(p.id)?.status || null;
        }
      });
    }

    // Assign auto-categories
    const allClients = Array.from(clientMap.values()).map(c => {
      c.sources = Array.from(c.sources);
      c.avgCheck = c.visitCount > 0 ? Math.round(c.revenue / c.visitCount) : 0;
      const segment = classifyClientSegment({
        visitCount: c.visitCount,
        completedCount: c.visitCount - (c.noShowCount || 0),
        noShowCount: c.noShowCount || 0,
        lastVisit: c.lastVisit,
        revenue: c.revenue,
        isBlacklisted: false,
        hasVipTag: false,
        score: c.score,
        scoreStatus: c.scoreStatus,
      });
      c.segment = segment;
      const labelMap: Record<ClientSegment, string> = {
        all: 'Все',
        vip: 'VIP',
        trusted: 'Надёжный',
        regular: 'Постоянный',
        new: 'Новый',
        sleeping: 'Спящий',
        inactive: 'Пропавший',
        prepayment: 'Предоплата',
        risk: 'Риск',
        blacklisted: 'ЧС',
      };
      c.category = c.visitCount === 0 && c.sources.includes('chat') ? 'Не посещал' : labelMap[segment];
      return c;
    });

    setClients(allClients);
    setLoading(false);
  };

  const handleAddManual = async () => {
    if (!manualForm.name.trim()) { toast({ title: 'Введите имя', variant: 'destructive' }); return; }
    if (!user) return;
    // Store manual client data as JSON in client_tags note
    const noteData = JSON.stringify({
      name: manualForm.name, phone: manualForm.phone, birthday: manualForm.birthday,
      gender: manualForm.gender, source: manualForm.source === 'Другое' ? manualForm.sourceCustom : manualForm.source,
      comment: manualForm.comment,
    });
    // Use user's own id as client_id placeholder (will be merged later)
    const tempId = user.id; // Placeholder until client registers
    await supabase.from('client_tags').insert({
      client_id: tempId, tagger_id: user.id, business_id: businessId,
      tag: 'manual_client', note: noteData,
    });
    toast({ title: 'Клиент добавлен', description: 'Данные сохранены. При регистрации клиента используйте «Объединить».' });
    setAddManualOpen(false);
    setManualForm({ name: '', phone: '', birthday: '', gender: '', source: '', sourceCustom: '', comment: '' });
    fetchClients();
  };

  const handleMerge = async () => {
    if (!mergeTarget || !mergeSkillspotId.trim()) { toast({ title: 'Введите ID клиента', variant: 'destructive' }); return; }
    const { data: targetProfile } = await supabase.from('profiles')
      .select('id, first_name, last_name, skillspot_id')
      .eq('skillspot_id', mergeSkillspotId.trim()).maybeSingle();
    if (!targetProfile) { toast({ title: 'Клиент не найден', variant: 'destructive' }); return; }
    if (targetProfile.id === mergeTarget.id) { toast({ title: 'Это тот же клиент', variant: 'destructive' }); return; }
    await supabase.from('client_tags').insert({
      client_id: targetProfile.id, tagger_id: user!.id,
      tag: 'merged_from', note: `Объединён с ${mergeTarget.name} (${mergeTarget.id})`
    });
    toast({ title: 'Клиенты объединены' });
    setMergeOpen(false); setMergeTarget(null); setMergeSkillspotId('');
    fetchClients();
  };

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      'VIP': 'bg-yellow-100 text-yellow-800', 'Постоянный': 'bg-green-100 text-green-800',
      'Спящий': 'bg-blue-100 text-blue-800', 'Пропавший': 'bg-red-100 text-red-800',
      'Риск': 'bg-destructive/10 text-destructive', 'Предоплата': 'bg-orange-100 text-orange-800',
      'Не посещал': 'bg-muted text-muted-foreground', 'Новый': 'bg-primary/10 text-primary',
      'Надёжный': 'bg-emerald-100 text-emerald-800', 'ЧС': 'bg-destructive/10 text-destructive',
    };
    return map[cat] || '';
  };

  const categories = ['all', 'VIP', 'Надёжный', 'Постоянный', 'Новый', 'Спящий', 'Пропавший', 'Предоплата', 'Риск', 'ЧС', 'Не посещал'];

  const filtered = clients.filter(c => {
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    if (search) return c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.skillspot_id?.includes(search);
    return true;
  });

  const getSourceBadges = (sources: string[]) => (
    <div className="flex gap-1">
      {sources.includes('booking') && <Badge variant="outline" className="text-[10px]">Записи</Badge>}
      {sources.includes('chat') && <Badge variant="outline" className="text-[10px]">Чат</Badge>}
      {sources.includes('manual') && <Badge variant="outline" className="text-[10px]">Вручную</Badge>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> Клиенты ({clients.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setAddManualOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по имени, телефону или ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Категория" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'Все категории' : c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-10">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>{search ? 'Не найдено' : 'Клиентов пока нет.'}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{c.name || 'Без имени'}</p>
                      <Badge variant="outline" className={`text-[10px] ${categoryColor(c.category)}`}>{c.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.phone} {c.skillspot_id ? `· ID: ${c.skillspot_id}` : ''}</p>
                    {(c.score || c.scoreStatus) && (
                      <p className="text-xs text-muted-foreground">
                        Рейтинг: {c.score ?? '—'} {c.scoreStatus ? `· ${c.scoreStatus}` : ''}
                      </p>
                    )}
                    {getSourceBadges(c.sources)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm">{c.visitCount} визит(ов)</p>
                      <p className="text-xs text-muted-foreground">
                        {c.revenue > 0 ? `${c.revenue.toLocaleString()} ₽` : ''}
                        {c.avgCheck > 0 ? ` · ср. ${c.avgCheck.toLocaleString()} ₽` : ''}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Написать" onClick={() => onOpenChat?.(c.id)}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Объединить" onClick={() => { setMergeTarget(c); setMergeOpen(true); }}>
                      <Merge className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Merge dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Объединить клиента</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Введите SkillSpot ID зарегистрированного клиента.</p>
          {mergeTarget && <p className="text-sm">Текущий: <strong>{mergeTarget.name}</strong></p>}
          <div className="space-y-2">
            <Label>SkillSpot ID</Label>
            <Input placeholder="Например: SS-12345" value={mergeSkillspotId} onChange={e => setMergeSkillspotId(e.target.value)} />
          </div>
          <Button onClick={handleMerge} className="w-full">Объединить</Button>
        </DialogContent>
      </Dialog>

      {/* Add manual client dialog — FULL FORM */}
      <Dialog open={addManualOpen} onOpenChange={setAddManualOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Добавить клиента</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Имя *</Label>
              <Input value={manualForm.name} onChange={e => setManualForm(p => ({ ...p, name: e.target.value }))} placeholder="ФИО клиента" />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input type="tel" value={manualForm.phone} onChange={e => setManualForm(p => ({ ...p, phone: e.target.value }))} placeholder="+7 (999) 123-45-67" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>День рождения</Label>
                <Input type="date" value={manualForm.birthday} onChange={e => setManualForm(p => ({ ...p, birthday: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Пол</Label>
                <Select value={manualForm.gender} onValueChange={v => setManualForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="М">Мужской</SelectItem>
                    <SelectItem value="Ж">Женский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Источник (откуда узнал)</Label>
              <Select value={manualForm.source} onValueChange={v => setManualForm(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите канал" /></SelectTrigger>
                <SelectContent>
                  {sourceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {manualForm.source === 'Другое' && (
                <Input value={manualForm.sourceCustom} onChange={e => setManualForm(p => ({ ...p, sourceCustom: e.target.value }))} placeholder="Укажите источник" className="mt-2" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Комментарий</Label>
              <Textarea value={manualForm.comment} onChange={e => setManualForm(p => ({ ...p, comment: e.target.value }))} placeholder="Важная информация: пожелания, работа, дети..." className="min-h-[80px]" />
            </div>
            <Button className="w-full" onClick={handleAddManual}>Добавить клиента</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Business Stats ──
const BusinessStats = ({ businessId }: { businessId: string }) => {
  const [stats, setStats] = useState({ total: 0, completed: 0, cancelled: 0, pending: 0, noShow: 0, revenue: 0 });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('status, services(price)')
        .eq('organization_id', businessId);
      const rows = data || [];
      setStats({
        total: rows.length,
        completed: rows.filter((r: any) => r.status === 'completed').length,
        cancelled: rows.filter((r: any) => r.status === 'cancelled').length,
        pending: rows.filter((r: any) => ['pending', 'confirmed', 'in_progress'].includes(r.status)).length,
        noShow: rows.filter((r: any) => r.status === 'no_show').length,
        revenue: rows.filter((r: any) => r.status === 'completed').reduce((s: number, r: any) => s + (r.services?.price || 0), 0),
      });
    };
    fetch();
  }, [businessId]);

  const cards = [
    { label: 'Всего записей', value: stats.total },
    { label: 'Завершено', value: stats.completed },
    { label: 'Запланировано', value: stats.pending },
    { label: 'Отменено', value: stats.cancelled },
    { label: 'Неявки', value: stats.noShow },
    { label: 'Доход', value: `${stats.revenue.toLocaleString()} ₽` },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Статистика</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ── Sidebar config ──
const mainItems = [
  { key: 'overview', label: 'Главная', icon: LayoutDashboard },
  { key: 'profile', label: 'Профиль организации', icon: Settings },
  { key: 'messages', label: 'Сообщения', icon: MessageSquare },
];

const sidebarSections = [
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'erp', label: 'ERP', icon: Database },
  { key: 'directories', label: 'Справочники', icon: Briefcase },
];

const crmItems = [
  { key: 'bookings', label: 'Записи', icon: Calendar, description: 'Все записи клиентов' },
  { key: 'schedule', label: 'Расписание', icon: Calendar, description: 'Календарь событий' },
  { key: 'work_schedule', label: 'График работы', icon: Calendar, description: 'Шахматка по мастерам' },
  { key: 'clients', label: 'Клиенты', icon: Users, description: 'База клиентов' },
  { key: 'marketing', label: 'Маркетинг', icon: Megaphone, description: 'Рассылки и реклама' },
  { key: 'promotions', label: 'Акции и Скидки', icon: Percent, description: 'Скидки и промо' },
  { key: 'bonus_programs', label: 'Бонусные программы', icon: Gift, description: 'Лояльность и кэшбэк' },
  { key: 'loyalty_programs', label: 'Программы лояльности', icon: Award, description: 'Кэшбэк, баллы, абонементы' },
  { key: 'gift_certs', label: 'Подарочные сертификаты', icon: Ticket, description: 'Выпуск и погашение' },
  { key: 'penalties', label: 'Штрафы', icon: AlertTriangle, description: 'Штрафы за нарушения' },
  { key: 'booking_settings', label: 'Онлайн запись', icon: Globe, description: 'Настройки онлайн-записи' },
  { key: 'notif_settings', label: 'Уведомления', icon: Bell, description: 'Шаблоны уведомлений' },
];

const erpItems = [
  { key: 'stats', label: 'Статистика', icon: BarChart3, description: 'Аналитика и отчёты' },
  { key: 'services', label: 'Услуги', icon: ClipboardList, description: 'Услуги и прайс' },
  { key: 'commissions', label: 'Комиссии', icon: DollarSign, description: 'Настройки комиссий' },
  { key: 'salaries', label: 'Зарплаты', icon: Banknote, description: 'Схемы оплаты и расчёт выплат' },
  { key: 'inventory', label: 'Склад', icon: Package, description: 'Товары и материалы' },
  { key: 'registers', label: 'Кассы', icon: Wallet, description: 'Наличные и безналичные' },
  { key: 'product_sales', label: 'Продажи', icon: Briefcase, description: 'Продажа товаров' },
  { key: 'finance', label: 'Финансы', icon: Wallet, description: 'Доходы и расходы' },
];

const directoryItems = [
  { key: 'dir_client_types', label: 'Типы клиентов', icon: Users, description: 'Системные и пользовательские типы' },
  { key: 'dir_client_groups', label: 'Группы клиентов', icon: Users, description: 'Ручные группы клиентов' },
  { key: 'dir_resources', label: 'Ресурсы', icon: DoorOpen, description: 'Кабинеты, залы, оборудование' },
  { key: 'dir_products', label: 'Товары и материалы', icon: Package, description: 'Справочник товаров' },
  { key: 'dir_registers', label: 'Кассы', icon: Wallet, description: 'Управление кассами' },
  { key: 'dir_positions', label: 'Должности', icon: Shield, description: 'Настройка доступов' },
  { key: 'dir_employee_groups', label: 'Группы сотрудников', icon: Award, description: 'Стажёр, мастер, старший...' },
];

// Profile sub-items (team, subscription, transfer, manager)
const profileItems = [
  { key: 'masters', label: 'Команда', icon: Users, description: 'Сотрудники организации' },
  { key: 'subscription', label: 'Подписка', icon: CreditCard, description: 'Тарифы и оплата' },
];

const allItems = [...mainItems, ...sidebarSections];

// ── Tier badge in sidebar header ──
const TierBadge = () => {
  const { user } = useAuth();
  const { tierLabel, status } = useSubscriptionTier(user?.id);
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
        {tierLabel}
      </Badge>
      {status === 'trial' && <span className="text-[10px] text-muted-foreground">trial</span>}
      {status === 'grace' && <span className="text-[10px] text-destructive">льгот.</span>}
      {status === 'expired' && <span className="text-[10px] text-destructive">истекла</span>}
    </div>
  );
};

// ── Маппинг ключей разделов BusinessDashboard на стабильные ключи tierSections ──
const SECTION_TIER_KEY: Record<string, string> = {
  // CRM
  bonus_programs: 'bonus_programs',
  gift_certs: 'gift_certificates',
  penalties: 'penalties',
  booking_settings: 'booking_settings',
  notif_settings: 'notification_settings',
  work_schedule: 'work_schedule',
  // ERP
  inventory: 'inventory',
  registers: 'cash_registers',
  procurement: 'procurement',
  writeoffs: 'writeoffs',
  product_sales: 'product_sales',
  salaries: 'salaries',
  // Directories
  dir_products: 'inventory',
  dir_resources: 'resources',
  dir_registers: 'cash_registers',
  dir_positions: 'permissions',
  dir_employee_groups: 'employee_groups',
  // Профиль / команда
  masters: 'staff',
};

const BusinessDashboard = () => {
  const [searchParams] = useSearchParams();
  const { user, profile, activeEntityId, activeRole } = useAuth();
  const { toast } = useToast();
  const pricing = usePlatformPricing();
  const subscription = useSubscriptionTier(user?.id);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [masterCount, setMasterCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [activeSection, setActiveSection] = useState('overview');
  const [messagesTab, setMessagesTab] = useState<'chats' | 'notifications' | 'support'>('chats');
  const [previousSection, setPreviousSection] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatTarget, setChatTarget] = useState<{ contactId: string; targetCabinet?: string | null } | null>(null);
  // Paywall state for soft-gated sections
  const [paywallSection, setPaywallSection] = useState<{ key: string; label: string; requiredTierLabel: string } | null>(null);
  // Transfer ownership dialog state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [transferring, setTransferring] = useState(false);
  // Assign manager dialog state
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerId, setManagerId] = useState('');
  const [assigningManager, setAssigningManager] = useState(false);
  const [masterImportPromptOpen, setMasterImportPromptOpen] = useState(false);
  const [importableMasterServices, setImportableMasterServices] = useState<any[]>([]);
  const [importingMasterCatalog, setImportingMasterCatalog] = useState(false);

  /** Возвращает требуемый тариф для раздела, если он недоступен текущему. */
  const getLockInfo = (sectionKey: string): { locked: boolean; requiredTierLabel: string } => {
    const tierKey = SECTION_TIER_KEY[sectionKey];
    if (!tierKey) return { locked: false, requiredTierLabel: '' };
    const effectiveTier = subscription.tier === 'none' ? 'master' : subscription.tier;
    const allowed = tierAllowsSection(effectiveTier, tierKey);
    if (allowed) return { locked: false, requiredTierLabel: '' };
    return { locked: true, requiredTierLabel: TIER_LABELS[getRequiredTier(tierKey)] };
  };

  const decorateItems = (items: typeof crmItems) =>
    items.map((it) => {
      const lock = getLockInfo(it.key);
      return { ...it, locked: lock.locked, requiredTierLabel: lock.requiredTierLabel };
    });

  const navigateTo = (section: string) => {
    const lock = getLockInfo(section);
    if (lock.locked) {
      const item = [...crmItems, ...erpItems, ...directoryItems, ...profileItems].find(i => i.key === section);
      setPaywallSection({ key: section, label: item?.label || section, requiredTierLabel: lock.requiredTierLabel });
      return;
    }
    setPreviousSection(activeSection);
    setActiveSection(section);
  };

  const goBack = () => {
    if (previousSection) {
      setActiveSection(previousSection);
      setPreviousSection(null);
    } else {
      setActiveSection('overview');
    }
  };

  useEffect(() => {
    const section = searchParams.get('section');
    const tab = searchParams.get('tab');
    const contact = searchParams.get('contact');
    const contactScope = searchParams.get('contact_scope');

    if (section && ['overview', 'messages'].includes(section)) {
      setActiveSection(section);
    }

    if (tab && ['chats', 'notifications', 'support'].includes(tab)) {
      setMessagesTab(tab as 'chats' | 'notifications' | 'support');
    }

    if (section === 'messages' && contact) {
      setChatTarget({ contactId: contact, targetCabinet: contactScope || 'business' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeSection === 'messages' && chatTarget) {
      const timer = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-chat-with', { detail: chatTarget }));
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [activeSection, chatTarget]);

  const fetchBusinesses = useCallback(async () => {
    if (!user) return;
    const [ownedRes, managedRes, masterRes] = await Promise.all([
      supabase.from('business_locations').select('*').eq('owner_id', user.id),
      supabase
        .from('business_managers')
        .select('business_id, business_locations:business_locations!business_managers_business_id_fkey(*)')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('business_masters')
        .select('business_id, business_locations:business_locations!business_masters_business_id_fkey(*)')
        .eq('master_id', user.id)
        .eq('status', 'accepted'),
    ]);

    const scopedBusinesses = new Map<string, any>();
    (ownedRes.data || []).forEach((biz: any) => {
      scopedBusinesses.set(biz.id, { ...biz, accessRole: 'owner' });
    });
    (managedRes.data || []).forEach((entry: any) => {
      const biz = entry.business_locations;
      if (!biz || scopedBusinesses.has(biz.id)) return;
      scopedBusinesses.set(biz.id, { ...biz, accessRole: 'manager' });
    });
    (masterRes.data || []).forEach((entry: any) => {
      const biz = entry.business_locations;
      if (!biz || scopedBusinesses.has(biz.id)) return;
      scopedBusinesses.set(biz.id, { ...biz, accessRole: 'master' });
    });

    const data = Array.from(scopedBusinesses.values());
    setBusinesses(data);
    if (data && data.length > 0) {
      const target = activeEntityId
        ? data.find(b => b.id === activeEntityId)
          || data.find(b => b.id === subscription.primaryEntityId)
          || data[0]
        : data.find(b => b.id === subscription.primaryEntityId) || data[0];
      setSelectedBusiness(target);
      const [mRes, sRes] = await Promise.all([
        supabase.from('business_masters').select('id', { count: 'exact', head: true }).eq('business_id', target.id).eq('status', 'accepted'),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', target.id).eq('is_active', true),
      ]);
      setMasterCount(mRes.count || 0);
      setServiceCount(sRes.count || 0);
    }
    setLoading(false);
  }, [user, activeEntityId, subscription.primaryEntityId]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  useEffect(() => {
    const maybePromptImport = async () => {
      if (!user || !selectedBusiness || activeRole !== 'business_master') return;

      const dismissedKey = `skillspot_master_import_prompt_${selectedBusiness.id}_${user.id}`;
      if (localStorage.getItem(dismissedKey) === 'dismissed') return;

      const [sourceRes, targetRes] = await Promise.all([
        supabase
          .from('services')
          .select('id, name, description, price, duration_minutes, hashtags, work_photos, business_id, organization_id, master_id')
          .eq('master_id', user.id)
          .eq('is_active', true)
          .limit(100),
        supabase
          .from('services')
          .select('id, tech_card')
          .or(`business_id.eq.${selectedBusiness.id},organization_id.eq.${selectedBusiness.id}`),
      ]);

      const sourceServices = (sourceRes.data || []).filter((service: any) =>
        service.business_id !== selectedBusiness.id && service.organization_id !== selectedBusiness.id
      );
      const importedIds = new Set(
        (targetRes.data || [])
          .map((service: any) => service.tech_card?.imported_source_service_id)
          .filter(Boolean)
      );
      const nextImportable = sourceServices.filter((service: any) => !importedIds.has(service.id));

      if (nextImportable.length > 0) {
        setImportableMasterServices(nextImportable);
        setMasterImportPromptOpen(true);
      }
    };

    maybePromptImport();
  }, [user, selectedBusiness, activeRole]);

  const canActivate = masterCount >= 1 && serviceCount >= 1;
  const isBusinessMasterCabinet = activeRole === 'business_master';
  const isDowngradedReadOnlyPoint = Boolean(
    selectedBusiness &&
    subscription.tier === 'business' &&
    !subscription.isReadOnly &&
    subscription.primaryEntityId &&
    selectedBusiness.id !== subscription.primaryEntityId,
  );
  const readOnlyNavigationSections = ['overview', 'crm', 'erp', 'directories'];

  const getSubscriptionBadge = () => {
    if (!selectedBusiness) return null;
    const s = selectedBusiness.subscription_status;
    if (s === 'trial') return <Badge variant="secondary">Тестовый период</Badge>;
    if (s === 'active') return <Badge variant="default">Активна</Badge>;
    if (s === 'in_network') return <Badge variant="outline">В составе сети</Badge>;
    return <Badge variant="destructive">Неактивна</Badge>;
  };

  if (!selectedBusiness && !loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Нет бизнес-точек</h2>
          <p className="text-muted-foreground">Создайте бизнес-аккаунт.</p>
        </CardContent>
      </Card>
    );
  }

  const subStatus = selectedBusiness?.subscription_status;
  const isSubscriptionBlocked = selectedBusiness && !['trial', 'active', 'in_network'].includes(subStatus || '');

  if (isSubscriptionBlocked && !loading) {
    return (
      <SubscriptionPaywall
        entityType="business"
        entityId={selectedBusiness.id}
        entityName={selectedBusiness.name || 'Организация'}
        onPaid={fetchBusinesses}
      />
    );
  }

  const showCompletion = selectedBusiness?.moderation_status !== 'approved';

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const dismissMasterImportPrompt = () => {
    if (user && selectedBusiness) {
      localStorage.setItem(`skillspot_master_import_prompt_${selectedBusiness.id}_${user.id}`, 'dismissed');
    }
    setMasterImportPromptOpen(false);
  };

  const importMasterServicesToBusiness = async () => {
    if (!selectedBusiness || !importableMasterServices.length || !user) return;
    setImportingMasterCatalog(true);
    try {
      for (const service of importableMasterServices) {
        const { error } = await supabase.from('services').insert({
          name: service.name,
          price: service.price,
          duration_minutes: service.duration_minutes,
          description: service.description,
          hashtags: service.hashtags || [],
          work_photos: service.work_photos || [],
          business_id: selectedBusiness.id,
          organization_id: null,
          master_id: user.id,
          is_active: true,
          tech_card: {
            assigned_master_ids: [user.id],
            imported_source_service_id: service.id,
          },
        });
        if (error) throw error;
      }

      toast({
        title: 'Услуги подтянуты в организацию',
        description: 'Это отдельные услуги организации. Вы сможете изменить цену, описание и правила работы без влияния на ваш личный кабинет мастера.',
      });
      dismissMasterImportPrompt();
      fetchBusinesses();
    } catch (error: any) {
      toast({ title: 'Не удалось импортировать услуги', description: error.message, variant: 'destructive' });
    } finally {
      setImportingMasterCatalog(false);
    }
  };

  const visibleMainItems = isBusinessMasterCabinet
    ? mainItems.filter((item) => item.key !== 'profile')
    : mainItems;
  const visibleProfileItems = isBusinessMasterCabinet ? [] : profileItems;
  const allVisibleItems = [...visibleMainItems, ...sidebarSections];

  const NavButton = ({ item }: { item: typeof mainItems[0] }) => (
    <Button
      variant={activeSection === item.key ? 'default' : 'ghost'}
      className={`w-full gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'} ${activeSection === item.key ? '' : 'text-muted-foreground'}`}
      onClick={() => navigateTo(item.key)}
      title={sidebarCollapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
    </Button>
  );

  const wrapReadOnlyContent = (content: any) => {
    if (!isDowngradedReadOnlyPoint || readOnlyNavigationSections.includes(activeSection)) {
      return content;
    }

    return (
      <div className="space-y-4">
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Эта точка открыта в режиме просмотра после понижения тарифа. Полный доступ к изменениям
            сохраняется только у приоритетной точки.
          </AlertDescription>
        </Alert>
        <div className="pointer-events-none select-none opacity-95">
          {content}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (paywallSection && selectedBusiness) {
      return (
        <SubscriptionPaywall
          entityType="business"
          entityId={selectedBusiness.id}
          entityName={selectedBusiness.name || 'Организация'}
          sectionLabel={paywallSection.label}
          requiredTierLabel={paywallSection.requiredTierLabel}
          onPaid={() => { setPaywallSection(null); fetchBusinesses(); subscription.refetch(); }}
        />
      );
    }
    const content = (() => {
      switch (activeSection) {
      case 'crm':
        return <SectionHub title="CRM" description="Управление клиентами и коммуникациями" items={decorateItems(crmItems)} onNavigate={navigateTo} onLockedClick={(it: any) => setPaywallSection({ key: it.key, label: it.label, requiredTierLabel: it.requiredTierLabel })} />;
      case 'erp':
        return <SectionHub title="ERP" description="Управление бизнес-процессами" items={decorateItems(erpItems)} onNavigate={navigateTo} onLockedClick={(it: any) => setPaywallSection({ key: it.key, label: it.label, requiredTierLabel: it.requiredTierLabel })} />;
      case 'directories':
        return <SectionHub title="Справочники" description="Справочные данные и настройки" items={decorateItems(directoryItems)} onNavigate={navigateTo} onLockedClick={(it: any) => setPaywallSection({ key: it.key, label: it.label, requiredTierLabel: it.requiredTierLabel })} />;
      case 'dir_client_types':
        return selectedBusiness ? <ClientTypeDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_resources':
        return selectedBusiness ? <BusinessResources businessId={selectedBusiness.id} /> : null;
      case 'dir_products':
        return selectedBusiness ? <ProductsDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_registers':
        return selectedBusiness ? <CashRegistersDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_positions':
        return selectedBusiness ? <PositionsDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_client_groups':
        return selectedBusiness ? <ClientTypeDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_employee_groups':
        return selectedBusiness ? <BusinessEmployeeGroups businessId={selectedBusiness.id} /> : null;
      case 'bonus_programs':
        return selectedBusiness ? <BusinessBonusPrograms businessId={selectedBusiness.id} /> : null;
      case 'gift_certs':
        return selectedBusiness ? <BusinessGiftCertificates businessId={selectedBusiness.id} /> : null;
      case 'penalties':
        return selectedBusiness ? <BusinessPenalties businessId={selectedBusiness.id} /> : null;
      case 'salaries':
        return selectedBusiness ? <BusinessSalaries businessId={selectedBusiness.id} /> : null;
      case 'loyalty_programs':
        return selectedBusiness ? <BusinessLoyaltyPrograms businessId={selectedBusiness.id} /> : null;
      case 'booking_settings':
        return selectedBusiness ? <BusinessBookingSettings businessId={selectedBusiness.id} /> : null;
      case 'notif_settings':
        return selectedBusiness ? <BusinessNotificationSettings businessId={selectedBusiness.id} /> : null;
      case 'work_schedule':
        return selectedBusiness ? <BusinessWorkSchedule businessId={selectedBusiness.id} /> : null;
      case 'overview':
      return (
        <div className="space-y-6">
          <BusinessOnboardingTour onNavigate={navigateTo} />
          {isBusinessMasterCabinet && (
            <Alert className="border-primary/20 bg-primary/5">
              <Wrench className="h-4 w-4" />
              <AlertDescription>
                Вы находитесь в кабинете организации как мастер. Услуги организации живут отдельно от ваших личных услуг и могут настраиваться по собственным ценам, описаниям и зарплатной политике.
              </AlertDescription>
            </Alert>
          )}
          {!canActivate && selectedBusiness && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Для активации: минимум 1 принятый мастер ({masterCount}/1) и 1 активная услуга ({serviceCount}/1).
                </AlertDescription>
              </Alert>
            )}
            {showCompletion && selectedBusiness && (
              <ProfileCompletionCheck entityType="business" entityData={selectedBusiness} onProfileUpdated={fetchBusinesses} />
            )}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-bold">{selectedBusiness?.name || 'Бизнес'}</h2>
                <p className="text-muted-foreground">{selectedBusiness?.address || 'Адрес не указан'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {getSubscriptionBadge()}
                {selectedBusiness?.moderation_status === 'approved' && <Badge variant="outline">Опубликован</Badge>}
                {selectedBusiness?.moderation_status === 'pending' && <Badge>На модерации</Badge>}
                {selectedBusiness?.moderation_status === 'draft' && <Badge variant="secondary">Черновик</Badge>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Информация о точке</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><span className="text-muted-foreground">Название:</span> {selectedBusiness?.name}</div>
                  <div><span className="text-muted-foreground">ИНН:</span> {selectedBusiness?.inn}</div>
                  <div><span className="text-muted-foreground">Адрес:</span> {selectedBusiness?.address || '—'}</div>
                  <div><span className="text-muted-foreground">Город:</span> {selectedBusiness?.city || '—'}</div>
                  <div><span className="text-muted-foreground">ФИО директора:</span> {selectedBusiness?.director_name || '—'}</div>
                  <div><span className="text-muted-foreground">Email:</span> {selectedBusiness?.contact_email || '—'}</div>
                  <div><span className="text-muted-foreground">Телефон:</span> {selectedBusiness?.contact_phone || '—'}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'commissions':
        return selectedBusiness ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Настройки комиссий</h3>
            <BusinessSettings business={selectedBusiness} onUpdated={fetchBusinesses} />
          </div>
        ) : null;
      case 'bookings':
        return selectedBusiness ? <BusinessBookingDetail businessId={selectedBusiness.id} /> : null;
      case 'masters':
        return selectedBusiness ? <BusinessMasters businessId={selectedBusiness.id} freeMasters={selectedBusiness.free_masters || 3} extraMasterPrice={selectedBusiness.extra_master_price || 500} /> : null;
      case 'services':
        return selectedBusiness ? <BusinessServices businessId={selectedBusiness.id} /> : null;
      case 'inventory':
        return selectedBusiness ? <BusinessInventory businessId={selectedBusiness.id} /> : null;
      case 'registers':
        return selectedBusiness ? <BusinessCashRegisters businessId={selectedBusiness.id} /> : null;
      case 'procurement':
        return selectedBusiness ? <BusinessProcurement businessId={selectedBusiness.id} /> : null;
      case 'writeoffs':
        return selectedBusiness ? <BusinessWriteOffs businessId={selectedBusiness.id} /> : null;
      case 'product_sales':
        return selectedBusiness ? <BusinessProductSales businessId={selectedBusiness.id} /> : null;
      case 'schedule':
        return selectedBusiness ? <BusinessSchedule businessId={selectedBusiness.id} /> : null;
      case 'finance':
        return selectedBusiness ? <BusinessFinances businessId={selectedBusiness.id} /> : null;
      case 'promotions':
        return selectedBusiness ? <BusinessPromotions businessId={selectedBusiness.id} /> : null;
      case 'marketing':
        return selectedBusiness ? <BusinessMarketing businessId={selectedBusiness.id} /> : null;
      case 'clients':
        return selectedBusiness ? <BusinessClients businessId={selectedBusiness.id} onOpenChat={(clientId) => { setChatTarget({ contactId: clientId, targetCabinet: 'business' }); navigateTo('messages'); }} /> : null;
      case 'stats':
        return selectedBusiness ? <BusinessAnalytics businessId={selectedBusiness.id} /> : null;
      case 'messages':
        return (
          <Card>
            <CardHeader><CardTitle className="text-lg">Сообщения</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Tabs value={messagesTab} onValueChange={(value) => setMessagesTab(value as 'chats' | 'notifications' | 'support')} className="w-full">
                <TabsList className="w-full rounded-none border-b bg-transparent px-6 pt-2">
                  <TabsTrigger value="chats" className="flex-1">Чаты</TabsTrigger>
                  <TabsTrigger value="notifications" className="flex-1">Уведомления</TabsTrigger>
                  <TabsTrigger value="support" className="flex-1">Техподдержка</TabsTrigger>
                </TabsList>
                <div className="p-6">
                  <TabsContent value="chats" className="mt-0"><TeachingChats cabinetContext="business" /></TabsContent>
                  <TabsContent value="notifications" className="mt-0"><BusinessNotifications businessId={selectedBusiness?.id} /></TabsContent>
                  <TabsContent value="support" className="mt-0"><SupportChat /></TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        );
      case 'subscription':
        return (
          <SubscriptionManager
            entityType="business"
            entityId={selectedBusiness?.id}
            subscriptionStatus={selectedBusiness?.subscription_status || 'trial'}
            trialStartDate={selectedBusiness?.trial_start_date}
            trialDays={14}
            lastPaymentDate={selectedBusiness?.last_payment_date}
            basePrice={pricing.business}
            parentManaged={selectedBusiness?.subscription_status === 'in_network'}
            parentLabel="Управляется сетью"
          />
        );
      case 'profile':
        return isBusinessMasterCabinet ? null : selectedBusiness ? (
          <div className="space-y-6">
            <BusinessSettings business={selectedBusiness} onUpdated={fetchBusinesses} />
            {/* Transfer ownership */}
            <Card>
              <CardHeader><CardTitle className="text-base">Управление</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full gap-2" onClick={() => setTransferOpen(true)}>
                  <ArrowRightLeft className="h-4 w-4" /> Передать управление
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => setManagerOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Назначить менеджера
                </Button>
              </CardContent>
            </Card>
            {/* Transfer dialog */}
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Передать управление</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Введите SkillSpot ID нового владельца. Действие необратимо.</p>
                <Input placeholder="Например: AB1234" value={transferId} onChange={e => setTransferId(e.target.value)} />
                <Button disabled={transferring || !transferId.trim()} className="w-full" onClick={async () => {
                  setTransferring(true);
                  const { data: target } = await supabase.from('profiles').select('id, first_name, last_name').eq('skillspot_id', transferId.trim().toUpperCase()).maybeSingle();
                  if (!target) { toast({ title: 'Пользователь не найден', variant: 'destructive' }); setTransferring(false); return; }
                  const { error } = await supabase.from('business_locations').update({ owner_id: target.id }).eq('id', selectedBusiness.id);
                  if (error) { toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }); } else {
                    toast({ title: 'Управление передано', description: `Новый владелец: ${target.first_name} ${target.last_name}` });
                    setTransferOpen(false); setTransferId(''); fetchBusinesses();
                  }
                  setTransferring(false);
                }}>
                  {transferring ? 'Передача...' : 'Передать'}
                </Button>
              </DialogContent>
            </Dialog>
            {/* Manager dialog */}
            <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Назначить менеджера</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Введите SkillSpot ID пользователя для назначения менеджером.</p>
                <Input placeholder="Например: AB1234" value={managerId} onChange={e => setManagerId(e.target.value)} />
                <Button disabled={assigningManager || !managerId.trim()} className="w-full" onClick={async () => {
                  setAssigningManager(true);
                  const { data: target } = await supabase.from('profiles').select('id, first_name, last_name').eq('skillspot_id', managerId.trim().toUpperCase()).maybeSingle();
                  if (!target) { toast({ title: 'Пользователь не найден', variant: 'destructive' }); setAssigningManager(false); return; }
                  const { error } = await supabase.from('business_managers').insert({ business_id: selectedBusiness.id, user_id: target.id });
                  if (error) { toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }); } else {
                    toast({ title: 'Менеджер назначен', description: `${target.first_name} ${target.last_name}` });
                    setManagerOpen(false); setManagerId('');
                  }
                  setAssigningManager(false);
                }}>
                  {assigningManager ? 'Назначение...' : 'Назначить'}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        ) : null;
      default:
        return null;
      }
    })();

    return wrapReadOnlyContent(content);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:gap-6 w-full overflow-hidden">
      {isDowngradedReadOnlyPoint && (
        <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3 lg:hidden">
          <Lock className="h-5 w-5 text-amber-700 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">Точка открыта в режиме просмотра</p>
            <p className="text-xs text-amber-800/80">
              После понижения тарифа изменения доступны только в приоритетной точке
            </p>
          </div>
        </div>
      )}
      <aside className={`hidden lg:flex flex-col shrink-0 sticky top-20 self-start h-[calc(100vh-6rem)] transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <div className="flex items-center gap-3 px-3 pb-4 border-b mb-2">
          {!sidebarCollapsed && (
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{selectedBusiness?.name || 'Организация'}</p>
              <TierBadge />
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        {isDowngradedReadOnlyPoint && !sidebarCollapsed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 mx-1">
            <p className="text-xs font-medium text-amber-800">Точка в режиме просмотра</p>
            <p className="text-[10px] text-amber-700/80 mt-0.5">
              После понижения тарифа изменения доступны только в приоритетной точке
            </p>
          </div>
        )}
        <div className="space-y-0.5 overflow-y-auto flex-1">
          {!sidebarCollapsed && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Основное</p>}
          {visibleMainItems.map(item => <NavButton key={item.key} item={item} />)}
          {sidebarSections.map(sec => <NavButton key={sec.key} item={sec} />)}
        </div>
        {!sidebarCollapsed && (
          <div className="mt-auto pt-6 border-t">
            <div className="flex items-center gap-3 px-3">
              <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials()}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile?.first_name}</p>
                <p className="text-xs text-muted-foreground">Организация</p>
              </div>
            </div>
          </div>
        )}
      </aside>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-hide">
          {allVisibleItems.map(item => (
            <button key={item.key} onClick={() => setActiveSection(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[4rem] flex-1 py-2 text-[10px] leading-tight transition-colors ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[3.5rem] text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">{renderContent()}</div>
      <Dialog open={masterImportPromptOpen} onOpenChange={(open) => { if (!open) dismissMasterImportPrompt(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Подтянуть ваши услуги в организацию?</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Нашли {importableMasterServices.length} услуг из вашего личного кабинета мастера. Их можно импортировать в организацию как новые услуги, а затем при необходимости изменить цены, описание, фото и правила начисления.
            </p>
            <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
              {importableMasterServices.map((service) => (
                <div key={service.id} className="text-sm">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-muted-foreground">{Number(service.price || 0).toLocaleString()} ₽ · {service.duration_minutes || 0} мин</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={dismissMasterImportPrompt}>
                Пока пропустить
              </Button>
              <Button className="flex-1" onClick={importMasterServicesToBusiness} disabled={importingMasterCatalog}>
                {importingMasterCatalog ? 'Импортируем...' : 'Импортировать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDashboard;
