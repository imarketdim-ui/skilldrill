import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, Building2, Briefcase, ChevronRight, Plus, Loader2 } from 'lucide-react';

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

const BusinessRoleHub = ({ onSelect, onBack }: BusinessRoleHubProps) => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [subRoles, setSubRoles] = useState<SubRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSubRoles();
  }, [user]);

  const fetchSubRoles = async () => {
    if (!user) return;
    const entries: SubRole[] = [];

    // Solo master
    if (roles.includes('master')) {
      const { data: mp } = await supabase
        .from('master_profiles')
        .select('id, business_id, business_locations(name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (mp) {
        const bizName = (mp.business_locations as any)?.name;
        entries.push({
          id: `master-${mp.id}`,
          entityId: mp.id,
          label: bizName ? `Мастер в «${bizName}»` : 'Соло мастер',
          sublabel: bizName ? 'Мастер в организации' : 'Индивидуальный специалист',
          icon: <Wrench className="h-5 w-5" />,
          role: 'master',
        });
      }
    }

    // Business owner
    if (roles.includes('business_owner')) {
      const { data: businesses } = await supabase
        .from('business_locations')
        .select('id, name')
        .eq('owner_id', user.id);

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
    }

    // Business manager
    if (roles.includes('business_manager')) {
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
    }

    // Network owner
    if (roles.includes('network_owner')) {
      const { data: networks } = await supabase
        .from('networks')
        .select('id, name')
        .eq('owner_id', user.id);

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
    }

    // Network manager
    if (roles.includes('network_manager')) {
      const { data: managed } = await supabase
        .from('network_managers')
        .select('id, network_id, networks:networks!network_managers_network_id_fkey(name)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      (managed || []).forEach(m => {
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
    }

    setSubRoles(entries);
    setLoading(false);
  };

  const hasBusinessRoles = roles.some(r =>
    ['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(r)
  );

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
        <h2 className="text-2xl font-bold">Выберите кабинет</h2>
        <p className="text-muted-foreground mt-1">Выберите, от имени кого вы хотите работать</p>
      </div>

      {subRoles.length > 0 ? (
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
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold text-lg">У вас пока нет бизнес-аккаунтов</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Создайте профиль мастера или бизнес-аккаунт, чтобы начать
            </p>
            <Button onClick={() => navigate('/create-account')} className="gap-2">
              <Plus className="h-4 w-4" />
              Создать бизнес-аккаунт
            </Button>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full" onClick={onBack}>
        ← Вернуться в кабинет клиента
      </Button>
    </div>
  );
};

export default BusinessRoleHub;
