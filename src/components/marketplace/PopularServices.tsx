import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Star, MapPin, Clock, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allMasters, allBusinesses } from "@/data/mockCatalog";

const topServices = allMasters.slice(0, 4);
const topBusinesses = allBusinesses.slice(0, 3);

const PopularServices = () => {
  const navigate = useNavigate();

  return (
    <section className="section-padding bg-surface">
      <div className="container-wide">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Популярные услуги</h2>
            <p className="text-muted-foreground">Лучшие предложения от проверенных специалистов</p>
          </div>
          <a href="/catalog" className="text-primary font-medium hover:underline">Смотреть все →</a>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {topServices.map((master) => (
            <motion.div key={master.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }}
              className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl transition-all cursor-pointer"
              onClick={() => navigate(`/master/${master.id}`)}
            >
              <div className="relative h-48 overflow-hidden">
                <img src={master.services[0]?.image} alt={master.services[0]?.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber fill-amber" />
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
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
                  <img src={master.avatar} alt={master.name} className="w-10 h-10 rounded-full object-cover" />
                  <div><p className="text-sm font-medium text-foreground">{master.name}</p><p className="text-xs text-muted-foreground">Мастер</p></div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-display font-bold text-foreground">{master.services[0]?.price.toLocaleString()} ₽</p>
                  <Button variant="hero" size="sm">Записаться</Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Популярные заведения</h2>
            <p className="text-muted-foreground">Проверенные бизнесы с высоким рейтингом</p>
          </div>
          <a href="/catalog" className="text-primary font-medium hover:underline">Смотреть все →</a>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topBusinesses.map((biz) => (
            <motion.div key={biz.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }}
              className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl transition-all cursor-pointer"
              onClick={() => navigate(`/business/${biz.id}`)}
            >
              <div className="relative h-40 overflow-hidden">
                <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-3 left-4"><span className="px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs font-medium">{biz.categoryName}</span></div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-display font-semibold text-foreground mb-2 line-clamp-1">{biz.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber fill-amber" /><span className="text-sm font-medium">{biz.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">({biz.reviewCount} отзывов)</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4"><MapPin className="w-4 h-4" />{biz.address}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-1"><Users className="w-4 h-4" />{biz.specialistCount} специалистов</div>
                  <div>{biz.serviceCount} услуг</div>
                </div>
                <Button variant="outline" className="w-full">Смотреть услуги <ExternalLink className="w-4 h-4 ml-1" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularServices;
