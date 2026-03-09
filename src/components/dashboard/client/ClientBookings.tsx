import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Loader2, Archive, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Props { userId: string; }

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Ожидает', variant: 'secondary' },
  confirmed: { label: 'Подтверждена', variant: 'default' },
  in_progress: { label: 'В процессе', variant: 'default' },
  completed: { label: 'Завершена', variant: 'outline' },
  cancelled: { label: 'Отменена', variant: 'destructive' },
  rejected: { label: 'Отклонена', variant: 'destructive' },
  no_show: { label: 'Неявка', variant: 'destructive' },
};

export default function ClientBookings({ userId }: Props) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'day' | 'week' | 'month' | 'archive'>('week');
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [disputeDialog, setDisputeDialog] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      // Fetch from both bookings and lesson_bookings
      const [bRes, lbRes] = await Promise.all([
        supabase.from('bookings')
          .select('id, status, scheduled_at, duration_minutes, notes, executor_id, service_id, organization_id, services!bookings_service_id_fkey(name), profiles!bookings_executor_id_fkey(first_name, last_name)')
          .eq('client_id', userId)
          .order('scheduled_at', { ascending: false })
          .limit(200),
        supabase.from('lesson_bookings')
          .select('id, status, booked_at, lessons!inner(title, lesson_date, start_time, end_time, price, teacher_id, profiles!lessons_teacher_id_fkey(first_name, last_name))')
          .eq('student_id', userId)
          .order('booked_at', { ascending: false })
          .limit(200),
      ]);

      const unified: any[] = [];
      (bRes.data || []).forEach(b => {
        unified.push({
          id: b.id,
          type: 'booking',
          status: b.status,
          date: b.scheduled_at,
          title: (b as any).services?.name || 'Услуга',
          master: `${(b as any).profiles?.first_name || ''} ${(b as any).profiles?.last_name || ''}`.trim(),
          master_id: b.executor_id,
          duration: b.duration_minutes,
          canCancel: ['pending', 'confirmed'].includes(b.status),
          canDispute: b.status === 'completed',
        });
      });
      (lbRes.data || []).forEach(lb => {
        const lesson = lb.lessons as any;
        unified.push({
          id: lb.id,
          type: 'lesson',
          status: lb.status,
          date: `${lesson?.lesson_date}T${lesson?.start_time}`,
          title: lesson?.title || 'Занятие',
          master: `${lesson?.profiles?.first_name || ''} ${lesson?.profiles?.last_name || ''}`.trim(),
          master_id: lesson?.teacher_id || null,
          duration: null,
          canCancel: ['pending', 'confirmed'].includes(lb.status),
          canDispute: ['completed', 'no_show'].includes(lb.status),
        });
      });

      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBookings(unified);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const filtered = useMemo(() => {
    if (period === 'all') return bookings;
    const now = new Date();
    return bookings.filter(b => {
      const d = new Date(b.date);
      if (period === 'archive') return d < now;
      if (period === 'day') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        const end = new Date(now);
        end.setDate(end.getDate() + 7);
        return d >= now && d <= end;
      }
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return d >= now && d <= end;
    });
  }, [bookings, period]);

  // Group by date for "all" view
  const groupedByDate = useMemo(() => {
    if (period !== 'all') return null;
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(b => {
      const dateKey = new Date(b.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(b);
    });
    return groups;
  }, [filtered, period]);

  const handleCancel = async () => {
    if (!cancelDialog) return;
    setSubmitting(true);
    const booking = bookings.find(b => b.id === cancelDialog);
    if (booking?.type === 'booking') {
      await supabase.from('bookings').update({
        status: 'cancelled',
        cancellation_reason: reason || null,
        cancelled_by: userId,
      }).eq('id', cancelDialog);
    } else {
      await supabase.from('lesson_bookings').update({
        status: 'cancelled',
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
      }).eq('id', cancelDialog);
    }
    toast({ title: 'Запись отменена' });
    setBookings(prev => prev.map(b => b.id === cancelDialog ? { ...b, status: 'cancelled', canCancel: false } : b));
    setCancelDialog(null);
    setReason('');
    setSubmitting(false);
  };

  const handleDispute = async () => {
    if (!disputeDialog || !reason.trim()) return;
    setSubmitting(true);
    const booking = bookings.find(b => b.id === disputeDialog);
    if (booking) {
      const insertData: any = {
        initiator_id: userId,
        respondent_id: booking.master_id || booking.executor_id || '',
        reason: reason,
        description: reason,
      };
      if (booking.type === 'booking') {
        insertData.booking_id = disputeDialog;
      } else {
        insertData.lesson_booking_id = disputeDialog;
      }
      await supabase.from('disputes').insert(insertData);
      toast({ title: 'Спор открыт' });
    }
    setDisputeDialog(null);
    setReason('');
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Мои записи</h3>
      <Tabs value={period} onValueChange={v => setPeriod(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="day" className="flex-1">День</TabsTrigger>
          <TabsTrigger value="week" className="flex-1">Неделя</TabsTrigger>
          <TabsTrigger value="month" className="flex-1">Месяц</TabsTrigger>
          <TabsTrigger value="archive" className="flex-1 gap-1"><Archive className="h-3 w-3" />Архив</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Нет записей за выбранный период</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const s = STATUS_MAP[b.status] || { label: b.status, variant: 'secondary' as const };
            const d = new Date(b.date);
            return (
              <Card key={b.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{b.title}</p>
                      <p className="text-sm text-muted-foreground">{b.master}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {d.toLocaleDateString('ru-RU')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {b.duration && <span>{b.duration} мин</span>}
                      </div>
                    </div>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  {(b.canCancel || b.canDispute) && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {b.canCancel && (
                        <Button size="sm" variant="outline" onClick={() => setCancelDialog(b.id)}>Отменить</Button>
                      )}
                      {b.canDispute && (
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDisputeDialog(b.id)}>
                          <AlertTriangle className="h-3 w-3 mr-1" />Открыть спор
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel dialog */}
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

      {/* Dispute dialog */}
      <Dialog open={!!disputeDialog} onOpenChange={() => { setDisputeDialog(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Открыть спор</DialogTitle></DialogHeader>
          <Textarea placeholder="Опишите проблему *" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDisputeDialog(null)}>Назад</Button>
            <Button onClick={handleDispute} disabled={submitting || !reason.trim()}>
              {submitting ? 'Отправка...' : 'Открыть спор'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
