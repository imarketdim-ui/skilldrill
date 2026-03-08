import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props { businessId: string; }

const BusinessMarketing = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const sendBroadcast = async () => {
    if (!user || !message.trim()) return;
    setSending(true);
    try {
      // Get all unique clients who had bookings with this business
      const { data: bookings } = await supabase
        .from('bookings')
        .select('client_id')
        .eq('organization_id', businessId);

      const clientIds = [...new Set((bookings || []).map(b => b.client_id))];

      if (clientIds.length === 0) {
        toast({ title: 'Нет клиентов', description: 'У вашего бизнеса ещё нет клиентов для рассылки', variant: 'destructive' });
        setSending(false);
        return;
      }

      // Filter out blacklisted
      const { data: blacklisted } = await supabase
        .from('blacklists')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      const blSet = new Set((blacklisted || []).map(b => b.blocked_id));
      const validClients = clientIds.filter(id => !blSet.has(id));

      // Send marketing messages
      const messages = validClients.map(clientId => ({
        sender_id: user.id,
        recipient_id: clientId,
        message: message.trim(),
        chat_type: 'marketing',
      }));

      const { error } = await supabase.from('chat_messages').insert(messages);
      if (error) throw error;

      setSentCount(validClients.length);
      setMessage('');
      toast({ title: 'Рассылка отправлена', description: `Сообщение отправлено ${validClients.length} клиентам` });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Megaphone className="h-5 w-5" /> Маркетинговые рассылки
      </h3>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Текст сообщения</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Напишите сообщение для ваших клиентов..."
              className="min-h-[120px] mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Сообщение будет отправлено всем клиентам, которые записывались в вашу организацию
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Рассылка клиентам бизнеса</span>
              {sentCount > 0 && (
                <Badge variant="outline">Последняя: {sentCount} получателей</Badge>
              )}
            </div>
            <Button onClick={sendBroadcast} disabled={!message.trim() || sending} className="gap-1">
              <Send className="h-4 w-4" />
              {sending ? 'Отправка...' : 'Отправить'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium mb-3">Советы по рассылкам</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Не отправляйте рассылки слишком часто — раз в неделю оптимально</li>
            <li>• Предлагайте реальную ценность: скидки, новые услуги, полезную информацию</li>
            <li>• Персонализируйте обращение и указывайте ваше название</li>
            <li>• Клиенты из чёрного списка автоматически исключаются из рассылок</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessMarketing;
