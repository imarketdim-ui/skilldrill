import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";

export interface ServiceCardData {
  id: string;
  name: string;
  price: number | null;
  duration_minutes: number | null;
  work_photos: string[];
  master_id: string;
  master_name: string;
  master_avatar: string | null;
  master_location: string | null;
  master_rating: number | null;
  master_review_count: number;
  category_name: string | null;
  category_id?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Props {
  service: ServiceCardData;
  onClick: () => void;
  onBook?: () => void;
}

const ServiceCardItem = ({ service, onClick, onBook }: Props) => {
  const navigate = useNavigate();
  const photos = service.work_photos?.length > 0 ? service.work_photos : ["/placeholder.svg"];
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [currentSlide, setCurrentSlide] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useCallback(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  if (emblaApi) {
    emblaApi.on("select", onSelect);
  }

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBook) {
      onBook();
    } else {
      navigate(`/master/${service.master_id}?book=${service.id}`);
    }
  };

  const handleMasterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/master/${service.master_id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Cover carousel */}
      <div className="relative h-48 overflow-hidden bg-secondary">
        {photos.length > 1 ? (
          <div ref={emblaRef} className="overflow-hidden h-full">
            <div className="flex h-full">
              {photos.map((src, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0 h-full">
                  <img
                    src={src}
                    alt={service.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                </div>
              ))}
            </div>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev(); }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); emblaApi?.scrollNext(); }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.slice(0, 5).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentSlide ? 'bg-card' : 'bg-card/50'}`} />
              ))}
            </div>
          </div>
        ) : (
          <img
            src={photos[0]}
            alt={service.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        )}
        {service.master_rating != null && service.master_rating > 0 && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm flex items-center gap-1">
            <Star className="w-4 h-4 text-amber fill-amber" />
            <span className="text-sm font-medium text-foreground">
              {Number(service.master_rating).toFixed(1)}
            </span>
            {service.master_review_count > 0 && (
              <span className="text-xs text-muted-foreground">({service.master_review_count})</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {service.category_name && (
          <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">
            {service.category_name}
          </p>
        )}
        <h3 className="text-lg font-display font-semibold text-foreground mb-3 line-clamp-1">
          {service.name}
        </h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {service.duration_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {service.duration_minutes} мин
            </div>
          )}
          {service.master_location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {service.master_location}
            </div>
          )}
        </div>

        {/* Master info - clickable */}
        <div
          className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50 hover:opacity-80 transition-opacity"
          onClick={handleMasterClick}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0">
            {service.master_avatar ? (
              <img src={service.master_avatar} alt={service.master_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-sm">
                {service.master_name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-primary">{service.master_name}</p>
            <p className="text-xs text-muted-foreground">Мастер</p>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <p className="text-2xl font-display font-bold text-foreground">
            {service.price != null ? `${Number(service.price).toLocaleString()} ₽` : "—"}
          </p>
          <Button variant="hero" size="sm" onClick={handleBookClick}>Записаться</Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCardItem;
