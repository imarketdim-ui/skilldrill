import AdminDashboard from './AdminDashboard';

/**
 * Support dashboard — wraps AdminDashboard.
 * Tab visibility is restricted to support-related tabs based on
 * the active role ('support').
 */
const SupportDashboard = () => <AdminDashboard />;

export default SupportDashboard;
