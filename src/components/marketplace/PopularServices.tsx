import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Star, MapPin, Clock, Users, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PopularMaster {
  id: string;
  user_id: string;
  name: string;
  avatar: string | null;
  category_name: string | null;
  location: string | null;
  service_name: string | null;
  service_price: number | null;
  service_duration: number | null;
  service_image: string | null;
}

interface PopularBusiness {
  id: string;
  name: string;
  image: string | null;
  category_name: string | null;
  address: string | null;
  description: string | null;
  specialist_count: number;
  service_count: number;
}

const PopularServices = () => {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<PopularMaster[]>([]);
  const [businesses, setBusinesses] = useState<PopularBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch approved masters with profiles
      const { data: mpData } = await supabase
        .from("master_profiles")
        .select(`
          id, user_id, address, work_photos, category_id,
          profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url),
          service_categories!master_profiles_category_id_fkey(name)
        `)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .limit(8);

      const userIds = (mpData || []).map((mp: any) => mp.user_id);
      let servicesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: svcData } = await supabase
          .from("services")
          .select("master_id, name, price, duration_minutes, work_photos")
          .in("master_id", userIds)
          .eq("is_active", true);
        (svcData || []).forEach((s: any) => {
          if (!servicesMap[s.master_id]) servicesMap[s.master_id] = s;
        });
      }

      const mappedMasters: PopularMaster[] = (mpData || []).slice(0, 4).map((mp: any) => {
        const profile = mp.profiles;
        const svc = servicesMap[mp.user_id];
        const svcPhotos = svc?.work_photos as string[] || [];
        const wpPhotos = mp.work_photos as string[] || [];
        return {
          id: mp.id,
          user_id: mp.user_id,
          name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Мастер",
          avatar: profile?.avatar_url || null,
          category_name: mp.service_categories?.name || null,
          location: mp.address || null,
          service_name: svc?.name || null,
          service_price: svc?.price ? Number(svc.price) : null,
          service_duration: svc?.duration_minutes || null,
          service_image: svcPhotos[0] || wpPhotos[0] || null,
        };
      });
      setMasters(mappedMasters);

      // Fetch approved businesses
      const { data: bizData } = await supabase
        .from("business_locations")
        .select(`
          id, name, address, description, interior_photos, exterior_photos, category_id,
          service_categories!business_locations_category_id_fkey(name)
        `)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .limit(3);

      if (bizData && bizData.length > 0) {
        const bizIds = bizData.map((b: any) => b.id);
        const [bmRes, svcRes] = await Promise.all([
          supabase.from("business_masters").select("business_id").in("business_id", bizIds).eq("status", "accepted"),
          supabase.from("services").select("organization_id").in("organization_id", bizIds).eq("is_active", true),
        ]);

        const masterCountMap: Record<string, number> = {};
        const serviceCountMap: Record<string, number> = {};
        (bmRes.data || []).forEach((bm: any) => { masterCountMap[bm.business_id] = (masterCountMap[bm.business_id] || 0) + 1; });
        (svcRes.data || []).forEach((s: any) => { serviceCountMap[s.organization_id] = (serviceCountMap[s.organization_id] || 0) + 1; });

        const mappedBiz: PopularBusiness[] = bizData.map((b: any) => {
          const photos = [...(b.interior_photos || []), ...(b.exterior_photos || [])];
          return {
            id: b.id,
            name: b.name,
            image: photos[0] || null,
            category_name: (b as any).service_categories?.name || null,
            address: b.address || null,
            description: b.description || null,
            specialist_count: masterCountMap[b.id] || 0,
            service_count: serviceCountMap[b.id] || 0,
          };
        });
        setBusinesses(mappedBiz);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="section-padding bg-surface">
        <div className="container-wide flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (masters.length === 0 && businesses.length === 0) return null;

  return (
    <section className="section-padding bg-surface">
      <div className="container-wide">
        {masters.length > 0 && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Популярные услуги</h2>
                <p className="text-muted-foreground">Лучшие предложения от проверенных специалистов</p>
              </div>
              <a href="/" className="text-primary font-medium hover:underline">Смотреть все →</a>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {masters.map((master) => (
                <motion.div key={master.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }}
                  className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => navigate(`/master/${master.user_id}`)}
                >
                  {master.service_image ? (
                    <div className="relative h-48 overflow-hidden">
                      <img src={master.service_image} alt={master.service_name || master.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                    </div>
                  ) : (
                    <div className="h-48 bg-secondary flex items-center justify-center">
                      <span className="text-4xl font-bold text-muted-foreground">{master.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="p-5">
                    {master.category_name && (
                      <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">{master.category_name}</p>
                    )}
                    <h3 className="text-lg font-display font-semibold text-foreground mb-3 line-clamp-1">
                      {master.service_name || master.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      {master.service_duration && (
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{master.service_duration} мин</div>
                      )}
                      {master.location && (
                        <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{master.location}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0">
                        {master.avatar ? (
                          <img src={master.avatar} alt={master.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-sm">
                            {master.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div><p className="text-sm font-medium text-foreground">{master.name}</p><p className="text-xs text-muted-foreground">Мастер</p></div>
                    </div>
                    <div className="flex items-center justify-between">
                      {master.service_price != null && (
                        <p className="text-2xl font-display font-bold text-foreground">{master.service_price.toLocaleString()} ₽</p>
                      )}
                      <Button variant="hero" size="sm">Записаться</Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {businesses.length > 0 && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Популярные заведения</h2>
                <p className="text-muted-foreground">Проверенные бизнесы с высоким рейтингом</p>
              </div>
              <a href="/?tab=businesses" className="text-primary font-medium hover:underline">Смотреть все →</a>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((biz) => (
                <motion.div key={biz.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }}
                  className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => navigate(`/business/${biz.id}`)}
                >
                  <div className="relative h-40 overflow-hidden">
                    {biz.image ? (
                      <>
                        <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40" />
                      </>
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <Users className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {biz.category_name && (
                      <div className="absolute bottom-3 left-4">
                        <span className="px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs font-medium">{biz.category_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-display font-semibold text-foreground mb-2 line-clamp-1">{biz.name}</h3>
                    {biz.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4"><MapPin className="w-4 h-4" />{biz.address}</div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b border-border/50">
                      {biz.specialist_count > 0 && (
                        <div className="flex items-center gap-1"><Users className="w-4 h-4" />{biz.specialist_count} специалистов</div>
                      )}
                      {biz.service_count > 0 && <div>{biz.service_count} услуг</div>}
                    </div>
                    <Button variant="outline" className="w-full">Смотреть услуги <ExternalLink className="w-4 h-4 ml-1" /></Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default PopularServices;
