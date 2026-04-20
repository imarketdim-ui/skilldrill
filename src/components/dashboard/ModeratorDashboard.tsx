import AdminDashboard from './AdminDashboard';

/**
 * Moderator dashboard — wraps AdminDashboard.
 * Tab visibility is controlled by `TAB_ACCESS` in AdminDashboard
 * based on the active role ('moderator'). Only moderation-related
 * tabs are shown.
 */
const ModeratorDashboard = () => <AdminDashboard />;

export default ModeratorDashboard;
