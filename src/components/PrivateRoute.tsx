import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface PrivateRouteProps {
  children: ReactNode;
  /** Required roles. If omitted — only authentication is required. */
  roles?: UserRoleType[];
  /** Fallback path when access is denied. */
  fallback?: string;
}

/**
 * Guards a route by authentication and (optionally) by required roles.
 * - Unauthenticated users are redirected to /auth.
 * - Authenticated users without one of the required roles are redirected to `fallback`.
 */
const PrivateRoute = ({ children, roles, fallback = '/dashboard' }: PrivateRouteProps) => {
  const { user, loading, roles: userRoles } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <Skeleton className="h-16 w-48 mb-4" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some((r) => userRoles?.includes(r));
    if (!hasRequiredRole) {
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;
