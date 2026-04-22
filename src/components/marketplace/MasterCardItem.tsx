import { useState } from "react";
import { Star, MapPin, ChevronLeft, ChevronRight, BadgeCheck, ThumbsUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import useEmblaCarousel from "embla-carousel-react";

interface Props {
  id: string;
  name: string;
  avatar_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  bio?: string | null;
  location?: string | null;
  category_name?: string | null;
  min_price?: number | null;
  hashtags?: string[] | null;
  work_photos?: string[] | null;
  moderation_status?: string | null;
  availableOnDate?: boolean;
  onClick: () => void;
}

const MasterCardItem = ({
  name, avatar_url, rating, review_count, bio, location, category_name, min_price, hashtags, work_photos, moderation_status, availableOnDate, onClick,
}: Props) => {
  const photos = work_photos && work_photos.length > 0 ? work_photos : [];
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
      {/* Photo carousel */}
      {photos.length > 0 && (
        <div className="h-40 relative overflow-hidden">
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
          ) : (
            <img src={photos[0]} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          )}
        </div>
      )}

      <CardContent className="p-5">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary shrink-0">
            {avatar_url ? (
              <img src={avatar_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
                {name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{name}</h3>
              {moderation_status === 'approved' && (
                <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {category_name && (
                <Badge variant="outline" className="text-xs">{category_name}</Badge>
              )}
              {rating != null && rating >= 4.5 && (
                <Badge variant="secondary" className="text-xs gap-0.5 bg-accent/10 text-accent border-0">
                  <ThumbsUp className="w-2.5 h-2.5" /> Рекомендуем
                </Badge>
              )}
              {availableOnDate && (
                <Badge variant="secondary" className="text-xs gap-0.5 bg-primary/10 text-primary border-0">
                  <Clock className="w-2.5 h-2.5" /> Свободно
                </Badge>
              )}
            </div>
          </div>
          {rating != null && rating > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-semibold">{Number(rating).toFixed(1)}</span>
              {review_count != null && <span className="text-xs text-muted-foreground">({review_count})</span>}
            </div>
          )}
        </div>

        {bio && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bio}</p>}

        {location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <MapPin className="w-3.5 h-3.5 shrink-0" /> {location}
          </div>
        )}

        <div className="flex items-center justify-between">
          {min_price != null && min_price > 0 && (
            <span className="text-sm font-bold text-foreground">от {min_price.toLocaleString("ru-RU")} ₽</span>
          )}
          {hashtags && hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hashtags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MasterCardItem;
