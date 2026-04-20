import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ClientDashboard from '@/components/dashboard/ClientDashboard';
import MasterDashboard from '@/components/dashboard/MasterDashboard';
import BusinessDashboard from '@/components/dashboard/BusinessDashboard';
import NetworkDashboard from '@/components/dashboard/NetworkDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import ModeratorDashboard from '@/components/dashboard/ModeratorDashboard';
import SupportDashboard from '@/components/dashboard/SupportDashboard';
import IntegratorDashboard from '@/components/dashboard/IntegratorDashboard';
import BusinessRoleHub from '@/components/dashboard/BusinessRoleHub';
import PlatformRoleHub from '@/components/dashboard/PlatformRoleHub';

type ViewMode = 'dashboard' | 'hub_business' | 'hub_platform';

const Dashboard = () => {
  const { user, loading, activeRole, roles, setActiveRole } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('dashboard');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const [skipNextRoleEffect, setSkipNextRoleEffect] = useState(false);

  useEffect(() => {
    if (skipNextRoleEffect) {
      setSkipNextRoleEffect(false);
      return;
    }
    if (activeRole !== 'client') {
      setView('dashboard');
    }
  }, [activeRole, skipNextRoleEffect]);

  const handleBackToHubInternal = useCallback(() => {
    const isBusinessRole = ['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(activeRole);
    const isPlatformRole = ['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(activeRole);

    if (isBusinessRole) {
      setView('hub_business');
    } else if (isPlatformRole) {
      setView('hub_platform');
    } else {
      setView('dashboard');
    }

    setSkipNextRoleEffect(true);
    setActiveRole('client');
  }, [activeRole, setActiveRole]);

  const handleSelectHub = useCallback((hub: 'business' | 'platform') => {
    if (activeRole !== 'client') {
      setActiveRole('client');
    }
    setView(hub === 'business' ? 'hub_business' : 'hub_platform');
  }, [activeRole, setActiveRole]);

  const handleBusinessRoleSelected = useCallback((role: UserRoleType, entityId: string) => {
    setActiveRole(role, entityId);
    setView('dashboard');
  }, [setActiveRole]);

  const handlePlatformRoleSelected = useCallback((role: UserRoleType) => {
    setActiveRole(role);
    setView('dashboard');
  }, [setActiveRole]);

  const handleBackToClient = useCallback(() => {
    setActiveRole('client');
    setView('dashboard');
  }, [setActiveRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-wide py-8">
          <Skeleton className="h-16 w-48 mb-4" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (view === 'hub_business') {
      return <BusinessRoleHub onSelect={handleBusinessRoleSelected} onBack={handleBackToClient} />;
    }
    if (view === 'hub_platform') {
      return <PlatformRoleHub onSelect={handlePlatformRoleSelected} onBack={handleBackToClient} />;
    }

    switch (activeRole) {
      case 'master':
        return roles.includes('master') ? <MasterDashboard /> : <ClientDashboard />;
      case 'business_owner':
      case 'business_manager':
        return roles.includes(activeRole) ? <BusinessDashboard /> : <ClientDashboard />;
      case 'network_owner':
      case 'network_manager':
        return roles.includes(activeRole) ? <NetworkDashboard /> : <ClientDashboard />;
      case 'platform_admin':
        return roles.includes('platform_admin') ? <AdminDashboard /> : <ClientDashboard />;
      case 'super_admin':
        return roles.includes('super_admin') ? <SuperAdminDashboard /> : <ClientDashboard />;
      case 'platform_manager':
        return roles.includes('platform_manager') ? <ManagerDashboard /> : <ClientDashboard />;
      case 'moderator':
        return roles.includes('moderator') ? <ModeratorDashboard /> : <ClientDashboard />;
      case 'support':
        return roles.includes('support') ? <SupportDashboard /> : <ClientDashboard />;
      case 'integrator':
        return roles.includes('integrator') ? <IntegratorDashboard /> : <ClientDashboard />;
      default:
        return <ClientDashboard />;
    }
  };

  return (
    <DashboardLayout
      onSelectHub={handleSelectHub}
      onBackToHub={activeRole !== 'client' ? handleBackToHubInternal : undefined}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default Dashboard;
