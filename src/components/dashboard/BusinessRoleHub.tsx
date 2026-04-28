import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Building2, Briefcase, ChevronRight, Plus, Loader2, Crown, Lock, CreditCard, AlertTriangle, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import SubscriptionManager from './SubscriptionManager';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';

interface SubRole {
  id: string;
  entityId: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  role: UserRoleType;
  disabled?: boolean;
}

interface BusinessRoleHubProps {
  onSelect: (role: UserRoleType, entityId: string) => void;
  onBack: () => void;
}

const BusinessRoleHub = ({ onSelect, onBack }: BusinessRoleHubProps) => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const pricing = usePlatformPricing();
  const subscription = useSubscriptionTier(user?.id);
  const [subRoles, setSubRoles] = useState<SubRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMaster, setHasMaster] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, subscription.tier, subscription.status]);

  const fetchData = async () => {
    if (!user) return;
    const entries: SubRole[] = [];
    const isExpired = subscription.isReadOnly;

    // Master profile
    const { data: masterProfile } = await supabase
      .from('master_profiles')
      .select('id, business_id, subscription_status, business_locations(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (masterProfile) {
      setHasMaster(true);
      const bizName = (masterProfile.business_locations as any)?.name;
      entries.push({
        id: `master-${masterProfile.id}`,
        entityId: masterProfile.id,
        label: bizName ? `Мастер в «${bizName}»` : 'Соло мастер',
        sublabel: bizName ? 'Мастер в организации' : 'Индивидуальный специалист',
        icon: <Wrench className="h-5 w-5" />,
        role: 'master',
        disabled: isExpired,
      });
    } else {
      setHasMaster(false);
    }

    // Business owner
    const { data: businesses } = await supabase
      .from('business_locations')
      .select('id, name, subscription_status')
      .eq('owner_id', user.id);

    (businesses || []).forEach(biz => {
      const canAccess = subscription.tier === 'network' || subscription.tier === 'business';
      entries.push({
        id: `biz-owner-${biz.id}`,
        entityId: biz.id,
        label: `«${biz.name}»`,
        sublabel: 'Владелец',
        icon: <Building2 className="h-5 w-5" />,
        role: 'business_owner',
        disabled: isExpired || (!canAccess && subscription.tier === 'master'),
      });
    });

    // Business manager
    const { data: managed } = await supabase
      .from('business_managers')
      .select('id, business_id, business_locations:business_locations!business_managers_business_id_fkey(name)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    (managed || []).forEach(m => {
      const bizName = (m.business_locations as any)?.name || 'Организация';
      entries.push({
        id: `biz-mgr-${m.id}`,
        entityId: m.business_id,
        label: `«${bizName}»`,
        sublabel: 'Менеджер',
        icon: <Briefcase className="h-5 w-5" />,
        role: 'business_manager',
        disabled: isExpired,
      });
    });

    // Business admin (assigned via business_managers with admin flag, or direct role)
    if (roles.includes('business_admin')) {
      const { data: adminBiz } = await supabase
        .from('business_managers')
        .select('id, business_id, business_locations:business_locations!business_managers_business_id_fkey(name)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      (adminBiz || []).forEach(m => {
        const bizName = (m.business_locations as any)?.name || 'Организация';
        // avoid duplicate if already added as manager
        if (entries.some(e => e.entityId === m.business_id && e.role === 'business_manager')) return;
        entries.push({
          id: `biz-admin-${m.id}`,
          entityId: m.business_id,
          label: `«${bizName}»`,
          sublabel: 'Администратор',
          icon: <Shield className="h-5 w-5" />,
          role: 'business_admin',
          disabled: isExpired,
        });
      });
    }

    // Network owner
    const { data: networks } = await supabase
      .from('networks')
      .select('id, name, subscription_status')
      .eq('owner_id', user.id);

    (networks || []).forEach(net => {
      entries.push({
        id: `net-owner-${net.id}`,
        entityId: net.id,
        label: `«${net.name}»`,
        sublabel: 'Владелец сети',
        icon: <Crown className="h-5 w-5" />,
        role: 'network_owner',
        disabled: isExpired,
      });
    });

    // Network manager
    const { data: netManaged } = await supabase
      .from('network_managers')
      .select('id, network_id, networks:networks!network_managers_network_id_fkey(name)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    (netManaged || []).forEach(m => {
      const netName = (m.networks as any)?.name || 'Сеть';
      entries.push({
        id: `net-mgr-${m.id}`,
        entityId: m.network_id,
        label: `«${netName}»`,
        sublabel: 'Менеджер сети',
        icon: <Briefcase className="h-5 w-5" />,
        role: 'network_manager',
        disabled: isExpired,
      });
    });

    setSubRoles(entries);
    setLoading(false);
  };

  const handleSelect = (sr: SubRole) => {
    if (sr.disabled) return;
    onSelect(sr.role, sr.entityId);
  };

  const canCreateMaster = !hasMaster;
  const canCreateBusiness = subscription.tier === 'business' || subscription.tier === 'network';
  const canCreateNetwork = subscription.tier !== 'network'; // can upgrade

  if (loading || subscription.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    master: 'bg-blue-500 text-white',
    business: 'bg-primary text-primary-foreground',
    network: 'bg-amber-500 text-white',
    none: 'bg-muted text-muted-foreground',
  };

  const isExpired = subscription.isReadOnly;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Бизнес-кабинеты</h2>
        <p className="text-muted-foreground mt-1">Выберите активный кабинет, следите за лимитами тарифа и управляйте доступом к точкам, мастерам и сети.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-4 px-5">
            <p className="font-medium text-sm">Лимиты тарифа</p>
            <p className="text-sm text-muted-foreground mt-1">
              `Мастер` — только личный кабинет. `Про` — одна точка и до 10 сотрудников. `Сеть` — несколько точек и единое управление.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5">
            <p className="font-medium text-sm">Read-only при окончании подписки</p>
            <p className="text-sm text-muted-foreground mt-1">
              При завершении льготного периода кабинеты остаются доступными на просмотр, но создание и редактирование ограничиваются до продления.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription tier card */}
      <Card className={isExpired ? 'border-destructive/50' : 'border-primary/30'}>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isExpired ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                {isExpired ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <CreditCard className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">Тариф</p>
                  <Badge className={tierColors[subscription.tier]}>{subscription.tierLabel}</Badge>
                  <Badge variant={isExpired ? 'destructive' : 'secondary'} className="text-xs">
                    {subscription.status === 'active' ? 'Активен' : subscription.status === 'trial' ? 'Пробный' : subscription.status === 'grace' ? 'Льготный' : 'Истёк'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subscription.tier === 'master' && 'Доступна только роль Мастера'}
                  {subscription.tier === 'business' && 'Мастер + 1 точка'}
                  {subscription.tier === 'network' && 'Мастер + все точки (сеть)'}
                  {subscription.tier === 'none' && 'Оформите подписку для доступа'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={isExpired ? 'default' : 'outline'}
              onClick={() => navigate('/subscription')}
            >
              {isExpired ? 'Оплатить' : 'Изменить'}
            </Button>
          </div>
          {isExpired && (
            <p className="text-xs text-destructive mt-2">
              Подписка истекла. Вы можете просматривать данные, но действия (редактирование, запись, чаты) заблокированы.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Existing sub-roles */}
      {subRoles.length > 0 && (
        <div className="grid gap-3">
          {subRoles.map(sr => (
            <Card
              key={sr.id}
              className={`transition-colors ${
                sr.disabled
                  ? 'opacity-60 cursor-not-allowed border-muted'
                  : 'cursor-pointer hover:border-primary/50'
              }`}
              onClick={() => handleSelect(sr)}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    sr.disabled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {sr.disabled ? <Lock className="h-5 w-5" /> : sr.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{sr.label}</p>
                    <p className="text-sm text-muted-foreground">{sr.sublabel}</p>
                    {sr.disabled && subscription.tier === 'master' && sr.role !== 'master' && (
                      <p className="text-xs text-destructive mt-0.5">Доступно на тарифе «Бизнес» и выше</p>
                    )}
                    {sr.disabled && isExpired && (
                      <p className="text-xs text-destructive mt-0.5">Подписка истекла — только просмотр</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Creation options */}
      <div className="space-y-3">
        {subRoles.length > 0 && <Separator />}
        <p className="text-sm font-medium text-muted-foreground">Создать новый аккаунт</p>

        {canCreateMaster && (
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors border-dashed"
            onClick={() => navigate('/create-account?type=master')}
          >
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Создать профиль мастера</p>
                  <p className="text-sm text-muted-foreground">Индивидуальный специалист — от {pricing.master} ₽/мес</p>
                </div>
                <Wrench className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {canCreateBusiness ? (
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors border-dashed"
            onClick={() => navigate('/create-account?type=business')}
          >
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Создать организацию</p>
                  <p className="text-sm text-muted-foreground">Салон, студия, клиника</p>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        ) : subscription.tier === 'master' ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-muted-foreground">Организация недоступна</p>
                  <p className="text-sm text-muted-foreground">
                    Для создания организации{' '}
                    <Link to="/subscription" className="text-primary hover:underline">
                      перейдите на тариф «Бизнес»
                    </Link>{' '}
                    — от {pricing.business} ₽/мес
                  </p>
                </div>
                <Crown className="h-5 w-5 text-primary shrink-0" />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {subscription.tier !== 'network' && (
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors border-dashed"
            onClick={() => navigate('/subscription?upgrade=network')}
          >
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Перейти на тариф «Сеть»</p>
                  <p className="text-sm text-muted-foreground">Мастер + все точки — от {pricing.network} ₽/мес</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Для перехода в кабинет клиента используйте переключатель ролей вверху
      </p>
    </div>
  );
};

export default BusinessRoleHub;
