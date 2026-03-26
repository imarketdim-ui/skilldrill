import { useState, useEffect, useCallback } from 'react';
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
  Search, User, Merge
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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

// ── Notifications with real counter ──
const BusinessNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tab, setTab] = useState<'active' | 'archive'>('active');

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('notifications').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      setNotifications(data || []);
    };
    fetch();
  }, []);

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
              <div key={n.id} className={`p-3 rounded-lg border ${n.is_read ? '' : 'border-primary/30 bg-primary/5'}`}>
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
    const saved = localStorage.getItem(`client_types_${businessId}`);
    if (saved) try { setCustomTypes(JSON.parse(saved)); } catch {}
  }, [businessId]);

  const saveTypes = (types: string[]) => {
    setCustomTypes(types);
    localStorage.setItem(`client_types_${businessId}`, JSON.stringify(types));
  };

  const addType = () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (systemTypes.includes(trimmed) || customTypes.includes(trimmed)) {
      toast({ title: 'Такой тип уже существует', variant: 'destructive' });
      return;
    }
    saveTypes([...customTypes, trimmed]);
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
                  <button onClick={() => { saveTypes(customTypes.filter(x => x !== t)); toast({ title: 'Тип удалён' }); }} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
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
  const [manualForm, setManualForm] = useState({ name: '', phone: '', email: '', note: '' });
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<any>(null);
  const [mergeSkillspotId, setMergeSkillspotId] = useState('');

  useEffect(() => { if (user) fetchClients(); }, [user, businessId]);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    // Get clients from bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('client_id, scheduled_at, status, services:service_id(price)')
      .eq('organization_id', businessId)
      .order('scheduled_at', { ascending: false });

    // Get clients from chats (messages sent to business owner)
    const { data: chatMessages } = await supabase
      .from('chat_messages')
      .select('sender_id, recipient_id, created_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(500);

    // Get manually added clients
    const { data: manualClients } = await supabase
      .from('client_tags')
      .select('client_id, note, created_at')
      .eq('tagger_id', user.id)
      .eq('tag', 'manual_client');

    // Collect all unique client IDs
    const clientMap = new Map<string, any>();

    (bookings || []).forEach((b: any) => {
      if (b.client_id === user.id) return;
      if (!clientMap.has(b.client_id)) {
        clientMap.set(b.client_id, { id: b.client_id, sources: new Set(['booking']), visitCount: 0, lastVisit: b.scheduled_at, revenue: 0 });
      }
      const c = clientMap.get(b.client_id);
      c.sources.add('booking');
      c.visitCount++;
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
        clientMap.set(mc.client_id, { id: mc.client_id, sources: new Set(['manual']), visitCount: 0, lastVisit: mc.created_at, revenue: 0, note: mc.note });
      } else {
        clientMap.get(mc.client_id).sources.add('manual');
      }
    });

    // Fetch profiles
    const ids = Array.from(clientMap.keys());
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, phone, email, skillspot_id').in('id', ids);
      (profiles || []).forEach(p => {
        const c = clientMap.get(p.id);
        if (c) {
          c.name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Без имени';
          c.phone = p.phone || '—';
          c.email = p.email;
          c.skillspot_id = p.skillspot_id;
        }
      });
    }

    setClients(Array.from(clientMap.values()).map(c => ({ ...c, sources: Array.from(c.sources) })));
    setLoading(false);
  };

  const handleAddManual = async () => {
    if (!manualForm.name.trim()) {
      toast({ title: 'Введите имя', variant: 'destructive' });
      return;
    }
    // For manual clients we need a real user profile. Show info about this.
    toast({ title: 'Для добавления клиента вручную', description: 'Попросите клиента зарегистрироваться на платформе и сообщить свой ID. Затем используйте функцию «Объединить».' });
    setAddManualOpen(false);
  };

  const handleMerge = async () => {
    if (!mergeTarget || !mergeSkillspotId.trim()) {
      toast({ title: 'Введите ID клиента', variant: 'destructive' });
      return;
    }
    // Find user by skillspot_id
    const { data: targetProfile } = await supabase.from('profiles')
      .select('id, first_name, last_name, skillspot_id')
      .eq('skillspot_id', mergeSkillspotId.trim())
      .maybeSingle();

    if (!targetProfile) {
      toast({ title: 'Клиент не найден', description: 'Проверьте ID', variant: 'destructive' });
      return;
    }
    if (targetProfile.id === mergeTarget.id) {
      toast({ title: 'Это тот же клиент', variant: 'destructive' });
      return;
    }

    // Mark as merged via tag
    await supabase.from('client_tags').insert({
      client_id: targetProfile.id, tagger_id: user!.id,
      tag: 'merged_from', note: `Объединён с ${mergeTarget.name} (${mergeTarget.id})`
    });

    toast({ title: 'Клиенты отмечены для объединения', description: `${mergeTarget.name} → ${targetProfile.first_name} ${targetProfile.last_name}. История будет учитываться в рейтинге нового профиля.` });
    setMergeOpen(false);
    setMergeTarget(null);
    setMergeSkillspotId('');
    fetchClients();
  };

  const filtered = search
    ? clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.skillspot_id?.includes(search))
    : clients;

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по имени, телефону или ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-10">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>{search ? 'Не найдено' : 'Клиентов пока нет. Клиенты добавятся автоматически из записей и чатов.'}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.name || 'Без имени'}</p>
                    <p className="text-xs text-muted-foreground">{c.phone} {c.skillspot_id ? `· ID: ${c.skillspot_id}` : ''}</p>
                    {getSourceBadges(c.sources)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm">{c.visitCount} визит(ов)</p>
                      <p className="text-xs text-muted-foreground">{c.revenue > 0 ? `${c.revenue.toLocaleString()} ₽` : ''}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Написать" onClick={() => {
                      if (onOpenChat) onOpenChat(c.id);
                    }}>
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
          <p className="text-sm text-muted-foreground">Если клиент зарегистрировался и сообщил свой ID — введите его ниже.</p>
          {mergeTarget && <p className="text-sm">Текущий: <strong>{mergeTarget.name}</strong></p>}
          <div className="space-y-2">
            <Label>SkillSpot ID нового профиля</Label>
            <Input placeholder="Например: SS-12345" value={mergeSkillspotId} onChange={e => setMergeSkillspotId(e.target.value)} />
          </div>
          <Button onClick={handleMerge} className="w-full">Объединить</Button>
        </DialogContent>
      </Dialog>

      {/* Add manual dialog */}
      <Dialog open={addManualOpen} onOpenChange={setAddManualOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить клиента</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Клиенты добавляются автоматически из записей и чатов. Для ручного добавления попросите клиента зарегистрироваться и сообщить свой ID.</p>
          <Button variant="outline" onClick={() => setAddManualOpen(false)}>Понятно</Button>
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
  { key: 'clients', label: 'Клиенты', icon: Users, description: 'База клиентов' },
  { key: 'marketing', label: 'Маркетинг', icon: Megaphone, description: 'Рассылки и реклама' },
  { key: 'promotions', label: 'Акции и Скидки', icon: Percent, description: 'Скидки и промо' },
];

const erpItems = [
  { key: 'stats', label: 'Статистика', icon: BarChart3, description: 'Аналитика и отчёты' },
  { key: 'services', label: 'Услуги', icon: ClipboardList, description: 'Услуги и прайс' },
  { key: 'commissions', label: 'Комиссии', icon: DollarSign, description: 'Настройки комиссий' },
  { key: 'inventory', label: 'Склад', icon: Package, description: 'Товары и материалы' },
  { key: 'registers', label: 'Кассы', icon: Wallet, description: 'Наличные и безналичные' },
  { key: 'product_sales', label: 'Продажи', icon: Briefcase, description: 'Продажа товаров' },
  { key: 'finance', label: 'Финансы', icon: Wallet, description: 'Доходы и расходы' },
];

const directoryItems = [
  { key: 'dir_client_types', label: 'Типы клиентов', icon: Users, description: 'Системные и пользовательские типы' },
  { key: 'dir_products', label: 'Товары и материалы', icon: Package, description: 'Справочник товаров для склада и тех. карт' },
  { key: 'dir_registers', label: 'Кассы', icon: Wallet, description: 'Создание и управление кассами' },
  { key: 'dir_positions', label: 'Должности', icon: Shield, description: 'Настройка доступов по ролям' },
];

// Profile sub-items (team, subscription, transfer, manager)
const profileItems = [
  { key: 'masters', label: 'Команда', icon: Users, description: 'Сотрудники организации' },
  { key: 'subscription', label: 'Подписка', icon: CreditCard, description: 'Тарифы и оплата' },
];

const allItems = [...mainItems, ...sidebarSections];

const BusinessDashboard = () => {
  const { user, profile, activeEntityId } = useAuth();
  const pricing = usePlatformPricing();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [masterCount, setMasterCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [activeSection, setActiveSection] = useState('overview');
  const [previousSection, setPreviousSection] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);
  // Transfer ownership dialog state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [transferring, setTransferring] = useState(false);
  // Assign manager dialog state
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerId, setManagerId] = useState('');
  const [assigningManager, setAssigningManager] = useState(false);

  const navigateTo = (section: string) => {
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

  const fetchBusinesses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('business_locations').select('*').eq('owner_id', user.id);
    setBusinesses(data || []);
    if (data && data.length > 0) {
      const target = activeEntityId ? data.find(b => b.id === activeEntityId) || data[0] : data[0];
      setSelectedBusiness(target);
      const [mRes, sRes] = await Promise.all([
        supabase.from('business_masters').select('id', { count: 'exact', head: true }).eq('business_id', target.id).eq('status', 'accepted'),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', target.id).eq('is_active', true),
      ]);
      setMasterCount(mRes.count || 0);
      setServiceCount(sRes.count || 0);
    }
    setLoading(false);
  }, [user, activeEntityId]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const canActivate = masterCount >= 1 && serviceCount >= 1;

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

  const renderContent = () => {
    switch (activeSection) {
      case 'crm':
        return <SectionHub title="CRM" description="Управление клиентами и коммуникациями" items={crmItems} onNavigate={navigateTo} />;
      case 'erp':
        return <SectionHub title="ERP" description="Управление бизнес-процессами" items={erpItems} onNavigate={navigateTo} />;
      case 'directories':
        return <SectionHub title="Справочники" description="Справочные данные и настройки" items={directoryItems} onNavigate={navigateTo} />;
      case 'dir_client_types':
        return selectedBusiness ? <ClientTypeDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_products':
        return selectedBusiness ? <ProductsDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_registers':
        return selectedBusiness ? <CashRegistersDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_positions':
        return selectedBusiness ? <PositionsDirectory businessId={selectedBusiness.id} /> : null;
      case 'overview':
        return (
          <div className="space-y-6">
            <BusinessOnboardingTour onNavigate={navigateTo} />
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
        return selectedBusiness ? <BusinessClients businessId={selectedBusiness.id} onOpenChat={(clientId) => { setChatTargetId(clientId); navigateTo('messages'); }} /> : null;
      case 'stats':
        return selectedBusiness ? <BusinessAnalytics businessId={selectedBusiness.id} /> : null;
      case 'messages':
        return (
          <Card>
            <CardHeader><CardTitle className="text-lg">Сообщения</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="chats" className="w-full">
                <TabsList className="w-full rounded-none border-b bg-transparent px-6 pt-2">
                  <TabsTrigger value="chats" className="flex-1">Чаты</TabsTrigger>
                  <TabsTrigger value="notifications" className="flex-1">Уведомления</TabsTrigger>
                  <TabsTrigger value="support" className="flex-1">Техподдержка</TabsTrigger>
                </TabsList>
                <div className="p-6">
                  <TabsContent value="chats" className="mt-0"><TeachingChats cabinetContext="business" /></TabsContent>
                  <TabsContent value="notifications" className="mt-0"><BusinessNotifications /></TabsContent>
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
        return selectedBusiness ? <BusinessSettings business={selectedBusiness} onUpdated={fetchBusinesses} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:gap-6 w-full overflow-hidden">
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
              <p className="text-xs text-muted-foreground">Организация</p>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-0.5 overflow-y-auto flex-1">
          {!sidebarCollapsed && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Основное</p>}
          {mainItems.map(item => <NavButton key={item.key} item={item} />)}
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
          {allItems.map(item => (
            <button key={item.key} onClick={() => setActiveSection(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[4rem] flex-1 py-2 text-[10px] leading-tight transition-colors ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[3.5rem] text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">{renderContent()}</div>
    </div>
  );
};

export default BusinessDashboard;
