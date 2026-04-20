import AdminDashboard from './AdminDashboard';

/**
 * Integrator dashboard — wraps AdminDashboard.
 * Visibility limited to support + promo codes per `INTEGRATOR_TABS`.
 */
const IntegratorDashboard = () => <AdminDashboard />;

export default IntegratorDashboard;
