import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { TIER_COMPARISON, TIER_LABELS, SubscriptionTierKey } from '@/lib/tierSections';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';

interface TierComparisonProps {
  /** Текущий тариф пользователя — для подсветки колонки. */
  currentTier?: SubscriptionTierKey;
}

const TIERS: SubscriptionTierKey[] = ['master', 'business', 'network'];

const renderValue = (value: boolean | string) => {
  if (value === true) return <Check className="h-4 w-4 text-success mx-auto" />;
  if (value === false) return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  if (value === '—') return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs">{value}</span>;
};

/**
 * Карточки сравнения трёх тарифов.
 * Используется в SubscriptionManager и на странице /subscription.
 */
const TierComparison = ({ currentTier }: TierComparisonProps) => {
  const pricing = usePlatformPricing();
  const prices: Record<SubscriptionTierKey, number> = {
    none: 0,
    master: pricing.master,
    business: pricing.business,
    network: pricing.network,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сравнение тарифов</CardTitle>
        <CardDescription>Подберите тариф под ваш масштаб</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 pr-2 font-medium text-muted-foreground">Возможность</th>
                {TIERS.map((t) => (
                  <th key={t} className={`text-center py-3 px-2 font-semibold min-w-[100px] ${currentTier === t ? 'bg-primary/5 rounded-t-lg' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      <span>{TIER_LABELS[t]}</span>
                      <span className="text-xs font-normal text-muted-foreground">{prices[t].toLocaleString()} ₽/мес</span>
                      {currentTier === t && <Badge variant="secondary" className="text-[10px] mt-0.5">Текущий</Badge>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIER_COMPARISON.map((feature) => (
                <tr key={feature.key} className="border-b last:border-b-0">
                  <td className="py-2.5 pr-2 text-muted-foreground">{feature.label}</td>
                  {TIERS.map((t) => (
                    <td key={t} className={`text-center py-2.5 px-2 ${currentTier === t ? 'bg-primary/5' : ''}`}>
                      {renderValue(feature[t])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TierComparison;
