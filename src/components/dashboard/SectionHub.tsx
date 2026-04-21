import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, LucideIcon } from 'lucide-react';

interface SectionItem {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  /** Заблокирован тарифом — показываем замок и не выполняем переход. */
  locked?: boolean;
  /** Метка минимального тарифа для бейджа. */
  requiredTierLabel?: string;
}

interface SectionHubProps {
  title: string;
  description?: string;
  items: SectionItem[];
  onNavigate: (key: string) => void;
  /** Колбэк при клике на заблокированный пункт — открывает paywall. */
  onLockedClick?: (item: SectionItem) => void;
}

const SectionHub = ({ title, description, items, onNavigate, onLockedClick }: SectionHubProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const locked = !!item.locked;
          return (
            <Card
              key={item.key}
              className={`cursor-pointer transition-all group ${
                locked
                  ? 'opacity-70 hover:opacity-100 hover:border-primary/40'
                  : 'hover:border-primary/50 hover:shadow-md'
              }`}
              onClick={() => (locked ? onLockedClick?.(item) : onNavigate(item.key))}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    locked
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                  }`}
                >
                  {locked ? <Lock className="h-5 w-5" /> : <item.icon className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`font-semibold transition-colors ${
                        locked ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary'
                      }`}
                    >
                      {item.label}
                    </h3>
                    {locked && item.requiredTierLabel && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                        {item.requiredTierLabel}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SectionHub;
