import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LayoutDashboard, Calendar, Users, CreditCard, Banknote, MessageSquare, BarChart3, Ban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import FitnessDashboardHome from './FitnessDashboardHome';
import FitnessSchedule from './FitnessSchedule';
import FitnessClients from './FitnessClients';
import FitnessPayments from './FitnessPayments';
import FitnessExpenses from './FitnessExpenses';
import FitnessStats from './FitnessStats';
import TeachingBlacklist from '../teaching/TeachingBlacklist';
import TeachingChats from '../teaching/TeachingChats';

interface Props {
  masterProfile: any;
  isSubscriptionActive: boolean;
}

const navItems = [
  { key: 'home', label: 'Главная', icon: LayoutDashboard },
  { key: 'schedule', label: 'Расписание', icon: Calendar },
  { key: 'clients', label: 'Клиенты', icon: Users },
  { key: 'payments', label: 'Оплаты', icon: CreditCard },
  { key: 'expenses', label: 'Расходы', icon: Banknote },
  { key: 'chats', label: 'Чаты', icon: MessageSquare },
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
  { key: 'blacklist', label: 'Чёрный список', icon: Ban },
];

const FitnessMasterDashboard = ({ masterProfile, isSubscriptionActive }: Props) => {
  const [activeSection, setActiveSection] = useState('home');

  if (!isSubscriptionActive && masterProfile) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Подписка неактивна</h2>
          <p className="text-muted-foreground mb-4">
            Ваши данные сохранены, но интерфейс мастера недоступен. Оплатите подписку (1 000 ₽/мес) для продолжения работы.
          </p>
          <Button>Оплатить подписку</Button>
        </CardContent>
      </Card>
    );
  }

  const getSubscriptionBadge = () => {
    if (!masterProfile) return null;
    const status = masterProfile.subscription_status;
    if (status === 'trial') return <Badge className="bg-blue-500/90 text-white">Тестовый период</Badge>;
    if (status === 'active') return <Badge className="bg-primary text-primary-foreground">Активна</Badge>;
    if (status === 'in_business') return <Badge className="bg-purple-500/90 text-white">В составе бизнеса</Badge>;
    return <Badge variant="destructive">Неактивна</Badge>;
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'schedule': return <FitnessSchedule />;
      case 'clients': return <FitnessClients />;
      case 'payments': return <FitnessPayments />;
      case 'expenses': return <FitnessExpenses />;
      case 'chats': return <TeachingChats />;
      case 'stats': return <FitnessStats />;
      case 'blacklist': return <TeachingBlacklist />;
      default: return <FitnessDashboardHome />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Кабинет тренера</h2>
          <p className="text-muted-foreground">Фитнес / Спорт</p>
        </div>
        {getSubscriptionBadge()}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {navItems.map(item => (
              <Button
                key={item.key}
                variant={activeSection === item.key ? 'default' : 'ghost'}
                className={`justify-start gap-2 whitespace-nowrap ${activeSection === item.key ? '' : 'text-muted-foreground'}`}
                onClick={() => setActiveSection(item.key)}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            ))}
          </div>
        </nav>
        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>
    </div>
  );
};

export default FitnessMasterDashboard;
