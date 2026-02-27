import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Banknote, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ServiceDetailDialogProps {
  service: any;
  masterName?: string;
  masterId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBook?: () => void;
}

const ServiceDetailDialog = ({ service, masterName, masterId, open, onOpenChange, onBook }: ServiceDetailDialogProps) => {
  const [copied, setCopied] = useState(false);

  if (!service) return null;

  const photos = service.work_photos || [];
  const hashtags = service.hashtags || [];
  const serviceUrl = masterId ? `${window.location.origin}/master/${masterId}?service=${service.id}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(serviceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{service.name}</DialogTitle>
        </DialogHeader>

        {/* Photos gallery */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {photos.slice(0, 4).map((url: string, i: number) => (
              <img key={i} src={url} alt={service.name} className="w-full h-32 object-cover rounded-lg" />
            ))}
          </div>
        )}

        {/* Info */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{Number(service.price).toLocaleString()} ₽</span>
          </div>
          {service.duration_minutes && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{service.duration_minutes} мин</span>
            </div>
          )}
          {masterName && (
            <span className="text-sm text-muted-foreground">Мастер: {masterName}</span>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {hashtags.map((tag: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onBook && <Button className="flex-1" onClick={onBook}>Записаться</Button>}
          {serviceUrl && (
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDetailDialog;
