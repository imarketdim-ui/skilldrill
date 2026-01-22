import { motion } from "framer-motion";
import { Star, MapPin, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BusinessCardProps {
  image: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  location: string;
  specialistCount: number;
  serviceCount: number;
}

const BusinessCard = ({
  image,
  name,
  category,
  rating,
  reviewCount,
  location,
  specialistCount,
  serviceCount,
}: BusinessCardProps) => {
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
      <div className="relative h-40 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <span className="inline-block px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
            {category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-display font-semibold text-foreground mb-2 line-clamp-1">
          {name}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber fill-amber" />
            <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground text-sm">({reviewCount} отзывов)</span>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4" />
          {location}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {specialistCount} специалистов
          </div>
          <div>
            {serviceCount} услуг
          </div>
        </div>

        <Button variant="outline-primary" className="w-full">
          Смотреть услуги
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default BusinessCard;
