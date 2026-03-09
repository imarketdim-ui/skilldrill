import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Star, MapPin, ArrowLeft, Users, Clock, MessageSquare, Heart, Share2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const BusinessDetail = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [masters, setMasters] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bookingService, setBookingService] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '', comment: '' });
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (!bookingService) return;
    
    const fetchProfile = async () => {
      let initialName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ').trim();
      let initialPhone = user?.phone || user?.user_metadata?.phone || '';
      
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          if (data.first_name || data.last_name) {
            initialName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
          }
          if (data.phone) {
            initialPhone = data.phone;
          }
        }
      }
      
      setBookingData(prev => ({
        ...prev,
        name: prev.name || initialName,
        phone: prev.phone || initialPhone,
        date: prev.date || new Date().toISOString().slice(0, 10),
      }));
    };
    
    fetchProfile();
  }, [bookingService, user]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!businessId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: biz } = await supabase.from('business_locations')
        .select('*').eq('id', businessId).maybeSingle();
      setBusiness(biz);
      if (!biz) { setLoading(false); return; }

      const [mastersRes, svcRes] = await Promise.all([
        supabase.from('business_masters').select('master_id, profiles!business_masters_master_id_fkey(id, first_name, last_name, avatar_url)').eq('business_id', biz.id).eq('status', 'accepted'),
        supabase.from('services').select('*, profiles!services_master_id_fkey(first_name, last_name)').eq('organization_id', biz.id).eq('is_active', true),
      ]);
      setMasters((mastersRes.data || []).map((m: any) => m.profiles).filter(Boolean));
      setServices(svcRes.data || []);

      if (user) {
        const { data: fav } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('target_id', biz.id).eq('favorite_type', 'business').maybeSingle();
        setIsFavorite(!!fav);
      }
      setLoading(false);
    };
    fetch();
  }, [businessId, user]);

  useEffect(() => {
    if (!mapOpen || !mapRef.current || !business?.latitude || !business?.longitude) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [business.longitude, business.latitude],
      zoom: 15,
    });
    new maplibregl.Marker({ color: '#4F46E5' }).setLngLat([business.longitude, business.latitude]).addTo(map);
    return () => map.remove();
  }, [mapOpen, business]);

  const toggleFavorite = async () => {
    if (!user || !business) { toast({ title: 'Войдите, чтобы добавить в избранное' }); return; }
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('target_id', business.id).eq('favorite_type', 'business');
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, target_id: business.id, favorite_type: 'business' });
      setIsFavorite(true);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `${business?.name} на SkillSpot`;
    const links: Record<string, string> = {
      vk: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    };
    if (platform === 'copy') { navigator.clipboard.writeText(url); toast({ title: 'Ссылка скопирована' }); }
    else window.open(links[platform], '_blank');
  };

  const handleBook = () => {
    toast({ title: 'Заявка отправлена!', description: 'Организация свяжется с вами для подтверждения.' });
    setBookingService(null);
    setBookingData({ name: '', phone: '', date: '', time: '', comment: '' });
  };

  if (loading) return <div className="min-h-screen"><Header /><main className="pt-24 pb-16 text-center"><p className="text-muted-foreground">Загрузка...</p></main><Footer /></div>;
  if (!business) return <div className="min-h-screen"><Header /><main className="pt-24 pb-16 text-center"><p>Организация не найдена</p></main><Footer /></div>;

  const allPhotos = [...(business.interior_photos || []), ...(business.work_photos || []), ...(business.exterior_photos || [])];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-5xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Поиск услуг</Link>
            <span>/</span>
            <span className="text-foreground">{business.name}</span>
          </div>

          {/* Gallery */}
          {allPhotos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8 rounded-xl overflow-hidden">
              <div className="md:col-span-2 h-64 md:h-80">
                <img src={allPhotos[0]} alt={business.name} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => setSelectedPhoto(allPhotos[0])} />
              </div>
              <div className="grid grid-rows-2 gap-2 h-64 md:h-80">
                {allPhotos.slice(1, 3).map((img: string, i: number) => (
                  <img key={i} src={img} alt="" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => setSelectedPhoto(img)} />
                ))}
                {allPhotos.length < 3 && <div className="bg-muted rounded flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground" /></div>}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {business.address && (
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => business.latitude ? setMapOpen(true) : null}>
                        <MapPin className="w-4 h-4" />{business.address}
                      </button>
                    )}
                    <div className="flex items-center gap-1"><Users className="w-4 h-4" />{masters.length} мастеров</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={toggleFavorite} className={isFavorite ? 'text-destructive' : ''}>
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShare('vk')}>ВКонтакте</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('telegram')}>Telegram</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('whatsapp')}>WhatsApp</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')}>Скопировать ссылку</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {business.description && <p className="text-muted-foreground mb-6">{business.description}</p>}

              {business.hashtags && business.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {business.hashtags.map((tag: string) => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                </div>
              )}

              <Tabs defaultValue="services">
                <TabsList className="mb-6">
                  <TabsTrigger value="services">Услуги ({services.length})</TabsTrigger>
                  <TabsTrigger value="masters">Мастера ({masters.length})</TabsTrigger>
                  <TabsTrigger value="info">О нас</TabsTrigger>
                </TabsList>

                <TabsContent value="services">
                  <div className="grid gap-4">
                    {services.map((service: any) => (
                      <Card key={service.id}>
                        <CardContent className="flex flex-col md:flex-row gap-4 p-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                            {service.description && <p className="text-sm text-muted-foreground mb-1">{service.description}</p>}
                            {service.profiles && (
                              <p className="text-xs text-primary cursor-pointer" onClick={() => navigate(`/master/${service.master_id}`)}>
                                Мастер: {(service.profiles as any)?.first_name} {(service.profiles as any)?.last_name}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{service.duration_minutes} мин</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between">
                            <p className="text-2xl font-bold">{Number(service.price).toLocaleString()} ₽</p>
                            <Dialog open={bookingService === service.id} onOpenChange={open => setBookingService(open ? service.id : null)}>
                              <DialogTrigger asChild><Button>Записаться</Button></DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Запись на «{service.name}»</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <p className="text-sm text-muted-foreground">{Number(service.price).toLocaleString()} ₽ · {service.duration_minutes} мин</p>
                                  <Input placeholder="Ваше имя" /><Input type="tel" placeholder="Телефон" />
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><label className="text-sm font-medium">Дата</label><Input type="date" /></div>
                                    <div className="space-y-1"><label className="text-sm font-medium">Время</label><Input type="time" /></div>
                                  </div>
                                  <Textarea placeholder="Комментарий (необязательно)" />
                                  <Button onClick={handleBook} className="w-full">Подтвердить запись</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {services.length === 0 && <div className="text-center py-12 text-muted-foreground"><p>Пока нет услуг</p></div>}
                  </div>
                </TabsContent>

                <TabsContent value="masters">
                  <div className="grid gap-4 md:grid-cols-2">
                    {masters.map((m: any) => (
                      <Card key={m.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/master/${m.id}`)}>
                        <CardContent className="flex items-center gap-4 p-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={m.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary">{(m.first_name || '?')[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">{m.first_name} {m.last_name}</h3>
                          </div>
                          <Button variant="outline" size="sm">Профиль</Button>
                        </CardContent>
                      </Card>
                    ))}
                    {masters.length === 0 && <div className="text-center py-12 text-muted-foreground col-span-2"><p>Пока нет мастеров</p></div>}
                  </div>
                </TabsContent>

                <TabsContent value="info">
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      {business.address && <div><h3 className="font-semibold mb-1">Адрес</h3><p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-4 h-4" />{business.address}</p></div>}
                      {business.description && <div><h3 className="font-semibold mb-1">О нас</h3><p className="text-muted-foreground">{business.description}</p></div>}
                      {business.contact_phone && <div><h3 className="font-semibold mb-1">Телефон</h3><p className="text-muted-foreground">{business.contact_phone}</p></div>}
                      {business.contact_email && <div><h3 className="font-semibold mb-1">Email</h3><p className="text-muted-foreground">{business.contact_email}</p></div>}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="lg:w-80 shrink-0">
              <div className="lg:sticky lg:top-24 space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    {business.contact_phone && <p className="text-sm"><span className="font-medium">Телефон:</span> {business.contact_phone}</p>}
                    {business.contact_email && <p className="text-sm"><span className="font-medium">Email:</span> {business.contact_email}</p>}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Расположение</DialogTitle></DialogHeader>
          <div ref={mapRef} className="w-full h-80 rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDetail;
