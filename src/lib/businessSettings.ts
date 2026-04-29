import { supabase } from '@/integrations/supabase/client';

export async function fetchBusinessSettingsSections(businessId: string) {
  const { data, error } = await supabase
    .from('business_settings')
    .select('id, booking, notifications, crm, erp')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateBusinessSettingsSection(
  businessId: string,
  section: 'booking' | 'notifications' | 'crm' | 'erp',
  value: Record<string, unknown>,
) {
  const existing = await fetchBusinessSettingsSections(businessId);
  const payload = {
    business_id: businessId,
    booking: existing?.booking ?? {},
    notifications: existing?.notifications ?? {},
    crm: existing?.crm ?? {},
    erp: existing?.erp ?? {},
    updated_at: new Date().toISOString(),
    [section]: value,
  };

  const { error } = await supabase.from('business_settings').upsert(payload);
  if (error) throw error;
}
