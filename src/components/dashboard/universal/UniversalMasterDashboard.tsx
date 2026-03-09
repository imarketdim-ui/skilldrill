import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Calendar, Users, MessageSquare, BarChart3, Wallet,
  Package, Bell, ClipboardList, UserCog, Lock, AlertTriangle, Trophy,
  PanelLeftClose, PanelLeftOpen, Database, Briefcase, HeadphonesIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SubscriptionPaywall from '../SubscriptionPaywall';
import UniversalDashboardHome from './UniversalDashboardHome';
import UniversalSchedule from './UniversalSchedule';
import UniversalClients from './UniversalClients';
import UniversalFinances from './UniversalFinances';
import UniversalServices from './UniversalServices';
import UniversalStats from './UniversalStats';
import TeachingChats from '../teaching/TeachingChats';
import SupportChat from '../SupportChat';
import { CategoryConfig } from './categoryConfig';
import MasterProfileEditor from './MasterProfileEditor';
import MasterAchievements from './MasterAchievements';

// Inline notifications component for master dashboard
const MasterNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    supabase.from('notifications').select('*')
      .eq('user_id', (supabase as any).auth?.getUser ? '' : '')
      .order('created_at', { ascending: false }).limit(30)
      .then(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('notifications').select('*')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
        setNotifications(data || []);
      });
  }, []);

  const displayed = showArchive ? notifications : notifications.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Уведомления</CardTitle>
      </CardHeader>
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

// Inline requests component - shows pending lesson bookings
const MasterRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('lesson_bookings')
        .select('*, lessons!inner(title, lesson_date, start_time, end_time, price, teacher_id), profiles:student_id(first_name, last_name)')
        .eq('lessons.teacher_id', user.id).eq('status', 'pending')
        .order('created_at', { ascending: false });
      setRequests(data || []);
    };
    fetch();
  }, []);

  const handleAction = async (id: string, status: 'confirmed' | 'cancelled') => {
    await supabase.from('lesson_bookings').update({ status, confirmed_at: status === 'confirmed' ? new Date().toISOString() : null }).eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Заявки на запись</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">Нет ожидающих заявок</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => (
              <div key={r.id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{(r.profiles as any)?.first_name} {(r.profiles as any)?.last_name}</p>
                    <p className="text-sm text-muted-foreground">{(r.lessons as any)?.title}</p>
                    <p className="text-sm text-muted-foreground">{(r.lessons as any)?.lesson_date} · {(r.lessons as any)?.start_time?.slice(0, 5)}</p>
                    <p className="text-sm font-medium mt-1">{Number((r.lessons as any)?.price).toLocaleString()} ₽</p>
                  </div>
                  <Badge variant="secondary">Ожидает</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => handleAction(r.id, 'confirmed')}>Подтвердить</Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(r.id, 'cancelled')}>Отклонить</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface Props {
  masterProfile: any;
  isSubscriptionActive: boolean;
  config: CategoryConfig;
}

const menuItems = [
  { key: 'home', label: 'Главная', icon: LayoutDashboard, group: 'main' },
  { key: 'profile', label: 'Профиль', icon: UserCog, group: 'main' },
  { key: 'notifications', label: 'Уведомления', icon: Bell, group: 'main' },
];

const crmItems = [
  { key: 'schedule', label: 'Расписание', icon: Calendar, group: 'crm' },
  { key: 'clients', label: 'Клиенты', icon: Users, group: 'crm' },
  { key: 'chats', label: 'Чаты', icon: MessageSquare, group: 'crm' },
  { key: 'requests', label: 'Заявки', icon: ClipboardList, group: 'crm' },
];

const erpItems = [
  { key: 'stats', label: 'Статистика', icon: BarChart3, group: 'erp' },
  { key: 'services', label: 'Услуги', icon: Package, group: 'erp' },
  { key: 'finances', label: 'Финансы', icon: Wallet, group: 'erp' },
  { key: 'achievements', label: 'Достижения', icon: Trophy, group: 'erp' },
];

const communicationItems = [
  { key: 'support', label: 'Техподдержка', icon: HeadphonesIcon, group: 'comm' },
];

const allItems = [...menuItems, ...crmItems, ...erpItems, ...communicationItems];

const UniversalMasterDashboard = ({ masterProfile, isSubscriptionActive, config }: Props) => {
  const { profile } = useAuth();
  const pricing = usePlatformPricing();
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for navigate-dashboard custom events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail) setActiveSection(e.detail);
    };
    window.addEventListener('navigate-dashboard', handler as EventListener);
    return () => window.removeEventListener('navigate-dashboard', handler as EventListener);
  }, []);

  const isReadOnly = !isSubscriptionActive && !!masterProfile;

  // Read-only sections that work without subscription
  const readOnlySections = ['home', 'profile', 'notifications', 'support'];

  const adaptedCrmItems = crmItems.map(item =>
    item.key === 'clients' ? { ...item, label: config.clientNamePlural } : item
  );

  const renderContent = () => {
    // If read-only and trying to access a restricted section, show paywall
    if (isReadOnly && !readOnlySections.includes(activeSection)) {
      return (
        <SubscriptionPaywall
          entityType="master"
          entityId={masterProfile.id}
          entityName={masterProfile.short_description || 'Мастер'}
          onPaid={() => window.location.reload()}
        />
      );
    }
    switch (activeSection) {
      case 'profile': return <MasterProfileEditor masterProfile={masterProfile} config={config} />;
      case 'schedule': return <UniversalSchedule config={config} />;
      case 'services': return <UniversalServices config={config} />;
      case 'clients': return <UniversalClients config={config} />;
      case 'finances': return <UniversalFinances config={config} masterProfile={masterProfile} />;
      case 'chats': return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Общение</CardTitle>
          </CardHeader>
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
      case 'support': return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Общение</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="support" className="w-full">
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
      case 'stats': return <UniversalStats config={config} />;
      case 'achievements': return <MasterAchievements />;
      case 'requests': return <MasterRequests />;
      case 'notifications': return <MasterNotifications />;
      default: return <UniversalDashboardHome config={config} />;
    }
  };

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const IconComponent = config.icon;

  const NavButton = ({ item }: { item: { key: string; label: string; icon: any } }) => {
    const isLocked = isReadOnly && !readOnlySections.includes(item.key);
    return (
      <Button
        key={item.key}
        variant={activeSection === item.key ? 'default' : 'ghost'}
        className={`w-full gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'} ${activeSection === item.key ? '' : 'text-muted-foreground'} ${isLocked ? 'opacity-60' : ''}`}
        onClick={() => setActiveSection(item.key)}
        title={sidebarCollapsed ? item.label : undefined}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
        {!sidebarCollapsed && isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
      </Button>
    );
  };

  const SectionLabel = ({ label, icon: Icon }: { label: string; icon: any }) => {
    if (sidebarCollapsed) return <div className="border-t my-2 mx-2" />;
    return (
      <div className="flex items-center gap-2 px-3 mb-2 mt-4">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row lg:gap-6 w-full overflow-hidden">
      {/* Subscription expired banner */}
      {isReadOnly && (
        <div className="w-full bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4 flex items-center gap-3 lg:hidden">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Подписка истекла</p>
            <p className="text-xs text-muted-foreground">Доступ ограничен. Оплатите подписку для полного доступа.</p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setActiveSection('schedule')}>Оплатить</Button>
        </div>
      )}
      {/* Desktop: collapsible sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 sticky top-20 self-start h-[calc(100vh-6rem)] transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <div className="flex items-center gap-3 px-3 pb-4 border-b mb-2">
          {!sidebarCollapsed && (
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <IconComponent className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {masterProfile?.service_categories?.name || config.label}
              </p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        {isReadOnly && !sidebarCollapsed && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 mx-1">
            <p className="text-xs font-medium text-destructive">Подписка истекла</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Часть функций заблокирована</p>
          </div>
        )}
        <div className="space-y-0.5 overflow-y-auto flex-1">
          {!sidebarCollapsed && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Основное</p>}
          {menuItems.map(item => <NavButton key={item.key} item={item} />)}

          <SectionLabel label="CRM" icon={Users} />
          {adaptedCrmItems.map(item => <NavButton key={item.key} item={item} />)}

          <SectionLabel label="ERP" icon={Database} />
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
                <p className="text-xs text-muted-foreground">{config.label}</p>
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
              <span className="truncate max-w-[3.5rem] text-center">{item.key === 'clients' ? config.clientNamePlural : item.label}</span>
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

export default UniversalMasterDashboard;
