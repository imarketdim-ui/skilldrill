import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, Users, ClipboardList, Calendar, DollarSign, Settings, 
  ArrowRightLeft, UserPlus, AlertTriangle, MessageSquare, LayoutDashboard, CreditCard
} from 'lucide-react';
import ProfileCompletionCheck from './ProfileCompletionCheck';
import SubscriptionManager from './SubscriptionManager';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';
import BusinessMasters from './business/BusinessMasters';
import BusinessServices from './business/BusinessServices';
import BusinessSettings from './business/BusinessSettings';
import BusinessFinances from './business/BusinessFinances';
import SupportChat from './SupportChat';

const menuItems = [
  { key: 'overview', label: 'Главная', icon: LayoutDashboard },
  { key: 'masters', label: 'Мастера', icon: Users },
  { key: 'services', label: 'Услуги', icon: ClipboardList },
  { key: 'schedule', label: 'Расписание', icon: Calendar },
  { key: 'finance', label: 'Финансы', icon: DollarSign },
  { key: 'subscription', label: 'Подписка', icon: CreditCard },
  { key: 'support', label: 'Поддержка', icon: MessageSquare },
  { key: 'settings', label: 'Настройки', icon: Settings },
];

const BusinessDashboard = () => {
  const { user, profile } = useAuth();
  const pricing = usePlatformPricing();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [masterCount, setMasterCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [activeSection, setActiveSection] = useState('overview');

  const fetchBusinesses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('business_locations').select('*').eq('owner_id', user.id);
    setBusinesses(data || []);
    if (data && data.length > 0) {
      setSelectedBusiness(data[0]);
      const [mRes, sRes] = await Promise.all([
        supabase.from('business_masters').select('id', { count: 'exact', head: true }).eq('business_id', data[0].id).eq('status', 'accepted'),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', data[0].id).eq('is_active', true),
      ]);
      setMasterCount(mRes.count || 0);
      setServiceCount(sRes.count || 0);
    }
    setLoading(false);
  }, [user]);

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

  const showCompletion = selectedBusiness?.moderation_status !== 'approved';

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const NavButton = ({ item }: { item: typeof menuItems[0] }) => (
    <Button
      variant={activeSection === item.key ? 'default' : 'ghost'}
      className={`w-full justify-start gap-3 ${activeSection === item.key ? '' : 'text-muted-foreground'}`}
      onClick={() => setActiveSection(item.key)}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Button>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {!canActivate && selectedBusiness && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Для активации бизнеса необходимо: минимум 1 принятый мастер ({masterCount}/1) и 1 активная услуга ({serviceCount}/1).
                  Пока условия не выполнены, бизнес не будет виден в каталоге.
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
      case 'masters':
        return selectedBusiness ? (
          <BusinessMasters businessId={selectedBusiness.id} freeMasters={selectedBusiness.free_masters || 3} extraMasterPrice={selectedBusiness.extra_master_price || 500} />
        ) : null;
      case 'services':
        return selectedBusiness ? <BusinessServices businessId={selectedBusiness.id} /> : null;
      case 'schedule':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Общее расписание</CardTitle>
              <CardDescription>С разбивкой по мастерам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Расписание будет доступно после добавления мастеров</p>
              </div>
            </CardContent>
          </Card>
        );
      case 'finance':
        return selectedBusiness ? <BusinessFinances businessId={selectedBusiness.id} /> : null;
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
      case 'support':
        return <SupportChat />;
      case 'settings':
        return selectedBusiness ? <BusinessSettings business={selectedBusiness} onUpdated={fetchBusinesses} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-6 w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0">
        <div className="flex items-center gap-3 px-3 pb-6 border-b mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{selectedBusiness?.name || 'Организация'}</p>
            <p className="text-xs text-muted-foreground">Организация</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>
          {menuItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>

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
      </aside>

      {/* Mobile/tablet bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-hide">
          {menuItems.map(item => (
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

      {/* Content */}
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default BusinessDashboard;
