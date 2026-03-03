import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Wrench, Building2, Globe, Shield, Crown } from 'lucide-react';

const roleLabels: Record<UserRoleType, string> = {
  client: 'Клиент',
  master: 'Мастер',
  business_manager: 'Менеджер бизнеса',
  network_manager: 'Менеджер сети',
  business_owner: 'Владелец бизнеса',
  network_owner: 'Владелец сети',
  platform_admin: 'Администратор',
  super_admin: 'Супер администратор',
  platform_manager: 'Менеджер площадки',
};

const roleIcons: Record<UserRoleType, React.ReactNode> = {
  client: <User className="h-4 w-4" />,
  master: <Wrench className="h-4 w-4" />,
  business_manager: <Building2 className="h-4 w-4" />,
  network_manager: <Globe className="h-4 w-4" />,
  business_owner: <Building2 className="h-4 w-4" />,
  network_owner: <Globe className="h-4 w-4" />,
  platform_admin: <Shield className="h-4 w-4" />,
  super_admin: <Crown className="h-4 w-4" />,
  platform_manager: <User className="h-4 w-4" />,
};

const RoleSwitcher = () => {
  const { roles, activeRole, setActiveRole } = useAuth();

  if (roles.length <= 1) return null;

  return (
    <Select value={activeRole} onValueChange={(v) => setActiveRole(v as UserRoleType)}>
      <SelectTrigger className="w-auto min-w-[200px] gap-2">
        <div className="flex items-center gap-2">
          {roleIcons[activeRole]}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            <div className="flex items-center gap-2">
              {roleIcons[role]}
              <span>{roleLabels[role]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default RoleSwitcher;
