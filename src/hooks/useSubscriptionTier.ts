import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformPricing } from './usePlatformPricing';

export type SubscriptionTier = 'none' | 'master' | 'business' | 'network';

interface SubscriptionState {
  tier: SubscriptionTier;
  status: 'active' | 'trial' | 'expired' | 'grace';
  expiresAt: Date | null;
  loading: boolean;
  /** Tier labels for display */
  tierLabel: string;
  /** Price for current tier */
  price: number;
  /** Can access master features */
  canAccessMaster: boolean;
  /** Can access specific business location */
  canAccessBusiness: (businessId: string) => boolean;
  /** Can access network features */
  canAccessNetwork: boolean;
  /** Whether actions are blocked (read-only mode) */
  isReadOnly: boolean;
  /** Primary entity ID for the active tier */
  primaryEntityId: string | null;
  refetch: () => void;
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  none: 'Нет подписки',
  master: 'Мастер',
  business: 'Бизнес',
  network: 'Сеть',
};

export function useSubscriptionTier(userId?: string): SubscriptionState {
  const pricing = usePlatformPricing();
  const [tier, setTier] = useState<SubscriptionTier>('none');
  const [status, setStatus] = useState<'active' | 'trial' | 'expired' | 'grace'>('expired');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [primaryBusinessId, setPrimaryBusinessId] = useState<string | null>(null);
  const [networkBusinessIds, setNetworkBusinessIds] = useState<string[]>([]);
  const [primaryEntityId, setPrimaryEntityId] = useState<string | null>(null);

  const fetchTier = async () => {
    if (!userId) { setLoading(false); return; }

    // Check network subscription first (highest tier)
    const { data: networks } = await supabase
      .from('networks')
      .select('id, subscription_status, trial_start_date, last_payment_date')
      .eq('owner_id', userId);

    const activeNetwork = (networks || []).find(n =>
      n.subscription_status === 'active' || n.subscription_status === 'trial'
    );

    if (activeNetwork) {
      setTier('network');
      setStatus(activeNetwork.subscription_status as any);
      setPrimaryEntityId(activeNetwork.id);

      // All businesses under this network
      const { data: netBiz } = await supabase
        .from('business_locations')
        .select('id')
        .eq('network_id', activeNetwork.id);
      setNetworkBusinessIds((netBiz || []).map(b => b.id));

      // Also include owned businesses
      const { data: ownedBiz } = await supabase
        .from('business_locations')
        .select('id')
        .eq('owner_id', userId);
      const ownedIds = (ownedBiz || []).map(b => b.id);
      setNetworkBusinessIds(prev => [...new Set([...prev, ...ownedIds])]);

      setLoading(false);
      return;
    }

    // Check business subscription (mid tier)
    const { data: businesses } = await supabase
      .from('business_locations')
      .select('id, subscription_status, trial_start_date, last_payment_date')
      .eq('owner_id', userId);

    const activeBiz = (businesses || []).find(b =>
      b.subscription_status === 'active' || b.subscription_status === 'trial'
    );

    if (activeBiz) {
      setTier('business');
      setStatus(activeBiz.subscription_status as any);
      setPrimaryBusinessId(activeBiz.id);
      setPrimaryEntityId(activeBiz.id);
      setLoading(false);
      return;
    }

    // Check master subscription (lowest tier)
    const { data: master } = await supabase
      .from('master_profiles')
      .select('id, subscription_status, trial_start_date, last_payment_date, trial_days')
      .eq('user_id', userId)
      .maybeSingle();

    if (master) {
      const mStatus = master.subscription_status;
      if (mStatus === 'active' || mStatus === 'trial') {
        setTier('master');
        setStatus(mStatus as any);
        setPrimaryEntityId(master.id);

        if (mStatus === 'trial' && master.trial_start_date) {
          const trialEnd = new Date(master.trial_start_date);
          trialEnd.setDate(trialEnd.getDate() + (master.trial_days || 14));
          setExpiresAt(trialEnd);
        }
        setLoading(false);
        return;
      }

      // Expired master
      if (mStatus === 'grace' || mStatus === 'expired' || mStatus === 'suspended') {
        setTier('master');
        setStatus(mStatus === 'grace' ? 'grace' : 'expired');
        setPrimaryEntityId(master.id);
        setLoading(false);
        return;
      }
    }

    // Check if any business is expired
    const expiredBiz = (businesses || []).find(b =>
      b.subscription_status === 'grace' || b.subscription_status === 'expired' || b.subscription_status === 'suspended'
    );
    if (expiredBiz) {
      setTier('business');
      setStatus('expired');
      setPrimaryBusinessId(expiredBiz.id);
      setPrimaryEntityId(expiredBiz.id);
      setLoading(false);
      return;
    }

    const expiredNetwork = (networks || []).find(n =>
      n.subscription_status === 'grace' || n.subscription_status === 'expired' || n.subscription_status === 'suspended'
    );
    if (expiredNetwork) {
      setTier('network');
      setStatus('expired');
      setPrimaryEntityId(expiredNetwork.id);
      setLoading(false);
      return;
    }

    setTier('none');
    setStatus('expired');
    setLoading(false);
  };

  useEffect(() => { fetchTier(); }, [userId]);

  const isActive = status === 'active' || status === 'trial';
  const isReadOnly = !isActive && tier !== 'none';

  const canAccessMaster = tier !== 'none'; // all tiers include master
  const canAccessNetwork = tier === 'network' && isActive;

  const canAccessBusiness = (businessId: string): boolean => {
    if (!isActive) return false; // read-only
    if (tier === 'network') return true; // network = all locations
    if (tier === 'business') return businessId === primaryBusinessId; // business = 1 location
    return false; // master tier = no business access
  };

  const price = tier === 'network' ? pricing.network : tier === 'business' ? pricing.business : pricing.master;

  return {
    tier,
    status,
    expiresAt,
    loading,
    tierLabel: TIER_LABELS[tier],
    price,
    canAccessMaster,
    canAccessBusiness,
    canAccessNetwork,
    isReadOnly,
    primaryEntityId,
    refetch: fetchTier,
  };
}
