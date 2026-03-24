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
  PanelLeftClose, PanelLeftOpen, Wallet, Briefcase
} from 'lucide-react';
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
const BusinessNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('notifications').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
      setNotifications(data || []);
    };
    fetch();
  }, []);

  const displayed = showArchive ? notifications : notifications.slice(0, 10);

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Уведомления</CardTitle></CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">Уведомлений пока нет</p>
        ) : (
          <div className="space-y-3">
            {displayed.map((n: any) => (
              <div key={n.id} className={`p-3 rounded-lg border ${n.is_read ? '' : 'border-primary/30 bg-primary/5'}`}>
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('ru-RU')}</p>
              </div>
            ))}
            {!showArchive && notifications.length > 10 && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowArchive(true)}>
                Показать архив ({notifications.length - 10})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Business clients - extracted from bookings
const BusinessClients = ({ businessId }: { businessId: string }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('client_id, scheduled_at, profiles:client_id(first_name, last_name, phone)')
        .eq('organization_id', businessId)
        .order('scheduled_at', { ascending: false });

      const clientMap = new Map<string, any>();
      (bookings || []).forEach((b: any) => {
        if (!clientMap.has(b.client_id)) {
          clientMap.set(b.client_id, {
            id: b.client_id,
            name: `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`.trim(),
            phone: b.profiles?.phone || '—',
            lastVisit: b.scheduled_at,
            visitCount: 1,
          });
        } else {
          clientMap.get(b.client_id).visitCount++;
        }
      });

      setClients(Array.from(clientMap.values()));
      setLoading(false);
    };
    fetch();
  }, [businessId]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" /> Клиенты ({clients.length})
      </h3>
      {loading ? (
        <p className="text-muted-foreground text-center py-10">Загрузка...</p>
      ) : clients.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Клиентов пока нет</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {clients.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.name || 'Без имени'}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{c.visitCount} визит(ов)</p>
                  <p className="text-xs text-muted-foreground">
                    Последний: {new Date(c.lastVisit).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Business stats placeholder
const BusinessStats = ({ businessId }: { businessId: string }) => {
  const [stats, setStats] = useState({ total: 0, completed: 0, cancelled: 0, revenue: 0 });

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
        revenue: rows.filter((r: any) => r.status === 'completed').reduce((s: number, r: any) => s + (r.services?.price || 0), 0),
      });
    };
    fetch();
  }, [businessId]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5" /> Статистика
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего записей', value: stats.total },
          { label: 'Завершено', value: stats.completed },
          { label: 'Отменено', value: stats.cancelled },
          { label: 'Доход', value: `${stats.revenue.toLocaleString()} ₽` },
        ].map(s => (
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

const mainItems = [
  { key: 'overview', label: 'Главная', icon: LayoutDashboard },
  { key: 'profile', label: 'Профиль организации', icon: Settings },
  { key: 'notifications', label: 'Уведомления', icon: Bell },
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
  { key: 'chats', label: 'Чаты', icon: MessageSquare, description: 'Общение с клиентами' },
  { key: 'marketing', label: 'Маркетинг', icon: Megaphone, description: 'Рассылки и реклама' },
];

const erpItems = [
  { key: 'stats', label: 'Статистика', icon: BarChart3, description: 'Аналитика и отчёты' },
  { key: 'services', label: 'Услуги', icon: ClipboardList, description: 'Услуги и прайс' },
  { key: 'masters', label: 'Команда', icon: Users, description: 'Сотрудники' },
  { key: 'inventory', label: 'Склад', icon: Package, description: 'Товары и материалы' },
  { key: 'registers', label: 'Кассы', icon: Wallet, description: 'Наличные и безналичные' },
  { key: 'procurement', label: 'Закупки', icon: Package, description: 'Закупка материалов' },
  { key: 'writeoffs', label: 'Списания', icon: ClipboardList, description: 'Списание материалов' },
  { key: 'product_sales', label: 'Продажи', icon: Briefcase, description: 'Продажа товаров' },
  { key: 'promotions', label: 'Акции', icon: Percent, description: 'Скидки и промо' },
  { key: 'finance', label: 'Финансы', icon: Wallet, description: 'Доходы и расходы' },
  { key: 'subscription', label: 'Подписка', icon: CreditCard, description: 'Тарифы и оплата' },
];

const directoryItems = [
  { key: 'dir_client_types', label: 'Типы клиентов', icon: Users, description: 'Системные и пользовательские типы' },
  { key: 'dir_stats', label: 'Статистика справочников', icon: BarChart3, description: 'Обзор справочных данных' },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('business_locations').select('*').eq('owner_id', user.id);
    setBusinesses(data || []);
    if (data && data.length > 0) {
      const target = activeEntityId
        ? data.find(b => b.id === activeEntityId) || data[0]
        : data[0];
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
          <p className="text-muted-foreground">Создайте бизнес-аккаунт в разделе Клиент.</p>
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
      onClick={() => setActiveSection(item.key)}
      title={sidebarCollapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
    </Button>
  );

  const SectionLabel = ({ label, icon: Icon, sectionKey }: { label: string; icon: any; sectionKey?: string }) => {
    if (sidebarCollapsed) return <div className="border-t my-2 mx-2" />;
    return (
      <button
        className={`flex items-center gap-2 px-3 mb-2 mt-4 w-full text-left hover:opacity-80 transition-opacity ${activeSection === sectionKey ? 'text-primary' : ''}`}
        onClick={() => sectionKey && setActiveSection(sectionKey)}
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </button>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'crm':
        return (
          <SectionHub
            title="CRM"
            description="Управление клиентами и коммуникациями"
            items={crmItems}
            onNavigate={setActiveSection}
          />
        );
      case 'erp':
        return (
          <SectionHub
            title="ERP"
            description="Управление бизнес-процессами"
            items={erpItems}
            onNavigate={setActiveSection}
          />
        );
      case 'directories':
        return (
          <SectionHub
            title="Справочники"
            description="Справочные данные и настройки"
            items={directoryItems}
            onNavigate={setActiveSection}
          />
        );
      case 'dir_client_types':
        return selectedBusiness ? <ClientTypeDirectory businessId={selectedBusiness.id} /> : null;
      case 'dir_stats':
        return selectedBusiness ? <BusinessStats businessId={selectedBusiness.id} /> : null;
      case 'overview':
        return (
          <div className="space-y-6">
            <BusinessOnboardingTour onNavigate={setActiveSection} />
            {!canActivate && selectedBusiness && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Для активации бизнеса необходимо: минимум 1 принятый мастер ({masterCount}/1) и 1 активная услуга ({serviceCount}/1).
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
              <Card>
                <CardHeader><CardTitle>Управление</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <ArrowRightLeft className="h-4 w-4" /> Передать управление
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <UserPlus className="h-4 w-4" /> Назначить менеджера
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'bookings':
        return selectedBusiness ? <BusinessBookingDetail businessId={selectedBusiness.id} /> : null;
      case 'masters':
        return selectedBusiness ? (
          <BusinessMasters businessId={selectedBusiness.id} freeMasters={selectedBusiness.free_masters || 3} extraMasterPrice={selectedBusiness.extra_master_price || 500} />
        ) : null;
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
        return selectedBusiness ? <BusinessClients businessId={selectedBusiness.id} /> : null;
      case 'stats':
        return selectedBusiness ? <BusinessAnalytics businessId={selectedBusiness.id} /> : null;
      case 'notifications':
        return <BusinessNotifications />;
      case 'chats':
        return (
          <Card>
            <CardHeader><CardTitle className="text-lg">Общение</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="chats" className="w-full">
                <TabsList className="w-full rounded-none border-b bg-transparent px-6 pt-2">
                  <TabsTrigger value="chats" className="flex-1">Чаты</TabsTrigger>
                  <TabsTrigger value="support" className="flex-1">Техподдержка</TabsTrigger>
                </TabsList>
                <div className="p-6">
                  <TabsContent value="chats" className="mt-0"><TeachingChats /></TabsContent>
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
      {/* Desktop: collapsible sidebar */}
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

          <SectionLabel label="CRM" icon={Users} sectionKey="crm" />
          {crmItems.map(item => <NavButton key={item.key} item={item} />)}

          <SectionLabel label="ERP" icon={Database} sectionKey="erp" />
          {erpItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>

        {!sidebarCollapsed && (
          <div className="mt-auto pt-6 border-t">
            <div className="flex items-center gap-3 px-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile?.first_name}</p>
                <p className="text-xs text-muted-foreground">Организация</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile/tablet: bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-hide">
          {allItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[4rem] flex-1 py-2 text-[10px] leading-tight transition-colors
                ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[3.5rem] text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default BusinessDashboard;
