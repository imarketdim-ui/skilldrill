import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowLeft, MessageSquare, Camera, Heart, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MasterData {
  id: string;
  user_id: string;
  address: string | null;
  description: string | null;
  hashtags: string[] | null;
  latitude: number | null;
  longitude: number | null;
  work_photos: string[] | null;
  interior_photos: string[] | null;
  certificate_photos: string[] | null;
  category_id: string | null;
  profiles: { first_name: string | null; last_name: string | null; avatar_url: string | null; email: string | null } | null;
  service_categories: { name: string } | null;
}

const MasterDetail = () => {
  const { masterId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [master, setMaster] = useState<MasterData | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bookingService, setBookingService] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!masterId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: mp } = await supabase
        .from('master_profiles')
        .select('*, profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url, email), service_categories(name)')
        .eq('id', masterId)
        .maybeSingle();

      if (!mp) {
        // Try by user_id
        const { data: mp2 } = await supabase
          .from('master_profiles')
          .select('*, profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url, email), service_categories(name)')
          .eq('user_id', masterId)
          .maybeSingle();
        setMaster(mp2 as any);
        if (mp2) {
          const [svcRes, ratRes] = await Promise.all([
            supabase.from('services').select('*').eq('master_id', mp2.user_id).eq('is_active', true),
            supabase.from('ratings').select('*, profiles!ratings_rater_id_fkey(first_name, last_name)').eq('rated_id', mp2.user_id).order('created_at', { ascending: false }).limit(20),
          ]);
          setServices(svcRes.data || []);
          setRatings(ratRes.data || []);
          if (user) {
            const { data: fav } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('target_id', mp2.user_id).eq('favorite_type', 'master').maybeSingle();
            setIsFavorite(!!fav);
          }
        }
      } else {
        setMaster(mp as any);
        const [svcRes, ratRes] = await Promise.all([
          supabase.from('services').select('*').eq('master_id', mp.user_id).eq('is_active', true),
          supabase.from('ratings').select('*, profiles!ratings_rater_id_fkey(first_name, last_name)').eq('rated_id', mp.user_id).order('created_at', { ascending: false }).limit(20),
        ]);
        setServices(svcRes.data || []);
        setRatings(ratRes.data || []);
        if (user) {
          const { data: fav } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('target_id', mp.user_id).eq('favorite_type', 'master').maybeSingle();
          setIsFavorite(!!fav);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [masterId, user]);

  // Map dialog
  useEffect(() => {
    if (!mapOpen || !mapRef.current || !master?.latitude || !master?.longitude) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [master.longitude, master.latitude],
      zoom: 15,
    });
    new maplibregl.Marker({ color: '#4F46E5' }).setLngLat([master.longitude, master.latitude]).addTo(map);
    return () => map.remove();
  }, [mapOpen, master]);

  const toggleFavorite = async () => {
    if (!user || !master) { toast({ title: 'Войдите, чтобы добавить в избранное' }); return; }
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('target_id', master.user_id).eq('favorite_type', 'master');
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, target_id: master.user_id, favorite_type: 'master' });
      setIsFavorite(true);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const name = `${master?.profiles?.first_name || ''} ${master?.profiles?.last_name || ''}`.trim();
    const text = `${name} — ${master?.service_categories?.name || 'мастер'} на SkillSpot`;
    const links: Record<string, string> = {
      vk: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    };
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast({ title: 'Ссылка скопирована' });
    } else {
      window.open(links[platform], '_blank');
    }
  };

  const handleBook = (serviceId: string) => {
    toast({ title: 'Заявка отправлена!', description: 'Мастер свяжется с вами для подтверждения записи.' });
    setBookingService(null);
  };

  const handleMessage = () => {
    toast({ title: 'Сообщение отправлено!', description: 'Мастер ответит вам в ближайшее время.' });
    setMessageOpen(false);
  };

  if (loading) return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 text-center"><p className="text-muted-foreground">Загрузка...</p></main>
      <Footer />
    </div>
  );

  if (!master) return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 text-center"><p>Мастер не найден</p></main>
      <Footer />
    </div>
  );

  const masterName = `${master.profiles?.first_name || ''} ${master.profiles?.last_name || ''}`.trim() || 'Мастер';
  const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length) : 0;
  const allPhotos = [...(master.work_photos || []), ...(master.interior_photos || [])];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-5xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/catalog" className="hover:text-foreground transition-colors">Каталог</Link>
            <span>/</span>
            {master.service_categories && (
              <>
                <Link to={`/catalog?category=${master.category_id}`} className="hover:text-foreground transition-colors">{master.service_categories.name}</Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground">{masterName}</span>
          </div>

          {/* Image Gallery */}
          {allPhotos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8 rounded-xl overflow-hidden">
              <div className="md:col-span-2 h-64 md:h-80">
                <img
                  src={allPhotos[0]}
                  alt={masterName}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                  onClick={() => setSelectedPhoto(allPhotos[0])}
                />
              </div>
              <div className="grid grid-rows-2 gap-2 h-64 md:h-80">
                {allPhotos.slice(1, 3).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => setSelectedPhoto(img)}
                  />
                ))}
                {allPhotos.length <= 1 && <div className="bg-muted rounded flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground" /></div>}
                {allPhotos.length <= 2 && allPhotos.length > 1 && <div className="bg-muted rounded flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground" /></div>}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Profile Header */}
              <div className="flex items-start gap-4 mb-6">
                {master.profiles?.avatar_url ? (
                  <img src={master.profiles.avatar_url} alt={masterName} className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {(master.profiles?.first_name || '?')[0]}
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">{masterName}</h1>
                  {master.service_categories && <Badge variant="secondary" className="mt-1">{master.service_categories.name}</Badge>}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    {ratings.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-accent fill-accent" />
                        {avgRating.toFixed(1)} ({ratings.length} отзывов)
                      </div>
                    )}
                    {master.address && (
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => master.latitude ? setMapOpen(true) : null}
                      >
                        <MapPin className="w-4 h-4" />{master.address}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={toggleFavorite} className={isFavorite ? 'text-destructive' : ''}>
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShare('vk')}>ВКонтакте</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('telegram')}>Telegram</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('whatsapp')}>WhatsApp</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')}>Скопировать ссылку</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {master.description && <p className="text-muted-foreground mb-6">{master.description}</p>}

              {master.hashtags && master.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {master.hashtags.map(tag => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                </div>
              )}

              <Tabs defaultValue="services">
                <TabsList className="mb-6">
                  <TabsTrigger value="services">Услуги ({services.length})</TabsTrigger>
                  <TabsTrigger value="reviews">Отзывы ({ratings.length})</TabsTrigger>
                  <TabsTrigger value="portfolio">Работы</TabsTrigger>
                </TabsList>

                <TabsContent value="services">
                  <div className="grid gap-4">
                    {services.map(service => (
                      <Card key={service.id}>
                        <CardContent className="flex flex-col md:flex-row gap-4 p-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                            {service.description && <p className="text-sm text-muted-foreground mb-2">{service.description}</p>}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{service.duration_minutes} мин</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between">
                            <p className="text-2xl font-bold">{Number(service.price).toLocaleString()} ₽</p>
                            <Dialog open={bookingService === service.id} onOpenChange={open => setBookingService(open ? service.id : null)}>
                              <DialogTrigger asChild>
                                <Button>Записаться</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Запись на «{service.name}»</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <p className="text-sm text-muted-foreground">Мастер: {masterName}</p>
                                  <p className="text-sm text-muted-foreground">{Number(service.price).toLocaleString()} ₽ · {service.duration_minutes} мин</p>
                                  <Input type="text" placeholder="Ваше имя" />
                                  <Input type="tel" placeholder="Телефон" />
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><label className="text-sm font-medium">Дата</label><Input type="date" /></div>
                                    <div className="space-y-1"><label className="text-sm font-medium">Время</label><Input type="time" /></div>
                                  </div>
                                  <Textarea placeholder="Комментарий (необязательно)" />
                                  <Button onClick={() => handleBook(service.id)} className="w-full">Подтвердить запись</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {services.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>Мастер пока не добавил услуги</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="reviews">
                  <div className="space-y-4">
                    {ratings.map(review => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {(review.profiles as any)?.first_name || ''} {(review.profiles as any)?.last_name || 'Пользователь'}
                            </span>
                            <span className="text-sm text-muted-foreground">{new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.score ? 'text-accent fill-accent' : 'text-muted'}`} />
                            ))}
                          </div>
                          {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                        </CardContent>
                      </Card>
                    ))}
                    {ratings.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground"><p>Пока нет отзывов</p></div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="portfolio">
                  {allPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {allPhotos.map((img, i) => (
                        <img key={i} src={img} alt={`Работа ${i + 1}`} className="w-full h-48 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedPhoto(img)} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Мастер пока не добавил работы в портфолио</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sticky Sidebar */}
            <div className="lg:w-80 shrink-0">
              <div className="lg:sticky lg:top-24 space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full"><MessageSquare className="h-4 w-4 mr-2" /> Написать</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Написать {masterName}</DialogTitle></DialogHeader>
                        <Textarea placeholder="Ваше сообщение..." className="min-h-[100px]" />
                        <Button onClick={handleMessage} className="w-full">Отправить</Button>
                      </DialogContent>
                    </Dialog>
                    {master.address && (
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Адрес</p>
                        <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{master.address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      {/* Map Dialog */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Расположение</DialogTitle></DialogHeader>
          <div ref={mapRef} className="w-full h-80 rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterDetail;
