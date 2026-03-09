import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, Building2, Briefcase, ChevronRight, Plus, Loader2, Crown, Lock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SubRole {
  id: string;
  entityId: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  role: UserRoleType;
}

interface BusinessRoleHubProps {
  onSelect: (role: UserRoleType, entityId: string) => void;
  onBack: () => void;
}

interface Limits {
  hasMaster: boolean;
  businessCount: number;
  maxBusinesses: number;
  networkCount: number;
  maxNetworks: number;
  hasActiveNetworkSub: boolean;
}

const BusinessRoleHub = ({ onSelect, onBack }: BusinessRoleHubProps) => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [subRoles, setSubRoles] = useState<SubRole[]>([]);
  const [limits, setLimits] = useState<Limits>({
    hasMaster: false,
    businessCount: 0,
    maxBusinesses: 1,
    networkCount: 0,
    maxNetworks: 0,
    hasActiveNetworkSub: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const entries: SubRole[] = [];
    let hasMaster = false;
    let businessCount = 0;
    let networkCount = 0;
    let hasActiveNetworkSub = false;

    // Check master profile existence
    const { data: masterProfile } = await supabase
      .from('master_profiles')
      .select('id, business_id, subscription_status, business_locations(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (masterProfile) {
      hasMaster = true;
      const bizName = (masterProfile.business_locations as any)?.name;
      entries.push({
        id: `master-${masterProfile.id}`,
        entityId: masterProfile.id,
        label: bizName ? `Мастер в «${bizName}»` : 'Соло мастер',
        sublabel: bizName ? 'Мастер в организации' : 'Индивидуальный специалист',
        icon: <Wrench className="h-5 w-5" />,
        role: 'master',
      });
    }

    // Business owner - get all businesses
    const { data: businesses } = await supabase
      .from('business_locations')
      .select('id, name, subscription_status')
      .eq('owner_id', user.id);

    businessCount = businesses?.length || 0;
    (businesses || []).forEach(biz => {
      entries.push({
        id: `biz-owner-${biz.id}`,
        entityId: biz.id,
        label: `«${biz.name}»`,
        sublabel: 'Владелец',
        icon: <Building2 className="h-5 w-5" />,
        role: 'business_owner',
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
      });
    });

    // Network owner
    const { data: networks } = await supabase
      .from('networks')
      .select('id, name, subscription_status')
      .eq('owner_id', user.id);

    networkCount = networks?.length || 0;
    hasActiveNetworkSub = (networks || []).some(n => n.subscription_status === 'active' || n.subscription_status === 'trial');
    
    (networks || []).forEach(net => {
      entries.push({
        id: `net-owner-${net.id}`,
        entityId: net.id,
        label: `«${net.name}»`,
        sublabel: 'Владелец сети',
        icon: <Building2 className="h-5 w-5" />,
        role: 'network_owner',
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
      });
    });

    // Determine max businesses based on subscription
    // Basic: 1, Network subscription: unlimited within network
    let maxBusinesses = 1;
    if (hasActiveNetworkSub) {
      maxBusinesses = 999; // unlimited for network owners
    }

    setSubRoles(entries);
    setLimits({
      hasMaster,
      businessCount,
      maxBusinesses,
      networkCount,
      maxNetworks: hasActiveNetworkSub ? 1 : 0,
      hasActiveNetworkSub,
    });
    setLoading(false);
  };

  const canCreateMaster = !limits.hasMaster;
  const canCreateBusiness = limits.businessCount < limits.maxBusinesses;
  const canCreateNetwork = limits.networkCount === 0; // Only 1 network per user for now

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Бизнес-кабинеты</h2>
        <p className="text-muted-foreground mt-1">Выберите или создайте бизнес-аккаунт</p>
      </div>

      {/* Existing sub-roles */}
      {subRoles.length > 0 && (
        <div className="grid gap-3">
          {subRoles.map(sr => (
            <Card
              key={sr.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(sr.role, sr.entityId)}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {sr.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{sr.label}</p>
                    <p className="text-sm text-muted-foreground">{sr.sublabel}</p>
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

        {/* Create Master - only if doesn't exist */}
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
                  <p className="text-sm text-muted-foreground">Индивидуальный специалист</p>
                </div>
                <Wrench className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Business */}
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
        ) : (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-muted-foreground">Лимит организаций достигнут</p>
                  <p className="text-sm text-muted-foreground">
                    Для создания дополнительных филиалов{' '}
                    <Link to="/for-business#pricing" className="text-primary hover:underline">
                      перейдите на тариф «Сеть»
                    </Link>
                  </p>
                </div>
                <Crown className="h-5 w-5 text-amber-500 shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Network - only if no network yet */}
        {canCreateNetwork ? (
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors border-dashed"
            onClick={() => navigate('/create-account?type=network')}
          >
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Создать сеть</p>
                  <p className="text-sm text-muted-foreground">Управление несколькими филиалами</p>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        ) : limits.networkCount > 0 ? null : (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-muted-foreground">Сеть уже создана</p>
                  <p className="text-sm text-muted-foreground">
                    У вас может быть только одна сеть
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={onBack}>
        ← Вернуться в кабинет клиента
      </Button>
    </div>
  );
};

export default BusinessRoleHub;
