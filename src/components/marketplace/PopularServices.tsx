import { useNavigate } from "react-router-dom";
import { Star, MapPin, Clock, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allMasters, allBusinesses } from "@/data/mockCatalog";

const topServices = allMasters.slice(0, 4);
const topBusinesses = allBusinesses.slice(0, 3);

const PopularServices = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container-wide">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Популярное</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Популярные услуги</h2>
          </div>
          <a href="/catalog" className="text-primary font-medium hover:underline text-sm">Смотреть все →</a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {topServices.map((master) => (
            <div
              key={master.id}
              className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/master/${master.id}`)}
            >
              <div className="relative h-48 overflow-hidden">
                <img src={master.services[0]?.image} alt={master.services[0]?.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-card flex items-center gap-1 shadow-sm">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-sm font-medium text-foreground">{master.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({master.reviewCount})</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">{master.categoryName}</p>
                <h3 className="text-lg font-display font-semibold text-foreground mb-3 line-clamp-1">{master.services[0]?.name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{master.services[0]?.duration}</div>
                  <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{master.location}</div>
                </div>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <img src={master.avatar} alt={master.name} className="w-10 h-10 rounded-full object-cover" />
                  <div><p className="text-sm font-medium text-foreground">{master.name}</p><p className="text-xs text-muted-foreground">Мастер</p></div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-display font-bold text-foreground">{master.services[0]?.price.toLocaleString()} ₽</p>
                  <Button size="sm">Записаться</Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Заведения</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Популярные заведения</h2>
          </div>
          <a href="/catalog" className="text-primary font-medium hover:underline text-sm">Смотреть все →</a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topBusinesses.map((biz) => (
            <div
              key={biz.id}
              className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/business/${biz.id}`)}
            >
              <div className="relative h-40 overflow-hidden">
                <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-4">
                  <span className="px-2 py-1 rounded-lg bg-card text-foreground text-xs font-medium shadow-sm">{biz.categoryName}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-display font-semibold text-foreground mb-2 line-clamp-1">{biz.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-primary fill-primary" /><span className="text-sm font-medium">{biz.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">({biz.reviewCount} отзывов)</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4"><MapPin className="w-4 h-4" />{biz.address}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                  <div className="flex items-center gap-1"><Users className="w-4 h-4" />{biz.specialistCount} специалистов</div>
                  <div>{biz.serviceCount} услуг</div>
                </div>
                <Button variant="outline" className="w-full">Смотреть услуги <ExternalLink className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularServices;
