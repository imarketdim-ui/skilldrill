import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowLeft, MessageSquare, Camera, Heart, Share2, ExternalLink, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import ServiceDetailDialog from '@/components/marketplace/ServiceDetailDialog';
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
  work_days: number[] | null;
  work_hours_config: any;
  break_config: any;
  auto_booking_policy: string | null;
  profiles: { first_name: string | null; last_name: string | null; avatar_url: string | null; email: string | null } | null;
  service_categories: { name: string } | null;
}

const REMINDER_OPTIONS = [
  { value: '0', label: 'Не напоминать' },
  { value: '15', label: 'За 15 минут' },
  { value: '30', label: 'За 30 минут' },
  { value: '60', label: 'За 1 час' },
  { value: '180', label: 'За 3 часа' },
  { value: '1440', label: 'За сутки' },
];

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
  const [messageText, setMessageText] = useState('');
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '', comment: '', reminder: '60' });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingBooking, setSendingBooking] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!masterId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: mp } = await supabase
        .from('master_profiles')
        .select('*, profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url, email), service_categories(name)')
        .eq('id', masterId as string)
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

  useEffect(() => {
    if (!bookingService) return;
    const initialName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ').trim();
    setBookingData(prev => ({
      ...prev,
      name: prev.name || initialName,
      phone: prev.phone || '',
      date: prev.date || new Date().toISOString().slice(0, 10),
    }));
  }, [bookingService, user]);

  useEffect(() => {
    if (bookingService && bookingData.date) {
      loadAvailableSlots(bookingService, bookingData.date);
    }
  }, [bookingService, bookingData.date, services, master]);

  // Map dialog - use setTimeout to ensure dialog DOM is ready
  useEffect(() => {
    if (!mapOpen || !master?.latitude || !master?.longitude) return;
    let map: maplibregl.Map | null = null;
    const timeout = setTimeout(() => {
      if (!mapRef.current) return;
      map = new maplibregl.Map({
        container: mapRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [master.longitude!, master.latitude!],
        zoom: 15,
      });
      map.on('load', () => {
        new maplibregl.Marker({ color: '#4F46E5' }).setLngLat([master.longitude!, master.latitude!]).addTo(map!);
      });
    }, 100);
    return () => { clearTimeout(timeout); map?.remove(); };
  }, [mapOpen, master]);

  const toggleFavorite = async () => {
    if (!user || !master) { toast({ title: 'Войдите, чтобы добавить в избранное', variant: 'destructive' }); navigate('/auth'); return; }
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
    const cover = services.find(s => Array.isArray(s.work_photos) && s.work_photos.length > 0)?.work_photos?.[0] || allPhotos[0] || '';
    const teaser = services[0]?.description || master?.description || 'Проверенный специалист на SkillSpot';
    const text = `Я нашёл(а) специалиста: ${name}. ${teaser}${cover ? ` Фото: ${cover}` : ''} ${url}`;
    const links: Record<string, string> = {
      vk: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    };
    if (platform === 'copy') {
      navigator.clipboard.writeText(text);
      toast({ title: 'Текст для шаринга скопирован' });
    } else {
      window.open(links[platform], '_blank');
    }
  };

  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const toTime = (minutes: number) => `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;

  const loadAvailableSlots = async (serviceId: string, date: string) => {
    if (!master || !date) return setAvailableSlots([]);
    const selectedService = services.find(s => s.id === serviceId);
    if (!selectedService) return setAvailableSlots([]);

    // Check if this day is a work day
    const dateObj = new Date(date);
    const jsDay = dateObj.getDay(); // 0=Sun, 1=Mon..6=Sat
    const masterWorkDays = master.work_days || [1, 2, 3, 4, 5];
    if (!masterWorkDays.includes(jsDay)) return setAvailableSlots([]);

    // Get work hours for this day
    const whc = master.work_hours_config as any;
    let dayStart = toMinutes('09:00');
    let dayEnd = toMinutes('18:00');
    if (whc) {
      if (whc.perDay && whc.perDay[String(jsDay)]) {
        dayStart = toMinutes(whc.perDay[String(jsDay)].start);
        dayEnd = toMinutes(whc.perDay[String(jsDay)].end);
      } else if (whc.default) {
        dayStart = toMinutes(whc.default.start);
        dayEnd = toMinutes(whc.default.end);
      }
    }

    // Get breaks for this day
    const bc = master.break_config as any;
    const breakBlocks: { start: number; end: number }[] = [];
    if (bc) {
      const allBreaks = bc['all'] || [];
      const dayBreaks = bc[String(jsDay)] || [];
      [...allBreaks, ...dayBreaks].forEach((b: any) => {
        breakBlocks.push({ start: toMinutes(b.start), end: toMinutes(b.end) });
      });
    }

    const { data: dayLessons } = await supabase
      .from('lessons')
      .select('start_time, end_time')
      .eq('teacher_id', master.user_id)
      .eq('lesson_date', date)
      .neq('status', 'cancelled');

    const blocked = [
      ...(dayLessons || []).map((l: any) => ({
        start: toMinutes((l.start_time || '00:00').slice(0, 5)),
        end: toMinutes((l.end_time || '00:00').slice(0, 5)),
      })),
      ...breakBlocks,
    ];

    const bufferMin = (whc?.breakDuration) || 0;
    const duration = Number(selectedService.duration_minutes) || 60;
    const slotStep = Math.max(15, whc?.slotDuration || 30);
    const slots: string[] = [];

    // Filter out past slots for today
    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

    for (let t = dayStart; t + duration <= dayEnd; t += slotStep) {
      if (isToday && t < nowMinutes) continue;
      const overlap = blocked.some(b => t < (b.end + bufferMin) && (t + duration) > b.start);
      if (!overlap) slots.push(toTime(t));
    }

    setAvailableSlots(slots);
  };

  const handleBook = async (serviceId: string) => {
    if (!user || !master) {
      toast({ title: 'Нужно войти в аккаунт', description: 'Авторизуйтесь, чтобы записаться', variant: 'destructive' });
      return;
    }

    if (sendingBooking) return; // double-click guard

    const service = services.find(s => s.id === serviceId);
    if (!service || !bookingData.date || !bookingData.time) {
      toast({ title: 'Заполните дату и время', variant: 'destructive' });
      return;
    }

    if (!availableSlots.includes(bookingData.time)) {
      toast({ title: 'Слот недоступен', description: 'Выберите время из доступных слотов', variant: 'destructive' });
      return;
    }

    setSendingBooking(true);
    try {
      // Check blacklist
      const { data: blocked } = await supabase.from('blacklists').select('id')
        .eq('blocker_id', master.user_id).eq('blocked_id', user.id).maybeSingle();
      if (blocked) {
        toast({ title: 'Запись невозможна', description: 'Вы не можете записаться к этому мастеру', variant: 'destructive' });
        return;
      }

      const duration = Number(service.duration_minutes) || 60;
      const scheduledAt = `${bookingData.date}T${bookingData.time}:00`;

      // Determine booking status based on auto_booking_policy
      const policy = master.auto_booking_policy || 'all';
      let bookingStatus: 'confirmed' | 'pending' = 'pending';
      if (policy === 'all') {
        bookingStatus = 'confirmed';
      } else if (policy === 'known') {
        // Check if client has previous completed bookings with this master
        const { count: bookingCount } = await supabase.from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('executor_id', master.user_id)
          .eq('client_id', user.id)
          .in('status', ['confirmed', 'completed'] as any);
        const { count: lessonCount } = await supabase.from('lesson_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .in('status', ['confirmed', 'completed'] as any);
        if (((bookingCount || 0) + (lessonCount || 0)) > 0) bookingStatus = 'confirmed';
      }
      // policy === 'none' stays pending

      // Insert into bookings table (the correct marketplace table)
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          executor_id: master.user_id,
          service_id: service.id,
          organization_id: master.business_id || null,
          scheduled_at: scheduledAt,
          duration_minutes: duration,
          status: bookingStatus,
          notes: bookingData.comment || null,
        })
        .select('id')
        .single();

      if (bookingError) throw bookingError;

      // Send notification to master
      await supabase.from('notifications').insert({
        user_id: master.user_id,
        type: 'new_booking',
        title: 'Новая запись',
        message: `${user.user_metadata?.first_name || 'Клиент'} записался на «${service.name}» ${bookingData.date} в ${bookingData.time}`,
        related_id: newBooking.id,
      });

      // Create chat contact
      await supabase.from('chat_messages').insert({
        sender_id: user.id,
        recipient_id: master.user_id,
        message: `Новая запись: ${service.name} на ${bookingData.date} в ${bookingData.time}. ${bookingData.comment ? `Комментарий: ${bookingData.comment}` : ''}`,
        chat_type: 'direct',
      });

      if (bookingStatus === 'confirmed') {
        toast({ title: 'Запись подтверждена!', description: 'Вы записаны. Мастер получит уведомление.' });
      } else {
        toast({ title: 'Запись отправлена', description: 'Ожидаем подтверждения мастера. Вы получите уведомление.' });
      }

      setBookingService(null);
      setBookingData({ name: '', phone: '', date: '', time: '', comment: '', reminder: '60' });
      setAvailableSlots([]);
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setSendingBooking(false);
    }
  };

  const handleMessage = async () => {
    if (!user || !master) {
      toast({ title: 'Нужно войти в аккаунт', variant: 'destructive' });
      return;
    }
    if (!messageText.trim()) return;

    setSendingMessage(true);
    try {
      const { data: blocked } = await supabase
        .from('blacklists')
        .select('id')
        .eq('blocker_id', master.user_id)
        .eq('blocked_id', user.id)
        .maybeSingle();

      if (blocked) {
        toast({ title: 'Чат недоступен', description: 'Клиент заблокирован у мастера', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        recipient_id: master.user_id,
        message: messageText.trim(),
        chat_type: 'direct',
      });

      if (error) throw error;

      toast({ title: 'Сообщение отправлено' });
      setMessageText('');
      setMessageOpen(false);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
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
            <Link to="/catalog" className="hover:text-foreground transition-colors">Поиск услуг</Link>
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
                        onClick={() => {
                          if (master.latitude && master.longitude) {
                            setMapOpen(true);
                          } else if (master.address) {
                            window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(master.address)}`, '_blank');
                          }
                        }}
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
                      <Card key={service.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedServiceForDetail(service)}>
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
                                <Button onClick={(e) => e.stopPropagation()}>Записаться</Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[85vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Запись на «{service.name}»</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <p className="text-sm text-muted-foreground">Мастер: {masterName}</p>
                                  <p className="text-sm text-muted-foreground">{Number(service.price).toLocaleString()} ₽ · {service.duration_minutes} мин</p>
                                  <Input type="text" placeholder="Ваше имя" value={bookingData.name} onChange={(e) => setBookingData(p => ({ ...p, name: e.target.value }))} />
                                  <Input type="tel" placeholder="Телефон" value={bookingData.phone} onChange={(e) => setBookingData(p => ({ ...p, phone: e.target.value }))} />
                                  <div className="space-y-1">
                                    <label className="text-sm font-medium">Дата</label>
                                    <Input type="date" value={bookingData.date} onChange={(e) => setBookingData(p => ({ ...p, date: e.target.value, time: '' }))} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-sm font-medium">Доступные слоты</label>
                                    {availableSlots.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">Нет доступного времени на выбранную дату</p>
                                    ) : (
                                      <div className="grid grid-cols-4 gap-2">
                                        {availableSlots.map(slot => (
                                          <Button
                                            key={slot}
                                            type="button"
                                            size="sm"
                                            variant={bookingData.time === slot ? 'default' : 'outline'}
                                            onClick={() => setBookingData(p => ({ ...p, time: slot }))}
                                          >
                                            {slot}
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <Textarea placeholder="Комментарий (необязательно)" value={bookingData.comment} onChange={(e) => setBookingData(p => ({ ...p, comment: e.target.value }))} />
                                  <div className="space-y-1">
                                    <label className="text-sm font-medium flex items-center gap-1"><Bell className="w-3.5 h-3.5" /> Напоминание</label>
                                    <Select value={bookingData.reminder} onValueChange={v => setBookingData(p => ({ ...p, reminder: v }))}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {REMINDER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button onClick={() => handleBook(service.id)} className="w-full" disabled={sendingBooking || !bookingData.date || !bookingData.time}>
                                    {sendingBooking ? 'Отправка...' : 'Подтвердить запись'}
                                  </Button>
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
                {/* Address card */}
                {master.address && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="font-medium text-foreground mb-1">Адрес</p>
                      <button
                        className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => {
                          if (master.latitude && master.longitude) {
                            setMapOpen(true);
                          } else {
                            window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(master.address!)}`, '_blank');
                          }
                        }}
                      >
                        <MapPin className="w-3 h-3" />{master.address}
                      </button>
                    </CardContent>
                  </Card>
                )}

                {/* Chat card */}
                <Card>
                  <CardContent className="pt-6">
                    <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full"><MessageSquare className="h-4 w-4 mr-2" /> Написать</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Написать {masterName}</DialogTitle></DialogHeader>
                        <Textarea placeholder="Ваше сообщение..." className="min-h-[100px]" value={messageText} onChange={(e) => setMessageText(e.target.value)} />
                        <Button onClick={handleMessage} className="w-full" disabled={sendingMessage || !messageText.trim()}>{sendingMessage ? 'Отправка...' : 'Отправить'}</Button>
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
          <div ref={mapRef} className="w-full rounded-lg" style={{ height: 320 }} />
        </DialogContent>
      </Dialog>

      {/* Service Detail Dialog */}
      <ServiceDetailDialog
        service={selectedServiceForDetail}
        masterName={masterName}
        masterId={master.id}
        open={!!selectedServiceForDetail}
        onOpenChange={(open) => { if (!open) setSelectedServiceForDetail(null); }}
        onBook={() => { setBookingService(selectedServiceForDetail?.id); setSelectedServiceForDetail(null); }}
      />
    </div>
  );
};

export default MasterDetail;
