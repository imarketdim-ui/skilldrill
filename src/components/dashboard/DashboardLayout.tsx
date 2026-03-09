import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sparkles, LogOut, ArrowLeft } from 'lucide-react';
import RoleSwitcher from './RoleSwitcher';

interface DashboardLayoutProps {
  children: ReactNode;
  onSelectHub?: (hub: 'business' | 'platform') => void;
  onBackToClient?: () => void;
}

const DashboardLayout = ({ children, onSelectHub, onBackToClient }: DashboardLayoutProps) => {
  const { signOut, activeRole, setActiveRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isSubDashboard = !['client'].includes(activeRole) &&
    !['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(activeRole);

  const isPlatformDashboard = ['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(activeRole);

  const handleBack = () => {
    if (onBackToClient) {
      onBackToClient();
    } else {
      setActiveRole('client');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container-wide py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(isSubDashboard || isPlatformDashboard) ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Клиент</span>
              </Button>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold hidden sm:inline">SkillSpot</span>
              </>
            )}
          </div>

          <RoleSwitcher onSelectHub={onSelectHub} />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container-wide py-6">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
