import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
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
  business_id: string | null;
  social_links: { telegram?: string; vk?: string; instagram?: string; youtube?: string } | null;
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
  const [searchParams] = useSearchParams();
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

  // Auto-open booking from URL param (e.g. from service card "Записаться")
  useEffect(() => {
    const bookServiceId = searchParams.get('book');
    if (bookServiceId && services.length > 0 && !bookingService) {
      const serviceToBook = services.find(s => s.id === bookServiceId);
      if (serviceToBook) {
        setBookingService(serviceToBook.id);
      }
    }
  }, [searchParams, services, bookingService]);

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

    // Check both lessons AND bookings for blocked slots
    const [{ data: dayLessons }, { data: dayBookings }] = await Promise.all([
      supabase
        .from('lessons')
        .select('start_time, end_time')
        .eq('teacher_id', master.user_id)
        .eq('lesson_date', date)
        .neq('status', 'cancelled'),
      supabase
        .from('bookings')
        .select('scheduled_at, duration_minutes')
        .eq('executor_id', master.user_id)
        .gte('scheduled_at', `${date}T00:00:00`)
        .lt('scheduled_at', `${date}T23:59:59`)
        .not('status', 'in', '("cancelled","no_show")'),
    ]);

    const blocked = [
      ...(dayLessons || []).map((l: any) => ({
        start: toMinutes((l.start_time || '00:00').slice(0, 5)),
        end: toMinutes((l.end_time || '00:00').slice(0, 5)),
      })),
      ...(dayBookings || []).map((b: any) => {
        const d = new Date(b.scheduled_at);
        const startM = d.getHours() * 60 + d.getMinutes();
        return { start: startM, end: startM + (b.duration_minutes || 60) };
      }),
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
        setSendingBooking(false);
        return;
      }

      const duration = Number(service.duration_minutes) || 60;
      const scheduledAt = new Date(`${bookingData.date}T${bookingData.time}:00`).toISOString();

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
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {master.hashtags.map(tag => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                </div>
              )}

              {/* Social Links */}
              {master.social_links && Object.values(master.social_links).some(Boolean) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {master.social_links.telegram && (
                    <a href={master.social_links.telegram.startsWith('http') ? master.social_links.telegram : `https://t.me/${master.social_links.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#26A5E4]/10 text-[#26A5E4] hover:bg-[#26A5E4]/20 transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      Telegram
                    </a>
                  )}
                  {master.social_links.vk && (
                    <a href={master.social_links.vk.startsWith('http') ? master.social_links.vk : `https://vk.com/${master.social_links.vk}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0077FF]/10 text-[#0077FF] hover:bg-[#0077FF]/20 transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.046-1.747-1.03-1-1.485-1.14-1.74-1.14-.356 0-.457.104-.457.6v1.59c0 .427-.138.683-1.263.683-1.866 0-3.94-1.13-5.4-3.235C4.754 10.745 4.203 8.2 4.203 7.73c0-.255.102-.49.593-.49h1.744c.444 0 .61.204.783.675.856 2.485 2.283 4.663 2.875 4.663.218 0 .318-.102.318-.66V9.4c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.408.444-.408h2.75c.373 0 .508.204.508.64v3.467c0 .373.17.508.272.508.22 0 .407-.135.814-.543 1.26-1.406 2.156-3.578 2.156-3.578.12-.255.322-.49.762-.49h1.744c.525 0 .643.27.525.64-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.2 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.74-.576.74z"/></svg>
                      VK
                    </a>
                  )}
                  {master.social_links.instagram && (
                    <a href={master.social_links.instagram.startsWith('http') ? master.social_links.instagram : `https://instagram.com/${master.social_links.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#F58529]/10 via-[#DD2A7B]/10 to-[#515BD4]/10 text-[#DD2A7B] hover:from-[#F58529]/20 hover:via-[#DD2A7B]/20 hover:to-[#515BD4]/20 transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      Instagram
                    </a>
                  )}
                  {master.social_links.youtube && (
                    <a href={master.social_links.youtube.startsWith('http') ? master.social_links.youtube : `https://youtube.com/@${master.social_links.youtube.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF0000]/10 text-[#FF0000] hover:bg-[#FF0000]/20 transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      YouTube
                    </a>
                  )}
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
