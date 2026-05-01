import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { getPublicSiteUrl, removeStructuredData, updatePageMeta, updateStructuredData } from '@/lib/seoUtils';
import { Star, MapPin, Clock, MessageSquare, Camera, Heart, Share2, Bell, ShieldAlert, AlertTriangle, BadgeCheck, Award, Brush, Images, Sparkles } from 'lucide-react';
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
import AvailableSlotPicker from '@/components/marketplace/AvailableSlotPicker';
import MasterAvailabilityCalendar from '@/components/marketplace/MasterAvailabilityCalendar';
import {
  BookingGateDecision,
  BookingTrustPolicySettings,
  defaultBookingTrustPolicy,
  evaluateBookingGate,
  normalizeBookingTrustPolicy,
} from '@/lib/bookingTrustPolicy';
import { isSelfInteraction, syncBidirectionalContacts } from '@/lib/contactSync';
import { PROFILE_POST_KIND_META, type ProfilePostRecord, getProfilePostExcerpt, isStoryActive, sortProfilePosts } from '@/lib/profilePosts';

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

interface ClientScoreSnapshot {
  total_score: number | null;
  status: string | null;
}

const REMINDER_OPTIONS = [
  { value: '0', label: 'Не напоминать' },
  { value: '15', label: 'За 15 минут' },
  { value: '30', label: 'За 30 минут' },
  { value: '60', label: 'За 1 час' },
  { value: '180', label: 'За 3 часа' },
  { value: '1440', label: 'За сутки' },
];

const getBookingErrorCopy = (error: any) => {
  const raw = String(error?.message || '').toLowerCase();

  if (raw.includes('restricted') || raw.includes('cannot create bookings')) {
    return {
      title: 'Автоматическая запись сейчас недоступна',
      description: 'Сейчас запись доступна только после подтверждения мастером. Отправьте заявку ещё раз и ожидайте подтверждения.',
    };
  }

  if (raw.includes('duplicate') || raw.includes('already exists')) {
    return {
      title: 'Похожая запись уже создана',
      description: 'Похоже, такая заявка уже создана. Проверьте раздел «Мои записи».',
    };
  }

  if (raw.includes('conflict') || raw.includes('slot') || raw.includes('overlap')) {
    return {
      title: 'Этот слот уже занят',
      description: 'Пока вы оформляли запись, время мог занять другой клиент. Выберите другой слот.',
    };
  }

  return {
    title: 'Не удалось завершить запись',
    description: 'Попробуйте ещё раз чуть позже. Если ошибка повторится, напишите мастеру или в поддержку.',
  };
};

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
  const [viewingService, setViewingService] = useState<any>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '', comment: '', reminder: '60', resource_id: '' });
  
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingBooking, setSendingBooking] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [orgResources, setOrgResources] = useState<any[]>([]);
  const [hasPriorVisitsWithMaster, setHasPriorVisitsWithMaster] = useState(false);
  const [clientScore, setClientScore] = useState<ClientScoreSnapshot | null>(null);
  const [bookingTrustPolicy, setBookingTrustPolicy] = useState<BookingTrustPolicySettings>(defaultBookingTrustPolicy);
  const [publicPosts, setPublicPosts] = useState<ProfilePostRecord[]>([]);
  const [pendingBookingDialog, setPendingBookingDialog] = useState<{
    bookingId: string;
    title: string;
    description: string;
  } | null>(null);
  
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

      const fetchPosts = async (entityId: string) => {
        const { data: posts } = await (supabase as any)
          .from('profile_posts')
          .select('*')
          .eq('entity_type', 'master')
          .eq('entity_id', entityId)
          .eq('is_published', true)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });
        setPublicPosts(sortProfilePosts((posts || []) as ProfilePostRecord[]));
      };

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
            supabase.from('ratings').select('*, rater_profile:profiles!rater_id(first_name, last_name)').eq('rated_id', mp2.user_id).order('created_at', { ascending: false }).limit(20),
          ]);
          setServices(svcRes.data || []);
          setRatings(ratRes.data || []);
          await fetchPosts(mp2.id);
          if (user) {
            const { data: fav } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('favorite_type', 'master').in('target_id', [mp2.id, mp2.user_id]).limit(1).maybeSingle();
            setIsFavorite(!!fav);
          }
        }
      } else {
        setMaster(mp as any);
        const [svcRes, ratRes] = await Promise.all([
          supabase.from('services').select('*').eq('master_id', mp.user_id).eq('is_active', true),
          supabase.from('ratings').select('*, rater_profile:profiles!rater_id(first_name, last_name)').eq('rated_id', mp.user_id).order('created_at', { ascending: false }).limit(20),
        ]);
        setServices(svcRes.data || []);
        setRatings(ratRes.data || []);
        await fetchPosts(mp.id);
        if (user) {
          const { data: fav } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('favorite_type', 'master').in('target_id', [mp.id, mp.user_id]).limit(1).maybeSingle();
          setIsFavorite(!!fav);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [masterId, user]);

  // Dynamic SEO meta tags
  useEffect(() => {
    if (!master || !master.profiles) return;
    const name = `${master.profiles.first_name || ''} ${master.profiles.last_name || ''}`.trim();
    const category = master.service_categories?.name || '';
    const city = (master as any).city || '';
    const topService = services[0];
    const priceStr = topService ? `от ${topService.price} ₽` : '';
    const latestPost = publicPosts.find((post) => post.post_kind !== 'story') || null;
    const latestPostExcerpt = latestPost ? getProfilePostExcerpt(latestPost, 120) : '';
    const url = getPublicSiteUrl(`/master/${master.user_id}`);
    updatePageMeta({
      title: `Запись к ${name}${city ? ` в ${city}` : ''} — SkillSpot`,
      description: `${category}${topService ? `. ${topService.name} ${priceStr}` : ''}${latestPostExcerpt ? `. ${latestPostExcerpt}` : ''}. Отзывы, расписание и онлайн-запись.`,
      url,
      canonicalUrl: url,
      image: master.profiles.avatar_url || undefined,
      type: 'profile',
    });

    updateStructuredData('master-detail', {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      description: master.description || undefined,
      image: master.profiles.avatar_url || undefined,
      address: master.address || undefined,
      url,
      knowsAbout: category || undefined,
      hasPart: publicPosts.slice(0, 5).map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title || PROFILE_POST_KIND_META[post.post_kind].label,
        articleBody: post.body || undefined,
        datePublished: post.created_at,
        dateModified: post.updated_at,
        image: Array.isArray(post.media_urls) ? post.media_urls[0] : undefined,
      })),
    });

    return () => removeStructuredData('master-detail');
  }, [master, services, publicPosts]);

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
    const requestedServiceId = searchParams.get('service');
    if (!requestedServiceId || services.length === 0 || viewingService) return;
    const serviceToView = services.find((service) => service.id === requestedServiceId);
    if (serviceToView) {
      setViewingService(serviceToView);
    }
  }, [searchParams, services, viewingService]);

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

  // Check blacklist, active bookings count, and load resources when booking opens
  useEffect(() => {
    if (!bookingService || !master || !user) return;
    const checkAccess = async () => {
      const [blRes, activeRes, resourcesRes, settingsRes, scoreRes, priorBookingsRes, teacherLessonsRes] = await Promise.all([
        supabase.from('blacklists').select('id').eq('blocker_id', master.user_id).eq('blocked_id', user.id).maybeSingle(),
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq('client_id', user.id).in('status', ['pending', 'confirmed'] as any).gt('scheduled_at', new Date().toISOString()),
        master.business_id
          ? supabase.from('resources').select('id, name, capacity').eq('organization_id', master.business_id).eq('is_active', true)
          : Promise.resolve({ data: [] }),
        master.business_id
          ? supabase.from('business_settings').select('booking').eq('business_id', master.business_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('user_scores').select('total_score, status').eq('user_id', user.id).maybeSingle(),
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq('executor_id', master.user_id)
          .eq('client_id', user.id)
          .in('status', ['confirmed', 'completed'] as any),
        supabase.from('lessons').select('id').eq('teacher_id', master.user_id),
      ]);
      setIsBlacklisted(!!blRes.data);
      setActiveBookingsCount(activeRes.count || 0);
      const resources = resourcesRes.data || [];
      setOrgResources(resources);
      setBookingTrustPolicy(normalizeBookingTrustPolicy((settingsRes.data as any)?.booking?.trustPolicy));
      setClientScore({
        total_score: scoreRes.data?.total_score ?? null,
        status: scoreRes.data?.status ?? null,
      });

      const teacherLessonIds = (teacherLessonsRes.data || []).map((lesson) => lesson.id);
      let lessonCount = 0;
      if (teacherLessonIds.length > 0) {
        const { count } = await supabase
          .from('lesson_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .in('lesson_id', teacherLessonIds)
          .in('status', ['confirmed', 'completed'] as any);
        lessonCount = count || 0;
      }
      setHasPriorVisitsWithMaster(((priorBookingsRes.count || 0) + lessonCount) > 0);

      // Auto-select if single resource
      if (resources.length === 1) {
        setBookingData(prev => ({ ...prev, resource_id: resources[0].id }));
      }
    };
    checkAccess();
  }, [bookingService, master, user]);

  // Слоты теперь грузятся внутри AvailableSlotPicker через RPC.

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
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('favorite_type', 'master').in('target_id', [master.id, master.user_id]);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('favorite_type', 'master').eq('target_id', master.user_id);
      await supabase.from('favorites').insert({ user_id: user.id, target_id: master.id, favorite_type: 'master' });
      await syncBidirectionalContacts(user.id, master.user_id);
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

  const handleBook = async (serviceId: string) => {
    if (!user || !master) {
      toast({ title: 'Нужно войти в аккаунт', description: 'Авторизуйтесь, чтобы записаться', variant: 'destructive' });
      return;
    }

    if (sendingBooking) return; // double-click guard

    // Prevent self-booking
    if (isSelfInteraction(user.id, master.user_id)) {
      toast({ title: 'Нельзя записаться к себе', variant: 'destructive' });
      return;
    }

    const service = services.find(s => s.id === serviceId);
    if (!service || !bookingData.date || !bookingData.time) {
      toast({ title: 'Заполните дату и время', variant: 'destructive' });
      return;
    }

    // Prevent booking past dates
    const today = new Date().toISOString().slice(0, 10);
    if (bookingData.date < today) {
      toast({ title: 'Нельзя записаться на прошедшую дату', variant: 'destructive' });
      return;
    }

    if (!bookingData.time) {
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
      // Use timezone-safe ISO string: append timezone offset so DB stores correct UTC
      const scheduledAt = new Date(`${bookingData.date}T${bookingData.time}:00`).toISOString();

      const decision = evaluateBookingGate({
        isBlacklisted,
        activeBookingsCount,
        hasPriorVisitsWithMaster,
        score: clientScore?.total_score ?? null,
        scoreStatus: clientScore?.status ?? null,
        masterAutoBookingPolicy: master.auto_booking_policy,
      }, bookingTrustPolicy);

      if (!decision.allowBooking || !decision.bookingStatus) {
        toast({
          title: decision.title,
          description: decision.description,
          variant: 'destructive',
        });
        setSendingBooking(false);
        return;
      }

      const bookingStatus = decision.bookingStatus;

      // Insert into bookings table
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          executor_id: master.user_id,
          service_id: service.id,
          organization_id: master.business_id || null,
          resource_id: bookingData.resource_id || null,
          scheduled_at: scheduledAt,
          duration_minutes: duration,
          status: bookingStatus,
          notes: bookingData.comment || null,
        })
        .select('id')
        .single();

      if (bookingError) throw bookingError;

      await syncBidirectionalContacts(user.id, master.user_id);

      // Send notification to master
      await supabase.from('notifications').insert({
        user_id: master.user_id,
        type: 'new_booking',
        title: 'Новая запись',
        message: `${bookingData.name || user.user_metadata?.first_name || 'Клиент'} записался на «${service.name}» ${bookingData.date} в ${bookingData.time}`,
        related_id: newBooking.id,
      });
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: [master.user_id],
          title: bookingStatus === 'confirmed' ? 'Новая запись' : 'Новая заявка на запись',
          body: `${bookingData.name || 'Клиент'} ${bookingStatus === 'confirmed' ? 'записался' : 'отправил заявку'} на ${service.name}`,
          url: `/dashboard?section=${master.business_id ? 'overview' : 'schedule'}`,
          tag: 'booking-request',
        },
      }).catch(() => null);

      const createdBookingId = newBooking.id;

      if (bookingStatus === 'confirmed') {
        toast({ title: 'Запись подтверждена', description: 'Вы записаны. Мастер получит уведомление.' });
      } else {
        setPendingBookingDialog({
          bookingId: createdBookingId,
          title: 'Ожидайте подтверждения',
          description: 'Автоматическая запись сейчас недоступна. Мы отправили заявку мастеру. Ожидайте подтверждения, при желании вы можете дополнительно связаться с мастером в сообщениях.',
        });
      }

      // Offer Tinkoff payment if service has a price
      if (bookingStatus === 'confirmed' && service.price && service.price > 0 && newBooking?.id) {
        const payNow = window.confirm(`Оплатить ${Number(service.price).toLocaleString()} ₽ через Тинькофф прямо сейчас? Вы также можете оплатить позже из Личного кабинета.`);
        if (payNow) {
          try {
            const { data: payData, error: payError } = await supabase.functions.invoke('tinkoff-payment-init', {
              body: { booking_id: newBooking.id },
            });
            if (payError) throw payError;
            if (payData?.payment_url) {
              window.location.href = payData.payment_url;
              return;
            }
          } catch (payErr: any) {
            toast({ title: 'Ошибка оплаты', description: payErr.message || 'Попробуйте оплатить позже из ЛК', variant: 'destructive' });
          }
        }
      }

      setBookingService(null);
      setBookingData({ name: '', phone: '', date: '', time: '', comment: '', reminder: '60', resource_id: '' });
    } catch (err: any) {
      const copy = getBookingErrorCopy(err);
      toast({ title: copy.title, description: copy.description, variant: 'destructive' });
    } finally {
      setSendingBooking(false);
    }
  };

  const handleMessage = async () => {
    if (!user || !master) {
      toast({ title: 'Нужно войти в аккаунт', variant: 'destructive' });
      return;
    }
    if (isSelfInteraction(user.id, master.user_id)) {
      toast({ title: 'Нельзя писать самому себе', variant: 'destructive' });
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
        cabinet_type_scope: master.business_id ? 'business' : 'master',
      });

      if (error) throw error;

      await syncBidirectionalContacts(user.id, master.user_id);

      // Save contact in favorites so it appears in client chats
      await supabase.from('favorites').upsert({
        user_id: user.id,
        target_id: master.id,
        favorite_type: 'master',
      }, { onConflict: 'user_id,target_id,favorite_type' });

      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: [master.user_id],
          title: 'Новое сообщение',
          body: messageText.trim().slice(0, 120),
          url: `/dashboard?section=messages&tab=chats&contact=${user.id}&contact_scope=${master.business_id ? 'business' : 'master'}`,
          tag: 'direct-chat',
        },
      }).catch(() => null);

      toast({ title: 'Сообщение отправлено' });
      setMessageText('');
      setMessageOpen(false);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const cancelPendingBooking = async () => {
    if (!pendingBookingDialog) return;
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Отменено клиентом до подтверждения',
        cancelled_by: user?.id || null,
      })
      .eq('id', pendingBookingDialog.bookingId)
      .eq('status', 'pending');

    if (error) {
      toast({ title: 'Не удалось отменить заявку', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Заявка отменена' });
    setPendingBookingDialog(null);
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
  const heroPhoto = allPhotos[0] || master.profiles?.avatar_url || '';
  const activeStories = publicPosts.filter((post) => isStoryActive(post));
  const publicFeedItems = publicPosts
    .filter((post) => post.post_kind !== 'story' && post.is_published)
    .map((post) => ({
      id: post.id,
      type: 'public-post',
      title: post.title || PROFILE_POST_KIND_META[post.post_kind].label,
      description: post.body || 'Без дополнительного описания',
      photos: Array.isArray(post.media_urls) ? post.media_urls.slice(0, 4) : [],
      icon: PROFILE_POST_KIND_META[post.post_kind].icon,
      accent: PROFILE_POST_KIND_META[post.post_kind].accentClass,
      createdAt: post.created_at,
    }));
  const derivedFeedItems = [
    ...(master.work_photos?.length ? [{
      id: 'works',
      type: 'works',
      title: 'Новые работы в портфолио',
      description: 'Свежие примеры работ и результаты последних записей.',
      photos: master.work_photos.slice(0, 4),
      icon: Images,
      accent: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    }] : []),
    ...(master.certificate_photos?.length ? [{
      id: 'certs',
      type: 'certs',
      title: 'Обучение и сертификаты',
      description: 'Мастер обновил квалификацию, добавил новые сертификаты и техники работы.',
      photos: master.certificate_photos.slice(0, 3),
      icon: Award,
      accent: 'bg-amber-50 text-amber-900 border-amber-200',
    }] : []),
    ...(services.length ? [{
      id: 'services',
      type: 'services',
      title: 'Актуальные услуги',
      description: services.slice(0, 3).map(service => `${service.name} · ${Number(service.price).toLocaleString()} ₽`).join(' • '),
      photos: services.flatMap(service => Array.isArray(service.work_photos) ? service.work_photos.slice(0, 1) : []).slice(0, 3),
      icon: Brush,
      accent: 'bg-blue-50 text-blue-900 border-blue-200',
    }] : []),
    ...(ratings[0]?.comment ? [{
      id: 'review',
      type: 'review',
      title: 'Свежий отзыв клиента',
      description: `«${ratings[0].comment}»`,
      photos: [],
      icon: Sparkles,
      accent: 'bg-primary/10 text-primary border-primary/20',
    }] : []),
  ];
  const feedItems = publicFeedItems.length > 0 ? [...publicFeedItems, ...derivedFeedItems] : derivedFeedItems;
  const bookingDecision: BookingGateDecision | null = bookingService ? evaluateBookingGate({
    isBlacklisted,
    activeBookingsCount,
    hasPriorVisitsWithMaster,
    score: clientScore?.total_score ?? null,
    scoreStatus: clientScore?.status ?? null,
    masterAutoBookingPolicy: master.auto_booking_policy,
  }, bookingTrustPolicy) : null;

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

          <div className="mb-8 overflow-hidden rounded-[28px] border bg-card shadow-sm">
            <div className="relative h-64 md:h-80 overflow-hidden">
              {heroPhoto ? (
                <img
                  src={heroPhoto}
                  alt={masterName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/15 via-emerald-100 to-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
              <div className="absolute left-6 right-6 top-6 flex justify-end gap-2">
                <Button variant="secondary" size="icon" onClick={toggleFavorite} className={isFavorite ? 'text-destructive' : ''}>
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon"><Share2 className="h-4 w-4" /></Button>
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

            <div className="relative px-6 pb-6">
              <div className="-mt-14 flex flex-col gap-5 md:flex-row md:items-end">
                {master.profiles?.avatar_url ? (
                  <img src={master.profiles.avatar_url} alt={masterName} className="h-28 w-28 rounded-full border-4 border-background object-cover shadow-lg" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-background bg-primary/10 text-3xl font-bold text-primary shadow-lg">
                    {(master.profiles?.first_name || '?')[0]}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{masterName}</h1>
                    {master.service_categories && <Badge variant="secondary">{master.service_categories.name}</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {ratings.length > 0 && (
                      <div className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground flex items-center gap-1">
                        <Star className="h-4 w-4 text-accent fill-accent" />
                        {avgRating.toFixed(1)} · {ratings.length} отзывов
                      </div>
                    )}
                    <div className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{services.length} услуг</div>
                    <div className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{(master.work_photos || []).length} работ</div>
                    {!!master.certificate_photos?.length && (
                      <div className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{master.certificate_photos.length} сертификатов</div>
                    )}
                    {master.address && (
                      <button
                        className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
                        onClick={() => {
                          if (master.latitude && master.longitude) setMapOpen(true);
                          else if (master.address) window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(master.address)}`, '_blank');
                        }}
                      >
                        <MapPin className="h-4 w-4" />
                        {master.address}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => services[0] && setBookingService(services[0].id)}>Записаться</Button>
                  {user ? (
                    <Button variant="outline" onClick={() => setMessageOpen(true)}>
                      <MessageSquare className="mr-2 h-4 w-4" /> Написать
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setLoginPromptOpen(true)}>
                      <MessageSquare className="mr-2 h-4 w-4" /> Написать
                    </Button>
                  )}
                </div>
              </div>

              {master.description && <p className="mt-5 max-w-3xl text-muted-foreground">{master.description}</p>}

              {master.hashtags && master.hashtags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {master.hashtags.map(tag => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                </div>
              )}

              {master.social_links && Object.values(master.social_links).some(Boolean) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {master.social_links.telegram && (
                    <a href={master.social_links.telegram.startsWith('http') ? master.social_links.telegram : `https://t.me/${master.social_links.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#26A5E4]/10 px-3 py-1.5 text-sm font-medium text-[#26A5E4] transition-colors hover:bg-[#26A5E4]/20">
                      Telegram
                    </a>
                  )}
                  {master.social_links.vk && (
                    <a href={master.social_links.vk.startsWith('http') ? master.social_links.vk : `https://vk.com/${master.social_links.vk}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#0077FF]/10 px-3 py-1.5 text-sm font-medium text-[#0077FF] transition-colors hover:bg-[#0077FF]/20">
                      VK
                    </a>
                  )}
                  {master.social_links.instagram && (
                    <a href={master.social_links.instagram.startsWith('http') ? master.social_links.instagram : `https://instagram.com/${master.social_links.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F58529]/10 via-[#DD2A7B]/10 to-[#515BD4]/10 px-3 py-1.5 text-sm font-medium text-[#DD2A7B] transition-colors hover:from-[#F58529]/20 hover:via-[#DD2A7B]/20 hover:to-[#515BD4]/20">
                      Instagram
                    </a>
                  )}
                  {master.social_links.youtube && (
                    <a href={master.social_links.youtube.startsWith('http') ? master.social_links.youtube : `https://youtube.com/@${master.social_links.youtube.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#FF0000]/10 px-3 py-1.5 text-sm font-medium text-[#FF0000] transition-colors hover:bg-[#FF0000]/20">
                      YouTube
                    </a>
                  )}
                </div>
              )}

              {activeStories.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">Сторис и быстрые обновления</p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {activeStories.slice(0, 8).map((story) => (
                      <button
                        key={story.id}
                        type="button"
                        onClick={() => {
                          const firstPhoto = Array.isArray(story.media_urls) ? story.media_urls[0] : '';
                          if (firstPhoto) setSelectedPhoto(firstPhoto);
                        }}
                        className="min-w-[180px] rounded-2xl border bg-card/90 p-3 text-left shadow-sm transition-transform hover:-translate-y-0.5"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <div className={`rounded-full border p-2 ${PROFILE_POST_KIND_META.story.accentClass}`}>
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            До {story.expires_at ? new Date(story.expires_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'конца дня'}
                          </span>
                        </div>
                        <p className="line-clamp-1 font-semibold">{story.title || 'Новая сторис'}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {getProfilePostExcerpt(story, 90) || 'Короткое обновление для клиентов.'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <Tabs defaultValue="feed">
                <TabsList className="mb-6">
                  <TabsTrigger value="feed">Лента</TabsTrigger>
                  <TabsTrigger value="services">Услуги ({services.length})</TabsTrigger>
                  <TabsTrigger value="reviews">Отзывы ({ratings.length})</TabsTrigger>
                  <TabsTrigger value="portfolio">Работы</TabsTrigger>
                </TabsList>

                <TabsContent value="feed">
                  <div className="space-y-4">
                    {feedItems.length > 0 ? feedItems.map((item) => {
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
                                {'createdAt' in item && item.createdAt && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {new Date(item.createdAt as string).toLocaleDateString('ru-RU')}
                                  </p>
                                )}
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
                          Лента пока пустая. Как только мастер добавит новые работы, услуги или сертификаты, они появятся здесь.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="services">
                  <div className="grid gap-4">
                    {services.map(service => (
                      <Card 
                        key={service.id} 
                        className="hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => setViewingService(service)}
                      >
                        <CardContent className="flex flex-col md:flex-row gap-4 p-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                            {service.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{service.description}</p>}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/service/${service.id}`);
                              }}
                              className="text-xs text-primary hover:underline mb-2"
                            >
                              Открыть страницу услуги
                            </button>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{service.duration_minutes} мин</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between gap-2">
                            <p className="text-2xl font-bold">{Number(service.price).toLocaleString()} ₽</p>
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setBookingService(service.id);
                              }}
                            >
                              Записаться
                            </Button>
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
                <Card className="overflow-hidden border-primary/15 shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Ближайшая запись</p>
                      <p className="mt-1 text-lg font-semibold">Выберите услугу и подходящий слот</p>
                    </div>
                    {services[0] ? (
                      <Button className="w-full" onClick={() => setBookingService(services[0].id)}>
                        Записаться к мастеру
                      </Button>
                    ) : (
                      <Button className="w-full" disabled>
                        Скоро появятся услуги
                      </Button>
                    )}
                  </CardContent>
                </Card>

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
                    {user ? (
                      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full"><MessageSquare className="h-4 w-4 mr-2" /> Написать мастеру</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Написать {masterName}</DialogTitle></DialogHeader>
                          <Textarea placeholder="Ваше сообщение..." className="min-h-[100px]" value={messageText} onChange={(e) => setMessageText(e.target.value)} />
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => { setMessageOpen(false); setMessageText(''); }}>Отмена</Button>
                            <Button onClick={handleMessage} className="flex-1" disabled={sendingMessage || !messageText.trim()}>{sendingMessage ? 'Отправка...' : 'Отправить'}</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => setLoginPromptOpen(true)}>
                        <MessageSquare className="h-4 w-4 mr-2" /> Написать
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Availability calendar */}
                {master?.user_id && (
                  <MasterAvailabilityCalendar
                    masterId={master.user_id}
                    onSelectDate={(d) => {
                      if (services.length > 0) {
                        setBookingService(services[0].id);
                        setBookingData((p) => ({ ...p, date: d, time: '' }));
                      }
                    }}
                  />
                )}
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
        service={viewingService}
        masterName={masterName}
        masterId={master?.id}
        masterLocation={master?.address}
        masterLatitude={master?.latitude}
        masterLongitude={master?.longitude}
        open={!!viewingService}
        onOpenChange={(open) => !open && setViewingService(null)}
        onBook={() => {
          setViewingService(null);
          setBookingService(viewingService?.id);
        }}
      />

      {/* Booking Dialog */}
      {bookingService && (
        <Dialog open={!!bookingService} onOpenChange={(open) => !open && setBookingService(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Запись на «{services.find(s => s.id === bookingService)?.name}»</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {bookingDecision && (
                <div
                  className={[
                    'flex items-start gap-3 rounded-lg border p-3',
                    bookingDecision.mode === 'block'
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : bookingDecision.mode === 'prepayment'
                        ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                        : bookingDecision.mode === 'manual' || bookingDecision.mode === 'pending'
                          ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
                  ].join(' ')}
                >
                  {bookingDecision.mode === 'block' ? (
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : bookingDecision.mode === 'prepayment' ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{bookingDecision.title}</p>
                    <p className="text-sm leading-relaxed">{bookingDecision.description}</p>
                  </div>
                </div>
              )}

              {!bookingDecision || bookingDecision.mode !== 'block' || bookingDecision.allowManualRequest ? (
                <>
                  <p className="text-sm text-muted-foreground">Мастер: {masterName}</p>
                  <p className="text-sm text-muted-foreground">{Number(services.find(s => s.id === bookingService)?.price || 0).toLocaleString()} ₽ · {services.find(s => s.id === bookingService)?.duration_minutes} мин</p>
                  <Input type="text" placeholder="Ваше имя" value={bookingData.name} onChange={(e) => setBookingData(p => ({ ...p, name: e.target.value }))} />
                  <Input type="tel" placeholder="Телефон" value={bookingData.phone} onChange={(e) => setBookingData(p => ({ ...p, phone: e.target.value }))} />
                  
                  {/* Resource picker */}
                  {orgResources.length > 1 && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Ресурс (кабинет/бокс)</label>
                      <Select value={bookingData.resource_id} onValueChange={v => setBookingData(p => ({ ...p, resource_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Выберите ресурс" /></SelectTrigger>
                        <SelectContent>
                          {orgResources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Дата</label>
                    <Input type="date" min={new Date().toISOString().slice(0, 10)} value={bookingData.date} onChange={(e) => setBookingData(p => ({ ...p, date: e.target.value, time: '' }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Доступные слоты</label>
                    {bookingData.date && master?.user_id && bookingService ? (
                      <AvailableSlotPicker
                        masterId={master.user_id}
                        date={bookingData.date}
                        durationMinutes={Number(services.find(s => s.id === bookingService)?.duration_minutes) || 60}
                        selected={bookingData.time}
                        onSelect={(t) => setBookingData(p => ({ ...p, time: t }))}
                        onJumpToDate={(d) => setBookingData(p => ({ ...p, date: d, time: '' }))}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Выберите дату</p>
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
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setBookingService(null); setBookingData({ name: '', phone: '', date: '', time: '', comment: '', reminder: '60', resource_id: '' }); }}
                    >
                      Отменить
                    </Button>
                    {bookingDecision?.allowBooking ? (
                      <Button onClick={() => handleBook(bookingService)} className="flex-1" disabled={sendingBooking || !bookingData.date || !bookingData.time}>
                        {sendingBooking
                          ? 'Отправка...'
                          : bookingDecision.mode === 'prepayment'
                            ? 'Продолжить с предоплатой'
                            : bookingDecision.mode === 'pending'
                              ? 'Записаться с подтверждением'
                              : 'Подтвердить запись'}
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Login prompt for unauthorized users */}
      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Нужна авторизация</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Чтобы написать мастеру, войдите или зарегистрируйтесь — это займёт минуту.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`)}>
              Войти
            </Button>
            <Button className="flex-1" onClick={() => navigate(`/auth?mode=signup&redirect=${encodeURIComponent(window.location.pathname)}`)}>
              Регистрация
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingBookingDialog} onOpenChange={(open) => !open && setPendingBookingDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingBookingDialog?.title || 'Ожидайте подтверждения'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {pendingBookingDialog?.description}
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={cancelPendingBooking}>
              Отменить запись
            </Button>
            <Button className="flex-1" onClick={() => setPendingBookingDialog(null)}>
              Ок
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MasterDetail;
