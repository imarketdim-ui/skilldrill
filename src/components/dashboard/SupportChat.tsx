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

interface SupportChatProps {
  isAdmin?: boolean;
}

interface SupportThread {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

const SupportChat = ({ isAdmin = false }: SupportChatProps) => {
  const { user } = useAuth();
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
        if (isAdmin) {
          fetchThreads();
          if (selectedUserId && (msg.sender_id === selectedUserId || msg.recipient_id === selectedUserId)) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          }
        } else {
          if (msg.sender_id === user.id || msg.recipient_id === user.id) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin, selectedUserId]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    const { data: sentData } = await supabase.from('chat_messages').select('*').eq('chat_type', 'support').eq('sender_id', user.id).order('created_at', { ascending: true });
    const { data: receivedData } = await supabase.from('chat_messages').select('*').eq('chat_type', 'support').eq('recipient_id', user.id).order('created_at', { ascending: true });
    const all = [...(sentData || []), ...(receivedData || [])];
    const unique = Array.from(new Map(all.map(m => [m.id, m])).values());
    unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setMessages(unique);
    setLoading(false);
  };

  const fetchThreads = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('chat_messages').select('*').eq('chat_type', 'support').order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }

    const userMap = new Map<string, any[]>();
    data.forEach(msg => {
      const threadKey = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      if (threadKey === user.id) return;
      if (!userMap.has(threadKey)) userMap.set(threadKey, []);
      userMap.get(threadKey)!.push(msg);
    });

    const userIds = Array.from(userMap.keys()).filter(id => id && id.length > 10);
    if (userIds.length === 0) { setThreads([]); setLoading(false); return; }

    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', userIds);

    const threadList: SupportThread[] = userIds.map(uid => {
      const p = profiles?.find(pr => pr.id === uid);
      const msgs = userMap.get(uid)!;
      const lastMsg = msgs[0];
      return {
        userId: uid,
        userName: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Пользователь' : 'Пользователь',
        lastMessage: lastMsg?.message || '',
        lastMessageAt: lastMsg?.created_at || '',
        unread: msgs.filter(m => m.recipient_id === user.id && !m.is_read).length,
      };
    }).filter(t => t.userName);

    setThreads(threadList.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
    setLoading(false);
  };

  const fetchAdminMessages = async (userId: string) => {
    const { data: sentData } = await supabase.from('chat_messages').select('*').eq('chat_type', 'support').eq('sender_id', userId).order('created_at', { ascending: true });
    const { data: receivedData } = await supabase.from('chat_messages').select('*').eq('chat_type', 'support').eq('recipient_id', userId).order('created_at', { ascending: true });
    const all = [...(sentData || []), ...(receivedData || [])];
    const unique = Array.from(new Map(all.map(m => [m.id, m])).values());
    unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setMessages(unique);
    if (user) {
      await supabase.from('chat_messages').update({ is_read: true }).eq('chat_type', 'support').eq('sender_id', userId).eq('is_read', false);
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
        await supabase.from('chat_messages').insert({ ...baseMsg, sender_id: user.id, recipient_id: selectedUserId });
        setNewMessage(''); setReplyTo(null);
        fetchAdminMessages(selectedUserId);
      } else {
        const { data: adminRoles } = await supabase.from('user_roles').select('user_id').in('role', ['platform_admin', 'super_admin']).eq('is_active', true);
        const adminIds = (adminRoles || []).map(r => r.user_id).filter(id => id !== user.id);

        if (adminIds.length === 0) {
          await supabase.from('chat_messages').insert({ ...baseMsg, sender_id: user.id, recipient_id: user.id });
        } else {
          await Promise.all(adminIds.map(adminId =>
            supabase.from('chat_messages').insert({ ...baseMsg, sender_id: user.id, recipient_id: adminId })
          ));
        }

        try {
          const existingTickets = await supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['open', 'in_progress']);
          if ((existingTickets.count || 0) === 0) {
            await supabase.from('support_tickets').insert({
              user_id: user.id, subject: (text || 'Вложение').slice(0, 100), category: 'support', status: 'open',
            } as any);
          }
        } catch (_) { /* table may not exist yet */ }

        setNewMessage(''); setReplyTo(null);
        await fetchMessages();
      }
    } catch (err: any) {
      console.error('Support send error:', err);
    }
    setSending(false);
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
      {renderReplyPreview()}
      <div className="p-2 border-t flex items-center gap-1">
        {user && <ChatEmojiPicker onSelect={(e) => setNewMessage(prev => prev + e)} />}
        {user && <MediaUploader userId={user.id} onUploaded={(urls) => sendMessage({ media_urls: urls })} />}
        {user && <VoiceRecorder userId={user.id} onUploaded={(url) => sendMessage({ audio_url: url })} />}
        <Input value={newMessage} onChange={e => { setNewMessage(e.target.value); debouncedNotifyTyping(); }} onKeyDown={handleKeyDown} placeholder={isAdmin ? 'Ответить...' : 'Написать в поддержку...'} className="flex-1" />
        <Button size="icon" onClick={() => sendMessage()} disabled={sending || !newMessage.trim()}>
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
                    <p className="font-medium text-sm flex-1">{threads.find(t => t.userId === selectedUserId)?.userName}</p>
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
                <p className="text-xs mt-1 opacity-70">Все администраторы платформы получат ваше сообщение</p>
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
