import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, Crown, User, Building2 } from 'lucide-react';

interface RoleSwitcherProps {
  onSelectHub?: (hub: 'business' | 'platform') => void;
}

const RoleSwitcher = ({ onSelectHub }: RoleSwitcherProps) => {
  const { roles, activeRole, setActiveRole } = useAuth();

  const hasPlatformRoles = roles.some(r =>
    ['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(r)
  );
  const hasBusinessRoles = roles.some(r =>
    ['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(r)
  );

  const isInClientView = activeRole === 'client';
  const isInBusinessView = ['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(activeRole);
  const isInPlatformView = ['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(activeRole);

  // Nothing to show if user only has client role
  if (!hasPlatformRoles && !hasBusinessRoles) return null;

  const buttons: React.ReactNode[] = [];

  // Always show "Клиент" when not in client view
  if (!isInClientView) {
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

  // Show "Бизнес" when in client view and has business roles
  if (isInClientView && hasBusinessRoles) {
    buttons.push(
      <Button
        key="business"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => onSelectHub?.('business')}
      >
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">Бизнес</span>
      </Button>
    );
  }

  // Show "Площадка" when in client view and has platform roles
  if (isInClientView && hasPlatformRoles) {
    buttons.push(
      <Button
        key="platform"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => onSelectHub?.('platform')}
      >
        {roles.includes('super_admin') ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
        <span className="hidden sm:inline">Площадка</span>
      </Button>
    );
  }

  if (buttons.length === 0) return null;

  return <div className="flex items-center gap-2">{buttons}</div>;
};

export default RoleSwitcher;
