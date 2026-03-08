import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, Crown, User } from 'lucide-react';

const RoleSwitcher = () => {
  const { roles, activeRole, setActiveRole } = useAuth();

  // Only show switcher for platform admin / super admin roles
  const platformRoles = roles.filter(r => ['platform_admin', 'super_admin', 'platform_manager'].includes(r));
  
  if (platformRoles.length === 0) return null;

  // If currently in admin mode, show "Back to client"
  if (['platform_admin', 'super_admin', 'platform_manager'].includes(activeRole)) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setActiveRole('client')}
      >
        <User className="h-4 w-4" />
        Клиент
      </Button>
    );
  }

  // If in client mode and has admin roles, show admin switch
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => setActiveRole(platformRoles[0] as UserRoleType)}
    >
      {platformRoles.includes('super_admin') ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
      Панель управления
    </Button>
  );
};

export default RoleSwitcher;
