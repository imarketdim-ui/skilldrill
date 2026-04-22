import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformPricing {
  master: number;
  business: number;
  network: number;
}

const defaultPricing: PlatformPricing = { master: 199, business: 2490, network: 5490 };

export const usePlatformPricing = () => {
  const { data } = useQuery({
    queryKey: ['platform-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'pricing')
        .maybeSingle();
      if (error || !data) return defaultPricing;
      const val = data.value as any;
      return {
        master: val?.master ?? defaultPricing.master,
        business: val?.business ?? defaultPricing.business,
        network: val?.network ?? defaultPricing.network,
      } as PlatformPricing;
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  return data || defaultPricing;
};
