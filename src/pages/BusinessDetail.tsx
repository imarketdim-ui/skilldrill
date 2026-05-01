import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getPublicSiteUrl, removeStructuredData, updatePageMeta, updateStructuredData } from '@/lib/seoUtils';
import { Star, MapPin, Users, Clock, MessageSquare, Heart, Share2, Camera, Sparkles, Images, BadgeCheck, ScissorsSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isSelfInteraction, syncBidirectionalContacts } from '@/lib/contactSync';
import Header from '@/components/landing/Header';
import AvailableSlotPicker from '@/components/marketplace/AvailableSlotPicker';
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
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '', comment: '', selected_master_id: '' });
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
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
        supabase.from('services').select('*, profiles!services_master_id_fkey(first_name, last_name)').or(`business_id.eq.${biz.id},organization_id.eq.${biz.id}`).eq('is_active', true),
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

  const getAssignedMasterIds = (service: any) => {
    const assignedFromTechCard = Array.isArray(service?.tech_card?.assigned_master_ids)
      ? service.tech_card.assigned_master_ids.filter(Boolean)
      : [];

    if (assignedFromTechCard.length > 0) return assignedFromTechCard;
    return service?.master_id ? [service.master_id] : [];
  };

  const getAssignedMasters = (service: any) => {
    const assignedIds = getAssignedMasterIds(service);
    return masters.filter((master: any) => assignedIds.includes(master.id));
  };

  const getSelectedMasterId = (service: any) => {
    const assignedIds = getAssignedMasterIds(service);
    if (bookingData.selected_master_id && assignedIds.includes(bookingData.selected_master_id)) {
      return bookingData.selected_master_id;
    }
    return assignedIds.length === 1 ? assignedIds[0] : '';
  };

  // Dynamic SEO meta tags
  useEffect(() => {
    if (!business) return;
    const topService = services[0];
    const priceStr = topService ? `от ${topService.price} ₽` : '';
    const url = getPublicSiteUrl(`/business/${business.id}`);
    updatePageMeta({
      title: `${business.name}${business.city ? ` в ${business.city}` : ''} — SkillSpot`,
      description: `${business.description || business.name}${topService ? `. ${topService.name} ${priceStr}` : ''}. Онлайн-запись.`,
      url,
      canonicalUrl: url,
      type: 'website',
    });

    updateStructuredData('business-detail', {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: business.name,
      description: business.description || undefined,
      image: business.interior_photos?.[0] || business.exterior_photos?.[0] || undefined,
      address: business.address || undefined,
      telephone: business.contact_phone || undefined,
      email: business.contact_email || undefined,
      url,
    });

    return () => removeStructuredData('business-detail');
  }, [business, services]);

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
      await syncBidirectionalContacts(user.id, business.owner_id);
      setIsFavorite(true);
    }
  };

  const handleMessage = async () => {
    if (!user || !business) {
      toast({ title: 'Нужно войти в аккаунт', variant: 'destructive' });
      return;
    }
    if (isSelfInteraction(user.id, business.owner_id)) {
      toast({ title: 'Нельзя писать самому себе', variant: 'destructive' });
      return;
    }
    if (!messageText.trim()) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        recipient_id: business.owner_id,
        message: messageText.trim(),
        chat_type: 'direct',
        cabinet_type_scope: 'business',
      });

      if (error) throw error;

      await syncBidirectionalContacts(user.id, business.owner_id);
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: [business.owner_id],
          title: 'Новое сообщение',
          body: messageText.trim().slice(0, 120),
          url: `/dashboard?section=messages&tab=chats&contact=${user.id}`,
          tag: 'business-direct-chat',
        },
      }).catch(() => null);

      toast({ title: 'Сообщение отправлено' });
      setMessageText('');
      setMessageOpen(false);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось отправить сообщение', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
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

  const handleBook = async () => {
    if (!user || !business || !bookingService) {
      toast({ title: 'Нужно войти в аккаунт', description: 'Авторизуйтесь, чтобы отправить заявку', variant: 'destructive' });
      return;
    }
    if (isSelfInteraction(user.id, business.owner_id)) {
      toast({ title: 'Нельзя записаться в свою организацию как клиент', variant: 'destructive' });
      return;
    }

    const service = services.find((item: any) => item.id === bookingService);
    const assignedMasterIds = service ? getAssignedMasterIds(service) : [];
    const selectedMasterId = service ? getSelectedMasterId(service) : '';
    const selectedMaster = masters.find((master: any) => master.id === selectedMasterId);

    if (!service || !bookingData.date || !bookingData.time) {
      toast({ title: 'Заполните дату и время', description: 'Выберите слот, чтобы отправить заявку в организацию.', variant: 'destructive' });
      return;
    }
    if (assignedMasterIds.length > 1 && !selectedMasterId) {
      toast({ title: 'Выберите мастера', description: 'Для этой услуги в организации работают несколько мастеров.', variant: 'destructive' });
      return;
    }

    try {
      const requestMessage = [
        `Запрос на запись в организацию: ${service.name}.`,
        selectedMaster ? `Выбранный мастер: ${selectedMaster.first_name} ${selectedMaster.last_name}.` : '',
        `Дата: ${bookingData.date}, время: ${bookingData.time}.`,
        bookingData.comment ? `Комментарий клиента: ${bookingData.comment}` : '',
      ].filter(Boolean).join(' ');

      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        recipient_id: business.owner_id,
        message: requestMessage,
        chat_type: 'direct',
        cabinet_type_scope: 'business',
      });

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: business.owner_id,
        type: 'manual_booking_request',
        title: 'Запрос на запись',
        message: `${bookingData.name || 'Клиент'} просит запись на «${service.name}» ${bookingData.date} в ${bookingData.time}.`,
      });

      await syncBidirectionalContacts(user.id, business.owner_id);
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: [business.owner_id],
          title: 'Запрос на запись',
          body: `${bookingData.name || 'Клиент'} просит запись на ${service.name}`,
          url: `/dashboard?section=messages&tab=chats&contact=${user.id}`,
          tag: 'business-booking-request',
        },
      }).catch(() => null);

      toast({ title: 'Заявка отправлена', description: 'Организация получит сообщение и сможет согласовать запись вручную.' });
      setBookingService(null);
      setBookingData({ name: '', phone: '', date: '', time: '', comment: '', selected_master_id: '' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось отправить заявку', variant: 'destructive' });
    }
  };

  if (loading) return <div className="min-h-screen"><Header /><main className="pt-24 pb-16 text-center"><p className="text-muted-foreground">Загрузка...</p></main><Footer /></div>;
  if (!business) return <div className="min-h-screen"><Header /><main className="pt-24 pb-16 text-center"><p>Организация не найдена</p></main><Footer /></div>;

  const allPhotos = [...(business.interior_photos || []), ...(business.work_photos || []), ...(business.exterior_photos || [])];
  const heroPhoto = allPhotos[0] || '';
  const feedItems = [
    ...(allPhotos.length ? [{
      id: 'photos',
      title: 'Новые фото пространства и работ',
      description: 'Свежие кадры из организации, интерьера и примеры оказанных услуг.',
      photos: allPhotos.slice(0, 4),
      icon: Images,
      accent: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    }] : []),
    ...(services.length ? [{
      id: 'services',
      title: 'Подборка актуальных услуг',
      description: services.slice(0, 3).map((service: any) => `${service.name} · ${Number(service.price).toLocaleString()} ₽`).join(' • '),
      photos: services.flatMap((service: any) => Array.isArray(service.work_photos) ? service.work_photos.slice(0, 1) : []).slice(0, 3),
      icon: ScissorsSquare,
      accent: 'bg-blue-50 text-blue-900 border-blue-200',
    }] : []),
    ...(masters.length ? [{
      id: 'team',
      title: 'Команда организации',
      description: `Сейчас в команде ${masters.length} ${masters.length === 1 ? 'мастер' : masters.length < 5 ? 'мастера' : 'мастеров'}. Клиент может выбрать подходящего специалиста при записи.`,
      photos: masters.map((master: any) => master.avatar_url).filter(Boolean).slice(0, 4),
      icon: BadgeCheck,
      accent: 'bg-primary/10 text-primary border-primary/20',
    }] : []),
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-5xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/catalog" className="hover:text-foreground transition-colors">Каталог услуг</Link>
            <span>/</span>
            <span className="text-foreground">{business.name}</span>
          </div>

          <div className="mb-8 overflow-hidden rounded-[28px] border bg-card shadow-sm">
            <div className="relative h-64 overflow-hidden md:h-80">
              {heroPhoto ? (
                <img src={heroPhoto} alt={business.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/15 via-emerald-100 to-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
              <div className="absolute right-6 top-6 flex gap-2">
                <Button variant="secondary" size="icon" onClick={toggleFavorite} className={isFavorite ? 'text-destructive' : ''}>
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="secondary" size="icon"><Share2 className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShare('vk')}>ВКонтакте</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('telegram')}>Telegram</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('whatsapp')}>WhatsApp</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('copy')}>Скопировать ссылку</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="relative px-6 pb-6">
              <div className="-mt-14 flex flex-col gap-5 md:flex-row md:items-end">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-background bg-primary/10 text-3xl font-bold text-primary shadow-lg">
                  {(business.name || '?')[0]}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{business.name}</h1>
                    <Badge variant="secondary">Организация</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <div className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{masters.length} мастеров</div>
                    <div className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{services.length} услуг</div>
                    <div className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{allPhotos.length} фото</div>
                    {business.address && (
                      <button className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => business.latitude ? setMapOpen(true) : null}>
                        <MapPin className="h-4 w-4" />{business.address}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {services[0] && <Button onClick={() => setBookingService(services[0].id)}>Записаться</Button>}
                  <Button variant="outline" onClick={() => setMessageOpen(true)}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Написать организации
                  </Button>
                </div>
              </div>

              {business.description && <p className="mt-5 max-w-3xl text-muted-foreground">{business.description}</p>}

              {business.hashtags && business.hashtags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {business.hashtags.map((tag: string) => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <Tabs defaultValue="feed">
                <TabsList className="mb-6">
                  <TabsTrigger value="feed">Лента</TabsTrigger>
                  <TabsTrigger value="services">Услуги ({services.length})</TabsTrigger>
                  <TabsTrigger value="masters">Мастера ({masters.length})</TabsTrigger>
                  <TabsTrigger value="info">О нас</TabsTrigger>
                </TabsList>

                <TabsContent value="feed">
                  <div className="space-y-4">
                    {feedItems.length > 0 ? feedItems.map((item: any) => {
                      const Icon = item.icon;
                      return (
                        <Card key={item.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex items-center gap-3 border-b px-5 py-4">
                              <div className={`rounded-full border p-2 ${item.accent}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold">{item.title}</p>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              </div>
                            </div>
                            {item.photos.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4">
                                {item.photos.map((img: string, index: number) => (
                                  <img
                                    key={`${item.id}-${index}`}
                                    src={img}
                                    alt=""
                                    className="h-36 w-full rounded-xl object-cover cursor-pointer hover:scale-[1.01] transition-transform"
                                    onClick={() => setSelectedPhoto(img)}
                                  />
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }) : (
                      <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                          Лента пока пустая. Здесь будут появляться новые фото, мастера и услуги организации.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="services">
                  <div className="grid gap-4">
                    {services.map((service: any) => (
                      <Card key={service.id}>
                        <CardContent className="flex flex-col md:flex-row gap-4 p-4">
                          {(() => {
                            const assignedMasters = getAssignedMasters(service);
                            const hasMultipleMasters = assignedMasters.length > 1;
                            return (
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                            {service.description && <p className="text-sm text-muted-foreground mb-1">{service.description}</p>}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/service/${service.id}`);
                              }}
                              className="text-xs text-primary hover:underline mb-1"
                            >
                              Открыть страницу услуги
                            </button>
                            {hasMultipleMasters ? (
                              <p className="text-xs text-muted-foreground">
                                Доступно у {assignedMasters.length} мастеров. Выбор мастера будет доступен при записи.
                              </p>
                            ) : service.profiles ? (
                              <p className="text-xs text-primary cursor-pointer" onClick={() => navigate(`/master/${service.master_id}`)}>
                                Мастер: {(service.profiles as any)?.first_name} {(service.profiles as any)?.last_name}
                              </p>
                            ) : null}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{service.duration_minutes} мин</span>
                            </div>
                          </div>
                            );
                          })()}
                          <div className="flex flex-col items-end justify-between">
                            <p className="text-2xl font-bold">{Number(service.price).toLocaleString()} ₽</p>
                            <Dialog
                              open={bookingService === service.id}
                              onOpenChange={open => {
                                if (open) {
                                  const assignedMasterIds = getAssignedMasterIds(service);
                                  setBookingService(service.id);
                                  setBookingData(prev => ({
                                    ...prev,
                                    time: '',
                                    comment: '',
                                    selected_master_id: assignedMasterIds.length === 1 ? assignedMasterIds[0] : '',
                                  }));
                                } else {
                                  setBookingService(null);
                                  setBookingData(prev => ({ ...prev, time: '', comment: '', selected_master_id: '' }));
                                }
                              }}
                            >
                              <DialogTrigger asChild><Button>Записаться</Button></DialogTrigger>
                              <DialogContent className="max-h-[85vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Запись на «{service.name}»</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  {(() => {
                                    const assignedMasters = getAssignedMasters(service);
                                    const selectedMasterId = getSelectedMasterId(service);
                                    return (
                                      <>
                                  <p className="text-sm text-muted-foreground">{Number(service.price).toLocaleString()} ₽ · {service.duration_minutes} мин</p>
                                  <Input placeholder="Ваше имя" value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                                  <Input type="tel" placeholder="Телефон" value={bookingData.phone} onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
                                  {assignedMasters.length > 1 && (
                                    <div className="space-y-1">
                                      <label className="text-sm font-medium">Мастер</label>
                                      <Select
                                        value={selectedMasterId}
                                        onValueChange={(value) => setBookingData({ ...bookingData, selected_master_id: value, time: '' })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Выберите мастера" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {assignedMasters.map((master: any) => (
                                            <SelectItem key={master.id} value={master.id}>
                                              {master.first_name} {master.last_name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <label className="text-sm font-medium">Дата</label>
                                    <Input type="date" min={new Date().toISOString().slice(0, 10)} value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value, time: ''})} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-sm font-medium">Доступное время</label>
                                    {bookingData.date && selectedMasterId ? (
                                      <AvailableSlotPicker
                                        masterId={selectedMasterId}
                                        date={bookingData.date}
                                        durationMinutes={Number(service.duration_minutes) || 60}
                                        selected={bookingData.time}
                                        onSelect={(t) => setBookingData({ ...bookingData, time: t })}
                                        onJumpToDate={(d) => setBookingData({ ...bookingData, date: d, time: '' })}
                                      />
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        {assignedMasters.length > 1 ? 'Сначала выберите мастера и дату' : 'Выберите дату'}
                                      </p>
                                    )}
                                  </div>
                                  <Textarea placeholder="Комментарий (необязательно)" value={bookingData.comment} onChange={e => setBookingData({...bookingData, comment: e.target.value})} />
                                  <div className="flex gap-2 pt-2">
                                    <Button
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => { setBookingService(null); setBookingData({ name: '', phone: '', date: '', time: '', comment: '', selected_master_id: '' }); }}
                                    >
                                      Отменить
                                    </Button>
                                    <Button onClick={handleBook} className="flex-1">Подтвердить запись</Button>
                                  </div>
                                      </>
                                    );
                                  })()}
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
                <Card className="overflow-hidden border-primary/15 shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Быстрая запись</p>
                      <p className="mt-1 text-lg font-semibold">Выберите услугу и мастера</p>
                    </div>
                    {services[0] ? (
                      <Button className="w-full" onClick={() => setBookingService(services[0].id)}>
                        Записаться в организацию
                      </Button>
                    ) : (
                      <Button className="w-full" disabled>
                        Услуги скоро появятся
                      </Button>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    {business.contact_phone && <p className="text-sm"><span className="font-medium">Телефон:</span> {business.contact_phone}</p>}
                    {business.contact_email && <p className="text-sm"><span className="font-medium">Email:</span> {business.contact_email}</p>}
                    <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full"><MessageSquare className="h-4 w-4 mr-2" /> Написать организации</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Написать {business.name}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <Textarea placeholder="Сообщение..." value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={4} />
                          <Button onClick={handleMessage} className="w-full" disabled={sendingMessage || !messageText.trim()}>
                            {sendingMessage ? 'Отправка...' : 'Отправить'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
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
