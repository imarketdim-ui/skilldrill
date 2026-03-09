import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface SectionItem {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

interface SectionHubProps {
  title: string;
  description?: string;
  items: SectionItem[];
  onNavigate: (key: string) => void;
}

const SectionHub = ({ title, description, items, onNavigate }: SectionHubProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card
            key={item.key}
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => onNavigate(item.key)}
          >
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SectionHub;
