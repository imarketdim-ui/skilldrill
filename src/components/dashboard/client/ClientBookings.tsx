import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Wallet, Star, ChevronDown, ChevronUp, Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Props { userId: string; }

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: 'Ожидает',      variant: 'secondary' },
  confirmed:  { label: 'Подтверждена', variant: 'default' },
  in_progress:{ label: 'В процессе',   variant: 'default' },
  completed:  { label: 'Состоялась',   variant: 'outline' },
  cancelled:  { label: 'Отменена',     variant: 'destructive' },
  rejected:   { label: 'Отклонена',    variant: 'destructive' },
  no_show:    { label: 'Неявка',       variant: 'destructive' },
  dispute:    { label: 'Спор',         variant: 'destructive' },
  awaiting_outcome: { label: 'Ожидает подтверждения', variant: 'secondary' },
};

interface BookingItem {
  id: string;
  type: 'booking' | 'lesson';
  status: string;
  displayStatus: string;
  date: string;
  title: string;
  master: string;
  master_id: string | null;
  duration: number | null;
  price: number | null;
  address: string | null;
  service_desc: string | null;
  canCancel: boolean;
  canDispute: boolean;
  canReview: boolean;
  canMarkAttended: boolean;
  canMarkNoShow: boolean;
  isExpired: boolean;
}

const isBookingExpired = (scheduledAt: string, durationMin: number | null): boolean => {
  const endTime = new Date(scheduledAt).getTime() + ((durationMin || 60) + 60) * 60000;
  return Date.now() > endTime;
};

const BookingCard = ({
  b, onCancel, onDispute, onReview, onMarkAttended, onMarkNoShow
}: {
  b: BookingItem;
  onCancel: (id: string) => void;
  onDispute: (id: string) => void;
  onReview: (id: string) => void;
  onMarkAttended: (id: string) => void;
  onMarkNoShow: (id: string) => void;
}) => {
  const s = STATUS_MAP[b.displayStatus] || STATUS_MAP[b.status] || { label: b.status, variant: 'secondary' as const };
  const d = new Date(b.date);
  const hasActions = b.canCancel || b.canDispute || b.canReview || b.canMarkAttended || b.canMarkNoShow;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{b.title}</p>
            <p className="text-sm text-muted-foreground">{b.master || '—'}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{d.toLocaleDateString('ru-RU')}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
              {b.duration && <span>{b.duration} мин</span>}
              {b.price != null && b.price > 0 && (
                <span className="flex items-center gap-1"><Wallet className="h-3 w-3" />{b.price.toLocaleString()} ₽</span>
              )}
              {b.address && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.address}</span>
              )}
            </div>
            {b.service_desc && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{b.service_desc}</p>
            )}
          </div>
          <Badge variant={s.variant as any}>{s.label}</Badge>
        </div>

        {hasActions && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            {b.canCancel && (
              <Button size="sm" variant="outline" onClick={() => onCancel(b.id)}>Отменить</Button>
            )}
            {b.canMarkAttended && (
              <Button size="sm" variant="outline" className="gap-1 text-primary" onClick={() => onMarkAttended(b.id)}>
                <CheckCircle2 className="h-3 w-3" />Состоялась
              </Button>
            )}
            {b.canMarkNoShow && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onMarkNoShow(b.id)}>
                <XCircle className="h-3 w-3" />Не состоялась
              </Button>
            )}
            {b.canReview && (
              <Button size="sm" variant="outline" className="gap-1 text-amber-600" onClick={() => onReview(b.id)}>
                <Star className="h-3 w-3" />Оставить отзыв
              </Button>
            )}
            {b.canDispute && (
              <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => onDispute(b.id)}>
                <AlertTriangle className="h-3 w-3" />Создать спор
              </Button>
            )}
          </div>
        )}

        {!hasActions && b.isExpired && (
          <div className="mt-2 pt-2 border-t flex items-center gap-1.5">
            {b.status === 'completed'
              ? <><CheckCircle2 className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-primary">Состоялась</span></>
              : b.status === 'no_show'
              ? <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-destructive">Не состоялась — неявка</span></>
              : b.status === 'cancelled'
              ? <><XCircle className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Отменена</span></>
              : null
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const INITIAL_SHOW = 10;

const NO_SHOW_REASONS = [
  { value: 'no_show_master', label: 'Неявка мастера' },
  { value: 'cancelled_by_master', label: 'Отмена мастером' },
  { value: 'other', label: 'Иное' },
];

export default function ClientBookings({ userId }: Props) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'archive'>('active');
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllArchive, setShowAllArchive] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [disputeDialog, setDisputeDialog] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState<string | null>(null);
  const [noShowDialog, setNoShowDialog] = useState<string | null>(null);
  const [noShowReason, setNoShowReason] = useState('no_show_master');
  const [noShowDescription, setNoShowDescription] = useState('');
  const [reason, setReason] = useState('');
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    const [bRes, lbRes] = await Promise.all([
      supabase.from('bookings')
        .select(`
          id, status, scheduled_at, duration_minutes, notes,
          executor_id, service_id, organization_id,
          services!bookings_service_id_fkey(name, price, description),
          profiles!bookings_executor_id_fkey(first_name, last_name),
          business_locations!bookings_organization_id_fkey(address)
        `)
        .eq('client_id', userId)
        .order('scheduled_at', { ascending: false })
        .limit(300),
      supabase.from('lesson_bookings')
        .select(`
          id, status, booked_at,
          lessons!inner(title, lesson_date, start_time, end_time, price, teacher_id,
            profiles!lessons_teacher_id_fkey(first_name, last_name))
        `)
        .eq('student_id', userId)
        .order('booked_at', { ascending: false })
        .limit(300),
    ]);

    const bookingIds = (bRes.data || []).map(b => b.id);
    const { data: existingRatings } = await supabase.from('ratings')
      .select('booking_id')
      .in('booking_id', bookingIds)
      .eq('rater_id', userId);
    const reviewedSet = new Set((existingRatings || []).map((r: any) => r.booking_id));

    const unified: BookingItem[] = [];

    (bRes.data || []).forEach(b => {
      const svc = (b as any).services;
      const prof = (b as any).profiles;
      const loc = (b as any).business_locations;
      const alreadyReviewed = reviewedSet.has(b.id);
      const expired = isBookingExpired(b.scheduled_at, b.duration_minutes);
      const isActiveStatus = ['pending', 'confirmed', 'in_progress'].includes(b.status);
      const isConfirmedExpired = expired && b.status === 'confirmed';
      
      // Determine available actions
      const canCancel = isActiveStatus && !expired;
      const canMarkAttended = isConfirmedExpired || (expired && b.status === 'in_progress');
      const canMarkNoShow = isConfirmedExpired || (expired && b.status === 'in_progress');
      const canDispute = expired && ['completed', 'confirmed', 'in_progress'].includes(b.status);
      const canReview = b.status === 'completed' && !alreadyReviewed;

      unified.push({
        id: b.id,
        type: 'booking',
        status: b.status,
        displayStatus: isConfirmedExpired ? 'awaiting_outcome' : b.status,
        date: b.scheduled_at,
        title: svc?.name || 'Услуга',
        master: `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim(),
        master_id: b.executor_id,
        duration: b.duration_minutes,
        price: svc?.price ?? null,
        address: loc?.address ?? null,
        service_desc: svc?.description ?? null,
        canCancel,
        canDispute,
        canReview,
        canMarkAttended,
        canMarkNoShow,
        isExpired: expired,
      });
    });

    (lbRes.data || []).forEach(lb => {
      const lesson = (lb as any).lessons;
      const dateStr = `${lesson?.lesson_date}T${lesson?.start_time}`;
      const d = new Date(dateStr);
      const durationMin = lesson?.end_time && lesson?.start_time
        ? (new Date(`2000-01-01T${lesson.end_time}`).getTime() - new Date(`2000-01-01T${lesson.start_time}`).getTime()) / 60000
        : 60;
      const expired = isBookingExpired(dateStr, durationMin);
      const isActiveStatus = ['pending', 'confirmed'].includes(lb.status);
      const isConfirmedExpired = expired && lb.status === 'confirmed';
      const prof = lesson?.profiles;

      unified.push({
        id: lb.id,
        type: 'lesson',
        status: lb.status,
        displayStatus: isConfirmedExpired ? 'awaiting_outcome' : lb.status,
        date: dateStr,
        title: lesson?.title || 'Занятие',
        master: `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim(),
        master_id: lesson?.teacher_id ?? null,
        duration: durationMin,
        price: lesson?.price ?? null,
        address: null,
        service_desc: null,
        canCancel: isActiveStatus && !expired,
        canDispute: expired && ['completed', 'confirmed'].includes(lb.status),
        canReview: lb.status === 'completed',
        canMarkAttended: isConfirmedExpired,
        canMarkNoShow: isConfirmedExpired,
        isExpired: expired,
      });
    });

    unified.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setBookings(unified);
    setLoading(false);
  };

  useEffect(() => { loadBookings(); }, [userId]);

  // Active = status is active AND not expired
  const active = useMemo(() => {
    return bookings.filter(b => {
      const isActiveStatus = ['pending', 'confirmed', 'in_progress'].includes(b.status);
      return isActiveStatus && !b.isExpired;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bookings]);

  // Archive = everything else
  const archive = useMemo(() => {
    return bookings.filter(b => {
      const isActiveStatus = ['pending', 'confirmed', 'in_progress'].includes(b.status);
      return !isActiveStatus || b.isExpired;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bookings]);

  const groupByDay = (items: BookingItem[]) => {
    const groups: Array<{ label: string; items: BookingItem[] }> = [];
    const map = new Map<string, BookingItem[]>();
    items.forEach(b => {
      const key = new Date(b.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    map.forEach((v, k) => groups.push({ label: k, items: v }));
    return groups;
  };

  const handleCancel = async () => {
    if (!cancelDialog) return;
    setSubmitting(true);
    const booking = bookings.find(b => b.id === cancelDialog);
    if (booking?.type === 'booking') {
      await supabase.from('bookings').update({ status: 'cancelled', cancellation_reason: reason || null, cancelled_by: userId }).eq('id', cancelDialog);
    } else {
      await supabase.from('lesson_bookings').update({ status: 'cancelled', cancellation_reason: reason || null, cancelled_at: new Date().toISOString() }).eq('id', cancelDialog);
    }
    toast({ title: 'Запись отменена' });
    setCancelDialog(null); setReason(''); setSubmitting(false);
    loadBookings();
  };

  const handleDispute = async () => {
    if (!disputeDialog || !reason.trim()) return;
    setSubmitting(true);
    const booking = bookings.find(b => b.id === disputeDialog);
    if (booking) {
      const insertData: any = { initiator_id: userId, respondent_id: booking.master_id || '', reason, description: reason };
      if (booking.type === 'booking') insertData.booking_id = disputeDialog;
      else insertData.lesson_booking_id = disputeDialog;
      await supabase.from('disputes').insert(insertData);
      
      // Create support ticket for dispute
      try {
        await supabase.from('support_tickets').insert({
          user_id: userId,
          subject: `Спор: ${booking.title}`,
          category: 'dispute',
          status: 'open',
        });
      } catch (_) { /* ticket table may not exist yet */ }
      
      toast({ title: 'Спор открыт', description: 'Мы рассмотрим вашу заявку' });
    }
    setDisputeDialog(null); setReason(''); setSubmitting(false);
    loadBookings();
  };

  const handleMarkAttended = async (id: string) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    if (booking.type === 'booking') {
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', id);
    } else {
      await supabase.from('lesson_bookings').update({ status: 'completed' }).eq('id', id);
    }
    toast({ title: 'Запись отмечена как состоявшаяся' });
    loadBookings();
  };

  const handleMarkNoShow = async () => {
    if (!noShowDialog) return;
    setSubmitting(true);
    const booking = bookings.find(b => b.id === noShowDialog);
    if (!booking) { setSubmitting(false); return; }
    
    const newStatus = noShowReason === 'cancelled_by_master' ? 'cancelled' : 'no_show';
    const reasonText = `${NO_SHOW_REASONS.find(r => r.value === noShowReason)?.label || noShowReason}${noShowDescription ? ': ' + noShowDescription : ''}`;
    
    if (booking.type === 'booking') {
      await supabase.from('bookings').update({ status: newStatus as any, cancellation_reason: reasonText }).eq('id', noShowDialog);
    } else {
      await supabase.from('lesson_bookings').update({ status: newStatus as any, cancellation_reason: reasonText }).eq('id', noShowDialog);
    }
    toast({ title: 'Статус обновлён' });
    setNoShowDialog(null); setNoShowReason('no_show_master'); setNoShowDescription(''); setSubmitting(false);
    loadBookings();
  };

  const handleReview = async () => {
    if (!reviewDialog) return;
    setSubmitting(true);
    const booking = bookings.find(b => b.id === reviewDialog);
    if (booking?.master_id && booking.type === 'booking') {
      await supabase.from('ratings').insert({
        rater_id: userId, rated_id: booking.master_id,
        score: reviewScore, comment: reviewText.trim() || null, booking_id: reviewDialog,
      });
      toast({ title: 'Отзыв оставлен' });
    }
    setReviewDialog(null); setReviewText(''); setReviewScore(5); setSubmitting(false);
    loadBookings();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const currentList = tab === 'active' ? active : archive;
  const showAll = tab === 'active' ? showAllActive : showAllArchive;
  const setShowAll = tab === 'active' ? setShowAllActive : setShowAllArchive;
  const displayed = showAll ? currentList : currentList.slice(0, INITIAL_SHOW);
  const groups = groupByDay(displayed);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Мои записи</h3>
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1 gap-1.5">
            Активные
            {active.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{active.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex-1 gap-1.5">
            Архив
            {archive.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{archive.length}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {currentList.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {tab === 'active' ? 'Нет активных записей' : 'Архив пуст'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.label}>
              <p className="text-sm font-semibold text-muted-foreground mb-2 capitalize">{g.label}</p>
              <div className="space-y-2 mb-3">
                {g.items.map(b => (
                  <BookingCard key={b.id} b={b}
                    onCancel={setCancelDialog}
                    onDispute={setDisputeDialog}
                    onReview={setReviewDialog}
                    onMarkAttended={handleMarkAttended}
                    onMarkNoShow={setNoShowDialog}
                  />
                ))}
              </div>
            </div>
          ))}

          {currentList.length > INITIAL_SHOW && (
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowAll(!showAll)}>
              {showAll
                ? <><ChevronUp className="h-4 w-4" />Свернуть</>
                : <><ChevronDown className="h-4 w-4" />Показать все ({currentList.length})</>
              }
            </Button>
          )}
        </div>
      )}

      {/* Cancel */}
      <Dialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Отменить запись</DialogTitle></DialogHeader>
          <Textarea placeholder="Причина отмены (необязательно)" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setCancelDialog(null)}>Назад</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
              {submitting ? 'Отмена...' : 'Отменить запись'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute */}
      <Dialog open={!!disputeDialog} onOpenChange={() => { setDisputeDialog(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Создать спор</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Опишите проблему. Будет создан тикет в техподдержку.</p>
          <Textarea placeholder="Опишите проблему *" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDisputeDialog(null)}>Назад</Button>
            <Button onClick={handleDispute} disabled={submitting || !reason.trim()}>
              {submitting ? 'Отправка...' : 'Создать спор'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* No-show / Not attended */}
      <Dialog open={!!noShowDialog} onOpenChange={() => { setNoShowDialog(null); setNoShowReason('no_show_master'); setNoShowDescription(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Запись не состоялась</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Причина</p>
              <Select value={noShowReason} onValueChange={setNoShowReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NO_SHOW_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {noShowReason === 'other' && (
              <Textarea placeholder="Опишите причину" value={noShowDescription} onChange={e => setNoShowDescription(e.target.value)} />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNoShowDialog(null)}>Назад</Button>
              <Button onClick={handleMarkNoShow} disabled={submitting || (noShowReason === 'other' && !noShowDescription.trim())}>
                {submitting ? 'Сохранение...' : 'Подтвердить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review */}
      <Dialog open={!!reviewDialog} onOpenChange={() => { setReviewDialog(null); setReviewText(''); setReviewScore(5); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Оставить отзыв</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Оценка</p>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setReviewScore(s)}>
                    <Star className={`h-7 w-7 ${s <= reviewScore ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea placeholder="Ваш отзыв" value={reviewText} onChange={e => setReviewText(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReviewDialog(null)}>Назад</Button>
              <Button onClick={handleReview} disabled={submitting}>
                {submitting ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
