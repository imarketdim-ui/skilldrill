import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Calendar, Users, MessageSquare, BarChart3, Wallet,
  Package, Bell, ClipboardList, UserCog, Lock, AlertTriangle,
  PanelLeftClose, PanelLeftOpen, Database, Briefcase, Megaphone, Plus, Trash2,
  Shield, Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import SubscriptionPaywall from '../SubscriptionPaywall';
import SectionHub from '../SectionHub';
import UniversalDashboardHome from './UniversalDashboardHome';
import UniversalSchedule from './UniversalSchedule';
import UniversalClients from './UniversalClients';
import UniversalFinances from './UniversalFinances';
import UniversalServices from './UniversalServices';
import UniversalStats from './UniversalStats';
import TeachingChats from '../teaching/TeachingChats';
import SupportChat from '../SupportChat';
import BusinessMarketing from '../business/BusinessMarketing';
import { CategoryConfig } from './categoryConfig';
import MasterProfileEditor from './MasterProfileEditor';
import MasterProfileView from './MasterProfileView';

// ── Notifications with real counter ──
const MasterNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tab, setTab] = useState<'active' | 'archive'>('active');

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('notifications').select('*')
        .eq('user_id', user.id)
        .eq('cabinet_type', 'master')
        .order('created_at', { ascending: false }).limit(50);
      setNotifications(data || []);
    };
    fetch();
  }, []);

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

// ── Client Type Directory (Supabase-backed) ──
const MasterClientTypeDirectory = () => {
  const { user } = useAuth();
  const [customTypes, setCustomTypes] = useState<{ id: string; name: string }[]>([]);
  const [newType, setNewType] = useState('');
  const { toast } = useToast();
  const systemTypes = ['VIP', 'Постоянный', 'Новый', 'Спящий', 'Неактивный', 'ЧС'];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('master_client_types')
        .select('id, name')
        .eq('master_id', user.id)
        .order('created_at', { ascending: true });
      setCustomTypes(data || []);
    })();
  }, [user]);

  const addType = async () => {
    if (!user) return;
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (systemTypes.includes(trimmed) || customTypes.some(t => t.name === trimmed)) {
      toast({ title: 'Такой тип уже существует', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase
      .from('master_client_types')
      .insert({ master_id: user.id, name: trimmed })
      .select('id, name')
      .single();
    if (error) {
      toast({ title: 'Ошибка добавления', description: error.message, variant: 'destructive' });
      return;
    }
    setCustomTypes(prev => [...prev, data]);
    setNewType('');
    toast({ title: 'Тип добавлен' });
  };

  const removeType = async (id: string) => {
    const { error } = await supabase.from('master_client_types').delete().eq('id', id);
    if (error) {
      toast({ title: 'Ошибка удаления', description: error.message, variant: 'destructive' });
      return;
    }
    setCustomTypes(prev => prev.filter(t => t.id !== id));
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
                <Badge key={t.id} variant="outline" className="text-sm gap-1 pr-1">
                  {t.name}
                  <button onClick={() => removeType(t.id)} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ── Requests ──
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
      <CardHeader><CardTitle className="text-lg">Заявки на запись</CardTitle></CardHeader>
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

const mainItems = [
  { key: 'home', label: 'Главная', icon: LayoutDashboard },
  { key: 'profile', label: 'Профиль', icon: UserCog },
  { key: 'messages', label: 'Сообщения', icon: MessageSquare },
];

const sidebarSections = [
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'erp', label: 'ERP', icon: Database },
  { key: 'directories', label: 'Справочники', icon: Briefcase },
];

const crmItems = [
  { key: 'schedule', label: 'Расписание', icon: Calendar, description: 'Управление временем' },
  { key: 'clients', label: 'Клиенты', icon: Users, description: 'База клиентов' },
  { key: 'requests', label: 'Заявки', icon: ClipboardList, description: 'Входящие заявки' },
  { key: 'marketing', label: 'Маркетинг', icon: Megaphone, description: 'Рассылки и реклама' },
  { key: 'promotions', label: 'Акции и Скидки', icon: Percent, description: 'Скидки и промо' },
];

const erpItems = [
  { key: 'stats', label: 'Статистика', icon: BarChart3, description: 'Аналитика и отчёты' },
  { key: 'services', label: 'Услуги', icon: Package, description: 'Список услуг и цены' },
  { key: 'finances', label: 'Финансы', icon: Wallet, description: 'Доходы и расходы' },
];

const directoryItems = [
  { key: 'dir_client_types', label: 'Типы клиентов', icon: Users, description: 'Системные и пользовательские типы' },
  { key: 'dir_stats', label: 'Статистика', icon: BarChart3, description: 'Обзор справочных данных' },
];

const allItems = [...mainItems, ...sidebarSections];

const UniversalMasterDashboard = ({ masterProfile, isSubscriptionActive, config }: Props) => {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [activeSection, setActiveSection] = useState('home');
  const [messagesTab, setMessagesTab] = useState<'chats' | 'notifications' | 'support'>('chats');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail) setActiveSection(e.detail);
    };
    window.addEventListener('navigate-dashboard', handler as EventListener);
    return () => window.removeEventListener('navigate-dashboard', handler as EventListener);
  }, []);

  useEffect(() => {
    const section = searchParams.get('section');
    const tab = searchParams.get('tab');
    const contact = searchParams.get('contact');

    if (section && ['home', 'messages'].includes(section)) {
      setActiveSection(section);
    }

    if (tab && ['chats', 'notifications', 'support'].includes(tab)) {
      setMessagesTab(tab as 'chats' | 'notifications' | 'support');
    }

    if (section === 'messages' && contact) {
      const timer = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-chat-with', { detail: contact }));
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [searchParams]);

  const isReadOnly = !isSubscriptionActive && !!masterProfile;
  const readOnlySections = ['home', 'profile', 'messages'];

  const adaptedCrmItems = crmItems.map(item =>
    item.key === 'clients' ? { ...item, label: config.clientNamePlural } : item
  );

  const renderContent = () => {
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
      case 'profile': return (
        <MasterProfileView
          masterProfile={masterProfile}
          profile={profile}
          config={config}
          onEditClick={() => setProfileEditorOpen(true)}
        />
      );
      case 'crm': return <SectionHub title="CRM" description="Управление клиентами и коммуникациями" items={adaptedCrmItems} onNavigate={setActiveSection} />;
      case 'erp': return <SectionHub title="ERP" description="Управление бизнес-процессами" items={erpItems} onNavigate={setActiveSection} />;
      case 'directories': return <SectionHub title="Справочники" description="Справочные данные и настройки" items={directoryItems} onNavigate={setActiveSection} />;
      case 'dir_client_types': return <MasterClientTypeDirectory />;
      case 'dir_stats': return <UniversalStats config={config} />;
      case 'schedule': return <UniversalSchedule config={config} />;
      case 'services': return <UniversalServices config={config} />;
      case 'clients': return <UniversalClients config={config} onNavigateToChat={(contactId) => {
        setActiveSection('messages');
        setTimeout(() => { window.dispatchEvent(new CustomEvent('open-chat-with', { detail: contactId })); }, 100);
      }} />;
      case 'finances': return <UniversalFinances config={config} masterProfile={masterProfile} />;
      case 'messages': return (
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
                <TabsContent value="chats" className="mt-0"><TeachingChats cabinetContext="master" /></TabsContent>
                <TabsContent value="notifications" className="mt-0"><MasterNotifications /></TabsContent>
                <TabsContent value="support" className="mt-0"><SupportChat /></TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      );
      case 'stats': return <UniversalStats config={config} />;
      case 'requests': return <MasterRequests />;
      case 'promotions': return <p className="text-center py-10 text-muted-foreground">Акции и скидки — в разработке</p>;
      case 'marketing': return <BusinessMarketing businessId={masterProfile?.id} />;
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

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:gap-6 w-full overflow-hidden">
        {isReadOnly && (
          <div className="w-full bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4 flex items-center gap-3 lg:hidden">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Подписка истекла</p>
              <p className="text-xs text-muted-foreground">Доступ ограничен.</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => setActiveSection('finances')}>Оплатить</Button>
          </div>
        )}

        <aside className={`hidden lg:flex flex-col shrink-0 sticky top-20 self-start h-[calc(100vh-6rem)] transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
          <div className="flex items-center gap-3 px-3 pb-4 border-b mb-2">
            {!sidebarCollapsed && (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <IconComponent className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{masterProfile?.service_categories?.name || config.label}</p>
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
            {mainItems.map(item => <NavButton key={item.key} item={item} />)}
            {sidebarSections.map(sec => <NavButton key={sec.key} item={sec} />)}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-auto pt-6 border-t">
              <div className="flex items-center gap-3 px-3">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials()}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.first_name}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
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

      <Dialog open={profileEditorOpen} onOpenChange={open => { if (!open) setProfileEditorOpen(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <MasterProfileEditor
            masterProfile={masterProfile}
            config={config}
            onPhotosChanged={() => { window.dispatchEvent(new CustomEvent('master-profile-updated')); }}
            onClose={() => setProfileEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UniversalMasterDashboard;
