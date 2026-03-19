import { useState, useEffect, useMemo } from 'react';
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
import { Gift } from 'lucide-react';
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
import ClientBonusPoints from '@/components/dashboard/client/ClientBonusPoints';


// Desktop sidebar
const desktopMenuItems = [
  { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { key: 'bookings', label: 'Записи', icon: Calendar },
  { key: 'favorites', label: 'Избранное', icon: Heart },
  { key: 'reviews', label: 'Отзывы', icon: Star },
  { key: 'communication', label: 'Общение', icon: MessageSquare },
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
  { key: 'wallet', label: 'Баланс и бонусы', icon: Wallet },
  { key: 'settings', label: 'Настройки', icon: Settings },
];

const mobileMenuItems = [
  { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { key: 'bookings', label: 'Записи', icon: Calendar },
  { key: 'favorites', label: 'Избранное', icon: Heart },
  { key: 'communication', label: 'Общение', icon: MessageSquare },
  { key: 'settings', label: 'Настройки', icon: Settings },
];

const ClientDashboard = () => {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState({ main_balance: 0, referral_balance: 0 });
  const [pendingInvites, setPendingInvites] = useState(0);
  const [clientBookings, setClientBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [bookingsView, setBookingsView] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('user_balances').select('main_balance, referral_balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('admin_assignments').select('id', { count: 'exact', head: true }).eq('assignee_id', user.id).eq('status', 'pending'),
      supabase.from('lesson_bookings').select('id, status, lesson_id, lessons!inner(id, title, lesson_date, start_time, end_time, teacher_id), teacher:lessons!inner(profiles!lessons_teacher_id_fkey(first_name, last_name))').eq('student_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    ]).then(([balanceRes, invitesRes, bookingsRes, notificationsRes]) => {
      if (balanceRes.data) setBalance(balanceRes.data);
      setPendingInvites(invitesRes.count || 0);
      setClientBookings(bookingsRes.data || []);
      setNotifications(notificationsRes.data || []);
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

  // Filter bookings by view period
  const filteredBookings = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    return clientBookings.filter((b) => {
      const date = (b.lessons as any)?.lesson_date;
      if (!date) return false;

      if (bookingsView === 'day') return date === today;

      if (bookingsView === 'week') {
        const d = new Date(date);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return d >= now && d <= weekEnd;
      }

      // month
      const d = new Date(date);
      const monthEnd = new Date(now);
      monthEnd.setDate(monthEnd.getDate() + 30);
      return d >= now && d <= monthEnd;
    });
  }, [clientBookings, bookingsView]);

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
                  <TabsTrigger value="chats" className="flex-1">Чаты</TabsTrigger>
                  <TabsTrigger value="requests" className="flex-1 relative">
                    Запросы
                    {pendingInvites > 0 && (
                      <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{pendingInvites}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="support" className="flex-1">Поддержка</TabsTrigger>
                </TabsList>
                <div className="p-6">
                  <TabsContent value="chats" className="mt-0"><TeachingChats /></TabsContent>
                  <TabsContent value="requests" className="mt-0"><ClientRequests /></TabsContent>
                  <TabsContent value="support" className="mt-0"><SupportChat /></TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        );

      case 'stats':
        return user ? <ClientStats userId={user.id} /> : null;

      case 'wallet':
        return <ClientWallet />;

      case 'bonus':
        return <ClientBonusPoints />;

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
                  <CardDescription>Последние уведомления по аккаунту</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">Уведомлений пока нет</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg border">
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
                          <Badge variant="secondary" className="font-mono text-sm">ID: {profile?.skillspot_id}</Badge>
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
              {/* Bookings block — opens full bookings view */}
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('bookings')}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Ближайшие записи</p>
                  <div className="mt-3 space-y-2">
                    {clientBookings.slice(0, 3).map((b) => (
                      <div key={b.id} className="text-sm p-2 rounded-md bg-muted/50">
                        <p className="font-medium truncate">{(b.lessons as any)?.title || 'Запись'}</p>
                        <p className="text-xs text-muted-foreground">{(b.lessons as any)?.lesson_date} · {(b.lessons as any)?.start_time?.slice(0, 5)}</p>
                      </div>
                    ))}
                    {clientBookings.length === 0 && <p className="text-sm text-muted-foreground">Нет предстоящих записей</p>}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">Открыть полный список</Button>
                </CardContent>
              </Card>

              {/* Notifications block */}
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

              {/* Search block */}
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/catalog')}>
                <CardContent className="pt-6 flex flex-col items-center justify-center">
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
          {desktopMenuItems.map(item => (
            <Button
              key={item.key}
              variant={activeSection === item.key ? 'default' : 'ghost'}
              className={`w-full gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'} ${activeSection === item.key ? '' : 'text-muted-foreground'}`}
              onClick={() => setActiveSection(item.key)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.key === 'communication' && pendingInvites > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">{pendingInvites}</Badge>
              )}
              {sidebarCollapsed && item.key === 'communication' && pendingInvites > 0 && (
                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          ))}
        </div>
        {!sidebarCollapsed && (
          <div className="mt-auto pt-6 border-t">
            <div className="flex items-center gap-3 px-3">
              <Avatar className="h-8 w-8">
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
          {mobileMenuItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] transition-colors relative
                ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="leading-tight">{item.label}</span>
              {item.key === 'communication' && pendingInvites > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-3 h-2 w-2 rounded-full bg-destructive" />
              )}
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

export default ClientDashboard;
