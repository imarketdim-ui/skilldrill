import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Banknote, Copy, Check, MapPin, User } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getPublicSiteUrl } from '@/lib/seoUtils';

interface ServiceDetailDialogProps {
  service: any;
  masterName?: string;
  masterId?: string;
  masterLocation?: string | null;
  masterLatitude?: number | null;
  masterLongitude?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBook?: () => void;
}

const ServiceDetailDialog = ({
  service,
  masterName,
  masterId,
  masterLocation,
  masterLatitude,
  masterLongitude,
  open,
  onOpenChange,
  onBook
}: ServiceDetailDialogProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  // Initialize map when showing
  useEffect(() => {
    if (!showMap || !mapRef.current || !masterLatitude || !masterLongitude) return;

    // Cleanup previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    requestAnimationFrame(() => {
      if (!mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [masterLongitude, masterLatitude],
        zoom: 15,
      });

      new maplibregl.Marker({ color: '#8B5CF6' })
        .setLngLat([masterLongitude, masterLatitude])
        .addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap, masterLatitude, masterLongitude]);

  // Reset map view when dialog closes
  useEffect(() => {
    if (!open) {
      setShowMap(false);
    }
  }, [open]);

  if (!service) return null;

  const photos = service.work_photos || [];
  const hashtags = service.hashtags || [];
  const serviceUrl = service?.id ? getPublicSiteUrl(`/service/${service.id}`) : '';

  const copyLink = () => {
    navigator.clipboard.writeText(serviceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMasterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (masterId) {
      onOpenChange(false);
      navigate(`/master/${masterId}`);
    }
  };

  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (masterLatitude && masterLongitude) {
      setShowMap(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{service.name}</DialogTitle>
        </DialogHeader>

        {/* Map view */}
        {showMap && masterLatitude && masterLongitude ? (
          <div className="space-y-3">
            <div ref={mapRef} className="w-full h-64 rounded-lg overflow-hidden" />
            {masterLocation && (
              <p className="text-sm text-muted-foreground">{masterLocation}</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => setShowMap(false)}>
              ← Вернуться к услуге
            </Button>
          </div>
        ) : (
          <>
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
            </div>

            {/* Master info - clickable */}
            {masterName && (
              <button
                onClick={handleMasterClick}
                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span>{masterName}</span>
              </button>
            )}

            {/* Address - clickable */}
            {masterLocation && (
              <button
                onClick={handleAddressClick}
                className={`flex items-center gap-2 text-sm ${masterLatitude && masterLongitude ? 'text-primary hover:underline cursor-pointer' : 'text-muted-foreground'}`}
              >
                <MapPin className="h-4 w-4" />
                <span>{masterLocation}</span>
              </button>
            )}

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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDetailDialog;
