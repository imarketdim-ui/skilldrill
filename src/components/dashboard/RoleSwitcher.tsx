import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, Crown, User, Building2, ChevronDown } from 'lucide-react';

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

  // Nothing to show if user only has client role
  if (!hasPlatformRoles && !hasBusinessRoles) return null;

  // Determine current role label
  const getCurrentLabel = () => {
    if (activeRole === 'client') return 'Клиент';
    if (['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(activeRole)) {
      return 'Бизнес';
    }
    return 'Площадка';
  };

  const getCurrentIcon = () => {
    if (activeRole === 'client') return <User className="h-4 w-4" />;
    if (['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(activeRole)) {
      return <Building2 className="h-4 w-4" />;
    }
    if (roles.includes('super_admin')) return <Crown className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {getCurrentIcon()}
          <span className="hidden sm:inline">{getCurrentLabel()}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {/* Client option */}
        {!isInClientView && (
          <DropdownMenuItem onClick={() => setActiveRole('client')} className="gap-2">
            <User className="h-4 w-4" />
            Клиент
          </DropdownMenuItem>
        )}

        {!isInClientView && (hasBusinessRoles || hasPlatformRoles) && <DropdownMenuSeparator />}

        {/* Business option */}
        {hasBusinessRoles && (
          <DropdownMenuItem onClick={() => onSelectHub?.('business')} className="gap-2">
            <Building2 className="h-4 w-4" />
            Бизнес
          </DropdownMenuItem>
        )}

        {/* Platform option */}
        {hasPlatformRoles && (
          <DropdownMenuItem onClick={() => onSelectHub?.('platform')} className="gap-2">
            {roles.includes('super_admin') ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            Площадка
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleSwitcher;
