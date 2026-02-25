import { Star, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  onClick: () => void;
}

const MasterCardItem = ({
  name, avatar_url, rating, review_count, bio, location, category_name, min_price, hashtags, onClick,
}: Props) => (
  <Card
    className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full"
    onClick={onClick}
  >
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
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{name}</h3>
          {category_name && (
            <Badge variant="outline" className="text-xs mt-0.5">{category_name}</Badge>
          )}
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

export default MasterCardItem;
