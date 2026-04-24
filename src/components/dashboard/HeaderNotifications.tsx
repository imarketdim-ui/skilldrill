import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, MessageSquare, Mail, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface NotifItem {
  id: string;
  kind: 'notification' | 'chat' | 'invitation';
  title: string;
  message: string;
  created_at: string;
  related_id?: string | null;
}

const HeaderNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchAll = async () => {
    if (!user) { setItems([]); setUnread(0); return; }

    const [notifRes, chatRes, invRes] = await Promise.all([
      supabase.from('notifications')
        .select('id, type, title, message, created_at, is_read, related_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('chat_messages')
        .select('id, message, sender_id, created_at, is_read, chat_type')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20),
      user.email
        ? supabase.from('invitations')
            .select('id, organization_id, role, created_at, accepted_at, expires_at')
            .eq('email', user.email)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const notifList: NotifItem[] = (notifRes.data || []).map((n: any) => ({
      id: `n-${n.id}`,
      kind: 'notification',
      title: n.title || 'Уведомление',
      message: n.message || '',
      created_at: n.created_at,
      related_id: n.related_id,
    }));

    const chatList: NotifItem[] = (chatRes.data || []).map((m: any) => ({
      id: `c-${m.id}`,
      kind: 'chat',
      title: m.chat_type === 'support' ? 'Поддержка' : 'Новое сообщение',
      message: m.message?.slice(0, 80) || '📎 Вложение',
      created_at: m.created_at,
    }));

    const invList: NotifItem[] = (invRes.data || []).map((i: any) => ({
      id: `i-${i.id}`,
      kind: 'invitation',
      title: 'Приглашение в организацию',
      message: `Роль: ${i.role}`,
      created_at: i.created_at,
      related_id: i.organization_id,
    }));

    const all = [...notifList, ...chatList, ...invList]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 15);

    const unreadNotif = (notifRes.data || []).filter((n: any) => !n.is_read).length;
    setItems(all);
    setUnread(unreadNotif + chatList.length + invList.length);
  };

  useEffect(() => { fetchAll(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`header-notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `recipient_id=eq.${user.id}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleClick = async (item: NotifItem) => {
    setOpen(false);
    if (item.kind === 'notification') {
      const realId = item.id.replace('n-', '');
      await supabase.from('notifications').update({ is_read: true }).eq('id', realId);
    }
    if (item.kind === 'chat') {
      navigate('/dashboard');
    } else if (item.kind === 'invitation') {
      navigate('/dashboard');
    }
    fetchAll();
  };

  const markAllRead = async () => {
    if (!user) return;
    await Promise.all([
      supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false),
      supabase.from('chat_messages').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false),
    ]);
    fetchAll();
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-semibold text-sm">Уведомления</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              Прочитать все
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Нет новых уведомлений
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => {
                const Icon = item.kind === 'chat' ? MessageSquare : item.kind === 'invitation' ? Mail : AlertCircle;
                return (
                  <button
                    key={item.id}
                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex gap-2"
                    onClick={() => handleClick(item)}
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default HeaderNotifications;
