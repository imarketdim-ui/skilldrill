import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import UniversalMasterDashboard from './universal/UniversalMasterDashboard';
import ProfileCompletionCheck from './ProfileCompletionCheck';
import { getCategoryConfig } from './universal/categoryConfig';

const MasterDashboard = () => {
  const { user } = useAuth();
  const [masterProfile, setMasterProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('master_profiles')
      .select('*, service_categories(name)')
      .eq('user_id', user.id)
      .maybeSingle();
    setMasterProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Re-fetch when profile is updated from editor dialog
  useEffect(() => {
    const handler = () => fetchProfile();
    window.addEventListener('master-profile-updated', handler);
    return () => window.removeEventListener('master-profile-updated', handler);
  }, [fetchProfile]);

  const isSubscriptionActive = () => {
    if (!masterProfile) return false;
    const status = masterProfile.subscription_status;
    if (status === 'active' || status === 'in_business') return true;
    if (status === 'trial') {
      const trialEnd = new Date(masterProfile.trial_start_date);
      trialEnd.setDate(trialEnd.getDate() + masterProfile.trial_days);
      return new Date() < trialEnd;
    }
    return false;
  };

  if (loading) return null;

  if (!masterProfile) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Профиль мастера не найден</h2>
          <p className="text-muted-foreground">Обратитесь в поддержку или создайте бизнес-аккаунт.</p>
        </CardContent>
      </Card>
    );
  }

  const categoryName = masterProfile?.service_categories?.name || 'Прочие услуги';
  const config = getCategoryConfig(categoryName);
  const showCompletion = masterProfile.moderation_status !== 'approved';

  return (
    <div className="space-y-6">
      {showCompletion && (
        <ProfileCompletionCheck
          entityType="master"
          entityData={masterProfile}
          onProfileUpdated={fetchProfile}
        />
      )}
      <UniversalMasterDashboard
        masterProfile={masterProfile}
        isSubscriptionActive={isSubscriptionActive()}
        config={config}
      />
    </div>
  );
};

export default MasterDashboard;
