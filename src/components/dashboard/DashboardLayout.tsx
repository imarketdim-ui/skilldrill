import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, LogOut, ArrowLeft } from 'lucide-react';
import RoleSwitcher from './RoleSwitcher';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';

interface DashboardLayoutProps {
  children: ReactNode;
  onSelectHub?: (hub: 'business' | 'platform') => void;
  onBackToHub?: () => void;
}

/** Бейдж текущего тарифа: показывается во всех бизнес-кабинетах. */
const HeaderTierBadge = () => {
  const { user, activeRole } = useAuth();
  const { tier, tierLabel, status, expiresAt } = useSubscriptionTier(user?.id);

  // Только для бизнес-ролей — у платформенных ролей нет подписки
  const isBusinessRole = ['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(activeRole);
  if (!isBusinessRole || tier === 'none') return null;

  const variant: 'default' | 'secondary' | 'destructive' | 'outline' =
    status === 'active' ? 'default' : status === 'trial' ? 'secondary' : 'destructive';

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <Badge variant={variant} className="text-[11px] h-5 px-2">
        {tierLabel}
      </Badge>
      {status === 'trial' && daysLeft !== null && (
        <span className="text-[11px] text-muted-foreground">trial · {daysLeft} дн.</span>
      )}
      {status === 'grace' && (
        <span className="text-[11px] text-destructive">льготный период</span>
      )}
      {status === 'expired' && (
        <span className="text-[11px] text-destructive">истекла</span>
      )}
    </div>
  );
};

const DashboardLayout = ({ children, onSelectHub, onBackToHub }: DashboardLayoutProps) => {
  const { signOut, activeRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isInSubDashboard = activeRole !== 'client';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container-wide py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isInSubDashboard && onBackToHub ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={onBackToHub}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Назад</span>
              </Button>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold hidden sm:inline">SkillSpot</span>
              </>
            )}
            <HeaderTierBadge />
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
