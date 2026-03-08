import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, Crown, User, Building2 } from 'lucide-react';

const RoleSwitcher = () => {
  const { roles, activeRole, setActiveRole } = useAuth();

  const platformRoles = roles.filter(r => ['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(r));
  const businessRoles = roles.filter(r => ['business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(r));

  // Nothing to switch to
  if (platformRoles.length === 0 && businessRoles.length === 0) return null;

  const buttons: React.ReactNode[] = [];

  // Currently in platform admin mode → show "Клиент" button
  if (['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(activeRole)) {
    buttons.push(
      <Button
        key="client"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setActiveRole('client')}
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Клиент</span>
      </Button>
    );
  }

  // Currently in business/network role → show "Клиент" button
  if (['business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(activeRole)) {
    buttons.push(
      <Button
        key="client"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setActiveRole('client')}
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Клиент</span>
      </Button>
    );
  }

  // Currently client → show available switches
  if (activeRole === 'client' || activeRole === 'master') {
    // Platform switch only — business switch happens via workspace cards in ClientDashboard
    if (platformRoles.length > 0) {
      buttons.push(
        <Button
          key="platform"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setActiveRole(platformRoles[0] as UserRoleType)}
        >
          {platformRoles.includes('super_admin') ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
          <span className="hidden sm:inline">Площадка</span>
        </Button>
      );
    }

    // Platform switch
    if (platformRoles.length > 0) {
      buttons.push(
        <Button
          key="platform"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setActiveRole(platformRoles[0] as UserRoleType)}
        >
          {platformRoles.includes('super_admin') ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
          <span className="hidden sm:inline">Площадка</span>
        </Button>
      );
    }
  }

  if (buttons.length === 0) return null;

  return <div className="flex items-center gap-2">{buttons}</div>;
};

export default RoleSwitcher;
