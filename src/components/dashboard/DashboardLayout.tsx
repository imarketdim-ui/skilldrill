import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, LogOut } from 'lucide-react';
import RoleSwitcher from './RoleSwitcher';

interface DashboardLayoutProps {
  children: ReactNode;
}

const orgRoleLabels: Record<string, string> = {
  business_owner: 'Владелец',
  business_manager: 'Менеджер',
  network_owner: 'Владелец',
  network_manager: 'Управляющий',
  master: 'Мастер',
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { signOut, activeRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const showOrgRole = ['business_owner', 'business_manager', 'network_owner', 'network_manager', 'master'].includes(activeRole);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container-wide py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold hidden sm:inline">SkillSpot</span>
          </div>

          <RoleSwitcher />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      {showOrgRole && (
        <div className="border-b bg-muted/50">
          <div className="container-wide py-1.5 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {orgRoleLabels[activeRole] || activeRole}
            </Badge>
          </div>
        </div>
      )}
      <main className="container-wide py-6">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
