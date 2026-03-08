import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, Loader2, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import UserScoreCard from '../UserScoreCard';

interface Props { businessId: string; }

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Ожидает', variant: 'secondary' },
  confirmed: { label: 'Подтверждена', variant: 'default' },
  in_progress: { label: 'В процессе', variant: 'default' },
  completed: { label: 'Завершена', variant: 'outline' },
  cancelled: { label: 'Отменена', variant: 'destructive' },
  rejected: { label: 'Отклонена', variant: 'destructive' },
  no_show: { label: 'Неявка', variant: 'destructive' },
};

export default function BusinessBookingDetail({ businessId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [disputeDialog, setDisputeDialog] = useState<string | null>(null);
  const [scoreDialog, setScoreDialog] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [businessId]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('id, status, scheduled_at, duration_minutes, notes, cancellation_reason, client_id, executor_id, service_id, services!bookings_service_id_fkey(name), client:profiles!bookings_client_id_fkey(first_name, last_name, email), executor:profiles!bookings_executor_id_fkey(first_name, last_name)')
      .eq('organization_id', businessId)
      .order('scheduled_at', { ascending: false })
      .limit(100);
    setBookings(data || []);
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelDialog || !user) return;
    setSubmitting(true);
    await supabase.from('bookings').update({
      status: 'cancelled',
      cancellation_reason: reason || null,
      cancelled_by: user.id,
    }).eq('id', cancelDialog);
    toast({ title: 'Запись отменена' });
    setCancelDialog(null);
    setReason('');
    setSubmitting(false);
    fetchBookings();
  };

  const handleDispute = async () => {
    if (!disputeDialog || !reason.trim() || !user) return;
    setSubmitting(true);
    const booking = bookings.find(b => b.id === disputeDialog);
    if (booking) {
      await supabase.from('disputes').insert({
        booking_id: disputeDialog,
        initiator_id: user.id,
        respondent_id: booking.client_id,
        reason: reason,
        description: reason,
      });
      toast({ title: 'Спор открыт' });
    }
    setDisputeDialog(null);
    setReason('');
    setSubmitting(false);
  };

  const handleConfirm = async (bookingId: string) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
    toast({ title: 'Запись подтверждена' });
    fetchBookings();
  };

  const handleNoShow = async (bookingId: string) => {
    await supabase.from('bookings').update({ status: 'no_show' }).eq('id', bookingId);
    toast({ title: 'Отмечена неявка' });
    fetchBookings();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Записи ({bookings.length})</h3>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Нет записей</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => {
            const s = STATUS_MAP[b.status] || { label: b.status, variant: 'secondary' as const };
            const d = new Date(b.scheduled_at);
            const clientName = `${(b.client as any)?.first_name || ''} ${(b.client as any)?.last_name || ''}`.trim() || 'Клиент';
            const executorName = `${(b.executor as any)?.first_name || ''} ${(b.executor as any)?.last_name || ''}`.trim() || 'Мастер';
            const isPending = b.status === 'pending';
            const isActive = ['pending', 'confirmed', 'in_progress'].includes(b.status);
            const isCompleted = b.status === 'completed';

            return (
              <Card key={b.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{(b.services as any)?.name || 'Услуга'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                          onClick={() => setScoreDialog(b.client_id)}
                        >
                          <User className="h-3 w-3" />{clientName}
                        </button>
                        <span className="text-xs text-muted-foreground">→ {executorName}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {d.toLocaleDateString('ru-RU')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>{b.duration_minutes} мин</span>
                      </div>
                      {b.cancellation_reason && (
                        <p className="text-xs text-destructive mt-1">Причина: {b.cancellation_reason}</p>
                      )}
                    </div>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>

                  {(isPending || isActive || isCompleted) && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                      {isPending && (
                        <Button size="sm" onClick={() => handleConfirm(b.id)}>Подтвердить</Button>
                      )}
                      {isActive && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setCancelDialog(b.id)}>Отменить</Button>
                          <Button size="sm" variant="outline" onClick={() => handleNoShow(b.id)}>Неявка</Button>
                        </>
                      )}
                      {isCompleted && (
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDisputeDialog(b.id)}>
                          <AlertTriangle className="h-3 w-3 mr-1" />Спор
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setScoreDialog(b.client_id)}>
                        <Eye className="h-3 w-3 mr-1" />Профиль клиента
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* UserScore dialog */}
      <Dialog open={!!scoreDialog} onOpenChange={() => setScoreDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Профиль клиента</DialogTitle></DialogHeader>
          {scoreDialog && <UserScoreCard userId={scoreDialog} viewMode="master" />}
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Отменить запись</DialogTitle></DialogHeader>
          <Textarea placeholder="Причина отмены" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setCancelDialog(null)}>Назад</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={submitting}>Отменить запись</Button>
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
            <Button onClick={handleDispute} disabled={submitting || !reason.trim()}>Открыть спор</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
