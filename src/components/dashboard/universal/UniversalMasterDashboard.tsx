import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Calendar, Users, MessageSquare, BarChart3, Wallet, Package, Bell, ClipboardList, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  { key: 'home', label: 'Главная', icon: LayoutDashboard },
  { key: 'profile', label: 'Профиль', icon: UserCog },
  { key: 'schedule', label: 'Расписание', icon: Calendar },
  { key: 'services', label: 'Услуги', icon: Package },
  { key: 'clients', label: 'Клиенты', icon: Users },
  { key: 'chats', label: 'Чаты', icon: MessageSquare },
  { key: 'finances', label: 'Финансы', icon: Wallet },
  { key: 'requests', label: 'Заявки', icon: ClipboardList },
  { key: 'support', label: 'Техподдержка', icon: MessageSquare },
  { key: 'notifications', label: 'Уведомления', icon: Bell },
];

const managementItems = [
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
];

const UniversalMasterDashboard = ({ masterProfile, isSubscriptionActive, config }: Props) => {
  const { profile } = useAuth();
  const pricing = usePlatformPricing();
  const [activeSection, setActiveSection] = useState('home');

  // Listen for navigate-dashboard custom events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail) setActiveSection(e.detail);
    };
    window.addEventListener('navigate-dashboard', handler as EventListener);
    return () => window.removeEventListener('navigate-dashboard', handler as EventListener);
  }, []);

  if (!isSubscriptionActive && masterProfile) {
    return (
      <SubscriptionPaywall
        entityType="master"
        entityId={masterProfile.id}
        entityName={masterProfile.short_description || 'Мастер'}
        onPaid={() => window.location.reload()}
      />
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return <MasterProfileEditor masterProfile={masterProfile} config={config} />;
      case 'schedule': return <UniversalSchedule config={config} />;
      case 'services': return <UniversalServices config={config} />;
      case 'clients': return <UniversalClients config={config} />;
      case 'finances': return <UniversalFinances config={config} masterProfile={masterProfile} />;
      case 'chats': return <TeachingChats />;
      case 'support': return <SupportChat />;
      case 'stats': return <UniversalStats config={config} />;
      case 'requests': return <MasterRequests />;
      case 'notifications': return <MasterNotifications />;
      default: return <UniversalDashboardHome config={config} />;
    }
  };

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const IconComponent = config.icon;

  const adaptedMenuItems = menuItems.map(item =>
    item.key === 'clients' ? { ...item, label: config.clientNamePlural } : item
  );

  const NavButton = ({ item }: { item: { key: string; label: string; icon: any } }) => (
    <Button
      key={item.key}
      variant={activeSection === item.key ? 'default' : 'ghost'}
      className={`w-full justify-start gap-3 ${activeSection === item.key ? '' : 'text-muted-foreground'}`}
      onClick={() => setActiveSection(item.key)}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Button>
  );

  return (
    <div className="flex flex-col lg:flex-row lg:gap-6 w-full overflow-hidden">
      {/* Desktop: sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-20 self-start h-[calc(100vh-6rem)]">
        <div className="flex items-center gap-3 px-3 pb-6 border-b mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <IconComponent className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {masterProfile?.service_categories?.name || config.label}
            </p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>
          {adaptedMenuItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>
        <div className="space-y-1 mt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Управление</p>
          {managementItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>
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
      </aside>

      {/* Mobile/tablet: bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-hide">
          {[...adaptedMenuItems, ...managementItems].map(item => (
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

export default UniversalMasterDashboard;
