import { useState, useCallback } from "react";
import { Star, MapPin, Users, ChevronLeft, ChevronRight, BadgeCheck, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import useEmblaCarousel from "embla-carousel-react";

interface Props {
  id: string;
  name: string;
  image?: string | null;
  images?: string[];
  rating?: number | null;
  review_count?: number | null;
  address?: string | null;
  description?: string | null;
  category_name?: string | null;
  specialist_count?: number;
  service_count?: number;
  moderation_status?: string | null;
  onClick: () => void;
}

const BusinessCardItem = ({
  name, image, images, rating, review_count, address, description, category_name, specialist_count, service_count, onClick,
}: Props) => {
  const photos = images && images.length > 0 ? images : image ? [image] : [];
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [currentSlide, setCurrentSlide] = useState(0);

  if (emblaApi) {
    emblaApi.on("select", () => setCurrentSlide(emblaApi.selectedScrollSnap()));
  }

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full"
      onClick={onClick}
    >
      {/* Cover image / carousel */}
      <div className="h-44 relative overflow-hidden">
        {photos.length > 1 ? (
          <div ref={emblaRef} className="overflow-hidden h-full">
            <div className="flex h-full">
              {photos.map((src, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0 h-full">
                  <img src={src} alt={name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev(); }}
            ><ChevronLeft className="w-4 h-4" /></button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); emblaApi?.scrollNext(); }}
            ><ChevronRight className="w-4 h-4" /></button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.slice(0, 5).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentSlide ? 'bg-card' : 'bg-card/50'}`} />
              ))}
            </div>
          </div>
        ) : photos.length === 1 ? (
          <img src={photos[0]} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {category_name && (
          <Badge className="absolute top-3 left-3 bg-background/90 text-foreground border-0 shadow-sm">
            {category_name}
          </Badge>
        )}
      </div>

      <CardContent className="p-5">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5">{name}</h3>

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
          {rating != null && rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-accent text-accent" />
              <span className="font-medium text-foreground">{Number(rating).toFixed(1)}</span>
              {review_count != null && <span>({review_count})</span>}
            </span>
          )}
          {address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {address}
            </span>
          )}
        </div>

        <div className="flex gap-4 text-sm text-muted-foreground mb-3">
          {specialist_count != null && specialist_count > 0 && (
            <span><Users className="w-3.5 h-3.5 inline mr-1" />{specialist_count} мастеров</span>
          )}
          {service_count != null && service_count > 0 && (
            <span>{service_count} услуг</span>
          )}
        </div>

        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}
      </CardContent>
    </Card>
  );
};

export default BusinessCardItem;
