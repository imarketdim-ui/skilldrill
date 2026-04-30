import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Check, CheckCheck, Loader2, X, Search, Reply, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import MediaUploader from '@/components/chat/MediaUploader';
import ChatEmojiPicker from '@/components/chat/ChatEmojiPicker';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useToast } from '@/hooks/use-toast';
import { syncBidirectionalContacts } from '@/lib/contactSync';

interface SupportChatProps {
  isAdmin?: boolean;
}

interface SupportThread {
  ticketId: string | null;
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  status: string;
  ownerId: string | null;
  ownerLabel: string | null;
  handoffAvailableAt: string | null;
  isOwnedByCurrentAdmin: boolean;
  canTakeOver: boolean;
}

const SUPPORT_ROLE_PRIORITY = ['support', 'platform_admin', 'super_admin', 'platform_manager', 'integrator', 'moderator'] as const;
const ACTIVE_TICKET_STATUSES = ['open', 'claimed', 'in_progress', 'waiting_user', 'waiting_platform'] as const;
const TAKEOVER_TIMEOUT_MS = 5 * 60 * 1000;

const isSupportSelfMessage = (message: any) =>
  Boolean(message?.sender_id && message?.recipient_id && message.sender_id === message.recipient_id);

const canTakeOverTicket = (thread: SupportThread | null, currentUserId?: string | null) => {
  if (!thread || !currentUserId) return false;
  if (['resolved', 'closed'].includes(thread.status)) return false;
  if (!thread.ownerId) return true;
  if (thread.ownerId === currentUserId) return false;
  if (!thread.handoffAvailableAt) return false;
  return new Date(thread.handoffAvailableAt).getTime() <= Date.now();
};

const SupportChat = ({ isAdmin = false }: SupportChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actingOnTicket, setActingOnTicket] = useState(false);

  // Канал индикатора набора: для админа — пара (admin↔user), для клиента — общий support-канал
  const typingChannelKey = isAdmin
    ? (selectedUserId ? `support:${selectedUserId}` : '')
    : (user ? `support:${user.id}` : '');
  const { typingUsers, notifyTyping } = useTypingIndicator({
    channelKey: typingChannelKey,
    userId: user?.id ?? null,
    displayName: isAdmin ? 'Поддержка' : 'Пользователь',
  });

  // Дебаунс отправки presence (400мс), чтобы не спамить сеть на каждый символ
  const debouncedNotifyTyping = () => {
    if (typingDebounceRef.current) return;
    notifyTyping();
    typingDebounceRef.current = setTimeout(() => {
      typingDebounceRef.current = null;
    }, 400);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) fetchThreads();
    else fetchMessages();
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin && selectedUserId) fetchAdminMessages(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`support-chat-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'chat_type=eq.support' }, (payload) => {
        const msg = payload.new as any;
        if (isSupportSelfMessage(msg)) return;
        if (isAdmin) {
          fetchThreads();
          if (selectedUserId && (msg.sender_id === selectedUserId || msg.recipient_id === selectedUserId)) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          }
        } else {
          if (msg.sender_id === user.id || msg.recipient_id === user.id) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
            if (msg.recipient_id === user.id && msg.sender_id !== user.id) {
              supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
            }
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin, selectedUserId]);

  const resolveSupportAgentIds = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', [...SUPPORT_ROLE_PRIORITY] as any[])
      .eq('is_active', true);

    const uniqueIds = Array.from(new Set((data || []).map((row) => row.user_id).filter((id) => id && id !== user?.id)));

    uniqueIds.sort((left, right) => {
      const leftPriority = Math.min(
        ...(data || [])
          .filter((row) => row.user_id === left)
          .map((row) => SUPPORT_ROLE_PRIORITY.indexOf(row.role as typeof SUPPORT_ROLE_PRIORITY[number]))
          .filter((index) => index >= 0),
      );
      const rightPriority = Math.min(
        ...(data || [])
          .filter((row) => row.user_id === right)
          .map((row) => SUPPORT_ROLE_PRIORITY.indexOf(row.role as typeof SUPPORT_ROLE_PRIORITY[number]))
          .filter((index) => index >= 0),
      );

      return leftPriority - rightPriority;
    });

    return uniqueIds;
  };

  const resolveSupportRoleLabels = async (profileIds: string[]) => {
    if (profileIds.length === 0) return new Map<string, string>();

    const { data } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', profileIds)
      .in('role', [...SUPPORT_ROLE_PRIORITY] as any[])
      .eq('is_active', true);

    const labels = new Map<string, string>();
    profileIds.forEach((profileId) => {
      const matchedRole = SUPPORT_ROLE_PRIORITY.find((role) =>
        (data || []).some((row) => row.user_id === profileId && row.role === role),
      );

      if (!matchedRole) return;

      const labelMap: Record<(typeof SUPPORT_ROLE_PRIORITY)[number], string> = {
        support: 'Поддержка',
        platform_admin: 'Администратор платформы',
        super_admin: 'Супер-админ',
        platform_manager: 'Платформенный менеджер',
        integrator: 'Интегратор',
        moderator: 'Модератор',
      };

      labels.set(profileId, labelMap[matchedRole]);
    });

    return labels;
  };

  const buildUniqueMessages = (items: any[]) => {
    const unique = Array.from(new Map(items.map((item) => [item.id, item])).values());
    unique.sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
    return unique;
  };

  const getTicketTimeoutCopy = (handoffAvailableAt: string | null) => {
    if (!handoffAvailableAt) return null;
    const diffMs = new Date(handoffAvailableAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Диалог можно перехватить сейчас';
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.max(0, Math.floor((diffMs % 60000) / 1000));
    return `Перехват будет доступен через ${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const ensureSupportTicket = async (targetUserId: string, subject: string) => {
    const { data: existingTickets } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('category', 'support')
      .in('status', [...ACTIVE_TICKET_STATUSES] as any[])
      .order('updated_at', { ascending: false })
      .limit(1);

    const existingTicket = existingTickets?.[0] as any | undefined;
    if (existingTicket) return existingTicket;

    const nowIso = new Date().toISOString();
    const { data: createdTicket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: targetUserId,
        subject: subject.slice(0, 100),
        category: 'support',
        status: 'open',
        last_activity_at: nowIso,
        handoff_available_at: nowIso,
      } as any)
      .select('*')
      .single();

    if (error) throw error;
    return createdTicket as any;
  };

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('user_id', user.id)
      .eq('category', 'support')
      .order('created_at', { ascending: true });

    const ticketIds = (tickets || []).map((ticket) => ticket.id);
    const { data: sentData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_type', 'support')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: true });
    const { data: receivedData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_type', 'support')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: true });

    const all = [...(sentData || []), ...(receivedData || [])].filter((message) => {
      if (isSupportSelfMessage(message)) return false;
      if (!message.reference_id) return true;
      return ticketIds.includes(message.reference_id);
    });
    const unique = buildUniqueMessages(all);
    setMessages(unique);
    const unreadIds = unique.filter(m => m.recipient_id === user.id && !m.is_read).map(m => m.id);
    if (!isAdmin && unreadIds.length > 0) {
      await supabase.from('chat_messages').update({ is_read: true }).in('id', unreadIds);
    }
    setLoading(false);
  };

  const fetchThreads = async () => {
    if (!user) return;
    setLoading(true);
    const [ticketRes, messageRes] = await Promise.all([
      supabase
        .from('support_tickets')
        .select('*')
        .eq('category', 'support')
        .neq('status', 'closed')
        .order('updated_at', { ascending: false }),
      supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_type', 'support')
        .order('created_at', { ascending: false }),
    ]);

    const tickets = (ticketRes.data || []) as any[];
    const messages = (messageRes.data || []).filter((message) => !isSupportSelfMessage(message));
    const messageMap = new Map<string, any[]>();
    const legacyMap = new Map<string, any[]>();

    messages.forEach((message) => {
      if (message.reference_id) {
        if (!messageMap.has(message.reference_id)) messageMap.set(message.reference_id, []);
        messageMap.get(message.reference_id)!.push(message);
        return;
      }
      const legacyUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
      if (legacyUserId === user.id) return;
      if (!legacyMap.has(legacyUserId)) legacyMap.set(legacyUserId, []);
      legacyMap.get(legacyUserId)!.push(message);
    });

    const userIds = Array.from(new Set([
      ...tickets.map((ticket) => ticket.user_id),
      ...Array.from(legacyMap.keys()),
    ])).filter((id) => id && id.length > 10);

    if (userIds.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const ownerIds = Array.from(new Set(tickets.map((ticket) => ticket.admin_id).filter(Boolean)));
    const [profilesRes, ownerLabels] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email').in('id', [...new Set([...userIds, ...ownerIds])]),
      resolveSupportRoleLabels(ownerIds as string[]),
    ]);

    const profiles = profilesRes.data || [];

    const threadList: SupportThread[] = userIds.map((userId) => {
      const profile = profiles.find((candidate) => candidate.id === userId);
      const ticket = tickets.find((candidate) => candidate.user_id === userId) as any | undefined;
      const ticketMessages = ticket ? messageMap.get(ticket.id) || [] : [];
      const legacyMessages = legacyMap.get(userId) || [];
      const relatedMessages = [...ticketMessages, ...legacyMessages].sort((left, right) => right.created_at.localeCompare(left.created_at));
      const lastMessage = relatedMessages[0];
      const ownerProfile = ticket?.admin_id ? profiles.find((candidate) => candidate.id === ticket.admin_id) : null;
      const ownerLabel = ticket?.admin_id
        ? ownerLabels.get(ticket.admin_id) || `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim() || ownerProfile?.email || 'Администратор'
        : null;

      const thread: SupportThread = {
        ticketId: ticket?.id || null,
        userId,
        userName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Пользователь' : 'Пользователь',
        lastMessage: lastMessage?.message || ticket?.subject || 'Новое обращение',
        lastMessageAt: lastMessage?.created_at || ticket?.updated_at || ticket?.created_at || '',
        unread: relatedMessages.filter((message) => message.recipient_id === user.id && !message.is_read).length,
        status: ticket?.status || 'open',
        ownerId: ticket?.admin_id || null,
        ownerLabel,
        handoffAvailableAt: ticket?.handoff_available_at || null,
        isOwnedByCurrentAdmin: ticket?.admin_id === user.id,
        canTakeOver: canTakeOverTicket({
          ticketId: ticket?.id || null,
          userId,
          userName: '',
          lastMessage: '',
          lastMessageAt: '',
          unread: 0,
          status: ticket?.status || 'open',
          ownerId: ticket?.admin_id || null,
          ownerLabel: null,
          handoffAvailableAt: ticket?.handoff_available_at || null,
          isOwnedByCurrentAdmin: ticket?.admin_id === user.id,
          canTakeOver: false,
        }, user.id),
      };

      return thread;
    }).filter((thread) => thread.userName);

    setThreads(threadList.sort((left, right) => (right.lastMessageAt || '').localeCompare(left.lastMessageAt || '')));
    setLoading(false);
  };

  const fetchAdminMessages = async (userId: string) => {
    const supportAgentIds = await resolveSupportAgentIds();
    const { data: ticketRes } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .eq('category', 'support')
      .order('updated_at', { ascending: false })
      .limit(1);

    const ticket = ticketRes?.[0] as any | undefined;
    const { data: sentData } = supportAgentIds.length > 0
      ? await supabase.from('chat_messages').select('*').eq('chat_type', 'support').eq('sender_id', userId).in('recipient_id', supportAgentIds).order('created_at', { ascending: true })
      : { data: [] as any[] };
    const { data: receivedData } = supportAgentIds.length > 0
      ? await supabase.from('chat_messages').select('*').eq('chat_type', 'support').eq('recipient_id', userId).in('sender_id', supportAgentIds).order('created_at', { ascending: true })
      : { data: [] as any[] };
    const all = [...(sentData || []), ...(receivedData || [])].filter((message) => {
      if (isSupportSelfMessage(message)) return false;
      if (ticket?.id && message.reference_id && message.reference_id !== ticket.id) return false;
      return true;
    });
    const unique = buildUniqueMessages(all);
    setMessages(unique);
    if (user) {
      if (supportAgentIds.length > 0) {
        await supabase.from('chat_messages').update({ is_read: true }).eq('chat_type', 'support').eq('sender_id', userId).in('recipient_id', supportAgentIds).eq('is_read', false);
      }
    }
  };

  const sendMessage = async (overrides?: { audio_url?: string; media_urls?: string[]; message_type?: string }) => {
    if (!user) return;
    const text = newMessage.trim();
    if (!text && !overrides?.audio_url && !overrides?.media_urls?.length) return;
    setSending(true);
    try {
      const baseMsg: any = {
        message: text || (overrides?.audio_url ? '🎤 Голосовое' : '📎 Вложение'),
        chat_type: 'support',
        message_type: overrides?.message_type || (overrides?.audio_url ? 'audio' : overrides?.media_urls?.length ? 'media' : 'text'),
        audio_url: overrides?.audio_url || null,
        media_urls: overrides?.media_urls || null,
        reply_to_id: replyTo?.id || null,
      };

      if (isAdmin && selectedUserId) {
        const thread = threads.find((candidate) => candidate.userId === selectedUserId) || null;
        if (!thread) {
          toast({
            title: 'Не найден тикет',
            description: 'Сначала выберите обращение из списка.',
            variant: 'destructive',
          });
          return;
        }

        if (!thread.isOwnedByCurrentAdmin) {
          toast({
            title: 'Диалог ведёт другой администратор',
            description: thread.canTakeOver
              ? 'Сначала перехватите тикет, чтобы ответить пользователю.'
              : getTicketTimeoutCopy(thread.handoffAvailableAt) || 'Отвечать может только текущий владелец тикета.',
            variant: 'destructive',
          });
          return;
        }

        const nowIso = new Date().toISOString();
        const ticketId = thread.ticketId || (await ensureSupportTicket(selectedUserId, thread.lastMessage || 'Обращение в поддержку')).id;
        await supabase.from('chat_messages').insert({ ...baseMsg, sender_id: user.id, recipient_id: selectedUserId, reference_id: ticketId });
        await supabase.from('support_tickets').update({
          admin_id: user.id,
          status: 'waiting_user',
          last_admin_reply_at: nowIso,
          last_activity_at: nowIso,
          handoff_available_at: null,
          updated_at: nowIso,
        } as any).eq('id', ticketId);
        await syncBidirectionalContacts(user.id, selectedUserId);
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [selectedUserId],
            title: 'Новое сообщение от поддержки',
            body: text || 'Поддержка отправила вложение',
            url: '/dashboard?section=communication&tab=support',
            tag: 'support-chat',
          },
        }).catch(() => null);
        setNewMessage(''); setReplyTo(null);
        fetchAdminMessages(selectedUserId);
      } else {
        const supportAgentIds = await resolveSupportAgentIds();
        const primarySupportId = supportAgentIds[0];

        if (!primarySupportId) {
          toast({
            title: 'Поддержка временно недоступна',
            description: 'Попробуйте написать чуть позже. Сейчас мы не можем принять новое обращение.',
            variant: 'destructive',
          });
          setSending(false);
          return;
        }

        const nowIso = new Date().toISOString();
        const activeTicket = await ensureSupportTicket(user.id, text || 'Обращение в поддержку');
        await supabase.from('chat_messages').insert({ ...baseMsg, sender_id: user.id, recipient_id: primarySupportId, reference_id: activeTicket.id });
        await supabase.from('support_tickets').update({
          status: activeTicket.admin_id ? 'waiting_platform' : 'open',
          last_user_reply_at: nowIso,
          last_activity_at: nowIso,
          updated_at: nowIso,
          chat_message_id: activeTicket.chat_message_id || null,
          handoff_available_at: activeTicket.admin_id
            ? new Date(Date.now() + TAKEOVER_TIMEOUT_MS).toISOString()
            : nowIso,
        } as any).eq('id', activeTicket.id);
        await syncBidirectionalContacts(user.id, primarySupportId);
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: supportAgentIds,
            title: 'Новое обращение в поддержку',
            body: text || 'Пользователь отправил вложение',
            url: '/dashboard?section=support&tab=support',
            tag: 'support-chat',
          },
        }).catch(() => null);

        try {
          if (!activeTicket.chat_message_id) {
            const { data: latestMessage } = await supabase
              .from('chat_messages')
              .select('id')
              .eq('chat_type', 'support')
              .eq('sender_id', user.id)
              .eq('recipient_id', primarySupportId)
              .eq('reference_id', activeTicket.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (latestMessage?.id) {
              await supabase.from('support_tickets').update({ chat_message_id: latestMessage.id } as any).eq('id', activeTicket.id);
            }
          }
        } catch (_) { /* table may not exist yet */ }

        setNewMessage(''); setReplyTo(null);
        await fetchMessages();
      }
    } catch (err: any) {
      console.error('Support send error:', err);
      toast({
        title: 'Не удалось отправить сообщение',
        description: 'Попробуйте ещё раз через пару секунд.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleDelete = async (msgId: string) => {
    if (!confirm('Удалить сообщение?')) return;
    await supabase.from('chat_messages').delete().eq('id', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const getMessageStatus = (msg: any) => {
    if (msg.sender_id !== user?.id) return null;
    if (msg.is_read) return <CheckCheck className="h-3 w-3 text-primary" />;
    return <Check className="h-3 w-3 text-muted-foreground" />;
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m => (m.message || '').toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.userId === selectedUserId) || null,
    [threads, selectedUserId],
  );

  const canReplyAsAdmin = !isAdmin || (selectedThread?.isOwnedByCurrentAdmin ?? false);

  const claimThread = async (thread: SupportThread) => {
    if (!user) return;
    setActingOnTicket(true);
    try {
      const nowIso = new Date().toISOString();
      const handoffAtIso = new Date(Date.now() + TAKEOVER_TIMEOUT_MS).toISOString();
      const ticket = thread.ticketId
        ? { id: thread.ticketId }
        : await ensureSupportTicket(thread.userId, thread.lastMessage || 'Обращение в поддержку');

      await supabase
        .from('support_tickets')
        .update({
          admin_id: user.id,
          claimed_at: nowIso,
          status: 'claimed',
          updated_at: nowIso,
          last_activity_at: nowIso,
          handoff_available_at: handoffAtIso,
        } as any)
        .eq('id', ticket.id);

      setSelectedUserId(thread.userId);
      await fetchThreads();
      await fetchAdminMessages(thread.userId);
      toast({
        title: thread.ownerId ? 'Диалог перехвачен' : 'Тикет взят в работу',
        description: thread.ownerId ? 'Теперь отвечать в этом диалоге можете вы.' : 'Теперь отвечать в этом диалоге можете вы.',
      });
    } catch (error: any) {
      toast({
        title: 'Не удалось взять тикет',
        description: error?.message || 'Попробуйте ещё раз.',
        variant: 'destructive',
      });
    } finally {
      setActingOnTicket(false);
    }
  };

  const renderMessages = (msgList: any[]) => (
    <div className="space-y-2">
      {msgList.map(msg => {
        const isMine = msg.sender_id === user?.id;
        const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
        return (
          <div key={msg.id} className={`flex group ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
            }`}>
              {!isMine && (
                <p className="text-[10px] font-medium mb-0.5 text-muted-foreground">
                  {isAdmin ? 'Пользователь' : 'Поддержка'}
                </p>
              )}
              {repliedMsg && (
                <div className={`text-[11px] border-l-2 pl-2 mb-1 opacity-80 ${isMine ? 'border-primary-foreground/40' : 'border-primary/40'}`}>
                  <p className="line-clamp-2">{repliedMsg.message}</p>
                </div>
              )}
              {msg.media_urls?.length > 0 && (
                <div className="grid grid-cols-2 gap-1 mb-1 max-w-[240px]">
                  {msg.media_urls.map((url: string, i: number) => (
                    /\.(mp4|webm|mov)$/i.test(url) ? (
                      <video key={i} src={url} controls className="rounded max-w-full" />
                    ) : (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" className="rounded object-cover w-full h-24" />
                      </a>
                    )
                  ))}
                </div>
              )}
              {msg.audio_url && (
                <audio src={msg.audio_url} controls className="max-w-full mb-1" />
              )}
              {msg.message && msg.message_type !== 'audio' && msg.message_type !== 'media' && (
                <p className="whitespace-pre-wrap">{msg.message}</p>
              )}
              <div className="flex items-center gap-1 mt-1 justify-end">
                <button
                  onClick={() => setReplyTo(msg)}
                  className={`opacity-0 group-hover:opacity-100 transition ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                  title="Ответить"
                >
                  <Reply className="h-3 w-3" />
                </button>
                {isMine && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-primary-foreground/70"
                    title="Удалить"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                <span className={`text-[10px] ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {format(new Date(msg.created_at), 'HH:mm')}
                </span>
                {getMessageStatus(msg)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );

  const renderReplyPreview = () => replyTo && (
    <div className="px-3 py-2 border-t bg-muted/40 flex items-center gap-2">
      <Reply className="h-4 w-4 text-muted-foreground shrink-0" />
      <p className="text-xs flex-1 truncate text-muted-foreground">Ответ на: {replyTo.message}</p>
      <button onClick={() => setReplyTo(null)}><X className="h-3 w-3 text-muted-foreground" /></button>
    </div>
  );

  const renderInputBar = () => (
    <>
      {typingUsers.length > 0 && (
        <div className="px-3 py-1 text-xs text-muted-foreground italic border-t bg-muted/20">
          {typingUsers[0].name || 'Собеседник'} печатает…
        </div>
      )}
      {isAdmin && selectedThread && !canReplyAsAdmin && (
        <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          {selectedThread.ownerId
            ? `Диалог ведёт ${selectedThread.ownerLabel || 'другой администратор'}. ${getTicketTimeoutCopy(selectedThread.handoffAvailableAt) || 'Отвечать может только текущий владелец тикета.'}`
            : 'Тикет ещё никто не взял в работу. Сначала нажмите «Взять в работу».'
          }
        </div>
      )}
      {renderReplyPreview()}
      <div className="p-2 border-t flex items-center gap-1">
        {user && <ChatEmojiPicker onSelect={(e) => setNewMessage(prev => prev + e)} />}
        {user && (!isAdmin || canReplyAsAdmin) && <MediaUploader userId={user.id} onUploaded={(urls) => sendMessage({ media_urls: urls })} />}
        {user && (!isAdmin || canReplyAsAdmin) && <VoiceRecorder userId={user.id} onUploaded={(url) => sendMessage({ audio_url: url })} />}
        <Input value={newMessage} onChange={e => { setNewMessage(e.target.value); debouncedNotifyTyping(); }} onKeyDown={handleKeyDown} placeholder={isAdmin ? 'Ответить...' : 'Написать в поддержку...'} className="flex-1" disabled={isAdmin && !canReplyAsAdmin} />
        <Button size="icon" onClick={() => sendMessage()} disabled={sending || !newMessage.trim() || (isAdmin && !canReplyAsAdmin)}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );

  if (isAdmin) {
    return (
      <Card>
        <CardHeader><CardTitle>Техподдержка — обращения</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-[500px] gap-0 rounded-lg border overflow-hidden">
            <div className={`w-72 border-r flex flex-col shrink-0 ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : threads.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Нет обращений</p>
                ) : threads.map(t => (
                  <div key={t.userId}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${selectedUserId === t.userId ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedUserId(t.userId)}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{t.userName}</p>
                      {t.unread > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{t.unread}</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!t.ownerId && <Badge variant="secondary" className="text-[10px]">Свободен</Badge>}
                      {t.ownerId && t.isOwnedByCurrentAdmin && <Badge variant="default" className="text-[10px]">У вас</Badge>}
                      {t.ownerId && !t.isOwnedByCurrentAdmin && (
                        <Badge variant={t.canTakeOver ? 'destructive' : 'outline'} className="text-[10px]">
                          {t.canTakeOver ? 'Можно перехватить' : `Ведёт: ${t.ownerLabel || 'другой админ'}`}
                        </Badge>
                      )}
                      {['waiting_platform', 'claimed', 'in_progress'].includes(t.status) && (
                        <Badge variant="outline" className="text-[10px]">Ждёт платформу</Badge>
                      )}
                      {t.status === 'waiting_user' && (
                        <Badge variant="secondary" className="text-[10px]">Ждёт пользователя</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{t.lastMessage}</p>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div className={`flex-1 flex flex-col ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
              {!selectedUserId ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Выберите обращение</p>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedUserId(null)}>←</Button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{selectedThread?.userName}</p>
                      {selectedThread && (
                        <p className="text-xs text-muted-foreground truncate">
                          {!selectedThread.ownerId
                            ? 'Тикет ещё не взят в работу'
                            : selectedThread.isOwnedByCurrentAdmin
                              ? 'Вы ведёте этот диалог'
                              : selectedThread.canTakeOver
                                ? 'Диалог можно перехватить'
                                : `Диалог ведёт ${selectedThread.ownerLabel || 'другой администратор'}`
                          }
                        </p>
                      )}
                    </div>
                    {selectedThread && !selectedThread.isOwnedByCurrentAdmin && (
                      <Button
                        size="sm"
                        variant={selectedThread.canTakeOver || !selectedThread.ownerId ? 'default' : 'outline'}
                        disabled={actingOnTicket || Boolean(selectedThread.ownerId && !selectedThread.canTakeOver)}
                        onClick={() => claimThread(selectedThread)}
                      >
                        {actingOnTicket
                          ? '...'
                          : selectedThread.ownerId
                            ? 'Перехватить'
                            : 'Взять в работу'}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setShowSearch(s => !s)}><Search className="h-4 w-4" /></Button>
                  </div>
                  {showSearch && (
                    <div className="p-2 border-b">
                      <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по сообщениям..." className="h-8" />
                    </div>
                  )}
                  <ScrollArea className="flex-1 p-3">{renderMessages(filteredMessages)}</ScrollArea>
                  {renderInputBar()}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Техподдержка
          <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" onClick={() => setShowSearch(s => !s)}>
            <Search className="h-4 w-4" />
          </Button>
        </CardTitle>
        {showSearch && (
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..." className="h-8 mt-2" />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[400px] rounded-lg border overflow-hidden">
          <ScrollArea className="flex-1 p-3">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Напишите нам, если у вас есть вопросы</p>
                <p className="text-xs mt-1 opacity-70">Команда поддержки увидит ваше обращение и возьмёт его в работу</p>
              </div>
            ) : renderMessages(filteredMessages)}
          </ScrollArea>
          {renderInputBar()}
        </div>
      </CardContent>
    </Card>
  );
};

export default SupportChat;
