import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, LayoutDashboard, Calendar, Users, CreditCard, Banknote, MessageSquare, BarChart3, Ban, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import SubscriptionManager from '../SubscriptionManager';
import TeachingDashboardHome from './TeachingDashboardHome';
import TeachingSchedule from './TeachingSchedule';
import TeachingStudents from './TeachingStudents';
import TeachingPayments from './TeachingPayments';
import TeachingExpenses from './TeachingExpenses';
import TeachingChats from './TeachingChats';
import TeachingStats from './TeachingStats';
import TeachingBlacklist from './TeachingBlacklist';

interface Props {
  masterProfile: any;
  isSubscriptionActive: boolean;
}

const menuItems = [
  { key: 'home', label: 'Главная', icon: LayoutDashboard },
  { key: 'schedule', label: 'Расписание', icon: Calendar },
  { key: 'students', label: 'Студенты', icon: Users },
  { key: 'chats', label: 'Чаты', icon: MessageSquare },
  { key: 'payments', label: 'Оплаты', icon: CreditCard },
  { key: 'expenses', label: 'Расходы', icon: Banknote },
];

const managementItems = [
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
  { key: 'blacklist', label: 'Чёрный список', icon: Ban },
  { key: 'subscription', label: 'Подписка', icon: CreditCard },
  { key: 'settings', label: 'Настройки', icon: Settings },
];

const TeachingMasterDashboard = ({ masterProfile, isSubscriptionActive }: Props) => {
  const { profile } = useAuth();
  const [activeSection, setActiveSection] = useState('home');

  if (!isSubscriptionActive && masterProfile) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Подписка неактивна</h2>
          <p className="text-muted-foreground mb-4">
            Ваши данные сохранены, но интерфейс мастера недоступен. Оплатите подписку для продолжения работы.
          </p>
          <Button>Оплатить подписку</Button>
        </CardContent>
      </Card>
    );
  }

  const getSubscriptionBadge = () => {
    if (!masterProfile) return null;
    const status = masterProfile.subscription_status;
    if (status === 'trial') return <Badge className="bg-blue-500 text-white">Тестовый период</Badge>;
    if (status === 'active') return <Badge className="bg-primary text-primary-foreground">Активна</Badge>;
    if (status === 'in_business') return <Badge className="bg-purple-500 text-white">В составе бизнеса</Badge>;
    return <Badge variant="destructive">Неактивна</Badge>;
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'schedule': return <TeachingSchedule />;
      case 'students': return <TeachingStudents />;
      case 'payments': return <TeachingPayments />;
      case 'expenses': return <TeachingExpenses />;
      case 'chats': return <TeachingChats />;
      case 'stats': return <TeachingStats />;
      case 'blacklist': return <TeachingBlacklist />;
      case 'subscription': return (
        <SubscriptionManager
          entityType="master"
          subscriptionStatus={masterProfile?.subscription_status || 'inactive'}
          trialStartDate={masterProfile?.trial_start_date}
          trialDays={masterProfile?.trial_days || 14}
          lastPaymentDate={masterProfile?.last_payment_date}
          basePrice={690}
          parentManaged={masterProfile?.subscription_status === 'in_business'}
          parentLabel="Управляется бизнесом"
        />
      );
      default: return <TeachingDashboardHome />;
    }
  };

  const getInitials = () => {
    return `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';
  };

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
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0">
        <div className="flex items-center gap-3 px-3 pb-6 border-b mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {masterProfile?.service_categories?.name || 'Преподаватель'}
            </p>
            <p className="text-xs text-muted-foreground">Преподаватель</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>
          {menuItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>

        <div className="space-y-1 mt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Управление</p>
          {managementItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>

        {/* User card at bottom */}
        <div className="mt-auto pt-6 border-t">
          <div className="flex items-center gap-3 px-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.first_name}</p>
              <p className="text-xs text-muted-foreground">Преподаватель</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex overflow-x-auto px-2 py-1">
        {[...menuItems, ...managementItems].map(item => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs shrink-0 ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default TeachingMasterDashboard;
