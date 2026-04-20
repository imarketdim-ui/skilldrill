import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { User, Wrench, Building2, Shield, Crown, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleSwitcherProps {
  onSelectHub?: (hub: 'business' | 'platform') => void;
}

type TabKey = 'client' | 'master' | 'business' | 'platform';

const RoleSwitcher = ({ onSelectHub }: RoleSwitcherProps) => {
  const { user, roles, activeRole, setActiveRole } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<Record<TabKey, number>>({ client: 0, master: 0, business: 0, platform: 0 });

  const hasPlatformRoles = roles.some(r =>
    ['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(r)
  );
  const hasBusinessRoles = roles.some(r =>
    ['master', 'business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(r)
  );
  const hasMasterRole = roles.includes('master');
  const hasOrgRoles = roles.some(r =>
    ['business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(r)
  );

  // Fetch unread notification counts per cabinet
  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const counts: Record<TabKey, number> = { client: 0, master: 0, business: 0, platform: 0 };

      // Client notifications
      const { count: clientNotifs } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or('cabinet_type.eq.client,cabinet_type.is.null');
      counts.client = clientNotifs || 0;

      // Client unread chats
      const { count: clientChats } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .or('cabinet_type_scope.eq.client,cabinet_type_scope.is.null');
      counts.client += clientChats || 0;

      // Master notifications
      if (hasMasterRole) {
        const { count: masterNotifs } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('cabinet_type', 'master');
        counts.master = masterNotifs || 0;

        const { count: masterChats } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false)
          .eq('cabinet_type_scope', 'master');
        counts.master += masterChats || 0;
      }

      // Business notifications
      if (hasOrgRoles) {
        const { count: bizNotifs } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('cabinet_type', 'business');
        counts.business = bizNotifs || 0;

        const { count: bizChats } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false)
          .eq('cabinet_type_scope', 'business');
        counts.business += bizChats || 0;
      }

      // Platform notifications
      if (hasPlatformRoles) {
        const { count: platNotifs } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('cabinet_type', 'platform');
        counts.platform = platNotifs || 0;
      }

      setUnreadCounts(counts);
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [user, hasMasterRole, hasOrgRoles, hasPlatformRoles]);

  // Determine active tab
  const getActiveTab = (): TabKey => {
    if (activeRole === 'client') return 'client';
    if (activeRole === 'master') return 'master';
    if (['business_owner', 'business_manager', 'network_owner', 'network_manager'].includes(activeRole)) return 'business';
    if (['platform_admin', 'super_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(activeRole)) return 'platform';
    return 'client';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: TabKey) => {
    if (tab === 'client') {
      setActiveRole('client');
    } else if (tab === 'master') {
      // Switch directly to master role if available
      if (hasMasterRole) {
        setActiveRole('master');
      }
    } else if (tab === 'business') {
      onSelectHub?.('business');
    } else if (tab === 'platform') {
      onSelectHub?.('platform');
    }
  };

  // Build tabs
  const tabs: { key: TabKey; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'client', label: 'Клиент', icon: <User className="h-4 w-4" />, show: true },
    { key: 'master', label: 'Мастер', icon: <Wrench className="h-4 w-4" />, show: hasMasterRole },
    { key: 'business', label: 'Бизнес', icon: <Building2 className="h-4 w-4" />, show: hasBusinessRoles },
    { key: 'platform', label: 'Площадка', icon: hasPlatformRoles && roles.includes('super_admin') ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />, show: hasPlatformRoles },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  // If only client, just show label
  if (visibleTabs.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm font-medium">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Клиент</span>
        {unreadCounts.client > 0 && (
          <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">{unreadCounts.client}</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
      {visibleTabs.map(tab => {
        const isActive = activeTab === tab.key;
        const count = unreadCounts[tab.key];
        return (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {count > 0 && (
              <Badge
                variant="destructive"
                className="h-4 min-w-4 px-1 text-[9px] leading-none"
              >
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default RoleSwitcher;
