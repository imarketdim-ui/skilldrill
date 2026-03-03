import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Check, CheckCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const SUPPORT_SYSTEM_ID = '00000000-0000-0000-0000-000000000000';

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

  // Admin-specific state
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      fetchThreads();
    } else {
      fetchMessages();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin && selectedUserId) fetchAdminMessages(selectedUserId);
  }, [selectedUserId]);

  // Realtime subscription
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
    const { data } = await supabase.from('chat_messages').select('*')
      .eq('chat_type', 'support')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  const fetchThreads = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('chat_messages').select('*')
      .eq('chat_type', 'support')
      .order('created_at', { ascending: false });
    
    if (!data) { setLoading(false); return; }

    // Group by user (non-admin sender or recipient)
    const userMap = new Map<string, { msgs: any[] }>();
    data.forEach(msg => {
      // The "user" is whoever is NOT an admin. For support messages, sender could be user or admin.
      // We identify threads by: if sender sent to SUPPORT_SYSTEM_ID, sender is the user
      // If sender is admin replying, recipient is the user
      let threadUserId: string;
      if (msg.recipient_id === SUPPORT_SYSTEM_ID) {
        threadUserId = msg.sender_id;
      } else {
        // Admin reply - recipient is the user
        threadUserId = msg.recipient_id;
      }
      if (!userMap.has(threadUserId)) userMap.set(threadUserId, { msgs: [] });
      userMap.get(threadUserId)!.msgs.push(msg);
    });

    // Fetch user profiles
    const userIds = Array.from(userMap.keys());
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', userIds);

    const threadList: SupportThread[] = userIds.map(uid => {
      const p = profiles?.find(pr => pr.id === uid);
      const msgs = userMap.get(uid)!.msgs;
      const lastMsg = msgs[0];
      return {
        userId: uid,
        userName: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Пользователь' : 'Пользователь',
        lastMessage: lastMsg?.message || '',
        lastMessageAt: lastMsg?.created_at || '',
        unread: msgs.filter(m => m.recipient_id !== user.id ? false : !m.is_read).length,
      };
    });

    setThreads(threadList.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
    setLoading(false);
  };

  const fetchAdminMessages = async (userId: string) => {
    const { data } = await supabase.from('chat_messages').select('*')
      .eq('chat_type', 'support')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    // Mark as read
    if (user) {
      await supabase.from('chat_messages').update({ is_read: true })
        .eq('chat_type', 'support')
        .eq('sender_id', userId)
        .eq('is_read', false);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    setSending(true);
    try {
      if (isAdmin && selectedUserId) {
        await supabase.from('chat_messages').insert({
          sender_id: user.id,
          recipient_id: selectedUserId,
          message: newMessage.trim(),
          chat_type: 'support',
        });
      } else {
        await supabase.from('chat_messages').insert({
          sender_id: user.id,
          recipient_id: SUPPORT_SYSTEM_ID,
          message: newMessage.trim(),
          chat_type: 'support',
        });
      }
      setNewMessage('');
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const getMessageStatus = (msg: any) => {
    if (msg.sender_id !== user?.id) return null;
    if (msg.is_read) return <CheckCheck className="h-3 w-3 text-primary" />;
    return <Check className="h-3 w-3 text-muted-foreground" />;
  };

  // Admin view with thread list
  if (isAdmin) {
    return (
      <Card>
        <CardHeader><CardTitle>Техподдержка — обращения</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-[500px] gap-0 rounded-lg border overflow-hidden">
            {/* Thread list */}
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
            {/* Messages */}
            <div className={`flex-1 flex flex-col ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
              {!selectedUserId ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Выберите обращение</p>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedUserId(null)}>←</Button>
                    <p className="font-medium text-sm">{threads.find(t => t.userId === selectedUserId)?.userName}</p>
                  </div>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-2">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                            msg.sender_id === user?.id ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <span className={`text-[10px] ${msg.sender_id === user?.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                              {getMessageStatus(msg)}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t flex gap-2">
                    <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ответить..." />
                    <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // User view
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Техподдержка
        </CardTitle>
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
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      msg.sender_id === user?.id ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
                    }`}>
                      {msg.sender_id !== user?.id && (
                        <p className={`text-[10px] font-medium mb-0.5 ${msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>Поддержка</p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className={`text-[10px] ${msg.sender_id === user?.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {getMessageStatus(msg)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t flex gap-2">
            <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Написать в поддержку..." />
            <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupportChat;
