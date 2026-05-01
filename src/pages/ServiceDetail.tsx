import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Clock, Copy, ExternalLink, MapPin, Share2, User, Building2, ChevronLeft } from "lucide-react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPublicSiteUrl, removeStructuredData, updatePageMeta, updateStructuredData } from "@/lib/seoUtils";

const ServiceDetail = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [service, setService] = useState<any>(null);
  const [masterProfile, setMasterProfile] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;

    const fetchService = async () => {
      setLoading(true);

      const { data: serviceData } = await supabase
        .from("services")
        .select(`
          id, name, description, price, duration_minutes, work_photos, hashtags, master_id, organization_id, business_id,
          profiles!services_master_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq("id", serviceId)
        .eq("is_active", true)
        .maybeSingle();

      if (!serviceData) {
        setService(null);
        setMasterProfile(null);
        setBusiness(null);
        setLoading(false);
        return;
      }

      setService(serviceData);

      const [{ data: masterData }, { data: businessData }] = await Promise.all([
        supabase
          .from("master_profiles")
          .select(`
            id, user_id, address, city, latitude, longitude, category_id,
            service_categories!master_profiles_category_id_fkey(name)
          `)
          .eq("user_id", serviceData.master_id)
          .maybeSingle(),
        (serviceData.business_id || serviceData.organization_id)
          ? supabase
              .from("business_locations")
              .select("id, name, address, city, latitude, longitude")
              .eq("id", serviceData.business_id || serviceData.organization_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setMasterProfile(masterData);
      setBusiness(businessData);
      setLoading(false);
    };

    fetchService();
  }, [serviceId]);

  const serviceUrl = useMemo(() => getPublicSiteUrl(`/service/${serviceId}`), [serviceId]);
  const masterName = useMemo(
    () => [service?.profiles?.first_name, service?.profiles?.last_name].filter(Boolean).join(" ").trim() || "Мастер",
    [service],
  );
  const serviceLocation = business?.address || masterProfile?.address || null;
  const serviceCity = business?.city || masterProfile?.city || "";
  const serviceImage = service?.work_photos?.[0] || service?.profiles?.avatar_url || undefined;

  useEffect(() => {
    if (!service) return;

    const description = [
      service.description || `${service.name} на SkillSpot`,
      service.price ? `Цена от ${Number(service.price).toLocaleString("ru-RU")} ₽.` : "",
      serviceCity ? `Доступно в ${serviceCity}.` : "",
    ].filter(Boolean).join(" ");

    updatePageMeta({
      title: `${service.name}${serviceCity ? ` в ${serviceCity}` : ""} — SkillSpot`,
      description,
      url: serviceUrl,
      canonicalUrl: serviceUrl,
      image: serviceImage,
      type: "product",
    });

    updateStructuredData("service-detail", {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      description,
      image: serviceImage,
      areaServed: serviceCity || undefined,
      url: serviceUrl,
      provider: business
        ? {
            "@type": "LocalBusiness",
            name: business.name,
            url: getPublicSiteUrl(`/business/${business.id}`),
          }
        : {
            "@type": "Person",
            name: masterName,
            url: getPublicSiteUrl(`/master/${service.master_id}`),
          },
      offers: service.price
        ? {
            "@type": "Offer",
            priceCurrency: "RUB",
            price: String(service.price),
            availability: "https://schema.org/InStock",
            url: serviceUrl,
          }
        : undefined,
    });

    return () => removeStructuredData("service-detail");
  }, [business, masterName, service, serviceCity, serviceImage, serviceUrl]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: service?.name || "Услуга на SkillSpot",
          text: `${service?.name || "Услуга"} на SkillSpot`,
          url: serviceUrl,
        });
        return;
      } catch {
        // Fallback to clipboard below.
      }
    }

    await navigator.clipboard.writeText(serviceUrl);
    toast({ title: "Ссылка скопирована" });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16 text-center text-muted-foreground">Загрузка услуги...</main>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16 text-center">
          <p className="text-lg font-medium">Услуга не найдена</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/catalog")}>
            Вернуться в каталог
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/catalog" className="hover:text-foreground transition-colors">
              Каталог услуг
            </Link>
            <span>/</span>
            <span className="text-foreground">{service.name}</span>
          </div>

          <Button variant="ghost" className="mb-4 px-0" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              {service.work_photos?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.work_photos.slice(0, 4).map((photo: string, index: number) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`${service.name} — фото ${index + 1}`}
                      className="w-full h-64 object-cover rounded-2xl border border-border/50"
                    />
                  ))}
                </div>
              ) : (
                <div className="h-72 rounded-2xl border border-border/50 bg-secondary flex items-center justify-center text-muted-foreground">
                  Фото услуги пока не добавлены
                </div>
              )}

              <div>
                {masterProfile?.service_categories?.name && (
                  <p className="text-sm font-medium uppercase tracking-wide text-primary mb-2">
                    {masterProfile.service_categories.name}
                  </p>
                )}
                <h1 className="text-3xl md:text-4xl font-bold mb-3">{service.name}</h1>
                <p className="text-lg text-muted-foreground">
                  {service.description || "Подробности об услуге, стоимости и записи доступны на этой странице."}
                </p>
              </div>

              {service.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {service.hashtags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Стоимость</p>
                      <p className="text-3xl font-bold">
                        {service.price != null ? `${Number(service.price).toLocaleString("ru-RU")} ₽` : "По запросу"}
                      </p>
                    </div>
                    {service.duration_minutes ? (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Длительность</p>
                        <p className="font-semibold flex items-center gap-1 justify-end">
                          <Clock className="w-4 h-4" />
                          {service.duration_minutes} мин
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => navigate(`/master/${service.master_id}`)}
                      className="w-full flex items-start gap-3 rounded-xl border border-border/50 p-3 text-left hover:border-primary/40 transition-colors"
                    >
                      <User className="w-4 h-4 mt-1 text-primary shrink-0" />
                      <div>
                        <p className="font-medium">{masterName}</p>
                        <p className="text-sm text-muted-foreground">Профиль мастера</p>
                      </div>
                    </button>

                    {business ? (
                      <button
                        onClick={() => navigate(`/business/${business.id}`)}
                        className="w-full flex items-start gap-3 rounded-xl border border-border/50 p-3 text-left hover:border-primary/40 transition-colors"
                      >
                        <Building2 className="w-4 h-4 mt-1 text-primary shrink-0" />
                        <div>
                          <p className="font-medium">{business.name}</p>
                          <p className="text-sm text-muted-foreground">Организация</p>
                        </div>
                      </button>
                    ) : null}

                    {serviceLocation ? (
                      <div className="flex items-start gap-3 rounded-xl border border-border/50 p-3">
                        <MapPin className="w-4 h-4 mt-1 text-primary shrink-0" />
                        <div>
                          <p className="font-medium">Адрес</p>
                          <p className="text-sm text-muted-foreground">{serviceLocation}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => navigate(`/master/${service.master_id}?book=${service.id}`)}>
                      Записаться
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleShare}>Поделиться</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            await navigator.clipboard.writeText(serviceUrl);
                            toast({ title: "Ссылка скопирована" });
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Скопировать ссылку
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(serviceUrl, "_blank")}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Открыть в новой вкладке
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ServiceDetail;
