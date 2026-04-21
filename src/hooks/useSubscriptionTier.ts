import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformPricing } from './usePlatformPricing';
import {
  SubscriptionTierKey,
  TIER_LABELS,
  TIER_LIMITS,
  tierAllowsSection,
  getRequiredTier,
} from '@/lib/tierSections';

export type SubscriptionTier = SubscriptionTierKey;

interface SubscriptionState {
  tier: SubscriptionTier;
  /** UI-метка тарифа: «Мастер» / «Про» / «Сеть» / «Нет подписки». */
  tierLabel: string;
  status: 'active' | 'trial' | 'expired' | 'grace';
  expiresAt: Date | null;
  loading: boolean;
  /** Цена текущего тарифа. */
  price: number;

  // ── Лимиты тарифа ──
  /** Сколько бизнес-точек разрешено создать (0 для Мастера). */
  locationLimit: number;
  /** Лимит активных сотрудников (мастера + менеджеры). */
  employeeLimit: number;
  /** Может ли создавать business_locations. */
  canCreateLocation: boolean;
  /** Может ли приглашать сотрудников в команду. */
  canInviteEmployees: boolean;
  /** Может ли указать адрес работы и фото интерьера (true для всех тарифов). */
  canSetWorkAddress: boolean;

  // ── Доступы старой схемы (back-compat) ──
  canAccessMaster: boolean;
  canAccessBusiness: (businessId: string) => boolean;
  canAccessNetwork: boolean;

  /** Централизованный gating разделов по матрице tierSections. */
  canAccessSection: (sectionKey: string) => boolean;
  /** Минимально требуемый тариф для раздела. */
  getRequiredTierForSection: (sectionKey: string) => SubscriptionTier;

  /** Подписка истекла — режим только для чтения. */
  isReadOnly: boolean;
  /** Основная сущность активного тарифа. */
  primaryEntityId: string | null;
  refetch: () => void;
}

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

    // Network — высший тариф
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

      const { data: netBiz } = await supabase
        .from('business_locations')
        .select('id')
        .eq('network_id', activeNetwork.id);
      const netIds = (netBiz || []).map(b => b.id);

      const { data: ownedBiz } = await supabase
        .from('business_locations')
        .select('id')
        .eq('owner_id', userId);
      const ownedIds = (ownedBiz || []).map(b => b.id);
      setNetworkBusinessIds([...new Set([...netIds, ...ownedIds])]);

      setLoading(false);
      return;
    }

    // Business / Pro — средний тариф
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

    // Master — минимальный тариф
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

      if (mStatus === 'grace' || mStatus === 'expired' || mStatus === 'suspended') {
        setTier('master');
        setStatus(mStatus === 'grace' ? 'grace' : 'expired');
        setPrimaryEntityId(master.id);
        setLoading(false);
        return;
      }
    }

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

  const canAccessMaster = tier !== 'none';
  const canAccessNetwork = tier === 'network' && isActive;

  const canAccessBusiness = (businessId: string): boolean => {
    if (!isActive) return false;
    if (tier === 'network') return true;
    if (tier === 'business') return businessId === primaryBusinessId;
    return false;
  };

  const limits = TIER_LIMITS[tier];
  const price = tier === 'network' ? pricing.network : tier === 'business' ? pricing.business : pricing.master;

  const canAccessSection = (sectionKey: string): boolean => {
    if (!isActive) return false;
    return tierAllowsSection(tier, sectionKey);
  };

  const getRequiredTierForSection = (sectionKey: string): SubscriptionTier =>
    getRequiredTier(sectionKey);

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    status,
    expiresAt,
    loading,
    price,

    locationLimit: limits.locationLimit,
    employeeLimit: limits.employeeLimit,
    canCreateLocation: limits.canCreateLocation && isActive,
    canInviteEmployees: limits.canInviteEmployees && isActive,
    canSetWorkAddress: limits.canSetWorkAddress,

    canAccessMaster,
    canAccessBusiness,
    canAccessNetwork,
    canAccessSection,
    getRequiredTierForSection,

    isReadOnly,
    primaryEntityId,
    refetch: fetchTier,
  };
}
