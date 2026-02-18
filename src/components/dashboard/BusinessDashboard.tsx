import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, ClipboardList, Calendar, BarChart3,
  DollarSign, Tag, UserPlus, Plus, Settings, ArrowRightLeft,
  LayoutDashboard, CreditCard
} from 'lucide-react';
import ProfileCompletionCheck from './ProfileCompletionCheck';
import SubscriptionManager from './SubscriptionManager';

const sidebarMenu = [
  { key: 'overview', label: 'Главная', icon: LayoutDashboard },
  { key: 'masters', label: 'Мастера', icon: Users },
  { key: 'services', label: 'Услуги', icon: ClipboardList },
  { key: 'schedule', label: 'Расписание', icon: Calendar },
  { key: 'clients', label: 'Клиенты', icon: Users },
];

const sidebarManage = [
  { key: 'finance', label: 'Финансы', icon: DollarSign },
  { key: 'subscription', label: 'Подписка', icon: CreditCard },
  { key: 'settings', label: 'Настройки', icon: Settings },
];

const BusinessDashboard = () => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const fetchBusinesses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('business_locations').select('*').eq('owner_id', user.id);
    setBusinesses(data || []);
    if (data && data.length > 0) setSelectedBusiness(data[0]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

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

  const showCompletion = selectedBusiness?.moderation_status !== 'approved';

  const NavItem = ({ item }: { item: { key: string; label: string; icon: any } }) => {
    const isActive = activeSection === item.key;
    return (
      <button
        onClick={() => setActiveSection(item.key)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground font-medium'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  };

  const getStatusBadge = () => {
    const s = selectedBusiness?.subscription_status;
    if (s === 'trial') return <Badge variant="secondary">Тест</Badge>;
    if (s === 'active') return <Badge variant="default">Активна</Badge>;
    if (s === 'in_network') return <Badge variant="outline">В сети</Badge>;
    return <Badge variant="destructive">Неактивна</Badge>;
  };

  const getModerationBadge = () => {
    const m = selectedBusiness?.moderation_status;
    if (m === 'approved') return <Badge variant="outline">В каталоге ✓</Badge>;
    if (m === 'pending') return <Badge>На модерации</Badge>;
    return <Badge variant="secondary">Черновик</Badge>;
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'masters':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-bold">Мастера</h2>
                <p className="text-sm text-muted-foreground">3 бесплатных, каждый доп. +500 ₽/мес</p>
              </div>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Пригласить</Button>
            </div>
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Пригласите мастеров по их SkillSpot ID</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'services':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">Каталог услуг</h2>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
            </div>
            <Card>
              <CardContent className="py-16 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Нет услуг</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'schedule':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-1">Расписание</h2>
            <p className="text-sm text-muted-foreground mb-6">Общее расписание с разбивкой по мастерам</p>
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Расписание доступно после добавления мастеров</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'clients':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">Клиентская база</h2>
              <Button size="sm" variant="outline"><Tag className="h-4 w-4 mr-1" /> Теги</Button>
            </div>
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Клиентская база пуста</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'finance':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-6">Финансы</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {['Доход', 'Расход', 'Комиссия', 'Прибыль'].map(label => (
                <Card key={label}>
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className="text-2xl font-display font-bold">0 ₽</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'subscription':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-6">Подписка</h2>
            <SubscriptionManager
              entityType="business"
              subscriptionStatus={selectedBusiness?.subscription_status || 'trial'}
              trialStartDate={selectedBusiness?.trial_start_date}
              trialDays={14}
              lastPaymentDate={selectedBusiness?.last_payment_date}
              basePrice={3000}
              parentManaged={selectedBusiness?.subscription_status === 'in_network'}
              parentLabel="Управляется сетью"
            />
          </div>
        );

      case 'settings':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-6">Настройки бизнеса</h2>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Button variant="outline" className="w-full justify-start">Редактировать информацию</Button>
                <Button variant="outline" className="w-full justify-start">Настройки комиссий</Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ArrowRightLeft className="h-4 w-4" /> Передать управление
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <UserPlus className="h-4 w-4" /> Назначить менеджера
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {showCompletion && selectedBusiness && (
              <ProfileCompletionCheck
                entityType="business"
                entityData={selectedBusiness}
                onProfileUpdated={fetchBusinesses}
              />
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold">{selectedBusiness?.name || 'Бизнес'}</h2>
                <p className="text-sm text-muted-foreground">{selectedBusiness?.address || 'Адрес не указан'}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {getModerationBadge()}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { label: 'Мастера', value: '0', icon: Users },
                { label: 'Услуги', value: '0', icon: ClipboardList },
                { label: 'Записи', value: '0', icon: Calendar },
                { label: 'Доход', value: '0 ₽', icon: DollarSign },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-display font-bold">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Info card */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><span className="text-sm text-muted-foreground">ИНН:</span> <span className="text-sm">{selectedBusiness?.inn}</span></div>
                  <div><span className="text-sm text-muted-foreground">Директор:</span> <span className="text-sm">{selectedBusiness?.director_name || '—'}</span></div>
                  <div><span className="text-sm text-muted-foreground">Email:</span> <span className="text-sm">{selectedBusiness?.contact_email || '—'}</span></div>
                  <div><span className="text-sm text-muted-foreground">Телефон:</span> <span className="text-sm">{selectedBusiness?.contact_phone || '—'}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-20 space-y-6">
          {/* Business name in sidebar */}
          <div className="px-3 pb-4 border-b border-border">
            <p className="font-display font-semibold text-sm truncate">{selectedBusiness?.name}</p>
            <p className="text-xs text-muted-foreground">Бизнес</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>
            <div className="space-y-0.5">
              {sidebarMenu.map(item => <NavItem key={item.key} item={item} />)}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Управление</p>
            <div className="space-y-0.5">
              {sidebarManage.map(item => <NavItem key={item.key} item={item} />)}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex px-1">
        {sidebarMenu.map(item => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              activeSection === item.key ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default BusinessDashboard;
