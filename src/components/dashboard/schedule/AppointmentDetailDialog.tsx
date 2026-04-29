import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Clock, Copy, Mail, MapPin, MessageSquare, Phone, User, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import UserScoreCard from '@/components/dashboard/UserScoreCard';

interface Props {
  booking: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void | Promise<void>;
  canManage?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  in_progress: 'В процессе',
  completed: 'Завершена',
  cancelled: 'Отменена',
  rejected: 'Отклонена',
  no_show: 'Неявка',
  break: 'Перерыв',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  in_progress: 'default',
  completed: 'outline',
  cancelled: 'destructive',
  rejected: 'destructive',
  no_show: 'destructive',
  break: 'outline',
};

export default function AppointmentDetailDialog({
  booking,
  open,
  onOpenChange,
  onUpdated,
  canManage = true,
}: Props) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const service = booking?.service || booking?.services;

  const status = booking?.status || 'pending';
  const start = booking?.scheduled_at ? new Date(booking.scheduled_at) : null;
  const end = start && booking?.duration_minutes
    ? new Date(start.getTime() + Number(booking.duration_minutes) * 60_000)
    : null;

  const canConfirm = canManage && status === 'pending';
  const canFinish = canManage && ['pending', 'confirmed', 'in_progress'].includes(status);
  const canNoShow = canManage && ['pending', 'confirmed', 'in_progress'].includes(status);
  const canCancel = canManage && ['pending', 'confirmed', 'in_progress'].includes(status);

  const clientName = useMemo(() => {
    return [booking?.client?.first_name, booking?.client?.last_name].filter(Boolean).join(' ') || 'Клиент';
  }, [booking]);

  const executorName = useMemo(() => {
    return [booking?.executor?.first_name, booking?.executor?.last_name].filter(Boolean).join(' ') || 'Мастер';
  }, [booking]);

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} скопирован` });
    } catch {
      toast({ title: 'Не удалось скопировать', variant: 'destructive' });
    }
  };

  const runUpdate = async (payload: Record<string, any>) => {
    if (!booking?.id) return;
    setSubmitting(true);
    const { error } = await supabase.from('bookings').update(payload).eq('id', booking.id);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    await onUpdated?.();
  };

  const handleAction = async (action: 'confirm' | 'complete' | 'no_show' | 'cancel') => {
    if (!booking?.id) return;

    if (action === 'confirm') {
      await runUpdate({ status: 'confirmed' });
      toast({ title: 'Запись подтверждена' });
      return;
    }

    if (action === 'complete') {
      await runUpdate({ status: 'completed' });
      toast({ title: 'Запись завершена' });
      return;
    }

    if (action === 'no_show') {
      await runUpdate({ status: 'no_show', cancellation_reason: reason.trim() || 'Неявка клиента' });
      toast({ title: 'Клиент отмечен как неявившийся' });
      setReason('');
      return;
    }

    await runUpdate({
      status: 'cancelled',
      cancellation_reason: reason.trim() || 'Отменено сотрудником',
    });
    toast({ title: 'Запись отменена' });
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Карточка записи</DialogTitle>
        </DialogHeader>

        {booking ? (
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{service?.name || 'Услуга'}</p>
                  <p className="text-sm text-muted-foreground">
                    {clientName} · {executorName}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[status] || 'secondary'}>
                  {STATUS_LABELS[status] || status}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Дата и время
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {start ? format(start, 'd MMMM yyyy', { locale: ru }) : '—'}
                  </p>
                  <p className="text-muted-foreground">
                    {start && end ? `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}` : '—'}
                  </p>
                </div>

                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Стоимость
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {Number(service?.price || 0).toLocaleString()} ₽
                  </p>
                  <p className="text-muted-foreground">{booking?.duration_minutes || 0} мин</p>
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Клиент
                </p>
                <p>{clientName}</p>
                <p className="text-muted-foreground">{booking?.client?.email || 'Email не указан'}</p>
                {booking?.client?.phone && <p className="text-muted-foreground">{booking.client.phone}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {booking?.client?.phone && (
                    <>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${booking.client.phone}`}>
                          <Phone className="h-3.5 w-3.5 mr-1" />
                          Позвонить
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCopy(booking.client.phone, 'Телефон')}>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Скопировать
                      </Button>
                    </>
                  )}
                  {booking?.client?.email && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${booking.client.email}`}>
                        <Mail className="h-3.5 w-3.5 mr-1" />
                        Написать
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ресурс и комментарии
                </p>
                <p>{booking?.resource?.name || 'Без закреплённого ресурса'}</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {booking?.notes || 'Комментарий не указан'}
                </p>
                {booking?.cancellation_reason && (
                  <p className="text-destructive whitespace-pre-wrap">
                    Причина: {booking.cancellation_reason}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Операции
                  </p>
                  <Textarea
                    placeholder="Причина отмены / неявки / служебный комментарий"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {canConfirm && (
                      <Button size="sm" disabled={submitting} onClick={() => handleAction('confirm')}>
                        Подтвердить
                      </Button>
                    )}
                    {canFinish && (
                      <Button size="sm" variant="outline" disabled={submitting} onClick={() => handleAction('complete')}>
                        Завершить
                      </Button>
                    )}
                    {canNoShow && (
                      <Button size="sm" variant="outline" disabled={submitting} onClick={() => handleAction('no_show')}>
                        Неявка
                      </Button>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="destructive" disabled={submitting} onClick={() => handleAction('cancel')}>
                        Отменить
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <UserScoreCard userId={booking.client_id} viewMode="master" />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
