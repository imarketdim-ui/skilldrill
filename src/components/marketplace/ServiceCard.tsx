import { motion } from "framer-motion";
import { Star, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceCardProps {
  image: string;
  title: string;
  businessName: string;
  rating: number;
  reviewCount: number;
  price: number;
  duration: string;
  location: string;
  specialistName?: string;
  specialistAvatar?: string;
}

const ServiceCard = ({
  image,
  title,
  businessName,
  rating,
  reviewCount,
  price,
  duration,
  location,
  specialistName,
  specialistAvatar,
}: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm flex items-center gap-1">
          <Star className="w-4 h-4 text-amber fill-amber" />
          <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({reviewCount})</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">
          {businessName}
        </p>
        <h3 className="text-lg font-display font-semibold text-foreground mb-3 line-clamp-1">
          {title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {duration}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {location}
          </div>
        </div>

        {/* Specialist */}
        {specialistName && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
              {specialistAvatar ? (
                <img src={specialistAvatar} alt={specialistName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-medium">{specialistName[0]}</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{specialistName}</p>
              <p className="text-xs text-muted-foreground">Мастер</p>
            </div>
          </div>
        )}

        {/* Price and CTA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {price.toLocaleString()} ₽
            </p>
          </div>
          <Button variant="hero" size="sm">
            Записаться
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
