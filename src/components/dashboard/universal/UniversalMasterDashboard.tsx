import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, LayoutDashboard, Calendar, Users, CreditCard, Banknote, MessageSquare, BarChart3, Ban, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import SubscriptionManager from '../SubscriptionManager';
import UniversalDashboardHome from './UniversalDashboardHome';
import UniversalSchedule from './UniversalSchedule';
import UniversalClients from './UniversalClients';
import UniversalPayments from './UniversalPayments';
import UniversalExpenses from './UniversalExpenses';
import UniversalStats from './UniversalStats';
import TeachingBlacklist from '../teaching/TeachingBlacklist';
import TeachingChats from '../teaching/TeachingChats';
import { CategoryConfig } from './categoryConfig';

interface Props {
  masterProfile: any;
  isSubscriptionActive: boolean;
  config: CategoryConfig;
}

const menuItems = [
  { key: 'home', label: 'Главная', icon: LayoutDashboard },
  { key: 'schedule', label: 'Расписание', icon: Calendar },
  { key: 'clients', label: 'Клиенты', icon: Users },
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

const UniversalMasterDashboard = ({ masterProfile, isSubscriptionActive, config }: Props) => {
  const { profile } = useAuth();
  const [activeSection, setActiveSection] = useState('home');

  if (!isSubscriptionActive && masterProfile) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-display font-bold mb-2">Подписка неактивна</h2>
          <p className="text-muted-foreground mb-4">
            Ваши данные сохранены, но интерфейс мастера недоступен. Оплатите подписку (900 ₽/мес) для продолжения работы.
          </p>
          <Button onClick={() => setActiveSection('subscription')}>Оплатить подписку</Button>
        </CardContent>
      </Card>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'schedule': return <UniversalSchedule config={config} />;
      case 'clients': return <UniversalClients config={config} />;
      case 'payments': return <UniversalPayments />;
      case 'expenses': return <UniversalExpenses config={config} />;
      case 'chats': return <TeachingChats />;
      case 'stats': return <UniversalStats config={config} />;
      case 'blacklist': return <TeachingBlacklist />;
      case 'subscription': return (
        <SubscriptionManager
          entityType="master"
          subscriptionStatus={masterProfile?.subscription_status || 'inactive'}
          trialStartDate={masterProfile?.trial_start_date}
          trialDays={masterProfile?.trial_days || 14}
          lastPaymentDate={masterProfile?.last_payment_date}
          basePrice={900}
          parentManaged={masterProfile?.subscription_status === 'in_business'}
          parentLabel="Управляется бизнесом"
        />
      );
      default: return <UniversalDashboardHome config={config} />;
    }
  };

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const IconComponent = config.icon;

  const adaptedMenuItems = menuItems.map(item =>
    item.key === 'clients' ? { ...item, label: config.clientNamePlural } : item
  );

  const NavButton = ({ item }: { item: { key: string; label: string; icon: any } }) => {
    const isActive = activeSection === item.key;
    return (
      <button
        key={item.key}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
        onClick={() => setActiveSection(item.key)}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex gap-6">
      <aside className="hidden lg:flex flex-col w-60 shrink-0">
        <div className="flex items-center gap-3 px-3 pb-5 border-b border-border/50 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-semibold text-sm">
              {masterProfile?.service_categories?.name || config.label}
            </p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>
          {adaptedMenuItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>

        <div className="space-y-0.5 mt-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Управление</p>
          {managementItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>

        <div className="mt-auto pt-5 border-t border-border/50">
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

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 z-50 flex overflow-x-auto px-2 py-1">
        {[...adaptedMenuItems, ...managementItems].map(item => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs shrink-0 transition-colors ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default UniversalMasterDashboard;
