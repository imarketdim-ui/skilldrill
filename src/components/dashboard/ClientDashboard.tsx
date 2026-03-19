import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, Heart, Calendar, Wallet, Users, MessageSquare,
  Copy, Check, Building2, Shield, Bell, ArrowLeft,
  LayoutDashboard, Settings, BarChart3, ChevronRight, Star,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import TeachingChats from '@/components/dashboard/teaching/TeachingChats';
import ClientRequests from '@/components/dashboard/client/ClientRequests';
import ClientWallet from '@/components/dashboard/client/ClientWallet';
import ClientStats from '@/components/dashboard/client/ClientStats';
import SupportChat from '@/components/dashboard/SupportChat';
import ClientFavorites from '@/components/dashboard/client/ClientFavorites';
import ClientSettingsSection from '@/components/dashboard/client/ClientSettingsSection';
import ClientBookings from '@/components/dashboard/client/ClientBookings';
import ClientReviews from '@/components/dashboard/client/ClientReviews';

// Desktop sidebar
const desktopMenuItems = [
  { key: 'overview',       label: 'Обзор',         icon: LayoutDashboard },
  { key: 'bookings',       label: 'Записи',         icon: Calendar },
  { key: 'favorites',      label: 'Избранное',      icon: Heart },
  { key: 'reviews',        label: 'Отзывы',         icon: Star },
  { key: 'communication',  label: 'Общение',        icon: MessageSquare },
  { key: 'stats',          label: 'Статистика',     icon: BarChart3 },
  { key: 'wallet',         label: 'Баланс и бонусы',icon: Wallet },
  { key: 'settings',       label: 'Настройки',      icon: Settings },
];

const mobileMenuItems = [
  { key: 'overview',      label: 'Обзор',    icon: LayoutDashboard },
  { key: 'bookings',      label: 'Записи',   icon: Calendar },
  { key: 'favorites',     label: 'Избранное',icon: Heart },
  { key: 'communication', label: 'Общение',  icon: MessageSquare },
  { key: 'settings',      label: 'Настройки',icon: Settings },
];

const ClientDashboard = () => {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cabinetBalance, setCabinetBalance] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  // Scoped to client cabinet only
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      // Client cabinet balance (isolated)
      supabase.from('cabinet_balances')
        .select('main_balance')
        .eq('user_id', user.id)
        .eq('cabinet_type', 'client')
        .is('cabinet_id', null)
        .maybeSingle(),
      supabase.from('admin_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', user.id).eq('status', 'pending'),
      // Upcoming bookings from both bookings + lesson_bookings
      supabase.from('bookings')
        .select('id, scheduled_at, status, services!inner(name), executor:profiles!bookings_executor_id_fkey(first_name, last_name)')
        .eq('client_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5),
      // Client-scoped notifications only (include null cabinet_type for backward compat)
      supabase.from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .or('cabinet_type.eq.client,cabinet_type.is.null')
        .order('created_at', { ascending: false })
        .limit(30),
      // Unread chats count — client cabinet scope
      supabase.from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .neq('chat_type', 'support')
        .or('cabinet_type_scope.eq.client,cabinet_type_scope.is.null'),
    ]).then(([balRes, invRes, bookRes, notifRes, chatRes]) => {
      setCabinetBalance(balRes.data?.main_balance || 0);
      setPendingInvites(invRes.count || 0);
      setUpcomingBookings(bookRes.data || []);
      setNotifications(notifRes.data || []);
      setUnreadChats(chatRes.count || 0);
    });
  }, [user]);

  const handleCopyId = () => {
    if (profile?.skillspot_id) {
      navigator.clipboard.writeText(profile.skillspot_id);
      setCopied(true);
      toast({ title: 'ID скопирован' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const totalUnread = (notifications.filter(n => !n.is_read).length) + unreadChats + pendingInvites;

  const renderContent = () => {
    switch (activeSection) {
      case 'bookings':
        return user ? <ClientBookings userId={user.id} /> : null;

      case 'reviews':
        return user ? <ClientReviews userId={user.id} /> : null;

      case 'favorites':
        return <ClientFavorites userId={user?.id} />;

      case 'communication':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Общение</CardTitle>
              <CardDescription>Чаты, запросы и техподдержка</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="chats" className="w-full">
                <TabsList className="w-full rounded-none border-b bg-transparent px-6 pt-2">
                  <TabsTrigger value="chats" className="flex-1 relative">
                    Чаты
                    {unreadChats > 0 && (
                      <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{unreadChats}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="flex-1 relative">
                    Запросы
                    {pendingInvites > 0 && (
                      <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{pendingInvites}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="support" className="flex-1">Поддержка</TabsTrigger>
                </TabsList>
                <div className="p-0 md:p-4">
                  <TabsContent value="chats" className="mt-0">
                    {/* isClientContext disables group creation, onUnreadChange syncs count */}
                    <TeachingChats isClientContext onUnreadChange={setUnreadChats} />
                  </TabsContent>
                  <TabsContent value="requests" className="mt-0 p-4 md:p-0"><ClientRequests /></TabsContent>
                  <TabsContent value="support" className="mt-0 p-4 md:p-0"><SupportChat /></TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        );

      case 'stats':
        return user ? <ClientStats userId={user.id} /> : null;

      case 'wallet':
        return <ClientWallet />;

      case 'settings':
        return <ClientSettingsSection />;

      case 'notifications':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveSection('overview')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>Уведомления</CardTitle>
                  <CardDescription>Уведомления клиентского кабинета</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">Уведомлений пока нет</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => {
                    const navTarget = n.type?.includes('booking') ? 'bookings'
                      : n.type?.includes('chat') || n.type?.includes('message') ? 'communication'
                      : n.type?.includes('review') ? 'reviews'
                      : n.type?.includes('payment') || n.type?.includes('subscription') ? 'wallet'
                      : null;
                    return (
                      <div key={n.id}
                        className={`p-3 rounded-lg border ${!n.is_read ? 'bg-primary/5 border-primary/20' : ''} ${navTarget ? 'cursor-pointer hover:border-primary/50' : ''}`}
                        onClick={async () => {
                          if (!n.is_read) await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
                          if (navTarget) setActiveSection(navTarget);
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('ru-RU')}</p>
                          </div>
                          {navTarget && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default: // overview
        return (
          <div className="space-y-6">
            {pendingInvites > 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">У вас {pendingInvites} входящ{pendingInvites === 1 ? 'ее' : 'их'} назначени{pendingInvites === 1 ? 'е' : 'й'}</p>
                        <p className="text-sm text-muted-foreground">Перейдите в раздел «Общение → Запросы»</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveSection('communication')}>Перейти</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {profile?.first_name && profile?.last_name
                            ? `${profile.first_name} ${profile.last_name}`
                            : profile?.email || 'Пользователь'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="font-mono text-sm select-all cursor-text">ID: {profile?.skillspot_id}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Upcoming bookings */}
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('bookings')}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Ближайшие записи</p>
                  <div className="mt-3 space-y-2">
                    {upcomingBookings.slice(0, 3).map((b) => (
                      <div key={b.id} className="text-sm p-2 rounded-md bg-muted/50">
                        <p className="font-medium truncate">{(b.services as any)?.name || 'Запись'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(b.scheduled_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ·{' '}
                          {new Date(b.scheduled_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                    {upcomingBookings.length === 0 && <p className="text-sm text-muted-foreground">Нет предстоящих записей</p>}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">Открыть полный список</Button>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('notifications')}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Уведомления</p>
                      <p className="text-3xl font-bold mt-1">{notifications.filter(n => !n.is_read).length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Непрочитанных</p>
                    </div>
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              {/* Balance */}
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('wallet')}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Баланс</p>
                      <p className="text-3xl font-bold mt-1">{Number(cabinetBalance).toLocaleString()} ₽</p>
                    </div>
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              {/* Search */}
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/catalog')}>
                <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[100px]">
                  <Search className="h-8 w-8 text-primary mb-2" />
                  <p className="text-sm font-medium">Поиск услуг</p>
                </CardContent>
              </Card>
            </div>

            {/* Stats teaser */}
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('stats')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Моя статистика</p>
                    <p className="text-sm text-muted-foreground">Надёжность, неявки, отмены и рейтинг</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>

            {!roles.some(r => ['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(r)) && (
              <Card className="border-dashed cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/create-account')}>
                <CardContent className="pt-6 text-center">
                  <Building2 className="h-10 w-10 mx-auto mb-2 text-primary" />
                  <p className="font-semibold">Создать бизнес-аккаунт</p>
                  <p className="text-sm text-muted-foreground">Мастер, бизнес или сеть — выберите тип и начните работу</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:gap-6">
      {/* Desktop: collapsible sidebar */}
      <aside className={`hidden lg:flex shrink-0 sticky top-20 self-start flex-col h-[calc(100vh-6rem)] transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <div className="flex items-center gap-3 px-3 pb-4 border-b mb-4">
          {!sidebarCollapsed && (
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Личный кабинет</p>
              <p className="text-xs text-muted-foreground">Клиент</p>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-1 overflow-y-auto flex-1">
          {!sidebarCollapsed && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>}
          {desktopMenuItems.map(item => {
            const badge = item.key === 'communication' ? totalUnread
              : item.key === 'notifications' ? notifications.filter(n => !n.is_read).length
              : 0;
            return (
              <Button
                key={item.key}
                variant={activeSection === item.key ? 'default' : 'ghost'}
                className={`w-full gap-3 relative ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'} ${activeSection === item.key ? '' : 'text-muted-foreground'}`}
                onClick={() => setActiveSection(item.key)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {!sidebarCollapsed && badge > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">{badge}</Badge>
                )}
                {sidebarCollapsed && badge > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            );
          })}
        </div>
        {!sidebarCollapsed && (
          <div className="mt-auto pt-6 border-t">
            <div className="flex items-center gap-3 px-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile?.first_name || 'Пользователь'}</p>
                <p className="text-xs text-muted-foreground">Клиент</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile/tablet: bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t safe-area-bottom">
        <div className="flex justify-around items-center h-14">
          {mobileMenuItems.map(item => {
            const badge = item.key === 'communication' ? totalUnread : 0;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] transition-colors relative
                  ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="leading-tight">{item.label}</span>
                {badge > 0 && (
                  <span className="absolute top-1 right-1/2 translate-x-3 h-2 w-2 rounded-full bg-destructive" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default ClientDashboard;
