import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ClientDashboard from '@/components/dashboard/ClientDashboard';
import MasterDashboard from '@/components/dashboard/MasterDashboard';
import BusinessDashboard from '@/components/dashboard/BusinessDashboard';
import NetworkDashboard from '@/components/dashboard/NetworkDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';

const Dashboard = () => {
  const { user, loading, activeRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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

  const renderDashboard = () => {
    switch (activeRole) {
      case 'master': return <MasterDashboard />;
      case 'business_owner': return <BusinessDashboard />;
      case 'business_manager': return <BusinessDashboard />;
      case 'network_owner': return <NetworkDashboard />;
      case 'network_manager': return <NetworkDashboard />;
      case 'platform_admin': return <AdminDashboard />;
      case 'super_admin': return <SuperAdminDashboard />;
      default: return <ClientDashboard />;
    }
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
};

export default Dashboard;
